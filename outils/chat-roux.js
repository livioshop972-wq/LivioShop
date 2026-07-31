/* Transforme le chat tigré gris de outils/sources/ en chat roux, et écrit
   le résultat dans assets/img/photos/gant-vignette.webp.

   Lancer un serveur local à la racine du dépôt, puis :
     node outils/chat-roux.js           génère la photo
     node outils/chat-roux.js apercu    visualise la sélection en vert
   Prérequis : Playwright (npm install --no-save playwright), et un serveur
   statique servant la racine du dépôt sur le port 8123 :
     python3 -m http.server 8123
   */
const { chromium } = require('playwright');
const fs = require('fs');
const RACINE = require('path').join(__dirname, '..');
const APERCU = process.argv[2] === 'apercu';

const TRAITEMENT = `
function rousseur(d, L, H, apercu) {
  const n = L * H;

  // Le chat : tout le bas de l'image, plus la tête en haut à droite.
  const zoneChat = (x, y) => {
    if (x < 150 && y < 215) return false;   // manche de la personne
    if (y > 112) return true;               // corps
    return x > 415 && y > 45;               // tête et oreilles
  };

  const sat = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx === mn) return 0;
    const l = (mx + mn) / 510;
    return l > 0.5 ? (mx - mn) / (510 - mx - mn) : (mx - mn) / (mx + mn);
  };

  let m = new Uint8Array(n);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L; x++) {
      if (!zoneChat(x, y)) continue;
      const i = (y * L + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (b >= r - 3) continue;             // le gant bleu et les ombres froides
      const s = sat(r, g, b);
      if (s > 0.34) continue;               // le fond chaud et saturé
      if (r > 205) continue;                // la couverture claire
      m[y * L + x] = 1;
    }
  }

  // fermeture : rattrape les rayures et les zones d'ombre isolées
  const filtre = (src, rayon, max) => {
    const tmp = new Uint8Array(n), out = new Uint8Array(n);
    for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
      let v = max ? 0 : 1;
      for (let k = -rayon; k <= rayon; k++) {
        const xx = x + k;
        if (xx < 0 || xx >= L) { if (!max) v = 0; continue; }
        const s = src[y * L + xx];
        v = max ? Math.max(v, s) : Math.min(v, s);
      }
      tmp[y * L + x] = v;
    }
    for (let x = 0; x < L; x++) for (let y = 0; y < H; y++) {
      let v = max ? 0 : 1;
      for (let k = -rayon; k <= rayon; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= H) { if (!max) v = 0; continue; }
        const s = tmp[yy * L + x];
        v = max ? Math.max(v, s) : Math.min(v, s);
      }
      out[y * L + x] = v;
    }
    return out;
  };
  m = filtre(m, 5, true);
  m = filtre(m, 5, false);

  // le gant et le hors-zone ne doivent jamais être rattrapés par la fermeture
  for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
    const p = y * L + x;
    if (!m[p]) continue;
    const i = p * 4;
    if (!zoneChat(x, y) || d[i + 2] >= d[i] - 1) m[p] = 0;
  }

  // bords adoucis
  const flou = new Float32Array(n), R = 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
    let s = 0, c = 0;
    for (let dy = -R; dy <= R; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue;
      for (let dx = -R; dx <= R; dx++) { const xx = x + dx; if (xx < 0 || xx >= L) continue;
        s += m[yy * L + xx]; c++; } }
    flou[y * L + x] = s / c;
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
    // roux : teinte orangée, saturation nettement relevée, luminosité conservée
    const nouvelleS = Math.min(0.64, 0.27 + s * 1.5);
    const nouvelleL = Math.min(0.95, l * 1.04);
    const [nr, ng, nb] = versRGB(0.072, nouvelleS, nouvelleL);
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

  const data = await p.evaluate(async (apercu) => {
    const img = new Image();
    img.src = '/outils/sources/chat-tigre-gris.webp';
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const im = ctx.getImageData(0, 0, c.width, c.height);
    rousseur(im.data, c.width, c.height, apercu);
    ctx.putImageData(im, 0, 0);
    return c.toDataURL(apercu ? 'image/png' : 'image/webp', 0.86).split(',')[1];
  }, APERCU);

  const chemin = RACINE + (APERCU ? '/outils/chat-masque.png' : '/assets/img/photos/gant-vignette.webp');
  fs.writeFileSync(chemin, Buffer.from(data, 'base64'));
  console.log(chemin.split('/').pop(), (fs.statSync(chemin).size / 1024).toFixed(0) + ' Ko');
  await b.close();
})();
