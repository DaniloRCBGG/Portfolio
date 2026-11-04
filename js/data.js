// Fonte única do conteúdo compartilhado entre as páginas: rotas da linha do tempo,
// projetos, habilidades e exemplos reais de uso de cada habilidade.
window.PORTFOLIO = {
  links: {
    github: 'https://github.com/DaniloRCBGG',
    portfolio: 'https://danilorcbgg.github.io/Portfolio/',
    linkedin: 'https://www.linkedin.com/in/danilo-rios-cerqueira',
    email: 'danilorios67@gmail.com',
  },

  // Cada rota é um ramo da linha do tempo; cada capítulo é um commit (uma seção com esse id na página).
  // A ordem conta a história: primeiro os projetos, depois as habilidades que eles exigiram.
  routes: [
    {
      id: 'inicio', label: 'Início', branch: 'main', color: '#00a6a6', page: 'index.html', chapters: [
        { id: 'apresentacao', label: 'Apresentação' },
        { id: 'numeros', label: 'Em números' },
        { id: 'trajetoria', label: 'Trajetória' },
      ],
    },
    {
      id: 'projetos', label: 'Projetos', branch: 'feat/projetos', color: '#e8955a', page: 'index.html', chapters: [
        { id: 'gemeo', label: 'Gêmeo Digital' },
        { id: 'curly', label: 'Curly Studio' },
        { id: 'n8n', label: 'Plataforma n8n', branch: 'feat/automacao' },
        { id: 'prefect', label: 'Prefect', branch: 'feat/automacao' },
        { id: 'outros', label: 'Outros projetos' },
      ],
    },
    {
      id: 'habilidades', label: 'Habilidades', branch: 'feat/habilidades', color: '#8e6bd8', page: 'index.html', chapters: [
        { id: 'areas', label: 'Habilidades na prática' },
        { id: 'mapa', label: 'Habilidades × projetos' },
      ],
    },
    {
      id: 'contato', label: 'Contato', branch: 'release/contato', color: '#5b8fd6', page: 'index.html', chapters: [
        { id: 'contato', label: 'Fale comigo' },
      ],
    },
  ],

  // Árvore da linha do tempo: a main segue reta; os ramos saem para cima (lane negativa) ou para baixo
  branches: {
    'main': { color: '#00a6a6', lane: 0 },
    'feat/projetos': { color: '#e8955a', lane: -1, parent: 'main' },
    'feat/automacao': { color: '#e3c26b', lane: -2, parent: 'feat/projetos' },
    'feat/habilidades': { color: '#8e6bd8', lane: 1, parent: 'main' },
    'release/contato': { color: '#5b8fd6', lane: -1, parent: 'main' },
  },

  projects: [
    { id: 'gemeo', label: 'Gêmeo Digital', href: '#gemeo' },
    { id: 'curly', label: 'Curly Studio', href: '#curly' },
    { id: 'n8n', label: 'Plataforma n8n', href: '#n8n' },
    { id: 'prefect', label: 'Prefect', href: '#prefect' },
    { id: 'inspira', label: 'Inspira Design', href: '#outro-inspira' },
    { id: 'webhook', label: 'Ingestão por webhook', href: '#outro-webhook' },
    { id: 'academicos', label: 'Projetos acadêmicos', href: '#outros' },
  ],

  // Ordem de prioridade: Front-end e Full Stack, Back-end e Banco de Dados, Engenharia de Dados, GIS.
  areas: [
    {
      id: 'front-end', label: 'Front-end', icon: 'bi-window-stack',
      desc: 'Interfaces a partir do Figma, componentes reutilizáveis, rotas, estado no cliente e integração com APIs.',
      groups: [{ label: null, skills: ['React', 'Next.js', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Tailwind CSS', 'styled-components', 'Zustand'] }],
    },
    {
      id: 'full-stack', label: 'Full Stack', icon: 'bi-stack',
      desc: 'Do formulário ao banco e à publicação: login, regras de acesso, deploy automático e documentação.',
      groups: [
        { label: 'Aplicação de ponta a ponta', skills: ['Next.js', 'Supabase', 'APIs REST', 'Server-Sent Events', 'Google OAuth'] },
        { label: 'Deploy e infraestrutura', skills: ['Docker', 'Docker Compose', 'Linux', 'Nginx', 'Netlify', 'GitHub Actions', 'Git'] },
        { label: 'Testes', skills: ['Jest', 'Supertest'] },
        { label: 'Análise de sistemas', skills: ['Requisitos', 'Casos de uso', 'UML', 'Documentação'] },
      ],
    },
    {
      id: 'back-end', label: 'Back-end', icon: 'bi-hdd-network',
      desc: 'Serviços HTTP, BFF com cache e envio em tempo real, validação dos dados de entrada e webhooks.',
      groups: [{ label: null, skills: ['Node.js', 'Express', 'Python', 'FastAPI', 'Zod', 'Webhooks'] }],
    },
    {
      id: 'banco-de-dados', label: 'Banco de Dados', icon: 'bi-database',
      desc: 'Regras de acesso por perfil, gatilhos, reservas com expiração, cache e backup criptografado.',
      groups: [{ label: null, skills: ['PostgreSQL', 'SQL', 'Supabase', 'RLS', 'Redis'] }],
    },
    {
      id: 'dados', label: 'Engenharia de Dados', icon: 'bi-diagram-3',
      desc: 'Coleta, normalização e agendamento de fluxos de dados, e ingestão de eventos.',
      groups: [{ label: null, skills: ['Prefect', 'n8n', 'ETL', 'Microsoft Fabric', 'OneLake'] }],
    },
    {
      id: 'gis', label: 'GIS', icon: 'bi-globe-americas',
      desc: 'Mapa 3D da cidade com camadas, pop-ups próprios, símbolos, rótulos e filtros por período.',
      groups: [{ label: null, skills: ['ArcGIS Maps SDK for JavaScript', 'Dados geoespaciais', 'Cena 3D'] }],
    },
  ],

  // Exemplos reais: em que projeto a habilidade apareceu e o que eu fiz com ela.
  // Um terceiro item opcional é o id do bloco exato da página para onde o exemplo leva.
  examples: {
    'React': [['gemeo', 'Interface do mapa 3D: camadas, pop-ups próprios, símbolos, rótulos e filtros por período.'], ['inspira', 'Telas do Figma transformadas em componentes reutilizáveis e rotas.'], ['curly', 'Site público e painel da equipe do salão.']],
    'Next.js': [['curly', 'Site e sistema do salão no mesmo projeto, publicado no Netlify a cada envio para a main.']],
    'TypeScript': [['gemeo', 'Contrato de dados compartilhado entre o BFF e o front: a regra de estado do ônibus mora num pacote só.'], ['curly', 'Todo o código do site e do painel.'], ['inspira', 'Componentes e rotas do site do projeto.']],
    'JavaScript': [['n8n', 'Code Node que confere os quatro campos do evento antes do IF.'], ['gemeo', 'Integração com o ArcGIS Maps SDK no navegador.']],
    'HTML': [['inspira', 'Páginas montadas a partir das telas do Figma.'], ['curly', 'Site público do salão.']],
    'CSS': [['inspira', 'Consistência visual entre as páginas, junto com a equipe de design.'], ['curly', 'Visual a partir do brandbook da marca.']],
    'Zustand': [['gemeo', 'Estado da interface do mapa no React, em stores: camadas ligadas, filtros e dados recebidos por SSE.']],
    'Tailwind CSS': [['inspira', 'Estilo das páginas do site do projeto, montadas a partir das telas do Figma.']],
    'styled-components': [['gemeo', 'Todo o estilo da interface do Gêmeo: painéis, controles e pop-ups como componentes estilizados.']],
    'Supabase': [['curly', 'PostgreSQL, login com email e senha ou Google, e Storage para as fotos de antes e depois.']],
    'APIs REST': [['gemeo', 'O BFF consome as camadas do Portal ArcGIS e a MobNit, e entrega o estado para o front.'], ['gemeo', 'API da NitBike consultada a cada 30 s: endereço de cada estação e quantas bikes ela tem.', 'gemeo-nitbike'], ['webhook', 'Serviço em FastAPI que recebe ocorrências em JSON.']],
    'Server-Sent Events': [['gemeo', 'Um evento por ciclo para todos os navegadores conectados, com o Nginx ajustado para não segurar o stream.']],
    'Google OAuth': [['curly', 'Clientes entram com a conta Google, sem criar senha.']],
    'Docker': [['gemeo', 'Front, BFF e Nginx em contêineres, iguais em desenvolvimento e produção.'], ['n8n', 'n8n, PostgreSQL e Redis com healthchecks e reinício automático.']],
    'Docker Compose': [['gemeo', 'A stack inteira do Gêmeo sobe com um comando.'], ['n8n', 'Rede dedicada, volumes persistentes e rotação de logs.']],
    'Linux': [['prefect', 'Máquina dedicada ao Prefect, preparada do zero.'], ['n8n', 'VM de homologação onde a plataforma nasceu.'], ['gemeo', 'Servidores onde o Gêmeo roda para uso interno e público.']],
    'Nginx': [['gemeo', 'Proxy reverso entre os front-ends e a API, publicado por DNS, com o SSE funcionando através dele.']],
    'Netlify': [['curly', 'Deploy automático da branch main.']],
    'GitHub Actions': [['curly', 'Backup com pg_dump criptografado duas vezes por semana, guardado por 90 dias.']],
    'Git': [['gemeo', 'Monorepo com front, BFF e pacote compartilhado.'], ['curly', 'Fluxo de branches com deploy pela main.']],
    'Jest': [['gemeo', 'Testes das rotas HTTP do BFF.']],
    'Supertest': [['gemeo', 'Chamadas de teste às rotas do BFF, sem subir o servidor de verdade.']],
    'Requisitos': [['academicos', 'Requisitos da biblioteca da UFF levantados em entrevista com o chefe da biblioteca central.']],
    'Casos de uso': [['academicos', 'Casos de uso detalhados para a biblioteca, a sorveteria e o salão.']],
    'UML': [['academicos', 'Diagramas de classes, estados, atividades e sequência.']],
    'Documentação': [['gemeo', 'Documentação técnica da arquitetura, dos fluxos e da configuração.'], ['academicos', 'Documentos de escopo e requisitos.']],
    'Node.js': [['gemeo', 'BFF que roda o ciclo de 30 segundos e cruza as fontes no servidor.']],
    'Express': [['gemeo', 'Rotas do BFF, incluindo o endpoint de streaming.']],
    'Python': [['prefect', 'Fluxos de coleta e normalização rodando no Prefect.'], ['gemeo', 'Fluxos de coleta das camadas de Waze, pluviômetros e NitBike, que rodam no Prefect.'], ['webhook', 'Webhook em FastAPI que grava no OneLake.'], ['n8n', 'Testes de Code Nodes em Python.']],
    'FastAPI': [['webhook', 'Webhook que valida as ocorrências e grava os dados brutos no OneLake.']],
    'Zod': [['gemeo', 'Valida ônibus, alertas, tráfego e chuva antes de entrar no ciclo.']],
    'Webhooks': [['n8n', 'Webhook com autenticação Bearer no primeiro fluxo da plataforma.'], ['webhook', 'Entrada das ocorrências da prova de conceito.']],
    'PostgreSQL': [['curly', 'Funções de reserva com expiração e gatilho que dá baixa no estoque.'], ['n8n', 'Tabela webhook_events com os eventos válidos.']],
    'SQL': [['curly', 'Regras de negócio no banco: reservas, estoque e acesso por perfil.']],
    'RLS': [['curly', 'Cada perfil (cliente, funcionária, gerente) só vê e altera o que pode.']],
    'Redis': [['gemeo', 'Estado corrente em cache com TTL de 60 s e lock distribuído do ciclo.'], ['n8n', 'Serviço de apoio na stack da plataforma.']],
    'Prefect': [['prefect', 'Arquitetei o uso do Prefect na Prefeitura: subi na máquina os fluxos que já tínhamos e criei uma máquina dedicada para ele.'], ['gemeo', 'Ciclo de ETL que mantém vivas as camadas de Waze, pluviômetros e NitBike.']],
    'n8n': [['n8n', 'Instância própria montada por mim, hoje ferramenta interna do Escritório de Dados.']],
    'ETL': [['gemeo', 'Coleta, normalização e diferencial de três vias dos alertas, com histórico arquivado por tema.'], ['gemeo', 'NitBike: snapshots de 30 s viram saídas e entradas por estação, somadas a cada minuto numa janela dos últimos 5 min.', 'gemeo-nitbike'], ['webhook', 'Ingestão de ocorrências organizadas por ano, mês e dia.']],
    'Microsoft Fabric': [['webhook', 'Destino dos dados da prova de conceito de ingestão.']],
    'OneLake': [['webhook', 'Arquivos brutos organizados por ano, mês e dia.']],
    'ArcGIS Maps SDK for JavaScript': [['gemeo', 'SceneView 3D com camadas hospedadas e em memória, e renderer por estado do ônibus.']],
    'Dados geoespaciais': [['gemeo', 'Buffer, spatial join e áreas de pluviômetros (Voronoi) no cruzamento.']],
    'Cena 3D': [['gemeo', 'Edificações 3D a partir do LiDAR do Urbanismo.']],
  },
};

// Mesmo slug do gerador das páginas: sem acentos, minúsculo, hífens (ex.: Node.js → node-js)
window.PORTFOLIO.slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Em quais projetos cada habilidade aparece, derivado dos exemplos
window.PORTFOLIO.usage = Object.fromEntries(Object.entries(window.PORTFOLIO.examples).map(([k, v]) => [k, [...new Set(v.map((e) => e[0]))]]));
