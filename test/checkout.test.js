/* Vérifie que la fonction de paiement construit la bonne session Stripe
   et qu'elle refuse tout ce qui est trafiqué côté navigateur. */

process.env.STRIPE_SECRET_KEY = 'sk_test_faux';
const handler = require('../api/checkout.js');

let dernierAppel = null;
global.fetch = async (url, options) => {
  dernierAppel = { url, body: options.body, auth: options.headers.Authorization };
  return {
    ok: true,
    json: async () => ({ url: 'https://checkout.stripe.com/c/pay/session_test' })
  };
};

function fausseReponse() {
  const r = {
    codes: null, corps: null, entetes: {},
    setHeader(k, v) { this.entetes[k] = v; },
    status(c) { this.codes = c; return this; },
    json(o) { this.corps = o; return this; }
  };
  return r;
}

async function appeler(body, methode) {
  const req = {
    method: methode || 'POST',
    headers: { origin: 'https://myfluffypaws.fr', host: 'myfluffypaws.fr' },
    body: body
  };
  const res = fausseReponse();
  await handler(req, res);
  return res;
}

function params() {
  return new URLSearchParams(dernierAppel.body);
}

(async () => {
  let echecs = 0;
  const verifier = (nom, condition, detail) => {
    console.log((condition ? '  OK  ' : ' ÉCHEC') + '  ' + nom + (condition ? '' : '  -> ' + detail));
    if (!condition) echecs++;
  };

  // 1. Commande normale : kit + 2 gants
  let res = await appeler({ lignes: [
    { id: 'kit', qte: 1, couleur: 'Bleu' },
    { id: 'gant', qte: 2 }
  ] });
  let p = params();
  verifier('la session est créée', res.codes === 200 && res.corps.url, JSON.stringify(res.corps));
  verifier('montant du kit = 2990 c', p.get('line_items[0][price_data][unit_amount]') === '2990',
    p.get('line_items[0][price_data][unit_amount]'));
  verifier('coloris repris dans le libellé',
    p.get('line_items[0][price_data][product_data][name]') === "Kit de Toilettage Ultim' — Bleu",
    p.get('line_items[0][price_data][product_data][name]'));
  verifier('quantité du gant = 2', p.get('line_items[1][quantity]') === '2', p.get('line_items[1][quantity]'));
  verifier('devise en euros', p.get('line_items[0][price_data][currency]') === 'eur');
  verifier('livraison offerte', p.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]') === '0');
  verifier('adresse de livraison demandée',
    p.get('shipping_address_collection[allowed_countries][0]') === 'FR');
  verifier('retour vers la page de remerciement',
    p.get('success_url') === 'https://myfluffypaws.fr/merci.html?session_id={CHECKOUT_SESSION_ID}',
    p.get('success_url'));
  verifier('clé secrète envoyée en en-tête', dernierAppel.auth === 'Bearer sk_test_faux');

  // 2. Le client tente d'imposer son prix
  res = await appeler({ lignes: [{ id: 'kit', qte: 1, prix: 1, unit_amount: 1, price_data: { unit_amount: 1 } }] });
  p = params();
  verifier('un prix envoyé par le client est ignoré',
    p.get('line_items[0][price_data][unit_amount]') === '2990',
    p.get('line_items[0][price_data][unit_amount]'));

  // 3. Entrées invalides
  const cas = [
    ['article inexistant', { lignes: [{ id: 'poney', qte: 1 }] }],
    ['quantité négative', { lignes: [{ id: 'kit', qte: -3 }] }],
    ['quantité démesurée', { lignes: [{ id: 'kit', qte: 999 }] }],
    ['quantité non entière', { lignes: [{ id: 'kit', qte: 'beaucoup' }] }],
    ['coloris inventé', { lignes: [{ id: 'kit', qte: 1, couleur: 'Doré' }] }],
    ['panier vide', { lignes: [] }],
    ['corps absent', {}]
  ];
  for (const [nom, corps] of cas) {
    const r = await appeler(corps);
    verifier('refusé : ' + nom, r.codes === 400 && !!r.corps.erreur, r.codes + ' ' + JSON.stringify(r.corps));
  }

  // 4. Méthode et origine
  res = await appeler({ lignes: [{ id: 'kit', qte: 1 }] }, 'GET');
  verifier('refusé : requête GET', res.codes === 405, res.codes);

  const resOrigine = fausseReponse();
  await handler({ method: 'POST', headers: { origin: 'http://pirate.example' }, body: { lignes: [{ id: 'kit', qte: 1 }] } }, resOrigine);
  verifier('refusé : origine non sécurisée', resOrigine.codes === 400, resOrigine.codes);

  // 5. Clé absente
  delete process.env.STRIPE_SECRET_KEY;
  res = await appeler({ lignes: [{ id: 'kit', qte: 1 }] });
  verifier('message clair si la clé Stripe manque', res.codes === 500 && !!res.corps.erreur, res.codes);
  verifier('la clé n\'apparaît jamais dans la réponse',
    JSON.stringify(res.corps).indexOf('sk_') === -1);

  console.log(echecs ? '\n' + echecs + ' test(s) en échec' : '\nTous les tests passent.');
  process.exit(echecs ? 1 : 0);
})();
