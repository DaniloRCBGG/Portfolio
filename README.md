# Portfólio – Danilo Rios

Site estático para GitHub Pages: HTML, CSS e JavaScript puros, sem build e sem backend. As bibliotecas ficam em `vendor/`; de fora vêm só as fontes do Google, a malha viária do OpenStreetMap (quando o arquivo do repositório ainda não existe) e a consulta de CEP do ViaCEP.

## Leitura contínua
Tudo fica em `index.html`, numa página só: Início → Projetos → Habilidades → Contato. A rolagem leva de uma parte para a outra; o menu e a linha do tempo só indicam onde a pessoa está (e servem de atalho, se ela quiser). `projetos.html`, `habilidades.html` e `contato.html` redirecionam para a parte certa, para links antigos não quebrarem.

## Linha do tempo (árvore de commits, estilo GitLens)
A `main` segue reta; cada parte é um ramo colorido que sai para cima ou para baixo e volta num símbolo de merge: `feat/projetos` (com o sub-ramo `feat/automacao` para n8n e Prefect), `feat/habilidades` e `release/contato`. Cada seção é um commit com hash curto, e um símbolo de ramo em preto e branco marca o commit onde a pessoa está; a cor do progresso corre pelo próprio ramo. No celular a linha começa recolhida (botão de ramo no topo) e, aberta, tem botões para escolher qual ramo ver. Partes e seções ficam em `js/data.js` (`routes`; um capítulo pode ter `branch` próprio), e a forma da árvore em `branches` (`lane` negativa = acima da main, positiva = abaixo; `parent` = de onde o ramo sai).

## Projetos ↔ habilidades
- O Gêmeo e o n8n têm cards de etapa com minifluxos animados; o Gêmeo tem também um mapa em camadas (uma camada por órgão) que acende conforme a etapa que está no meio da tela.
- Cada etapa e cada projeto listam as habilidades usadas (derivadas de `examples` em `js/data.js`). Clicar numa abre o laboratório de Habilidades já nela; os exemplos do laboratório e as células da matriz levam à etapa do projeto que usou a habilidade. Depois do salto aparece um botão para voltar.
- Link direto para uma habilidade: `index.html#habilidade-<nome>` (ex.: `#habilidade-react`, `#habilidade-node-js`).

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
| `js/steps.js` | Cards de etapa: mapa em camadas do Gêmeo, nós do n8n e minifluxos |
| `js/links.js` | Ligações projeto ↔ habilidade, rolagem suave dos links internos e botão de volta |
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

Também aparecem no mapa, sem entrar no cruzamento, as estações da NitBike (quadrado roxo com bike branca; branco com bike roxa quando a estação está cheia, como no app da NitBike) e câmeras urbanas da NITTRANS, ambas simuladas. A NitBike segue a lógica real: a cada 30 s um snapshot compara a contagem de bikes de cada estação com a anterior (caiu = saídas, subiu = entradas); a cada minuto os snapshots viram o total de saídas e entradas, numa janela dos últimos 5 minutos. As estações ficam em `NB`, em `js/gemeo.js`.

Todos os ícones do mapa abrem um pop-up: ônibus (linha, estado e onde está), estação (endereço e bikes), alerta (tipo, tipo no Waze e onde), lentidão (onde e extensão), pluviômetro (região e chuva) e câmera (cruzamento e um clipe animado ilustrativo, porque o vídeo real vem de uma API da Prefeitura que não é pública). Os endereços usam os nomes das vias principais que o `tools/malha-niteroi.mjs` grava no arquivo da malha; sem eles, aparece o bairro aproximado.

## Como editar
No GitHub, abra o arquivo, clique no lápis (Edit), altere e clique em **Commit changes**.
- Habilidades e exemplos de uso: `js/data.js`.
- Fases da trajetória: início de `js/journey.js`.
- Textos dos projetos: `index.html`.

## Imagens
| Onde | Arquivos |
| --- | --- |
| Prints do Gêmeo | `img/gemeo-1.png`, `img/gemeo-2.png`, `img/gemeo-3.png` |
| Prints do n8n | `img/n8n-1.png` (workflow no editor) e `img/n8n-2.png` (execução bem-sucedida) |
| Antes e depois do salão | `img/curly/antes-1.jpg` e `img/curly/depois-1.jpg` (e `-2`, `-3` para os outros resultados) |

Enquanto um arquivo não existe, os prints do Gêmeo e do n8n não aparecem e o antes e depois mostra bonecas de pano desenhadas no navegador (pele negra e parda, cabelo de lã cacheado), uma para cada resultado. Antes de subir prints, confira se não aparecem IPs, tokens ou endereços internos; e use fotos de clientes só com autorização.
