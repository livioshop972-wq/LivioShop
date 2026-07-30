# Encaisser pour de vrai — mise en route

Le paiement est **entièrement codé et testé**. Il reste trois choses à faire,
que je ne peux pas faire à ta place : elles demandent ton identité, ton compte
bancaire et tes mots de passe.

Compte environ **1 h**, sans savoir coder.

---

## Comment ça marche

Ton panier ne manipule jamais d'argent. Quand le client clique sur
« Passer commande » :

1. Le site envoie à ton serveur la **liste des articles** (pas les prix).
2. Le serveur recalcule le montant à partir de son propre catalogue
   (`api/checkout.js`) et demande à Stripe d'ouvrir une page de paiement.
3. Le client est redirigé vers **Stripe**, qui encaisse la carte bancaire.
4. Il revient sur `merci.html`, et l'argent arrive sur ton compte Stripe.

**Pourquoi les prix sont-ils recalculés côté serveur ?** Parce que n'importe qui
peut modifier une page web dans son navigateur. Si le prix venait du navigateur,
un visiteur pourrait acheter le kit à 0,01 €. Ici c'est impossible : le serveur
ignore tout prix envoyé par le client.

Les numéros de carte ne passent jamais par ton site : c'est Stripe qui les
reçoit, ce qui t'évite toute la réglementation lourde sur les données bancaires.

---

## Étape 1 — Créer ton compte Stripe

1. Va sur [stripe.com](https://stripe.com) et crée un compte.
2. Renseigne les informations de ton activité : nom, adresse, numéro SIRET
   (auto-entrepreneur suffit), et ton **IBAN** pour recevoir les virements.
3. Stripe vérifie ton dossier, en général sous 24 à 48 h.

Tarif Stripe en France, au moment où ces lignes sont écrites : environ
**1,5 % + 0,25 €** par paiement par carte européenne. Sur le kit à 29,90 €,
cela représente à peu près 0,70 €. Vérifie le tarif en vigueur sur leur site.

## Étape 2 — Récupérer ta clé secrète

Dans le tableau de bord Stripe : **Développeurs → Clés API**.

Tu y trouveras deux clés :

| Clé | À quoi elle sert |
|---|---|
| `pk_...` (publiable) | Inutile ici, tu peux l'ignorer. |
| `sk_...` (**secrète**) | C'est celle-là qu'il te faut. |

> ⚠️ **La clé secrète, c'est la clé de ta caisse.** Ne l'envoie à personne,
> ne la mets pas dans un fichier du site, ne la colle pas dans une conversation.
> Elle se saisit uniquement dans l'interface d'hébergement (étape 3).
> Si elle fuite, révoque-la immédiatement depuis Stripe.

Commence avec la clé **de test** (`sk_test_...`), en haut du tableau de bord :
tu pourras faire de fausses commandes sans dépenser un centime.

## Étape 3 — Mettre le site en ligne

Le site a besoin d'un hébergeur capable d'exécuter `api/checkout.js`.
Le plus simple est **Vercel**, gratuit pour un début.

1. Crée un compte sur [vercel.com](https://vercel.com) avec ton compte GitHub.
2. **Add New → Project**, puis choisis le dépôt `livioshop`.
3. Laisse tous les réglages par défaut et clique sur **Deploy**.
4. Une fois déployé : **Settings → Environment Variables**, et ajoute :

   | Nom | Valeur |
   |---|---|
   | `STRIPE_SECRET_KEY` | ta clé `sk_test_...` |

5. Onglet **Deployments → Redeploy**, pour que la clé soit prise en compte.

Ton site est en ligne à l'adresse `ton-projet.vercel.app`. Tu pourras y
brancher ton propre nom de domaine plus tard (Settings → Domains).

## Étape 4 — Tester avec une fausse carte

Sur ton site en ligne, ajoute un article et clique sur « Passer commande ».
Sur la page Stripe, utilise cette carte de test :

- Numéro : `4242 4242 4242 4242`
- Date : n'importe quelle date future — Code : n'importe quels 3 chiffres

Tu dois arriver sur la page de remerciement, et voir le paiement apparaître
dans **Stripe → Paiements**. Vérifie que le montant est le bon.

## Étape 5 — Passer en vrai

Quand tout fonctionne :

1. Bascule Stripe en mode **production** (interrupteur en haut du tableau de bord).
2. Récupère la clé secrète de production (`sk_live_...`).
3. Remplace `STRIPE_SECRET_KEY` dans Vercel par cette nouvelle clé, puis redéploie.

La boutique encaisse pour de vrai. 🎉

---

## Avant d'ouvrir : les obligations légales

Vendre en ligne en France impose des pages que le site n'a pas encore, et que
Stripe peut te demander :

- **Mentions légales** : ton nom, ton adresse, ton SIRET, ton hébergeur.
- **Conditions générales de vente** : prix, livraison, paiement, garanties.
- **Droit de rétractation** : 14 jours, à indiquer explicitement.
- **Politique de confidentialité** : les données que tu collectes (RGPD).

Ces textes demandent tes informations réelles. Donne-les moi et je rédige les
pages, ou pars d'un modèle officiel sur
[economie.gouv.fr](https://www.economie.gouv.fr) ou [service-public.fr](https://www.service-public.fr).

---

## Réglages courants

Tout se passe dans `api/checkout.js`, tout en haut du fichier.

**Changer un prix** — les montants sont **en centimes** (`2990` = 29,90 €).
Pense à modifier aussi l'affichage dans `index.html`, sinon le site annoncera
un prix différent de celui encaissé.

```js
const CATALOGUE = {
  'kit': { …, prix: 2990 },   // 29,90 €
```

**Facturer la livraison** — actuellement offerte partout :

```js
const LIVRAISON_CENTIMES = 0;   // mettre 390 pour 3,90 €
```

**Livrer d'autres pays** :

```js
const PAYS_LIVRES = ['FR', 'BE', 'LU', 'CH', 'MC'];
```

Après chaque modification, relance les tests :

```bash
node test/checkout.test.js
```

---

## Questions fréquentes

**Le bouton affiche « La commande n'a pas pu être ouverte ».**
La clé `STRIPE_SECRET_KEY` est absente ou invalide dans Vercel. Vérifie-la,
puis redéploie. Les journaux détaillés sont dans Vercel → Deployments → Logs.

**Puis-je rester sur un hébergement classique (OVH, Ionos…) ?**
Seulement s'il exécute du Node.js. Un hébergement de simples fichiers HTML ne
peut pas faire tourner `api/checkout.js`, et donc pas encaisser.

**Où voir mes commandes ?**
Dans Stripe → Paiements. Chaque commande indique les articles, le coloris
choisi, l'adresse de livraison et le téléphone du client.

**Comment rembourser ?**
Depuis Stripe, sur la commande concernée, bouton « Rembourser ». Aucune
manipulation à faire sur le site.
