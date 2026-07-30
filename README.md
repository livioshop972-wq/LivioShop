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
index.html            page complète
assets/css/styles.css feuille de style
assets/js/main.js     panier, sélecteur de coloris, interactions
assets/img/*.svg      illustrations vectorielles des produits
```

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
  total et badge du header. Le bouton « Passer commande » est un point
  d'accroche à brancher sur une vraie solution de paiement.
- Le coloris choisi dans la section « La Brosse auto-nettoyante » est mémorisé,
  affiché sur la fiche à l'unité et rattaché à la ligne du panier. Les photos
  montrant le modèle rose, la page le précise sous les pastilles.
- Responsive (grille 3 → 2 → 1 colonne), barre d'achat fixe sur mobile,
  navigation clavier, `prefers-reduced-motion` respecté.

## Version en un seul fichier

`node build.js` génère `dist/site.html` : la page entière (CSS, JS et
photos comprises) dans un fichier unique, sans dossier `assets/`.
Pratique pour l'envoyer par mail, l'héberger n'importe où, ou simplement
l'ouvrir d'un double-clic.
