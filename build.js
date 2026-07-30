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

/* Le CSS et le JS deviennent internes */
corps = corps.replace(/\s*<script src="[^"]*"><\/script>/, '');

const sortie = [
  // en tête du fichier : sans elle, les accents et le « € » s'affichent de travers
  '<meta charset="utf-8">',
  '<title>' + titre + '</title>',
  '<style>',
  css.trim(),
  '</style>',
  corps.trim(),
  '<script>',
  js.trim(),
  '</script>',
  ''
].join('\n');

fs.mkdirSync(path.join(racine, 'dist'), { recursive: true });
fs.writeFileSync(path.join(racine, 'dist/site.html'), sortie);

console.log(
  'dist/site.html généré — ' + (Buffer.byteLength(sortie) / 1024).toFixed(1) + ' Ko'
);
