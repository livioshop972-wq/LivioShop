# My Fluffy Paws 🐾 — Le Kit de Toilettage Ultim'

Page de vente (landing page) statique pour le kit de toilettage **My Fluffy Paws** :
brosse auto-nettoyante, gant de massage et coupe-griffes sécurisé.

## Contenu de la page

1. **Haut de page** — marque, titre « Le Kit de Toilettage Ultim' », accroche
   « Le confort de votre compagnon, en toute simplicité » et visuel du kit complet.
2. **Offre principale** — comparatif 49,70 € à l'unité vs **29,90 €** le kit,
   mise en avant de l'économie de 19,80 € + livraison offerte, bouton d'achat
   principal et éléments de confiance (livraison offerte, paiement sécurisé, retour 14 jours).
3. **Achat à l'unité** — 3 fiches produit (brosse 19,90 €, gant 14,90 €,
   coupe-griffes 14,90 €) avec bouton « Ajouter au panier ».
4. **Présentation des 3 accessoires** — un bloc par produit :
   nettoyage en 1 clic + sélecteur de coloris (Rose / Bleu / Gris) pour la brosse,
   moment de complicité pour le gant, butée de sécurité et compatibilité
   chiens/chats pour le coupe-griffes.
5. **FAQ** — 4 questions dépliables (entretien, sécurité du coupe-griffes,
   chiens & chats, choix du coloris).

## Structure

```
index.html              page de vente
merci.html              confirmation après paiement
api/checkout.js         création de la session de paiement Stripe
test/checkout.test.js   tests de la fonction de paiement
assets/css/styles.css   feuille de style
assets/js/main.js       panier, coloris, passage en caisse
assets/img/photos/      photos produit
build.js                génère dist/site.html (fichier unique)
```

## Mettre la boutique en ligne

Voir **[PAIEMENT.md](PAIEMENT.md)** : création du compte Stripe, déploiement
sur Vercel, test avec une carte fictive, puis passage en production.

## Lancer en local

Aucune dépendance, aucun build. Ouvrez `index.html` dans un navigateur, ou :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Détails techniques

- HTML/CSS/JS natifs, aucune librairie externe — la page fonctionne hors ligne.
- Photos en WebP (`assets/img/photos/`), chacune n'apparaissant qu'une fois :
  `kit-complet` en visuel principal, les `*-vignette` (640 px) sur les fiches à
  l'unité et dans le panier — des mises en situation avec un animal —, les
  `*-produit` (1024 px) dans les blocs de présentation. Chargement différé
  sous la ligne de flottaison.
- Panier persistant via `localStorage` : quantités, coloris de brosse sélectionné,
  total et badge du header.
- Paiement par carte via Stripe Checkout. Les prix sont recalculés côté serveur
  dans `api/checkout.js` : le navigateur n'envoie que des identifiants et des
  quantités, jamais de montant. Voir [PAIEMENT.md](PAIEMENT.md) pour la mise en
  route, et `node test/checkout.test.js` pour la suite de tests.
- Le coloris choisi dans la section « La Brosse auto-nettoyante » change la
  photo affichée, met à jour la fiche à l'unité et suit l'article jusque dans
  le panier et la commande Stripe. Les variantes bleue et grise sont obtenues
  par recolorisation de la photo rose (`outils/recolorer-brosse.js`) : à
  remplacer par de vraies photos dès que possible.
- Responsive (grille 3 → 2 → 1 colonne), barre d'achat fixe sur mobile,
  navigation clavier, `prefers-reduced-motion` respecté.

## Version en un seul fichier

`node build.js` génère `dist/site.html` : la page entière (CSS, JS et
photos comprises) dans un fichier unique, sans dossier `assets/`.
Pratique pour l'envoyer par mail, le montrer à quelqu'un ou l'ouvrir d'un
double-clic. C'est une **démonstration** : sans serveur derrière, le bouton
« Passer commande » indique que le paiement est désactivé.
