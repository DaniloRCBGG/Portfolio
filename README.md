# Portfólio – Danilo Rios (versão timeline)

Site estático para GitHub Pages: HTML, CSS e JavaScript puros, sem build e sem backend. As bibliotecas ficam na pasta `vendor/`, então o site não depende de CDN (só as fontes do Google e os mapas de fundo vêm de fora).

## Como funciona a navegação
- **Cabeçalho:** as quatro rotas (Início, Habilidades, Projetos, Contato), uma página `.html` para cada.
- **Linha do tempo logo abaixo:** no estilo do tour do Google Earth. Cada rota é um trecho e cada ponto é um capítulo da página. O marcador acompanha a rolagem; os botões passam de capítulo em capítulo; o play faz o tour sozinho e atravessa as páginas. O tour para assim que a pessoa rola ou usa o teclado.
- As rotas e os capítulos ficam em `js/data.js`. Para criar um capítulo, adicione uma seção com `id` na página e o mesmo `id` na lista `chapters` da rota.

## Estrutura
| Arquivo | O que tem |
| --- | --- |
| `index.html` | Início: apresentação com fundo animado, números e a trajetória em mapa de jogo |
| `habilidades.html` | Blocos por área com filtro e matriz habilidades × projetos |
| `projetos.html` | Gêmeo Digital, Curly Studio, plataforma n8n e outros projetos, com demonstrações |
| `contato.html` | GitHub, portfólio, email e LinkedIn |
| `css/app.css` | Paleta do Gêmeo (temas claro e escuro) e todo o visual |
| `js/data.js` | Rotas, capítulos, habilidades e em quais projetos cada uma aparece |
| `js/app.js` | Tema, botões de copiar, avisos, animações ao rolar e imagens |
| `js/timeline.js` | Linha do tempo e tour |
| `js/motion.js` | Rolagem suave (Lenis) e entrada das seções com GSAP ScrollTrigger |
| `js/journey.js` | Trajetória em mapa de jogo: fases, projetos, nível e conquistas |
| `js/niteroi-geo.js` | Limites do IBGE de Niterói e vizinhos, fundo do mapa quando os mapas online não carregam |
| `js/home.js`, `js/skills.js`, `js/projects.js` | Interações de cada página |
| `vendor/` | Bootstrap 5.3.3, Bootstrap Icons 1.11.3, Leaflet 1.9.4, GSAP 3.12.5 (com ScrollTrigger) e Lenis 1.1.13, com as licenças |

## Trajetória em mapa de jogo
As fases, os textos, as habilidades desbloqueadas e os projetos que saem de cada fase ficam no início de `js/journey.js` (listas `STAGES` e `BRANCHES`). No computador, a seção fica fixa e a rolagem leva o marcador de fase em fase; o cursor perto de um ponto também leva até ele. No celular, o mapa fica vertical e o card aparece no rodapé.

## Como editar
No GitHub, abra o arquivo, clique no lápis (Edit), altere o texto e clique em **Commit changes**.
- Habilidades e onde foram usadas: `js/data.js`.
- Textos dos projetos: `projetos.html`.

## Como colocar as imagens dos projetos
Coloque os prints na pasta `img/`, em PNG, com estes nomes exatos:

| Projeto | Arquivos |
| --- | --- |
| Gêmeo Digital de Niterói | `gemeo-1.png`, `gemeo-2.png`, `gemeo-3.png` |
| Carol Rios Curly Studio | `curly-1.png`, `curly-2.png`, `curly-3.png` |
| Plataforma n8n | `n8n-1.png`, `n8n-2.png` |

No GitHub: abra a pasta `img`, clique em **Add file → Upload files**, arraste os arquivos e clique em **Commit changes**. Enquanto um arquivo não existe, o espaço dele não aparece. Ao clicar num print, ele abre numa galeria. As legendas ficam no `alt` de cada `<img>` em `projetos.html`.

Antes de subir prints do Gêmeo ou do n8n, confira se não aparecem IPs, tokens, senhas ou endereços internos.

## Sobre as simulações
O mapa do Gêmeo, o agendamento do Curly Studio e o envio do n8n usam dados fictícios, e a página avisa isso. As regras e os limiares são os dos projetos reais. A busca de CEP faz uma consulta real à API pública do ViaCEP.
