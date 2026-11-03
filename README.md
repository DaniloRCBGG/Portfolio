# Portfólio – Danilo Rios

Site estático para GitHub Pages: HTML, CSS e JavaScript puros, sem build e sem backend. As bibliotecas ficam em `vendor/`; de fora vêm só as fontes do Google, a malha viária do OpenStreetMap (quando o arquivo do repositório ainda não existe) e a consulta de CEP do ViaCEP.

## Leitura contínua
Tudo fica em `index.html`, numa página só: Início → Projetos → Habilidades → Contato. A rolagem leva de uma parte para a outra; o menu e a linha do tempo só indicam onde a pessoa está (e servem de atalho, se ela quiser). `projetos.html`, `habilidades.html` e `contato.html` redirecionam para a parte certa, para links antigos não quebrarem.

## Linha do tempo (estilo GitLens)
Cada parte é um ramo colorido (`main`, `feat/projetos`, `feat/habilidades`, `release/contato`) que sai da linha principal e volta a ela; cada seção é um commit com um hash curto. O HEAD acompanha a rolagem. As partes e as seções ficam em `js/data.js` (`routes`); para criar um commit, adicione uma seção com `id` na página e o mesmo `id` em `chapters`.

## Estrutura
| Arquivo | O que tem |
| --- | --- |
| `index.html` | A página inteira |
| `css/app.css` | Paleta do Gêmeo, paleta do salão, fundos de cada aplicação e todo o visual |
| `js/data.js` | Partes, projetos, habilidades e o exemplo real de uso de cada habilidade |
| `js/motion.js` | Rolagem suave (Lenis) e entrada das seções com GSAP ScrollTrigger |
| `js/timeline.js` | Linha do tempo em grafo de commits e tour |
| `js/journey.js` | Trajetória em mapa de jogo, conduzida pela rolagem |
| `js/gemeo.js` | Mini Gêmeo: malha viária, ônibus simulados e camadas |
| `js/curly.js` | Antes e depois e agendamento do salão |
| `js/n8n.js` | Fluxo do n8n como camada de transporte |
| `js/skills.js` | Habilidades na prática e matriz habilidades × projetos |
| `js/projects.js` | Partes técnicas ("Por dentro") e janelas de detalhe |
| `js/niteroi-geo.js` | Limites do IBGE de Niterói e vizinhos, fundo do mapa quando a malha não carrega |
| `img/brand/` | Logo do Carol Rios Curly Studio |
| `tools/malha-niteroi.mjs` | Baixa a malha viária de Niterói do OpenStreetMap |
| `vendor/` | Bootstrap 5.3.3, Bootstrap Icons 1.11.3, GSAP 3.12.5 (com ScrollTrigger) e Lenis 1.1.13, com as licenças |

## Malha viária do mini Gêmeo
A malha é a mesma do [city-roads](https://anvaka.github.io/city-roads/?q=niteroi&areaId=3602220789) (OpenStreetMap, área 3602220789). A página tenta, nesta ordem:
1. `data/niteroi-ruas.json`, gerado pelo workflow **Malha viária de Niterói** (`.github/workflows/malha-niteroi.yml`). Ele roda sozinho quando o script muda na `main` e pode ser disparado pela aba Actions.
2. A cópia guardada no navegador de uma visita anterior.
3. A Overpass API ao vivo, como o city-roads faz.
4. Os limites do IBGE, com um trajeto ilustrativo.

Para gerar o arquivo na sua máquina: `node tools/malha-niteroi.mjs` (Node 18 ou mais novo).

Os ônibus são simulados sobre as ruas reais. Não há uma API pública da MobNit acessível; se houver um feed de posições, a URL entra em `MOBNIT_URL`, no início de `js/gemeo.js`.

## Como editar
No GitHub, abra o arquivo, clique no lápis (Edit), altere e clique em **Commit changes**.
- Habilidades e exemplos de uso: `js/data.js`.
- Fases da trajetória: início de `js/journey.js`.
- Textos dos projetos: `index.html`.

## Imagens
| Onde | Arquivos |
| --- | --- |
| Prints do Gêmeo | `img/gemeo-1.png`, `img/gemeo-2.png`, `img/gemeo-3.png` |
| Antes e depois do salão | `img/curly/antes-1.jpg` e `img/curly/depois-1.jpg` (e `-2`, `-3` para os outros resultados) |

Enquanto um arquivo não existe, os prints do Gêmeo não aparecem e o antes e depois usa uma ilustração. Antes de subir prints, confira se não aparecem IPs, tokens ou endereços internos; e use fotos de clientes só com autorização.
