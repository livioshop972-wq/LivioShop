/* ==========================================================================
   Génère dist/site.html : la page entière en un seul fichier autonome
   (CSS, JS et illustrations intégrés). Aucune dépendance : node build.js
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const racine = __dirname;
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8');

const html = lire('index.html');
const css = lire('assets/css/styles.css');
let js = lire('assets/js/main.js');

const titre = html.match(/<title>([\s\S]*?)<\/title>/)[1].trim();
let corps = html.match(/<body>([\s\S]*)<\/body>/)[1];

/* Photos -> data URI, pour se passer du dossier assets/ */
const cachePhotos = new Map();
function dataUri(fichier) {
  if (!cachePhotos.has(fichier)) {
    const octets = fs.readFileSync(path.join(racine, 'assets/img/photos', fichier));
    const type = fichier.endsWith('.png') ? 'image/png'
      : fichier.endsWith('.jpg') || fichier.endsWith('.jpeg') ? 'image/jpeg'
      : 'image/webp';
    cachePhotos.set(fichier, 'data:' + type + ';base64,' + octets.toString('base64'));
  }
  return cachePhotos.get(fichier);
}

const refPhoto = /assets\/img\/photos\/([\w-]+\.(?:webp|png|jpe?g))/g;
corps = corps.replace(refPhoto, (_, f) => dataUri(f));
js = js.replace(refPhoto, (_, f) => dataUri(f));

/* Le CSS et le JS deviennent internes */
corps = corps.replace(/\s*<script src="[^"]*"><\/script>/, '');

/* Le fichier unique est une démo hors ligne : aucun serveur pour encaisser. */
const drapeauDemo = '<script>window.MFP_DEMO = true;</script>';

const sortie = [
  // en tête du fichier : sans elle, les accents et le « € » s'affichent de travers
  '<meta charset="utf-8">',
  '<title>' + titre + '</title>',
  '<style>',
  css.trim(),
  '</style>',
  corps.trim(),
  drapeauDemo,
  '<script>',
  js.trim(),
  '</script>',
  ''
].join('\n');

fs.mkdirSync(path.join(racine, 'dist'), { recursive: true });
fs.writeFileSync(path.join(racine, 'dist/site.html'), sortie);

console.log(
  'dist/site.html généré — ' +
    (Buffer.byteLength(sortie) / 1024).toFixed(0) +
    ' Ko, ' +
    cachePhotos.size +
    ' photos intégrées'
);
