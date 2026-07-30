/* ==========================================================================
   Création d'une session de paiement Stripe.
   Fonction serverless (Vercel, Netlify, Cloudflare…) appelée par le panier.

   Les prix sont définis ICI, jamais dans le navigateur : le client n'envoie
   que des identifiants et des quantités. Impossible pour lui de fixer
   lui-même le montant à payer.

   Variable d'environnement requise : STRIPE_SECRET_KEY
   ========================================================================== */

'use strict';

/* Catalogue de référence — les montants sont en centimes d'euro. */
const CATALOGUE = {
  'kit': {
    nom: "Kit de Toilettage Ultim'",
    description: 'Brosse auto-nettoyante + Gant de massage + Coupe-griffes sécurisé',
    prix: 2990,
    coloris: true
  },
  'brosse': {
    nom: 'Brosse auto-nettoyante',
    description: 'Nettoyage des poils en 1 clic',
    prix: 1990,
    coloris: true
  },
  'gant': {
    nom: 'Gant de massage',
    description: 'Retient les poils morts pendant les caresses',
    prix: 1490
  },
  'coupe-griffes': {
    nom: 'Coupe-griffes sécurisé',
    description: 'Butée de sécurité anti-blessure, chiens et chats',
    prix: 1490
  }
};

const COLORIS_AUTORISES = ['Rose', 'Bleu', 'Gris'];

/* Livraison offerte sur toute la boutique.
   Pour la facturer, indiquez ici un montant en centimes (ex. 390 pour 3,90 €). */
const LIVRAISON_CENTIMES = 0;

const QUANTITE_MAX = 20;
const PAYS_LIVRES = ['FR', 'BE', 'LU', 'CH', 'MC'];

/* ---------- utilitaires ---------- */

/* Stripe attend des paramètres de formulaire à plat : line_items[0][quantity]=1 */
function aplatir(objet, prefixe, sortie) {
  sortie = sortie || new URLSearchParams();
  Object.keys(objet).forEach(function (cle) {
    const valeur = objet[cle];
    const nom = prefixe ? prefixe + '[' + cle + ']' : cle;
    if (valeur === undefined || valeur === null) { return; }
    if (typeof valeur === 'object') {
      aplatir(valeur, nom, sortie);
    } else {
      sortie.append(nom, String(valeur));
    }
  });
  return sortie;
}

function lireCorps(req) {
  if (!req.body) { return {}; }
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return req.body;
}

/* On ne renvoie le client que vers son propre site. */
function origineSure(req) {
  const brute = req.headers.origin || ('https://' + (req.headers.host || ''));
  try {
    const url = new URL(brute);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return null;
    }
    return url.origin;
  } catch (e) {
    return null;
  }
}

/* Le panier reçu est reconstruit à partir du catalogue, jamais recopié. */
function construireLignes(lignesRecues) {
  if (!Array.isArray(lignesRecues) || !lignesRecues.length) {
    throw new Error('Votre panier est vide.');
  }
  if (lignesRecues.length > Object.keys(CATALOGUE).length * COLORIS_AUTORISES.length) {
    throw new Error('Panier invalide.');
  }

  return lignesRecues.map(function (ligne) {
    const produit = CATALOGUE[ligne && ligne.id];
    if (!produit) {
      throw new Error('Article inconnu dans le panier.');
    }

    const quantite = Math.floor(Number(ligne.qte));
    if (!Number.isFinite(quantite) || quantite < 1 || quantite > QUANTITE_MAX) {
      throw new Error('Quantité invalide pour « ' + produit.nom + ' ».');
    }

    let nom = produit.nom;
    if (produit.coloris && ligne.couleur) {
      if (COLORIS_AUTORISES.indexOf(ligne.couleur) === -1) {
        throw new Error('Coloris indisponible.');
      }
      nom += ' — ' + ligne.couleur;
    }

    return {
      quantity: quantite,
      price_data: {
        currency: 'eur',
        unit_amount: produit.prix,
        product_data: { name: nom, description: produit.description }
      }
    };
  });
}

/* ---------- la fonction ---------- */

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erreur: 'Méthode non autorisée.' });
  }

  const cleStripe = process.env.STRIPE_SECRET_KEY;
  if (!cleStripe) {
    console.error('STRIPE_SECRET_KEY absente des variables d\'environnement.');
    return res.status(500).json({
      erreur: "Le paiement n'est pas encore configuré. Réessayez plus tard."
    });
  }

  const origine = origineSure(req);
  if (!origine) {
    return res.status(400).json({ erreur: 'Origine de la commande invalide.' });
  }

  let lignes;
  try {
    lignes = construireLignes(lireCorps(req).lignes);
  } catch (e) {
    return res.status(400).json({ erreur: e.message });
  }

  const session = {
    mode: 'payment',
    locale: 'fr',
    line_items: lignes,
    success_url: origine + '/merci.html?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origine + '/#offre',
    shipping_address_collection: { allowed_countries: PAYS_LIVRES },
    phone_number_collection: { enabled: true },
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        display_name: LIVRAISON_CENTIMES === 0 ? 'Livraison offerte' : 'Livraison standard',
        fixed_amount: { amount: LIVRAISON_CENTIMES, currency: 'eur' },
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 3 },
          maximum: { unit: 'business_day', value: 7 }
        }
      }
    }]
  };

  try {
    const reponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + cleStripe,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: aplatir(session).toString()
    });

    const donnees = await reponse.json();

    if (!reponse.ok) {
      console.error('Stripe a refusé la session :', donnees && donnees.error);
      return res.status(502).json({
        erreur: "La commande n'a pas pu être ouverte. Merci de réessayer dans un instant."
      });
    }

    return res.status(200).json({ url: donnees.url });
  } catch (e) {
    console.error('Appel Stripe impossible :', e);
    return res.status(502).json({
      erreur: "La commande n'a pas pu être ouverte. Merci de réessayer dans un instant."
    });
  }
};
