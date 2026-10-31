# Portfólio – Danilo Rios (versão com páginas separadas)

Site estático para GitHub Pages: HTML, CSS e JavaScript puros, sem build e sem backend.

## Estrutura
| Arquivo | Página |
| --- | --- |
| `index.html` | Início: apresentação, links de destaque e experiência |
| `habilidades.html` | Habilidades por área, de Front-end a GIS |
| `projetos.html` | Projetos em destaque e outros projetos |
| `contato.html` | GitHub, portfólio, email e LinkedIn |
| `css/style.css` | Visual de todas as páginas |
| `js/main.js` | Botões de copiar, imagens ampliadas e demonstrações dos projetos |

O menu do topo é o mesmo em todas as páginas; o link da página atual leva `aria-current="page"`.

## Como editar
No GitHub, abra o arquivo da página, clique no lápis (Edit), altere o texto e clique em **Commit changes**.

## Como colocar as imagens dos projetos
Coloque os prints na pasta `img/`, em PNG, com estes nomes exatos:

| Projeto | Arquivos |
| --- | --- |
| Gêmeo Digital de Niterói | `gemeo-1.png`, `gemeo-2.png`, `gemeo-3.png` |
| Carol Rios Curly Studio | `curly-1.png`, `curly-2.png`, `curly-3.png` |
| Plataforma n8n | `n8n-1.png`, `n8n-2.png` |

No GitHub: abra a pasta `img`, clique em **Add file → Upload files**, arraste os arquivos e clique em **Commit changes**.

Enquanto um arquivo não existe, o espaço dele simplesmente não aparece. As legendas ficam no `alt` de cada `<img>` dentro de `index.html`; troque o texto se o print mostrar outra coisa.

Antes de subir prints do Gêmeo ou do n8n, confira se não aparecem IPs, tokens, senhas ou endereços internos.
