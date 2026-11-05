// Carol Rios Curly Studio: o site da cliente e o painel da equipe numa demonstração só, com o mesmo
// estado nas duas visões. As regras seguem o sistema real (repositório Curly-Studio): reserva com sinal
// por Pix manual, "Já paguei", confirmação pela equipe, estoque em ml/g/unidades com embalagens,
// mínimo de 10% (ou à mão), produtos que não se apagam e baixa automática do consumo por serviço
// quando o atendimento é concluído. Clientes, horários e quantidades são fictícios.
(() => {
  const app = document.getElementById('cs-app');
  if (!app) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const view = document.getElementById('cs-view');
  const logEl = document.getElementById('cs-log');
  const machine = document.getElementById('cs-machine');
  const status = document.getElementById('cs-status');
  const urlEl = document.getElementById('cs-url');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------- Formatação (igual ao src/lib/estoque.ts do sistema) ---------------- */
  const num = (v, c = 2) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: c }).format(v);
  const brl = (v) => `R$ ${num(v)}`;
  const UN = { ml: 'ml', g: 'g', un: 'unidades' };
  const fmtQ = (v, u) => (u === 'un' ? `${num(v)} ${v === 1 ? 'unidade' : 'unidades'}` : v >= 1000 ? `${num(v / 1000)} ${u === 'ml' ? 'L' : 'kg'}` : `${num(v)} ${u}`);
  const emEmb = (p, v = p.estoque) => { if (p.unidade === 'un' && p.emb === 1) return ''; const q = num(v / p.emb, 1); return `${q} ${q === '1' ? 'embalagem' : 'embalagens'}`; };
  const lerNumero = (texto) => {
    let t = String(texto).trim().replace(/\s/g, '');
    if (t === '') return null;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const minimoPadrao = (v) => Math.ceil(v * 0.1);
  const situacao = (p) => (!p.ativo ? 'inativo' : p.estoque <= 0 ? 'acabou' : p.estoque <= p.minimo ? 'repor' : 'ok');
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const horaFala = (m) => (m % 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m / 60}h`);
  const durFala = (m) => (m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);

  /* ---------------- Dados de exemplo ---------------- */
  const TAM = ['P', 'M', 'G', 'GG'];
  const DIAS = [0, 1, 2].map((i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const semana = d.toLocaleDateString('pt-BR', { weekday: 'long' });
    return { i, rotulo: i === 0 ? 'hoje' : i === 1 ? 'amanhã' : semana.replace('-feira', ''), data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), semana };
  });
  const S = {
    view: 'site', tab: 'agenda', dia: 0, produto: null, consumoServ: 'tratamento', filtroRepor: false,
    servicos: [
      { id: 'corte', nome: 'Corte', dur: 90, preco: { P: 120, M: 140, G: 160, GG: 180 }, sinal: 40, obs: 'Inclui lavagem e finalização.', ativo: true },
      { id: 'tratamento', nome: 'Tratamento', dur: 90, preco: { P: 170, M: 180, G: 190, GG: 210 }, sinal: 50, obs: 'Inclui lavagem e finalização.', ativo: true },
      { id: 'sos', nome: 'SOS Recuperação', dur: 90, preco: { P: 190, M: 200, G: 210, GG: 230 }, sinal: 50, obs: '', ativo: true },
      { id: 'finalizacao', nome: 'Finalização premium', dur: 60, preco: { P: 70, M: 80, G: 100, GG: 120 }, sinal: 20, obs: '', ativo: true },
      { id: 'retoque', nome: 'Retoque de raiz', dur: 90, preco: { P: 120, M: 130, G: 140, GG: 160 }, sinal: 40, obs: '', ativo: true },
    ],
    profs: ['Carol', 'Lívia'],
    produtos: [
      { id: 'mascara', nome: 'Máscara de hidratação', unidade: 'g', emb: 1000, preco: 89.9, estoque: 1850, minimo: 185, manual: false, ativo: true },
      { id: 'creme', nome: 'Creme de pentear', unidade: 'ml', emb: 500, preco: 45, estoque: 1200, minimo: 120, manual: false, ativo: true },
      { id: 'shampoo', nome: 'Shampoo low poo', unidade: 'ml', emb: 300, preco: 38, estoque: 330, minimo: 300, manual: true, ativo: true },
      { id: 'gelatina', nome: 'Gelatina capilar', unidade: 'g', emb: 250, preco: 32, estoque: 20, minimo: 25, manual: false, ativo: true },
      { id: 'touca', nome: 'Touca térmica', unidade: 'un', emb: 1, preco: 12, estoque: 6, minimo: 5, manual: true, ativo: true },
    ],
    consumo: {
      corte: { shampoo: { P: 15, M: 25, G: 35, GG: 50 }, creme: { P: 10, M: 20, G: 30, GG: 45 } },
      tratamento: { mascara: { P: 20, M: 40, G: 60, GG: 90 }, touca: { P: 1, M: 1, G: 1, GG: 1 }, shampoo: { P: 15, M: 25, G: 35, GG: 50 } },
      sos: { mascara: { P: 30, M: 50, G: 80, GG: 110 }, touca: { P: 1, M: 1, G: 1, GG: 1 } },
      finalizacao: { creme: { P: 15, M: 25, G: 40, GG: 60 }, gelatina: { P: 10, M: 20, G: 30, GG: 45 } },
      retoque: {},
    },
    agenda: [
      { id: 1, dia: 0, ini: 9 * 60, serv: 'corte', tam: 'M', prof: 'Carol', cliente: 'Juliana', status: 'agendado', sinal: 'pago', forma: 'pix' },
      { id: 2, dia: 0, ini: 10 * 60 + 30, serv: 'tratamento', tam: 'G', prof: 'Lívia', cliente: 'Marina', status: 'aguardando_sinal', sinal: 'pendente', forma: 'pix', informou: true },
      { id: 3, dia: 0, ini: 14 * 60, serv: 'finalizacao', tam: 'GG', prof: 'Carol', cliente: 'Renata', status: 'agendado', sinal: 'pago', forma: 'presencial' },
      { id: 4, dia: 1, ini: 10 * 60, serv: 'sos', tam: 'M', prof: 'Lívia', cliente: 'Patrícia', status: 'agendado', sinal: 'pago', forma: 'pix' },
    ],
    hist: {},
    bk: { step: 0, serv: 'tratamento', tam: 'M', prof: 'Carol', dia: 1, ini: null, user: false, endereco: '', id: null, resta: 0 },
    nextId: 10,
  };
  S.produtos.forEach((p) => { S.hist[p.id] = [{ quando: 'seg 08:10', tipo: 'Estoque inicial', qtd: p.estoque, depois: p.estoque, quem: 'Carol' }]; });
  const prod = (id) => S.produtos.find((p) => p.id === id);
  const serv = (id) => S.servicos.find((s) => s.id === id);
  const agora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  /* ---------------- Registro do banco e estados ---------------- */
  const log = (fn, txt) => {
    if (!logEl) return;
    const li = document.createElement('li');
    li.innerHTML = `<time>${agora()}</time><code>${esc(fn)}</code><span>${esc(txt)}</span>`;
    logEl.prepend(li);
    while (logEl.children.length > 7) logEl.lastChild.remove();
  };
  const say = (msg) => { if (status) { status.textContent = ''; status.textContent = msg; } };
  const ESTADOS = [
    ['aguardando_sinal', 'aguardando sinal', 'horário reservado enquanto o Pix não chega'],
    ['agendado', 'agendado', 'sinal confirmado pela equipe'],
    ['concluido', 'concluído', 'atendimento feito: o estoque baixa sozinho'],
  ];
  const paintMachine = () => {
    if (!machine) return;
    const a = S.agenda.find((x) => x.id === S.bk.id);
    const st = a ? a.status : null;
    const idx = ESTADOS.findIndex((e) => e[0] === st);
    machine.innerHTML = `<div class="cs-m-head"><span class="eyebrow">O seu agendamento no banco</span>${a ? `<code>status = '${st}'</code>` : '<span class="cs-m-hint">faça uma reserva no site da cliente</span>'}</div>
      <ol class="cs-m-steps">${ESTADOS.map((e, i) => `<li class="${idx === i ? 'is-now' : idx > i ? 'is-done' : ''}"><b>${e[1]}</b><small>${e[2]}</small></li>`).join('')}</ol>
      <div class="cs-m-side ${st === 'expirado' ? 'is-now' : ''}"><b>expirado</b><small>o Pix não veio em 30 min e o horário voltou a ficar livre</small></div>`;
  };

  /* ---------------- Regras ---------------- */
  const ocupado = (dia, prof, ini, dur, ignorar) => S.agenda.some((a) => a.id !== ignorar && a.dia === dia && a.prof === prof && ['agendado', 'aguardando_sinal', 'concluido'].includes(a.status)
    && ini < a.ini + serv(a.serv).dur && a.ini < ini + dur);
  const slots = (dia, prof, dur) => {
    const out = [];
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    for (let m = 9 * 60; m + dur <= 18 * 60; m += 30) {
      const passado = dia === 0 && m < nowMin + 30;
      out.push({ m, livre: !passado && !ocupado(dia, prof, m, dur) });
    }
    return out;
  };
  // movimentar_estoque: entrada soma e recalcula o mínimo; saída não deixa ficar negativo; ajuste troca pela contagem
  const movimentar = (p, tipo, qtd, obs) => {
    let novo;
    if (tipo === 'entrada') novo = p.estoque + qtd;
    else if (tipo === 'saida') novo = p.estoque - qtd;
    else novo = qtd;
    if (novo < 0) return 'Não dá para tirar mais do que tem. Se o número não bate, faça uma contagem.';
    if (novo === p.estoque) return 'Contagem igual ao sistema: nada a registrar.';
    const delta = novo - p.estoque;
    p.estoque = Math.round(novo * 100) / 100;
    if (tipo === 'entrada' && !p.manual) p.minimo = minimoPadrao(p.estoque);
    S.hist[p.id].unshift({ quando: `hoje ${agora()}`, tipo: { entrada: 'Chegou produto', saida: 'Usei ou saiu', ajuste: 'Contagem' }[tipo], qtd: delta, depois: p.estoque, quem: 'Você', obs });
    log(`movimentar_estoque('${tipo}')`, `${p.nome}: ${delta > 0 ? '+' : ''}${fmtQ(Math.abs(delta), p.unidade).replace(/^/, delta < 0 ? '−' : '')}, fica ${fmtQ(p.estoque, p.unidade)}${tipo === 'entrada' && !p.manual ? `; mínimo recalculado: ${fmtQ(p.minimo, p.unidade)}` : ''}`);
    return null;
  };
  // gatilho baixar_estoque_do_atendimento: ao concluir, tira o consumo do serviço no tamanho do cabelo
  const concluir = (a) => {
    a.status = 'concluido';
    const t = a.tam || 'M';
    const uso = S.consumo[a.serv] || {};
    const saidas = [];
    Object.entries(uso).forEach(([pid, porTam]) => {
      const p = prod(pid);
      if (!p || !p.ativo || !porTam[t]) return;
      const q = porTam[t];
      const novo = Math.max(p.estoque - q, 0);
      const naoDava = p.estoque < q;
      if (novo === p.estoque) return;
      const delta = novo - p.estoque;
      p.estoque = novo;
      S.hist[pid].unshift({ quando: `hoje ${agora()}`, tipo: 'Baixa automática', qtd: delta, depois: novo, quem: 'Sistema', obs: `Atendimento: ${serv(a.serv).nome} (cabelo ${t})${naoDava ? ', estoque não dava: conferir' : ''}` });
      saidas.push({ p, q: -delta });
    });
    log("status = 'concluido'", saidas.length ? `gatilho tirou do estoque: ${saidas.map((x) => `${x.p.nome} −${fmtQ(x.q, x.p.unidade)}`).join(', ')}` : `${serv(a.serv).nome} não tem consumo cadastrado: nada foi descontado`);
    return saidas;
  };

  /* ---------------- Reserva da cliente: 30 min para o Pix (relógio acelerado: 1 s = 1 min) ---------------- */
  let timer = 0;
  const tickReserva = () => {
    const a = S.agenda.find((x) => x.id === S.bk.id);
    if (!a || a.status !== 'aguardando_sinal' || a.informou) { clearInterval(timer); timer = 0; return; }
    S.bk.resta -= 1;
    if (S.bk.resta <= 0) {
      a.status = 'expirado'; a.sinal = 'expirado';
      clearInterval(timer); timer = 0;
      log('expirar_reservas()', 'o Pix não veio a tempo: o horário voltou a ficar livre');
      say('O tempo do sinal acabou e o horário voltou a ficar livre.');
    }
    render(false);
  };

  /* ---------------- Visão: site da cliente ---------------- */
  const PASSOS = ['serviço', 'horário', 'entrar', 'sinal', 'pronto'];
  const siteHtml = () => {
    const b = S.bk;
    const s = serv(b.serv);
    const a = S.agenda.find((x) => x.id === b.id);
    const passos = `<ol class="cs-steps" aria-label="Etapas do agendamento">${PASSOS.map((n, i) => `<li class="${i === b.step ? 'is-now' : i < b.step ? 'is-done' : ''}"><span>${i + 1}</span>${n}</li>`).join('')}</ol>`;
    let corpo = '';
    if (b.step === 0) {
      corpo = `<h4 class="cs-title">agende seu horário</h4>
        <p class="cs-sub">Escolha o serviço e o tamanho do cabelo. O valor muda com o tamanho, como na tabela do salão.</p>
        <div class="cs-servs" role="radiogroup" aria-label="Serviço">${S.servicos.filter((x) => x.ativo).map((x) => `<button type="button" role="radio" aria-checked="${x.id === b.serv}" class="cs-serv" data-act="serv" data-id="${x.id}"><b>${x.nome}</b><span>${durFala(x.dur)} · a partir de ${brl(x.preco.P)}</span></button>`).join('')}</div>
        <div class="cs-field"><span class="cs-label">Tamanho do cabelo</span><div class="cs-seg" role="radiogroup" aria-label="Tamanho do cabelo">${TAM.map((t) => `<button type="button" role="radio" aria-checked="${t === b.tam}" data-act="tam" data-t="${t}">${t}</button>`).join('')}</div></div>
        <div class="cs-sum"><span>${s.nome} · cabelo ${b.tam} · ${durFala(s.dur)}</span><b>${brl(s.preco[b.tam])}</b><small>sinal de ${brl(s.sinal)} por Pix para garantir o horário${s.obs ? ` · ${esc(s.obs)}` : ''}</small></div>
        <div class="cs-actions"><button type="button" class="cs-btn" data-act="go" data-step="1">Escolher horário</button></div>`;
    } else if (b.step === 1) {
      const lista = slots(b.dia, b.prof, s.dur);
      corpo = `<h4 class="cs-title">quando fica bom?</h4>
        <div class="cs-field"><span class="cs-label">Com quem</span><div class="cs-seg" role="radiogroup" aria-label="Profissional">${S.profs.map((p) => `<button type="button" role="radio" aria-checked="${p === b.prof}" data-act="prof" data-p="${p}">${p}</button>`).join('')}</div></div>
        <div class="cs-field"><span class="cs-label">Dia</span><div class="cs-seg" role="radiogroup" aria-label="Dia">${DIAS.map((d) => `<button type="button" role="radio" aria-checked="${d.i === b.dia}" data-act="dia" data-d="${d.i}">${d.rotulo} <small>${d.data}</small></button>`).join('')}</div></div>
        <div class="cs-field"><span class="cs-label">Horário · ${durFala(s.dur)} de atendimento</span><div class="cs-slots">${lista.map((x) => `<button type="button" class="cs-slot" data-act="slot" data-m="${x.m}" aria-pressed="${b.ini === x.m}" ${x.livre ? '' : 'disabled'}>${hhmm(x.m)}</button>`).join('')}</div>
        ${lista.some((x) => x.livre) ? '' : '<p class="cs-sub mt-2">Nenhum horário livre neste dia. Que tal o próximo?</p>'}</div>
        <div class="cs-actions"><button type="button" class="cs-link" data-act="go" data-step="0">Voltar</button><button type="button" class="cs-btn" data-act="go" data-step="2" ${b.ini == null ? 'disabled' : ''}>Continuar</button></div>`;
    } else if (b.step === 2) {
      corpo = `<h4 class="cs-title">entre para reservar</h4>
        <p class="cs-sub">Com e-mail e senha ou com o Google. Quem entra pelo Google completa telefone e CPF na primeira vez; o CPF é exigido pelo Pix.</p>
        ${b.user ? '<div class="cs-user"><span class="cs-avatar">V</span><div><b>Você</b><small>conta Google · simulação, nada sai desta página</small></div></div>' : '<button type="button" class="cs-google" data-act="google"><i class="bi bi-google" aria-hidden="true"></i> Entrar com Google</button>'}
        <form class="cs-cep" data-form="cep" novalidate><label class="cs-label" for="cs-cep">Endereço pelo CEP</label><div class="d-flex gap-2"><input id="cs-cep" class="cs-input" inputmode="numeric" placeholder="00000-000" maxlength="9" autocomplete="postal-code"><button class="cs-link is-box" type="submit">Buscar</button></div><small class="cs-sub" id="cs-cep-out">${b.endereco ? esc(b.endereco) : 'Consulta real ao ViaCEP; opcional nesta demonstração.'}</small></form>
        <div class="cs-sum"><span>${s.nome} · cabelo ${b.tam} · ${DIAS[b.dia].rotulo}, ${horaFala(b.ini)}, com ${b.prof}</span><b>${brl(s.preco[b.tam])}</b><small>agora: sinal de ${brl(s.sinal)}; o resto no salão</small></div>
        <div class="cs-actions"><button type="button" class="cs-link" data-act="go" data-step="1">Voltar</button><button type="button" class="cs-btn" data-act="reservar" ${b.user ? '' : 'disabled'}>Reservar e pagar o sinal</button></div>`;
    } else if (b.step === 3) {
      const expirou = a && a.status === 'expirado';
      corpo = expirou ? `<h4 class="cs-title">o tempo do sinal acabou</h4><p class="cs-sub">Sem o Pix em 30 minutos, o horário voltou a ficar livre para outras clientes.</p><div class="cs-actions"><button type="button" class="cs-btn" data-act="go" data-step="1">Escolher outro horário</button></div>`
        : `<h4 class="cs-title">sinal por Pix</h4>
        <div class="cs-pix"><div class="cs-qr" aria-hidden="true"></div><div><p class="mb-1">Pague ${brl(s.sinal)} na chave do salão. ${a && a.informou ? 'Você avisou que pagou: o horário fica guardado até a equipe conferir no banco.' : 'O horário fica reservado enquanto o tempo corre.'}</p>
        ${a && a.informou ? '' : `<div class="cs-timer"><b>${String(Math.max(0, b.resta)).padStart(2, '0')}:00</b><small>restantes · relógio acelerado, 1 s = 1 min</small></div>`}<small class="cs-sub">QR ilustrativo, sem chave real.</small></div></div>
        ${a && a.informou ? `<div class="cs-wa"><i class="bi bi-whatsapp" aria-hidden="true"></i><p>Oi! Paguei o sinal de ${brl(s.sinal)} do ${s.nome}, ${DIAS[b.dia].rotulo} às ${horaFala(b.ini)}. Segue o comprovante.</p></div>
        <div class="cs-actions"><button type="button" class="cs-btn" data-act="ver-equipe">Ver como a equipe recebe</button></div>`
        : '<div class="cs-actions"><button type="button" class="cs-btn" data-act="paguei">Já paguei</button></div>'}`;
    } else {
      const ok = a && ['agendado', 'concluido'].includes(a.status);
      corpo = ok ? `<div class="cs-done"><i class="bi bi-check2-circle" aria-hidden="true"></i><h4 class="cs-title">horário marcado</h4><p>${s.nome}, ${DIAS[b.dia].semana}, ${horaFala(b.ini)}, com a ${b.prof}. Até lá!</p>${a.status === 'concluido' ? '<small class="cs-sub">Atendimento concluído. Obrigada pela visita.</small>' : '<small class="cs-sub">Em Minha conta dá para remarcar ou cancelar.</small>'}</div>
        <div class="cs-actions"><button type="button" class="cs-link" data-act="novo">Fazer outro agendamento</button></div>` : '';
    }
    return `<div class="cs-site">${passos}<div class="cs-site-body">${corpo}</div></div>`;
  };

  /* ---------------- Visão: painel da equipe ---------------- */
  const baixos = () => S.produtos.filter((p) => p.ativo && situacao(p) !== 'ok');
  const SINAL = (a) => {
    const s = serv(a.serv);
    if (a.forma === 'presencial') return `${brl(s.sinal)} sinal pago no salão`;
    if (a.status === 'expirado') return 'Pix expirado';
    if (a.sinal === 'pendente') return a.informou ? `${brl(s.sinal)} no Pix: a cliente diz que pagou, confira no banco` : `${brl(s.sinal)} aguardando a cliente pagar o Pix`;
    return `${brl(s.sinal)} sinal pago`;
  };
  const agendaHtml = () => {
    const lista = S.agenda.filter((a) => a.dia === S.dia && a.status !== 'expirado' && a.status !== 'cancelado').sort((x, y) => x.ini - y.ini);
    return `<div class="cs-p-head"><h4>agenda · ${DIAS[S.dia].semana}, ${DIAS[S.dia].data}</h4><div class="cs-seg is-small">${DIAS.map((d) => `<button type="button" aria-pressed="${d.i === S.dia}" data-act="pdia" data-d="${d.i}">${d.rotulo}</button>`).join('')}</div></div>
      ${lista.length ? `<ul class="cs-ag">${lista.map((a) => {
        const s = serv(a.serv);
        return `<li class="cs-ag-row ${a.id === S.bk.id ? 'is-yours' : ''} st-${a.status}" data-row="${a.id}">
          <div class="cs-ag-time">${hhmm(a.ini)}<small>${hhmm(a.ini + s.dur)}</small></div>
          <div class="cs-ag-info"><b>${s.nome} · cabelo ${a.tam} com ${a.prof}</b><span>${esc(a.cliente)} · ${SINAL(a)}${a.status === 'concluido' ? ' · concluído' : ''}</span></div>
          <div class="cs-ag-act">${a.status === 'aguardando_sinal' && a.informou ? `<button type="button" class="cs-btn is-sm" data-act="confirmar" data-id="${a.id}">Confirmar sinal</button>` : ''}
          ${a.status === 'agendado' ? `<button type="button" class="cs-btn is-sm" data-act="concluir" data-id="${a.id}">Concluir</button>` : ''}
          ${['agendado', 'aguardando_sinal'].includes(a.status) ? `<button type="button" class="cs-link is-sm" data-act="cancelar" data-id="${a.id}">Cancelar</button>` : ''}</div></li>`;
      }).join('')}</ul>` : '<p class="cs-sub">Nenhum atendimento neste dia.</p>'}
      <p class="cs-note">Ao concluir, o banco tira do estoque o que o serviço gasta naquele tamanho de cabelo (aba Consumo por serviço).</p>`;
  };
  const chip = (p) => { const s = situacao(p); return `<span class="cs-chip st-${s}">${{ ok: 'ok', repor: 'repor', acabou: 'acabou', inativo: 'inativo' }[s]}</span>`; };
  const estoqueHtml = () => {
    if (S.produto) return produtoHtml(prod(S.produto));
    const low = baixos();
    const lista = [...S.produtos].sort((x, y) => (y.ativo - x.ativo) || x.nome.localeCompare(y.nome)).filter((p) => !S.filtroRepor || (p.ativo && situacao(p) !== 'ok'));
    return `<div class="cs-p-head"><h4>estoque</h4><button type="button" class="cs-link is-sm" data-act="tab" data-tab="consumo">Consumo por serviço</button></div>
      ${low.length ? `<div class="cs-alert"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><span>${low.length === 1 ? `Estoque baixo: ${esc(low[0].nome)}, restam ${fmtQ(low[0].estoque, low[0].unidade)}.` : `${low.length} produtos chegaram ao mínimo.`}</span><button type="button" class="cs-link is-sm" data-act="filtro">${S.filtroRepor ? 'Ver todos' : 'Ver só esses'}</button></div>` : ''}
      <div class="cs-table-wrap"><table class="cs-table"><thead><tr><th>Produto</th><th>Em estoque</th><th>Mínimo</th><th>Situação</th></tr></thead><tbody>
      ${lista.map((p) => `<tr class="${p.ativo ? '' : 'is-off'}" data-prow="${p.id}"><td><button type="button" class="cs-plink" data-act="produto" data-id="${p.id}">${esc(p.nome)}</button></td><td>${fmtQ(p.estoque, p.unidade)}<small>${emEmb(p)}</small></td><td>${fmtQ(p.minimo, p.unidade)}${p.manual ? '<small>à mão</small>' : '<small>10%</small>'}</td><td>${chip(p)}</td></tr>`).join('')}
      </tbody></table></div>
      <details class="cs-new"><summary>cadastrar produto</summary>
        <form class="cs-form" data-form="novo" novalidate>
          <label>Nome<input class="cs-input" name="nome" required placeholder="Óleo finalizador"></label>
          <label>Medido em<select class="cs-input" name="unidade"><option value="ml">ml (líquidos)</option><option value="g">g (cremes e pós)</option><option value="un">unidades</option></select></label>
          <label>Quanto vem na embalagem<input class="cs-input" name="emb" inputmode="decimal" placeholder="100"></label>
          <label>Quanto já tem no salão (embalagens)<input class="cs-input" name="ini" inputmode="decimal" placeholder="2"></label>
          <div class="cs-actions"><button type="submit" class="cs-btn">Cadastrar produto</button></div>
          <small class="cs-sub" data-msg></small>
        </form></details>`;
  };
  const produtoHtml = (p) => {
    const quadro = (tipo, titulo, botao, ajuda) => `<form class="cs-box" data-form="mov" data-tipo="${tipo}" novalidate><b>${titulo}</b><small>${ajuda}</small>
      <div class="d-flex gap-2"><input class="cs-input" name="q" inputmode="decimal" placeholder="0" aria-label="Quantidade">${p.unidade === 'un' && p.emb === 1 ? '<input type="hidden" name="em" value="un">' : `<select class="cs-input is-unit" name="em" aria-label="Medida"><option value="emb">embalagens</option><option value="un">${UN[p.unidade]}</option></select>`}</div>
      <button type="submit" class="cs-link is-box">${botao}</button></form>`;
    return `<div class="cs-p-head"><button type="button" class="cs-link is-sm" data-act="voltar-estoque"><i class="bi bi-arrow-left" aria-hidden="true"></i> Estoque</button></div>
      <div class="cs-prod-top"><div><h4>${esc(p.nome)}</h4><small>${p.unidade === 'un' && p.emb === 1 ? 'avulso' : `embalagem de ${fmtQ(p.emb, p.unidade)}`}${p.preco ? ` · ${brl(p.preco)}` : ''}</small></div><div class="cs-prod-qty"><b>${fmtQ(p.estoque, p.unidade)}</b><small>${emEmb(p)}</small>${chip(p)}</div></div>
      <div class="cs-boxes">${quadro('entrada', 'Chegou produto', 'Registrar entrada', 'soma e recalcula o mínimo')}${quadro('saida', 'Usei ou saiu', 'Registrar saída', 'uso, perda ou vencido')}${quadro('ajuste', 'Contei o estoque', 'Salvar contagem', 'troca pelo total contado')}</div>
      <small class="cs-sub" data-msg></small>
      <div class="cs-table-wrap mt-2"><table class="cs-table is-hist"><thead><tr><th>Quando</th><th>Movimento</th><th>Quantidade</th><th>Fica</th></tr></thead><tbody>
      ${S.hist[p.id].slice(0, 6).map((h) => `<tr><td>${h.quando}<small>${h.quem}</small></td><td>${h.tipo}${h.obs ? `<small>${esc(h.obs)}</small>` : ''}</td><td class="${h.qtd < 0 ? 'is-out' : 'is-in'}">${h.qtd > 0 && h.tipo !== 'Estoque inicial' ? '+' : h.qtd < 0 ? '−' : ''}${fmtQ(Math.abs(h.qtd), p.unidade)}</td><td>${fmtQ(h.depois, p.unidade)}</td></tr>`).join('')}
      </tbody></table></div>
      <details class="cs-new"><summary>editar produto</summary><form class="cs-form" data-form="editar" novalidate>
        <label class="cs-check"><input type="checkbox" name="manual" ${p.manual ? 'checked' : ''}> Definir o mínimo à mão</label>
        <label>Mínimo (${UN[p.unidade]})<input class="cs-input" name="minimo" inputmode="decimal" value="${num(p.minimo)}"></label>
        <label class="cs-check"><input type="checkbox" name="ativo" ${p.ativo ? 'checked' : ''}> Ativo <small>(o sistema não apaga produtos: desativar guarda o histórico)</small></label>
        <div class="cs-actions"><button type="submit" class="cs-btn">Salvar</button></div></form></details>`;
  };
  const consumoHtml = () => {
    const s = serv(S.consumoServ);
    const uso = S.consumo[s.id] || {};
    const ligados = Object.keys(uso).map(prod).filter(Boolean);
    const livres = S.produtos.filter((p) => p.ativo && !uso[p.id]);
    const tPrev = S.bk.tam || 'G';
    return `<div class="cs-p-head"><h4>consumo por serviço</h4><button type="button" class="cs-link is-sm" data-act="tab" data-tab="estoque">Voltar ao estoque</button></div>
      <p class="cs-sub">Quanto cada serviço gasta de cada produto, por tamanho de cabelo. Quando um atendimento é concluído, o banco tira essas quantidades do estoque sozinho. Sem tamanho, vale a coluna M.</p>
      <div class="cs-seg is-wrap" role="radiogroup" aria-label="Serviço">${S.servicos.map((x) => `<button type="button" role="radio" aria-checked="${x.id === s.id}" data-act="cserv" data-id="${x.id}">${x.nome}<small>${Object.keys(S.consumo[x.id] || {}).length || 'nenhum'} ${Object.keys(S.consumo[x.id] || {}).length === 1 ? 'produto' : 'produtos'}</small></button>`).join('')}</div>
      <form class="cs-form is-grid" data-form="consumo" novalidate>
        <div class="cs-table-wrap"><table class="cs-table is-matrix"><thead><tr><th>Produto</th>${TAM.map((t) => `<th>Cabelo ${t}</th>`).join('')}</tr></thead><tbody>
        ${ligados.map((p) => `<tr><td>${esc(p.nome)} <small>(${UN[p.unidade]})</small></td>${TAM.map((t) => `<td><input class="cs-input is-cell" name="${p.id}:${t}" inputmode="decimal" value="${uso[p.id][t] ?? ''}" aria-label="${p.nome}, cabelo ${t}"></td>`).join('')}</tr>`).join('')}
        ${livres.length ? `<tr class="is-add"><td><select class="cs-input" name="novo" aria-label="Adicionar produto"><option value="">Adicionar produto…</option>${livres.map((p) => `<option value="${p.id}">${esc(p.nome)} (${UN[p.unidade]})</option>`).join('')}</select></td>${TAM.map((t) => `<td><input class="cs-input is-cell" name="novo:${t}" inputmode="decimal" aria-label="Novo produto, cabelo ${t}"></td>`).join('')}</tr>` : ''}
        </tbody></table></div>
        <p class="cs-note">${ligados.length ? `Concluir um ${s.nome} em cabelo ${tPrev} tira: ${ligados.map((p) => `${p.nome} ${fmtQ(uso[p.id][tPrev] || 0, p.unidade)}`).join(', ')}.` : 'Nenhum produto informado: concluir este serviço não desconta nada.'} Para tirar um produto do serviço, apague os números dele.</p>
        <div class="cs-actions"><button type="submit" class="cs-btn">Salvar consumo</button></div><small class="cs-sub" data-msg></small>
      </form>`;
  };
  const servicosHtml = () => `<div class="cs-p-head"><h4>serviços e valores</h4></div>
    <p class="cs-sub">A lista do banco é a única fonte: a home, a aba Valores e o agendamento leem daqui.</p>
    <form class="cs-form" data-form="servicos" novalidate><div class="cs-table-wrap"><table class="cs-table is-matrix"><thead><tr><th>Serviço</th>${TAM.map((t) => `<th>${t}</th>`).join('')}<th>Sinal</th><th>Ativo</th></tr></thead><tbody>
    ${S.servicos.map((s) => `<tr><td>${s.nome}<small>${durFala(s.dur)}</small></td>${TAM.map((t) => `<td><input class="cs-input is-cell" name="${s.id}:${t}" inputmode="decimal" value="${num(s.preco[t])}" aria-label="${s.nome}, cabelo ${t}"></td>`).join('')}<td><input class="cs-input is-cell" name="${s.id}:sinal" inputmode="decimal" value="${num(s.sinal)}" aria-label="Sinal de ${s.nome}"></td><td><input type="checkbox" name="${s.id}:ativo" ${s.ativo ? 'checked' : ''} aria-label="${s.nome} ativo"></td></tr>`).join('')}
    </tbody></table></div><div class="cs-actions"><button type="submit" class="cs-btn">Salvar valores</button></div><small class="cs-sub" data-msg></small></form>`;
  const equipeHtml = () => {
    const n = baixos().length;
    const TABS = [['agenda', 'Agenda', 'bi-calendar3'], ['estoque', 'Estoque', 'bi-box-seam'], ['consumo', 'Consumo por serviço', 'bi-diagram-2'], ['servicos', 'Serviços e valores', 'bi-tags']];
    const body = { agenda: agendaHtml, estoque: estoqueHtml, consumo: consumoHtml, servicos: servicosHtml }[S.tab]();
    return `<div class="cs-panel"><nav class="cs-menu" aria-label="Painel da equipe">${TABS.map(([id, nome, ic]) => `<button type="button" data-act="tab" data-tab="${id}" aria-current="${S.tab === id ? 'page' : 'false'}"><i class="bi ${ic}" aria-hidden="true"></i><span>${nome}</span>${id === 'estoque' && n ? `<em class="cs-badge">${n}</em>` : ''}</button>`).join('')}</nav><div class="cs-p-body">${body}</div></div>`;
  };

  /* ---------------- Desenho ---------------- */
  const URLS = { site: ['/agendar', '/agendar', '/entrar', '/agendar/pagamento', '/minha-conta'], equipe: { agenda: '/equipe', estoque: '/equipe/estoque', consumo: '/equipe/estoque/consumo', servicos: '/equipe/servicos' } };
  function render(anim = true) {
    view.innerHTML = S.view === 'site' ? siteHtml() : equipeHtml();
    app.querySelectorAll('.cs-switch [data-view]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === S.view)));
    const top = document.getElementById('cs-badge-top');
    const n = baixos().length;
    if (top) { top.hidden = !n; top.textContent = n; }
    if (urlEl) urlEl.textContent = `curlystudio.netlify.app${S.view === 'site' ? URLS.site[S.bk.step] : S.produto && S.tab === 'estoque' ? `/equipe/estoque/${S.produto}` : URLS.equipe[S.tab]}`;
    paintMachine();
    if (anim && !reduce && window.gsap) gsap.fromTo(view.firstElementChild, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'all' });
  }
  const flash = (sel) => { if (reduce) return; view.querySelectorAll(sel).forEach((el) => { el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash'); }); };
  const msg = (form, t, ok) => { const m = form.querySelector('[data-msg]') || view.querySelector('[data-msg]'); if (m) { m.textContent = t; m.className = `cs-sub ${ok ? 'is-ok' : 'is-err'}`; } say(t); };

  /* ---------------- Ações ---------------- */
  app.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act], [data-view]');
    if (!t || t.disabled) return;
    if (t.dataset.view) { S.view = t.dataset.view; render(); return; }
    const b = S.bk;
    const act = t.dataset.act;
    switch (act) {
      case 'serv': b.serv = t.dataset.id; b.ini = null; break;
      case 'tam': b.tam = t.dataset.t; break;
      case 'prof': b.prof = t.dataset.p; b.ini = null; break;
      case 'dia': b.dia = +t.dataset.d; b.ini = null; break;
      case 'slot': b.ini = +t.dataset.m; break;
      case 'go': b.step = +t.dataset.step; break;
      case 'google': b.user = true; log('auth: Google', 'conta da cliente criada; ficha ligada só com e-mail confirmado'); break;
      case 'reservar': {
        const s = serv(b.serv);
        if (ocupado(b.dia, b.prof, b.ini, s.dur)) { say('Esse horário acabou de ser ocupado. Escolha outro.'); b.step = 1; b.ini = null; break; }
        const a = { id: S.nextId++, dia: b.dia, ini: b.ini, serv: b.serv, tam: b.tam, prof: b.prof, cliente: 'Você', status: 'aguardando_sinal', sinal: 'pendente', forma: 'pix', informou: false };
        S.agenda.push(a);
        b.id = a.id; b.step = 3; b.resta = 30;
        log('reservar_horario()', `${s.nome}, cabelo ${b.tam}, ${hhmm(b.ini)} com ${b.prof}: aguardando_sinal por 30 min`);
        clearInterval(timer); timer = reduce ? 0 : setInterval(tickReserva, 1000);
        break;
      }
      case 'paguei': {
        const a = S.agenda.find((x) => x.id === b.id);
        if (a) { a.informou = true; log('informar_pagamento()', 'a cliente avisou: o horário fica guardado até a equipe conferir'); }
        clearInterval(timer); timer = 0;
        break;
      }
      case 'ver-equipe': S.view = 'equipe'; S.tab = 'agenda'; S.dia = b.dia; render(); flash('.is-yours'); return;
      case 'novo': S.bk = { step: 0, serv: 'tratamento', tam: 'M', prof: 'Carol', dia: 1, ini: null, user: b.user, endereco: b.endereco, id: null, resta: 0 }; break;
      case 'tab': S.tab = t.dataset.tab; S.produto = null; break;
      case 'pdia': S.dia = +t.dataset.d; break;
      case 'confirmar': {
        const a = S.agenda.find((x) => x.id === +t.dataset.id);
        a.status = 'agendado'; a.sinal = 'pago';
        log('confirmar_sinal_manual()', `sinal ${a.id === b.id ? 'da sua reserva' : `de ${a.cliente}`} conferido no banco: agendado`);
        if (a.id === b.id) b.step = 4;
        say(a.id === b.id ? 'Sinal confirmado: a sua reserva está agendada.' : `Sinal confirmado: ${a.cliente} está agendada.`);
        break;
      }
      case 'concluir': {
        const a = S.agenda.find((x) => x.id === +t.dataset.id);
        const saidas = concluir(a);
        say(saidas.length ? `Concluído. Saiu do estoque: ${saidas.map((x) => `${x.p.nome}, ${fmtQ(x.q, x.p.unidade)}`).join('; ')}.` : 'Concluído. Este serviço não tem consumo cadastrado.');
        render(); flash(`[data-row="${a.id}"]`);
        const n = baixos().length;
        if (n) { const bd = app.querySelector('.cs-menu .cs-badge'); if (bd && !reduce) { bd.classList.remove('is-pop'); void bd.offsetWidth; bd.classList.add('is-pop'); } }
        return;
      }
      case 'cancelar': {
        const a = S.agenda.find((x) => x.id === +t.dataset.id);
        a.status = 'cancelado';
        log('cancelar', `${a.cliente}: horário liberado`);
        if (a.id === b.id) { b.step = 0; b.id = null; clearInterval(timer); timer = 0; }
        break;
      }
      case 'produto': S.produto = t.dataset.id; break;
      case 'voltar-estoque': S.produto = null; break;
      case 'filtro': S.filtroRepor = !S.filtroRepor; break;
      case 'cserv': S.consumoServ = t.dataset.id; break;
      default: return;
    }
    render(!['serv', 'tam', 'prof', 'dia', 'slot', 'pdia', 'filtro'].includes(act));
  });

  app.addEventListener('submit', async (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const kind = f.dataset.form;
    const fd = new FormData(f);
    if (kind === 'cep') {
      const out = f.querySelector('#cs-cep-out');
      const cep = String(fd.get('') || f.querySelector('input').value).replace(/\D/g, '');
      if (cep.length !== 8) { out.textContent = 'Faltam números no CEP. São 8.'; return; }
      out.textContent = 'Consultando o ViaCEP…';
      try {
        const d = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json();
        if (d.erro) { out.textContent = 'Não achamos esse CEP. Confira os números.'; return; }
        S.bk.endereco = `${d.logradouro || 'Endereço'}, ${d.bairro || ''} · ${d.localidade}/${d.uf}`;
        out.textContent = S.bk.endereco;
        log('ViaCEP', `${d.localidade}/${d.uf}: endereço preenchido`);
      } catch (err) { out.textContent = 'O ViaCEP não respondeu agora. Dá para seguir sem o endereço.'; }
      return;
    }
    if (kind === 'mov') {
      const p = prod(S.produto);
      const q = lerNumero(fd.get('q'));
      if (q == null || q < 0 || (f.dataset.tipo !== 'ajuste' && q === 0)) { msg(f, 'Escreva a quantidade.', false); return; }
      const total = fd.get('em') === 'emb' ? Math.round(q * p.emb * 100) / 100 : q;
      const erro = movimentar(p, f.dataset.tipo, total, '');
      if (erro) { msg(f, erro, false); return; }
      render(false); flash('.cs-prod-qty');
      msg(view, 'Salvo.', true);
      return;
    }
    if (kind === 'novo') {
      const nome = String(fd.get('nome') || '').trim();
      const unidade = fd.get('unidade');
      const emb = lerNumero(fd.get('emb')) || (unidade === 'un' ? 1 : null);
      const ini = lerNumero(fd.get('ini')) || 0;
      if (!nome) { msg(f, 'Falta o nome do produto.', false); return; }
      if (!emb || emb <= 0) { msg(f, 'Falta quanto vem na embalagem.', false); return; }
      const id = `p${S.nextId++}`;
      const estoque = Math.round(ini * emb * 100) / 100;
      S.produtos.push({ id, nome, unidade, emb, preco: 0, estoque, minimo: minimoPadrao(estoque), manual: false, ativo: true });
      S.hist[id] = [{ quando: `hoje ${agora()}`, tipo: 'Estoque inicial', qtd: estoque, depois: estoque, quem: 'Você' }];
      log('insert into produtos', `${nome}: ${fmtQ(estoque, unidade)}, mínimo ${fmtQ(minimoPadrao(estoque), unidade)}`);
      S.produto = id;
      render(); say(`${nome} cadastrado.`);
      return;
    }
    if (kind === 'editar') {
      const p = prod(S.produto);
      p.manual = !!fd.get('manual');
      const m = lerNumero(fd.get('minimo'));
      p.minimo = p.manual && m != null ? m : minimoPadrao(p.estoque);
      p.ativo = !!fd.get('ativo');
      log('update produtos', `${p.nome}: mínimo ${p.manual ? 'à mão' : '10%'} (${fmtQ(p.minimo, p.unidade)}), ${p.ativo ? 'ativo' : 'desativado'}`);
      render(false); msg(view, 'Salvo.', true);
      return;
    }
    if (kind === 'consumo') {
      const s = serv(S.consumoServ);
      const uso = {};
      const novo = fd.get('novo');
      for (const [k, v] of fd.entries()) {
        if (k === 'novo' || !v) continue;
        let [pid, tam] = k.split(':');
        if (pid === 'novo') { if (!novo) continue; pid = novo; }
        const n = lerNumero(v);
        if (n == null || n <= 0) continue;
        (uso[pid] || (uso[pid] = {}))[tam] = n;
      }
      // Gasto igual em todos os tamanhos: quem preencheu só uma coluna vê o mesmo número nas outras
      Object.values(uso).forEach((porTam) => { const vals = Object.values(porTam); if (vals.length === 1) TAM.forEach((t) => { porTam[t] = vals[0]; }); });
      S.consumo[s.id] = uso;
      log('consumo_servico', `${s.nome}: ${Object.keys(uso).length} ${Object.keys(uso).length === 1 ? 'produto' : 'produtos'} por tamanho de cabelo`);
      render(false); msg(view, 'Salvo. Vale para os próximos atendimentos; os já concluídos não mudam.', true);
      return;
    }
    if (kind === 'servicos') {
      S.servicos.forEach((s) => {
        TAM.forEach((t) => { const v = lerNumero(fd.get(`${s.id}:${t}`)); if (v != null && v >= 0) s.preco[t] = v; });
        const sinal = lerNumero(fd.get(`${s.id}:sinal`)); if (sinal != null && sinal > 0) s.sinal = sinal;
        s.ativo = !!fd.get(`${s.id}:ativo`);
      });
      if (!serv(S.bk.serv).ativo) { const first = S.servicos.find((s) => s.ativo); if (first) S.bk.serv = first.id; }
      log('update servicos', 'valores por tamanho salvos: o site já mostra os novos');
      render(false); msg(view, 'Salvo. O site da cliente já mostra os valores novos.', true);
    }
  });
  // Máscara do CEP
  app.addEventListener('input', (e) => {
    if (e.target.id !== 'cs-cep') return;
    const v = e.target.value.replace(/\D/g, '').slice(0, 8);
    e.target.value = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
  });

  render(false);
  log('demonstração', 'dados fictícios; as regras são as do sistema do salão');
})();
