// Fonte única do conteúdo compartilhado entre as páginas: rotas da linha do tempo,
// habilidades e em quais projetos cada uma aparece.
window.PORTFOLIO = {
  links: {
    github: 'https://github.com/DaniloRCBGG',
    portfolio: 'https://danilorcbgg.github.io/Portfolio/',
    linkedin: 'https://www.linkedin.com/in/danilo-rios-cerqueira',
    email: 'danilorios67@gmail.com',
  },

  // Cada rota é um trecho da linha do tempo; cada capítulo é uma seção com esse id na página.
  routes: [
    {
      id: 'inicio', label: 'Início', page: 'index.html', chapters: [
        { id: 'apresentacao', label: 'Apresentação' },
        { id: 'numeros', label: 'Em números' },
        { id: 'trajetoria', label: 'Trajetória' },
      ],
    },
    {
      id: 'habilidades', label: 'Habilidades', page: 'habilidades.html', chapters: [
        { id: 'areas', label: 'Áreas' },
        { id: 'mapa', label: 'Habilidades × projetos' },
      ],
    },
    {
      id: 'projetos', label: 'Projetos', page: 'projetos.html', chapters: [
        { id: 'gemeo', label: 'Gêmeo Digital' },
        { id: 'curly', label: 'Curly Studio' },
        { id: 'n8n', label: 'Plataforma n8n' },
        { id: 'outros', label: 'Outros projetos' },
      ],
    },
    {
      id: 'contato', label: 'Contato', page: 'contato.html', chapters: [
        { id: 'contato', label: 'Fale comigo' },
      ],
    },
  ],

  projects: [
    { id: 'gemeo', label: 'Gêmeo Digital' },
    { id: 'curly', label: 'Curly Studio' },
    { id: 'n8n', label: 'Plataforma n8n' },
    { id: 'inspira', label: 'Inspira Design' },
    { id: 'webhook', label: 'Ingestão por webhook' },
    { id: 'academicos', label: 'Projetos acadêmicos' },
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

  // Em quais projetos do portfólio cada habilidade aparece.
  usage: {
    'React': ['gemeo', 'curly', 'inspira'],
    'Next.js': ['curly'],
    'TypeScript': ['gemeo', 'curly', 'inspira'],
    'JavaScript': ['gemeo', 'n8n'],
    'HTML': ['gemeo', 'curly', 'inspira'],
    'CSS': ['gemeo', 'curly', 'inspira'],
    'Zustand': ['gemeo'],
    'Supabase': ['curly'],
    'APIs REST': ['gemeo', 'webhook'],
    'Server-Sent Events': ['gemeo'],
    'Google OAuth': ['curly'],
    'Docker': ['gemeo', 'n8n'],
    'Docker Compose': ['gemeo', 'n8n'],
    'Linux': ['gemeo', 'n8n'],
    'Nginx': ['gemeo'],
    'Netlify': ['curly'],
    'GitHub Actions': ['curly'],
    'Git': ['gemeo', 'curly', 'n8n'],
    'Jest': ['gemeo'],
    'Supertest': ['gemeo'],
    'Requisitos': ['academicos'],
    'Casos de uso': ['academicos'],
    'UML': ['academicos'],
    'Documentação': ['gemeo', 'academicos'],
    'Node.js': ['gemeo'],
    'Express': ['gemeo'],
    'Python': ['gemeo', 'n8n', 'webhook'],
    'FastAPI': ['webhook'],
    'Zod': ['gemeo'],
    'Webhooks': ['n8n', 'webhook'],
    'PostgreSQL': ['curly', 'n8n'],
    'SQL': ['curly', 'n8n'],
    'RLS': ['curly'],
    'Redis': ['gemeo', 'n8n'],
    'Prefect': ['gemeo'],
    'n8n': ['n8n'],
    'ETL': ['gemeo', 'webhook'],
    'Microsoft Fabric': ['webhook'],
    'OneLake': ['webhook'],
    'ArcGIS Maps SDK for JavaScript': ['gemeo'],
    'Dados geoespaciais': ['gemeo'],
    'Cena 3D': ['gemeo'],
  },
};
