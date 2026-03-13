import JSZip from 'jszip';
import { readFileSync } from 'fs';

const buf = readFileSync('docs/Guia_Analise_Financeira_Raiz.pptx');
const zip = await JSZip.loadAsync(buf);

const slideFiles = Object.keys(zip.files)
  .filter(f => /ppt\/slides\/slide\d+\.xml$/.test(f))
  .sort((a, b) => {
    const na = parseInt(a.match(/slide(\d+)/)[1]);
    const nb = parseInt(b.match(/slide(\d+)/)[1]);
    return na - nb;
  });

for (let i = 0; i < slideFiles.length; i++) {
  const xml = await zip.files[slideFiles[i]].async('string');
  const texts = [];
  const re = /<a:t>([^<]+)<\/a:t>/g;
  let m;
  while ((m = re.exec(xml)) !== null) texts.push(m[1]);
  console.log(`=== SLIDE ${i + 1} ===`);
  // Group by runs (separate with |)
  const unique = texts.filter(t => t.trim());
  console.log(unique.join(' | '));
  console.log();
}
