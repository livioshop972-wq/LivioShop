/* ==========================================================================
   My Fluffy Paws — panier, coloris de la brosse, interactions
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_CART = 'mfp-cart';
  var STORAGE_COLOR = 'mfp-brush-color';

  var PRODUITS = {
    'kit': {
      nom: "Kit de Toilettage Ultim'",
      prix: 29.90,
      icone: 'ic-kit',
      vue: '0 0 900 420',
      note: 'Brosse + Gant + Coupe-griffes',
      couleur: true,
      livraisonOfferte: true
    },
    'brosse': {
      nom: 'Brosse auto-nettoyante',
      prix: 19.90,
      icone: 'ic-brosse',
      vue: '0 0 300 400',
      note: 'Nettoyage en 1 clic',
      couleur: true
    },
    'gant': {
      nom: 'Gant de massage',
      prix: 14.90,
      icone: 'ic-gant',
      vue: '0 0 300 400',
      note: 'Retient les poils'
    },
    'coupe-griffes': {
      nom: 'Coupe-griffes sécurisé',
      prix: 14.90,
      icone: 'ic-griffes',
      vue: '0 0 300 400',
      note: 'Butée anti-blessure'
    }
  };

  /* Chaque coloris fournit ses trois nuances : le dégradé du produit en dépend. */
  var COULEURS = {
    'Rose': { base: '#f4739f', clair: '#ffb3cd', fonce: '#d64d84' },
    'Bleu': { base: '#4a90d9', clair: '#93c3f2', fonce: '#2f6dab' },
    'Gris': { base: '#8a94a6', clair: '#c6cdd9', fonce: '#626c7d' }
  };

  /* ---------- utilitaires ---------- */

  function euros(valeur) {
    return valeur.toFixed(2).replace('.', ',') + ' €';
  }

  function lire(cle, defaut) {
    try {
      var brut = localStorage.getItem(cle);
      return brut ? JSON.parse(brut) : defaut;
    } catch (e) {
      return defaut;
    }
  }

  function ecrire(cle, valeur) {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
    } catch (e) { /* stockage indisponible : le panier reste en mémoire */ }
  }

  var panier = lire(STORAGE_CART, []);
  var couleurBrosse = lire(STORAGE_COLOR, 'Rose');
  if (!COULEURS[couleurBrosse]) { couleurBrosse = 'Rose'; }

  /* ---------- coloris de la brosse ---------- */

  var swatches = Array.prototype.slice.call(document.querySelectorAll('.swatch'));

  function appliquerCouleur(nom) {
    couleurBrosse = COULEURS[nom] ? nom : 'Rose';
    ecrire(STORAGE_COLOR, couleurBrosse);

    // les variables vivent sur la racine : toutes les brosses de la page suivent
    var teinte = COULEURS[couleurBrosse];
    var racine = document.documentElement;
    racine.style.setProperty('--brush-color', teinte.base);
    racine.style.setProperty('--brush-light', teinte.clair);
    racine.style.setProperty('--brush-dark', teinte.fonce);

    swatches.forEach(function (btn) {
      var actif = btn.dataset.color === couleurBrosse;
      btn.classList.toggle('is-active', actif);
      btn.setAttribute('aria-checked', actif ? 'true' : 'false');
    });
    document.querySelectorAll('[data-brush-current]').forEach(function (el) {
      el.textContent = couleurBrosse;
    });
    document.querySelectorAll('[data-brush-label]').forEach(function (el) {
      el.textContent = 'Coloris : ' + couleurBrosse;
    });
  }

  swatches.forEach(function (btn) {
    btn.addEventListener('click', function () {
      appliquerCouleur(btn.dataset.color);
      afficherToast('Coloris ' + couleurBrosse + ' sélectionné 🎨');
    });
  });

  appliquerCouleur(couleurBrosse);

  /* ---------- panier ---------- */

  var elItems = document.querySelector('[data-cart-items]');
  var elTotal = document.querySelector('[data-cart-total]');
  var elCount = document.querySelector('[data-cart-count]');
  var elShip = document.querySelector('[data-ship]');
  var drawer = document.querySelector('[data-drawer]');
  var overlay = document.querySelector('[data-overlay]');

  function cleLigne(id, couleur) {
    return couleur ? id + '::' + couleur : id;
  }

  function ajouter(id) {
    var produit = PRODUITS[id];
    if (!produit) { return; }

    var couleur = produit.couleur ? couleurBrosse : null;
    var cle = cleLigne(id, couleur);
    var ligne = panier.filter(function (l) { return l.cle === cle; })[0];

    if (ligne) {
      ligne.qte += 1;
    } else {
      panier.push({ cle: cle, id: id, couleur: couleur, qte: 1 });
    }

    sauver();
    rendre();
    afficherToast(produit.nom + ' ajouté au panier 🐾');
    ouvrirPanier();
  }

  function modifierQuantite(cle, delta) {
    var ligne = panier.filter(function (l) { return l.cle === cle; })[0];
    if (!ligne) { return; }
    ligne.qte += delta;
    if (ligne.qte <= 0) {
      panier = panier.filter(function (l) { return l.cle !== cle; });
    }
    sauver();
    rendre();
  }

  function supprimer(cle) {
    panier = panier.filter(function (l) { return l.cle !== cle; });
    sauver();
    rendre();
  }

  function sauver() { ecrire(STORAGE_CART, panier); }

  function total() {
    return panier.reduce(function (somme, ligne) {
      var produit = PRODUITS[ligne.id];
      return produit ? somme + produit.prix * ligne.qte : somme;
    }, 0);
  }

  function nombreArticles() {
    return panier.reduce(function (somme, ligne) { return somme + ligne.qte; }, 0);
  }

  function rendre() {
    // nettoyage des lignes devenues invalides (produit retiré du catalogue)
    panier = panier.filter(function (ligne) { return !!PRODUITS[ligne.id]; });

    var n = nombreArticles();
    if (elCount) {
      elCount.textContent = String(n);
      elCount.hidden = n === 0;
    }

    if (elItems) {
      elItems.innerHTML = '';

      if (!panier.length) {
        var vide = document.createElement('div');
        vide.className = 'cart-empty';
        vide.innerHTML = '<span aria-hidden="true">🐾</span>Votre panier est vide pour le moment.';
        elItems.appendChild(vide);
      } else {
        panier.forEach(function (ligne) {
          var produit = PRODUITS[ligne.id];
          var el = document.createElement('div');
          el.className = 'cart-line';

          var meta = produit.note + (ligne.couleur ? ' · ' + ligne.couleur : '');

          el.innerHTML =
            '<div class="cart-thumb">' +
              '<svg viewBox="' + produit.vue + '" aria-hidden="true" focusable="false">' +
                '<use href="#' + produit.icone + '"></use>' +
              '</svg>' +
            '</div>' +
            '<div>' +
              '<div class="cart-name"></div>' +
              '<div class="cart-meta"></div>' +
              '<div class="cart-qty">' +
                '<button class="qty-btn" type="button" data-qty="-1" aria-label="Retirer une unité">−</button>' +
                '<span class="qty-value">' + ligne.qte + '</span>' +
                '<button class="qty-btn" type="button" data-qty="1" aria-label="Ajouter une unité">+</button>' +
              '</div>' +
            '</div>' +
            '<div class="cart-price">' + euros(produit.prix * ligne.qte) + '</div>';

          el.querySelector('.cart-name').textContent = produit.nom;
          el.querySelector('.cart-meta').textContent = meta;

          el.querySelectorAll('[data-qty]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              modifierQuantite(ligne.cle, parseInt(btn.dataset.qty, 10));
            });
          });

          elItems.appendChild(el);
        });
      }
    }

    if (elTotal) { elTotal.textContent = euros(total()); }

    if (elShip) {
      var avecKit = panier.some(function (l) { return PRODUITS[l.id] && PRODUITS[l.id].livraisonOfferte; });
      elShip.textContent = panier.length
        ? (avecKit ? '🚚 Livraison offerte' : '🚚 Livraison offerte dès le kit complet')
        : '';
    }
  }

  /* ---------- tiroir panier ---------- */

  var dernierFocus = null;

  function ouvrirPanier() {
    if (!drawer) { return; }
    dernierFocus = document.activeElement;
    drawer.hidden = false;
    if (overlay) { overlay.hidden = false; }
    document.body.classList.add('is-locked');
    var fermer = drawer.querySelector('[data-cart-close]');
    if (fermer) { fermer.focus(); }
  }

  function fermerPanier() {
    if (!drawer) { return; }
    drawer.hidden = true;
    if (overlay) { overlay.hidden = true; }
    document.body.classList.remove('is-locked');
    if (dernierFocus && dernierFocus.focus) { dernierFocus.focus(); }
  }

  document.querySelectorAll('[data-cart-open]').forEach(function (b) {
    b.addEventListener('click', ouvrirPanier);
  });
  document.querySelectorAll('[data-cart-close]').forEach(function (b) {
    b.addEventListener('click', fermerPanier);
  });
  if (overlay) { overlay.addEventListener('click', fermerPanier); }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && !drawer.hidden) { fermerPanier(); }
  });

  document.querySelectorAll('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () { ajouter(btn.dataset.add); });
  });

  var checkout = document.querySelector('[data-checkout]');
  if (checkout) {
    checkout.addEventListener('click', function () {
      if (!panier.length) {
        afficherToast('Votre panier est encore vide 🐾');
        return;
      }
      afficherToast('Commande de ' + euros(total()) + ' — paiement à connecter');
    });
  }

  /* ---------- toast ---------- */

  var elToast = document.querySelector('[data-toast]');
  var minuteurToast;

  function afficherToast(message) {
    if (!elToast) { return; }
    elToast.textContent = message;
    elToast.hidden = false;
    // force le reflow pour rejouer la transition
    void elToast.offsetWidth;
    elToast.classList.add('is-visible');
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(function () {
      elToast.classList.remove('is-visible');
      setTimeout(function () { elToast.hidden = true; }, 250);
    }, 2600);
  }

  /* ---------- barre d'achat mobile ---------- */

  var sticky = document.querySelector('[data-sticky]');
  var reperage = document.querySelector('.hero-actions');

  if (sticky && reperage && 'IntersectionObserver' in window) {
    sticky.hidden = true;
    new IntersectionObserver(function (entrees) {
      sticky.hidden = entrees[0].isIntersecting;
    }, { rootMargin: '0px 0px -40% 0px' }).observe(reperage);
  } else if (sticky) {
    sticky.hidden = false;
  }

  /* ---------- divers ---------- */

  var annee = document.querySelector('[data-year]');
  if (annee) { annee.textContent = String(new Date().getFullYear()); }

  rendre();
})();
