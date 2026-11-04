// Baixa a malha viária de Niterói do OpenStreetMap (a mesma área do city-roads, areaId 3602220789)
// e grava data/niteroi-ruas.json num formato compacto que o mini Gêmeo lê sem depender da Overpass.
// Uso: node tools/malha-niteroi.mjs   (Node 18 ou mais novo)
import { writeFile, mkdir } from 'node:fs/promises';

const AREA = 3602220789;
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const query = `[out:json][timeout:180];area(${AREA})->.a;way["highway"](area.a);out geom qt;`;
// A Overpass recusa (406) pedidos sem identificação; a política de uso pede um User-Agent próprio
const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept: 'application/json',
  'User-Agent': 'portfolio-danilorcbgg-malha/1.0 (+https://github.com/DaniloRCBGG/portfolio)',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const classOf = (hw) => (/^(motorway|trunk|primary|secondary|tertiary)(_link)?$/.test(hw) ? 'major'
  : /^(residential|unclassified|living_street|service|road)$/.test(hw) ? 'minor' : 'path');

async function fetchOverpass() {
  for (let round = 1; round <= 3; round++) {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, { method: 'POST', body: `data=${encodeURIComponent(query)}`, headers: HEADERS });
        if (res.ok) return await res.json();
        console.error(`${url} respondeu ${res.status} (tentativa ${round})`);
      } catch (err) {
        console.error(`${url} falhou: ${err.message} (tentativa ${round})`);
      }
    }
    // Limite de pedidos (429) ou servidor ocupado (504): espera e tenta de novo
    if (round < 3) await sleep(30000 * round);
  }
  throw new Error('Nenhum servidor Overpass respondeu');
}

const json = await fetchOverpass();
const classes = { major: [], minor: [], path: [] };
// Nomes das vias principais (para os endereços dos pop-ups): uma lista de nomes únicos e, para cada via, o índice
const nomes = [], indice = new Map(), nomeVias = { major: [] };
const nomeDe = (n) => { if (!n) return -1; let i = indice.get(n); if (i === undefined) { i = nomes.length; nomes.push(n); indice.set(n, i); } return i; };
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
  const c = classOf(el.tags.highway);
  classes[c].push(out);
  if (c === 'major') nomeVias.major.push(nomeDe(el.tags.name));
  points += el.geometry.length;
}
const data = {
  fonte: 'OpenStreetMap, via Overpass API (© colaboradores do OpenStreetMap, ODbL)',
  area: AREA,
  gerado: new Date().toISOString(),
  formato: 'coordenadas em graus × 1e5, [lng, lat] com diferenças em relação ao ponto anterior; nomeVias.major[i] é o índice em nomes da via classes.major[i] (-1 sem nome)',
  classes,
  nomes,
  nomeVias,
};
await mkdir('data', { recursive: true });
await writeFile('data/niteroi-ruas.json', JSON.stringify(data));
const n = Object.values(classes).reduce((s, c) => s + c.length, 0);
console.log(`data/niteroi-ruas.json: ${n} vias, ${points} pontos (principais ${classes.major.length}, locais ${classes.minor.length}, caminhos ${classes.path.length}), ${nomes.length} nomes de vias principais`);
