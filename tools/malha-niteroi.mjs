// Baixa a malha viária de Niterói do OpenStreetMap (a mesma área do city-roads, areaId 3602220789)
// e grava data/niteroi-ruas.json num formato compacto que o mini Gêmeo lê sem depender da Overpass.
// Uso: node tools/malha-niteroi.mjs   (Node 18 ou mais novo)
import { writeFile, mkdir } from 'node:fs/promises';

const AREA = 3602220789;
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const query = `[out:json][timeout:180];area(${AREA})->.a;way["highway"](area.a);out geom qt;`;

const classOf = (hw) => (/^(motorway|trunk|primary|secondary|tertiary)(_link)?$/.test(hw) ? 'major'
  : /^(residential|unclassified|living_street|service|road)$/.test(hw) ? 'minor' : 'path');

async function fetchOverpass() {
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: 'POST', body: `data=${encodeURIComponent(query)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      if (res.ok) return await res.json();
      console.error(`${url} respondeu ${res.status}`);
    } catch (err) {
      console.error(`${url} falhou: ${err.message}`);
    }
  }
  throw new Error('Nenhum servidor Overpass respondeu');
}

const json = await fetchOverpass();
const classes = { major: [], minor: [], path: [] };
let points = 0;
for (const el of json.elements) {
  if (el.type !== 'way' || !el.geometry || !el.tags?.highway) continue;
  const out = [];
  let pl = 0, pa = 0;
  for (const g of el.geometry) {
    const l = Math.round(g.lon * 1e5), a = Math.round(g.lat * 1e5);
    out.push(l - pl, a - pa);
    pl = l; pa = a;
  }
  classes[classOf(el.tags.highway)].push(out);
  points += el.geometry.length;
}
const data = {
  fonte: 'OpenStreetMap, via Overpass API (© colaboradores do OpenStreetMap, ODbL)',
  area: AREA,
  gerado: new Date().toISOString(),
  formato: 'coordenadas em graus × 1e5, [lng, lat] com diferenças em relação ao ponto anterior',
  classes,
};
await mkdir('data', { recursive: true });
await writeFile('data/niteroi-ruas.json', JSON.stringify(data));
const n = Object.values(classes).reduce((s, c) => s + c.length, 0);
console.log(`data/niteroi-ruas.json: ${n} vias, ${points} pontos (principais ${classes.major.length}, locais ${classes.minor.length}, caminhos ${classes.path.length})`);
