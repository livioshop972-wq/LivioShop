/* Recolorisation de la brosse, deuxième approche.

   1. masque strict sur le rose franc
   2. fermeture morphologique : les ombres et les trous internes sont rattrapés
   3. la touffe de poils morts est protégée par une ellipse
   4. la teinte est remplacée en conservant la luminosité (les reflets restent)   */
const { chromium } = require('playwright');
const fs = require('fs');
const dir = '/tmp/claude-0/-home-user-LivioShop/6754ba14-f586-5d6a-98f3-2d76e66e283b/scratchpad/';

const CIBLES = {
  bleu:    { teinte: 0.578, satMax: 0.40, satFacteur: 1.00 },
  gris:    { teinte: 0.60,  satMax: 0.06, satFacteur: 0.14 },
  _apercu: null
};

const TRAITEMENT = `
function traiter(d, L, H, cible, apercu) {
  // La main tient le manche : on ne repeint que ce qui est hors de la prise.
  const dedans = (x, y) => {
    if (y >= 44 && y < 278) return x > 412 && x < 658;   // tête
    if (y >= 278 && y < 298) return x > 470 && x < 600;  // manche au-dessus des doigts
    if (y >= 348 && y < 452) return x > 508 && x < 557;  // manche visible entre les doigts
    if (y >= 452 && y <= 516) return x > 472 && x < 566;  // bout du manche sous la main
    return false;
  };
  // touffe de poils morts : elle ne doit pas changer de couleur
  const poils = (x, y) => {
    const dx = (x - 504) / 50, dy = (y - 180) / 46;
    return dx * dx + dy * dy < 1;
  };

  const n = L * H;
  let m = new Uint8Array(n);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L; x++) {
      if (!dedans(x, y) || poils(x, y)) continue;
      const i = (y * L + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const d1 = r - g, d2 = g - b;
      const tete = y < 278;
      const seuil = tete ? 0.56 : 0.40;
      const mini = tete ? 11 : 16;
      if (d1 > mini && d2 >= 0 && d2 < seuil * d1 && r > 55) m[y * L + x] = 1;
    }
  }

  // fermeture : dilatation puis érosion, en deux passes séparables
  const filtre = (src, rayon, max) => {
    const tmp = new Uint8Array(n), out = new Uint8Array(n);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < L; x++) {
        let v = max ? 0 : 1;
        for (let k = -rayon; k <= rayon; k++) {
          const xx = x + k;
          if (xx < 0 || xx >= L) { if (!max) { v = 0; } continue; }
          const s = src[y * L + xx];
          v = max ? Math.max(v, s) : Math.min(v, s);
        }
        tmp[y * L + x] = v;
      }
    }
    for (let x = 0; x < L; x++) {
      for (let y = 0; y < H; y++) {
        let v = max ? 0 : 1;
        for (let k = -rayon; k <= rayon; k++) {
          const yy = y + k;
          if (yy < 0 || yy >= H) { if (!max) { v = 0; } continue; }
          const s = tmp[yy * L + x];
          v = max ? Math.max(v, s) : Math.min(v, s);
        }
        out[y * L + x] = v;
      }
    }
    return out;
  };

  m = filtre(m, 4, true);
  m = filtre(m, 4, false);

  // on ne repeint jamais hors de la zone brosse, ni sur les poils, ni sur du froid
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L; x++) {
      const p = y * L + x;
      if (!m[p]) continue;
      if (!dedans(x, y) || poils(x, y)) { m[p] = 0; continue; }
      const i = p * 4;
      const d1 = d[i] - d[i + 1], d2 = d[i + 1] - d[i + 2];
      const limite = y < 278 ? 0.70 : 0.62;
      if (d1 < 6 || d2 < 0 || d2 > limite * d1) m[p] = 0;
    }
  }

  // adoucissement des bords : moyenne locale du masque
  const flou = new Float32Array(n);
  const R = 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L; x++) {
      let s = 0, c = 0;
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= H) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= L) continue;
          s += m[yy * L + xx]; c++;
        }
      }
      flou[y * L + x] = s / c;
    }
  }

  function versHSL(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const dd = mx - mn;
    const s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
    let h;
    if (mx === r) h = ((g - b) / dd + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / dd + 2) / 6;
    else h = ((r - g) / dd + 4) / 6;
    return [h, s, l];
  }
  function versRGB(h, s, l) {
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    const canal = (t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return pp + (q - pp) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
      return pp;
    };
    return [canal(h + 1 / 3), canal(h), canal(h - 1 / 3)].map(v => Math.round(v * 255));
  }

  for (let p = 0; p < n; p++) {
    const f = flou[p];
    if (f <= 0.02) continue;
    const i = p * 4;
    if (apercu) { d[i] = 0; d[i + 1] = Math.round(255 * f); d[i + 2] = 0; continue; }
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const [, s, l] = versHSL(r, g, b);
    const [nr, ng, nb] = versRGB(cible.teinte, Math.min(cible.satMax, s * cible.satFacteur), l);
    d[i]     = Math.round(r + (nr - r) * f);
    d[i + 1] = Math.round(g + (ng - g) * f);
    d[i + 2] = Math.round(b + (nb - b) * f);
  }
}
`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:8123/');
  await p.addScriptTag({ content: TRAITEMENT });

  for (const [nom, cible] of Object.entries(CIBLES)) {
    const apercu = cible === null;
    const data = await p.evaluate(async ({ cible, apercu }) => {
      const img = new Image();
      img.src = '/assets/img/photos/brosse-produit.webp';
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const im = ctx.getImageData(0, 0, c.width, c.height);
      traiter(im.data, c.width, c.height, cible, apercu);
      ctx.putImageData(im, 0, 0);
      return c.toDataURL(apercu ? 'image/png' : 'image/webp', 0.9).split(',')[1];
    }, { cible, apercu });

    const chemin = apercu
      ? dir + 'masque2.png'
      : '/home/user/LivioShop/assets/img/photos/brosse-produit-' + nom + '.webp';
    fs.writeFileSync(chemin, Buffer.from(data, 'base64'));
    console.log(nom, '->', chemin.split('/').pop(), (fs.statSync(chemin).size / 1024).toFixed(0) + ' Ko');
  }
  await b.close();
})();
