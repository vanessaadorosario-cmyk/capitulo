// ========= 1) CONFIGURAÇÃO DOS ATIVOS (baseado na sua planilha) =========

const LIMITE_PADRAO_ALTA = 0.001;   // 0,1%
const LIMITE_PADRAO_QUEDA = -0.001;
const LIMITE_VX_ALTA = 0.005;
const LIMITE_VX_QUEDA = -0.005;
const LIMITE_MINERIO_ALTA = 0.03;   // 3%
const LIMITE_MINERIO_QUEDA = -0.03;

// Threshold do score para ALTA / BAIXA do Dólar
const SCORE_ALTA = 5;
const SCORE_BAIXA = -5;

const STORAGE_KEY_SHEET_URL = "capitulo.googleSheetsCsvUrl";
const SHEET_REFRESH_MS = 300000;
const MARKET_HISTORY_KEY = "capitulo.marketHistory";
const MARKET_HISTORY_MAX = 72;

// Lista de ativos que você usa no checklist
let ativos = [
  // ---- RISCO ----
  { codigo: "VALE.K",  nome: "Vale SA ADR",                             tipo: "risco",     limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "PBR",     nome: "Petrobras ADR",                           tipo: "risco",     limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "EWZ",     nome: "iShares MSCI Brazil ETF",                 tipo: "risco",     limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "XLF",     nome: "Financial Select Sector SPDR",            tipo: "risco",     limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "XLP",     nome: "Consumer Staples Select Sector SPDR",     tipo: "risco",     limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "XLE",     nome: "Energy Select Sector SPDR",               tipo: "risco",     limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "XME",     nome: "SPDR S&P Metals & Mining",                tipo: "risco",     limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "EEM",     nome: "iShares MSCI Emerging Markets",           tipo: "risco",     limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "SOXX.O",  nome: "iShares Semiconductor ETF",               tipo: "risco",     limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: ".BSESN",  nome: "BSE Sensex 30",                           tipo: "risco",     limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "CHINA",   nome: "Bolsas China",                            tipo: "risco",     limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },

  // ---- SEGURANÇA ----
  { codigo: "DX",      nome: "Índice Dólar Futuros",                    tipo: "seguranca", limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "VX",      nome: "S&P 500 VIX Futuros",                     tipo: "seguranca", limiteAlta: LIMITE_VX_ALTA,     limiteQueda: LIMITE_VX_QUEDA,     variacao: 0 },
  { codigo: "USD/MXN", nome: "USD/MXN",                                 tipo: "seguranca", limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "USD/NOK", nome: "USD/NOK",                                 tipo: "seguranca", limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "USD/NZD", nome: "USD/NZD",                                 tipo: "seguranca", limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "USD/AUD", nome: "USD/AUD",                                 tipo: "seguranca", limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "USD/KRW", nome: "USD/KRW",                                 tipo: "seguranca", limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "USD/CNY", nome: "USD/CNY",                                 tipo: "seguranca", limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },
  { codigo: "EUR/BRL", nome: "EUR/BRL",                                 tipo: "seguranca", limiteAlta: LIMITE_PADRAO_ALTA, limiteQueda: LIMITE_PADRAO_QUEDA, variacao: 0 },

  // Minério (via Sina)
  { codigo: "MINERIO_SINA", nome: "Minério de Ferro (Sina I0)",         tipo: "risco",     limiteAlta: LIMITE_MINERIO_ALTA, limiteQueda: LIMITE_MINERIO_QUEDA, variacao: 0 }
];

function normalizarTexto(valor) {
  return String(valor ?? "").trim().toLowerCase();
}

function parseNumeroFlexible(valor) {
  if (valor == null) return null;
  const texto = String(valor).trim().replace(/\s+/g, "").replace(/%/g, "").replace(",", ".");
  if (!texto) return null;
  const numero = parseFloat(texto);
  return isNaN(numero) ? null : numero;
}

function detectarDelimitadorCSV(texto) {
  const primeiraLinha = String(texto).split(/\r?\n/, 1)[0] || "";
  const candidatos = [",", ";", "\t"];
  let melhor = ",";
  let melhorContagem = -1;

  for (const candidato of candidatos) {
    let contagem = 0;
    let dentroAspas = false;
    for (let i = 0; i < primeiraLinha.length; i++) {
      const char = primeiraLinha[i];
      if (char === '"') dentroAspas = !dentroAspas;
      else if (!dentroAspas && char === candidato) contagem++;
    }
    if (contagem > melhorContagem) {
      melhorContagem = contagem;
      melhor = candidato;
    }
  }

  return melhor;
}

function parseDelimitedText(texto, delimitador) {
  const linhas = [];
  let linha = [];
  let campo = "";
  let dentroAspas = false;

  const pushCampo = () => {
    linha.push(campo);
    campo = "";
  };

  const pushLinha = () => {
    pushCampo();
    linhas.push(linha);
    linha = [];
  };

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const nextChar = texto[i + 1];

    if (char === '"') {
      if (dentroAspas && nextChar === '"') {
        campo += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
      continue;
    }

    if (!dentroAspas && char === delimitador) {
      pushCampo();
      continue;
    }

    if (!dentroAspas && char === "\n") {
      pushLinha();
      continue;
    }

    if (char !== "\r") campo += char;
  }

  if (campo.length > 0 || linha.length > 0) {
    pushLinha();
  }

  return linhas.filter(row => row.some(value => String(value).trim() !== ""));
}

function csvParaObjetos(texto) {
  const delimitador = detectarDelimitadorCSV(texto);
  const linhas = parseDelimitedText(texto, delimitador);
  if (linhas.length === 0) return [];

  const cabecalhos = linhas[0].map(valor => normalizarTexto(valor));
  const dados = [];

  for (const linha of linhas.slice(1)) {
    const objeto = {};
    cabecalhos.forEach((cabecalho, indice) => {
      objeto[cabecalho] = linha[indice] ?? "";
    });
    dados.push(objeto);
  }

  return dados;
}

function obterCampoLinha(objeto, nomes) {
  for (const nome of nomes) {
    if (Object.prototype.hasOwnProperty.call(objeto, nome) && String(objeto[nome]).trim() !== "") {
      return objeto[nome];
    }
  }
  return null;
}

function setSheetStatus(texto, tipo = "neutral") {
  const el = document.getElementById("sheet-status");
  if (!el) return;
  el.textContent = texto;
  el.classList.remove("tag-up", "tag-down", "tag-neutral");
  if (tipo === "up") el.classList.add("tag-up");
  else if (tipo === "down") el.classList.add("tag-down");
  else el.classList.add("tag-neutral");
}

function getSheetUrl() {
  const input = document.getElementById("sheet-url");
  return input ? input.value.trim() : "";
}

function setSheetUrl(valor) {
  const input = document.getElementById("sheet-url");
  if (input) input.value = valor;
}

function salvarSheetUrl(valor) {
  localStorage.setItem(STORAGE_KEY_SHEET_URL, valor);
  const url = new URL(window.location.href);
  if (valor) url.searchParams.set("sheet", valor);
  else url.searchParams.delete("sheet");
  window.history.replaceState({}, "", url.toString());
}

function carregarSheetUrlInicial() {
  const url = new URL(window.location.href);
  const urlDaQuery = url.searchParams.get("sheet");
  const urlSalva = localStorage.getItem(STORAGE_KEY_SHEET_URL) || "";
  const urlInicial = urlDaQuery || urlSalva;
  if (urlInicial) setSheetUrl(urlInicial);
  return urlInicial;
}

function formatarHorario(timestamp) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function carregarHistoricoMercado() {
  try {
    const bruto = localStorage.getItem(MARKET_HISTORY_KEY);
    const dados = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function salvarHistoricoMercado(history) {
  localStorage.setItem(MARKET_HISTORY_KEY, JSON.stringify(history));
}

function calcularLeituraMercado(stats) {
  const otimismo = stats.riscoAlta + stats.segurQueda;
  const pessimismo = stats.riscoQueda + stats.segurAlta;
  const neutro = stats.neutros;
  const acumulado = stats.score;
  const direcao = otimismo > pessimismo ? "OTIMISMO" : pessimismo > otimismo ? "PESSIMISMO" : "NEUTRO";

  return { otimismo, pessimismo, neutro, acumulado, direcao };
}

function registrarSnapshotMercado(stats, origem = "manual") {
  const leitura = calcularLeituraMercado(stats);
  const history = carregarHistoricoMercado();
  const snapshot = {
    ts: Date.now(),
    origem,
    ...leitura
  };

  const last = history[history.length - 1];
  const sameBucket = last && Math.floor(last.ts / SHEET_REFRESH_MS) === Math.floor(snapshot.ts / SHEET_REFRESH_MS);
  const sameValues =
    last &&
    last.otimismo === snapshot.otimismo &&
    last.pessimismo === snapshot.pessimismo &&
    last.neutro === snapshot.neutro &&
    last.acumulado === snapshot.acumulado &&
    last.direcao === snapshot.direcao;

  if (last && sameBucket && sameValues) {
    history[history.length - 1] = snapshot;
  } else {
    history.push(snapshot);
  }

  while (history.length > MARKET_HISTORY_MAX) history.shift();
  salvarHistoricoMercado(history);
  return snapshot;
}

function determinarViradaMercado(history, snapshot) {
  const previous = history[history.length - 2] || history[history.length - 1];
  if (!previous) {
    return "Primeira leitura do mercado.";
  }

  if (snapshot.direcao !== previous.direcao && snapshot.direcao !== "NEUTRO" && previous.direcao !== "NEUTRO") {
    return `Virada: ${previous.direcao} → ${snapshot.direcao}`;
  }

  if (snapshot.direcao === "NEUTRO") {
    return "Mercado em indecisão; as linhas ainda não definiram direção.";
  }

  return snapshot.direcao === "OTIMISMO"
    ? "Otimismo confirmado: dólar cai e risco sobe."
    : "Pessimismo confirmado: dólar sobe e risco cai.";
}

function prepararCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(300, Math.floor(rect.width || canvas.clientWidth || 300));
  const height = Math.max(260, Math.floor(rect.height || canvas.clientHeight || 300));
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function renderDirecionalMercado(history, snapshot) {
  const canvas = document.getElementById("market-chart");
  if (!canvas) return;

  const { ctx, width, height } = prepararCanvas(canvas);
  const points = history.length ? history : snapshot ? [snapshot] : [];
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, width, height);

  if (!points.length) return;

  const padding = { top: 18, right: 18, bottom: 34, left: 48 };
  const plot = {
    x: padding.left,
    y: padding.top,
    w: width - padding.left - padding.right,
    h: height - padding.top - padding.bottom
  };

  const minValue = Math.min(0, ...points.flatMap(p => [p.otimismo, p.pessimismo, p.neutro, p.acumulado]));
  const maxValue = Math.max(6, ...points.flatMap(p => [p.otimismo, p.pessimismo, p.neutro, p.acumulado]));
  const range = Math.max(1, maxValue - minValue);
  const scaleY = value => plot.y + plot.h - ((value - minValue) / range) * plot.h;
  const scaleX = index =>
    points.length === 1
      ? plot.x + plot.w / 2
      : plot.x + (index / (points.length - 1)) * plot.w;

  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "rgba(229, 231, 235, 0.8)";
  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;

  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const value = minValue + (range / gridSteps) * i;
    const y = scaleY(value);
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.fillText(Math.round(value).toString(), 10, y + 3);
  }

  if (minValue < 0 && maxValue > 0) {
    const zeroY = scaleY(0);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(plot.x, zeroY);
    ctx.lineTo(plot.x + plot.w, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const series = [
    { key: "otimismo", color: "#22c55e", width: 3, dash: [] },
    { key: "pessimismo", color: "#ef4444", width: 3, dash: [] },
    { key: "neutro", color: "#a1a1aa", width: 2.5, dash: [8, 7] },
    { key: "acumulado", color: "#22d3ee", width: 3, dash: [2, 5] }
  ];

  for (const serie of series) {
    ctx.strokeStyle = serie.color;
    ctx.lineWidth = serie.width;
    ctx.setLineDash(serie.dash);
    ctx.beginPath();

    points.forEach((point, index) => {
      const x = scaleX(index);
      const y = scaleY(point[serie.key]);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
    ctx.setLineDash([]);

    points.forEach((point, index) => {
      const x = scaleX(index);
      const y = scaleY(point[serie.key]);
      if (index === points.length - 1) {
        ctx.fillStyle = serie.color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  const tickEvery = Math.max(1, Math.floor(points.length / 6));
  ctx.fillStyle = "rgba(229, 231, 235, 0.7)";
  points.forEach((point, index) => {
    if (index % tickEvery !== 0 && index !== points.length - 1) return;
    const x = scaleX(index);
    ctx.save();
    ctx.translate(x, height - 10);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(formatarHorario(point.ts), 0, 0);
    ctx.restore();
  });
}

function atualizarDirecionalMercado(stats, origem = "manual") {
  const snapshot = registrarSnapshotMercado(stats, origem);
  const history = carregarHistoricoMercado();
  const historyForChart = history.length ? history : [snapshot];
  renderDirecionalMercado(historyForChart, snapshot);

  const directionEl = document.getElementById("market-direction");
  const crossEl = document.getElementById("market-cross");
  const updatedEl = document.getElementById("market-updated");
  const noteEl = document.getElementById("market-note");

  if (directionEl) {
    const tipo = snapshot.direcao === "OTIMISMO" ? "up" : snapshot.direcao === "PESSIMISMO" ? "down" : "neutral";
    setTag(directionEl, snapshot.direcao, tipo);
  }

  if (crossEl) crossEl.textContent = determinarViradaMercado(historyForChart, snapshot);
  if (updatedEl) updatedEl.textContent = `Atualizado às ${formatarHorario(snapshot.ts)}`;
  if (noteEl) {
    noteEl.textContent = snapshot.direcao === "NEUTRO"
      ? "Neutros acima das linhas: mercado ainda indeciso."
      : snapshot.direcao === "OTIMISMO"
        ? "Linha verde dominante para baixo: dólar perde força e o índice tende a subir."
        : "Linha vermelha dominante para cima: dólar ganha força e o risco perde tração.";
  }
}

function atualizarAtivosComPlanilha(rows) {
  let minerioVariacao = null;
  let minerioPreco = null;
  let alterados = 0;

  for (const row of rows) {
    const codigo = obterCampoLinha(row, ["codigo", "code", "ativo", "ticker"]);
    if (!codigo) continue;

    const ativo = ativos.find(item => normalizarTexto(item.codigo) === normalizarTexto(codigo));
    if (!ativo) continue;

    const variacaoBruta = obterCampoLinha(row, ["variacao", "variacao_pct", "var_pct", "var", "change_pct", "alteracao_pct"]);
    const precoBruto = obterCampoLinha(row, ["preco", "preco_ultimo", "ultimo_preco", "price", "last_price"]);
    const variacaoPct = parseNumeroFlexible(variacaoBruta);

    if (variacaoPct != null) {
      ativo.variacao = variacaoPct / 100;
      alterados++;
      if (ativo.codigo === "MINERIO_SINA") minerioVariacao = ativo.variacao;
    }

    const preco = parseNumeroFlexible(precoBruto);
    if (ativo.codigo === "MINERIO_SINA" && preco != null) {
      minerioPreco = preco;
    }
  }

  if (minerioVariacao != null) {
    atualizarPainelMinerio(minerioVariacao, minerioPreco, { origem: "sheet" });
  } else {
    atualizarPainel({ origem: "sheet" });
  }

  return alterados;
}

async function carregarDadosDaPlanilha() {
  const url = getSheetUrl();
  if (!url) {
    setSheetStatus("Sem planilha carregada. Usando modo manual.", "neutral");
    return;
  }

  setSheetStatus("Atualizando dados da planilha...", "neutral");

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const texto = await response.text();
    const rows = csvParaObjetos(texto);
    const alterados = atualizarAtivosComPlanilha(rows);

    setSheetStatus(
      alterados > 0
        ? `Planilha atualizada com ${alterados} linha(s).`
        : "Planilha carregada, mas nenhum ativo foi encontrado.",
      alterados > 0 ? "up" : "neutral"
    );
  } catch (error) {
    console.error("Erro ao carregar planilha:", error);
    setSheetStatus("Falha ao ler a planilha. Mantendo os dados locais.", "down");
    atualizarPainel({ origem: "sheet" });
  }
}

function iniciarAutoRefreshPlanilha() {
  if (window.__sheetRefreshTimer) {
    clearInterval(window.__sheetRefreshTimer);
    window.__sheetRefreshTimer = null;
  }

  if (!getSheetUrl()) return;

  window.__sheetRefreshTimer = setInterval(() => {
    carregarDadosDaPlanilha();
  }, SHEET_REFRESH_MS);
}

// ========= 2) CLASSIFICAÇÃO E SCORE =========

function classificarAtivo(variacao, limiteAlta, limiteQueda) {
  if (variacao >= limiteAlta) return "ALTA";
  if (variacao <= limiteQueda) return "QUEDA";
  return "NEUTRO";
}

function calcularScoreEDistribuicao() {
  let riscoAlta = 0, riscoQueda = 0, segurAlta = 0, segurQueda = 0, neutros = 0;
  let score = 0;

  for (const ativo of ativos) {
    const status = classificarAtivo(ativo.variacao, ativo.limiteAlta, ativo.limiteQueda);
    ativo.status = status;

    if (status === "NEUTRO") {
      neutros++;
      continue;
    }

    if (ativo.tipo === "risco") {
      if (status === "ALTA") {
        riscoAlta++;
        score -= 1; // risco subindo -> dólar tende a cair
      } else if (status === "QUEDA") {
        riscoQueda++;
        score += 1; // risco caindo -> dólar tende a subir
      }
    } else if (ativo.tipo === "seguranca") {
      if (status === "ALTA") {
        segurAlta++;
        score += 1; // segurança subindo -> dólar tende a subir
      } else if (status === "QUEDA") {
        segurQueda++;
        score -= 1; // segurança caindo -> dólar tende a cair
      }
    }
  }

  return { riscoAlta, riscoQueda, segurAlta, segurQueda, neutros, score };
}

function tendenciaEDecisaoDolar(score) {
  if (score >= SCORE_ALTA) {
    return {
      tendencia: "ALTA",
      acao: "Buscar compras de Dólar em correções (viés forte de alta)."
    };
  } else if (score <= SCORE_BAIXA) {
    return {
      tendencia: "BAIXA",
      acao: "Buscar vendas de Dólar em repiques (viés forte de baixa)."
    };
  } else {
    return {
      tendencia: "NEUTRO",
      acao: "Operar menor / seletivo, sem viés macro claro."
    };
  }
}

// ========= 3) UI =========

function setTag(el, texto, tipo) {
  el.textContent = texto;
  el.classList.remove("tag-up", "tag-down", "tag-neutral");
  if (tipo === "up") el.classList.add("tag-up");
  else if (tipo === "down") el.classList.add("tag-down");
  else el.classList.add("tag-neutral");
}

function atualizarResumoNews() {
  const payroll = document.getElementById("chk-payroll").checked;
  const ipc = document.getElementById("chk-ipc").checked;
  const pib = document.getElementById("chk-pib").checked;
  const pce = document.getElementById("chk-pce").checked;
  const feriado = document.getElementById("chk-feriado").checked;
  const hint = document.getElementById("news-hint");

  if (feriado) {
    hint.textContent = "Feriado americano: NÃO OPERAR (liquidez ruim).";
    return;
  }
  if (payroll || ipc || pib || pce) {
    hint.textContent = "Dia de dado importante: operar preferencialmente depois do dado.";
  } else {
    hint.textContent = "Operar normalmente (sem grandes dados no checklist).";
  }
}

function renderTabelaAtivos() {
  const tbody = document.getElementById("ativos-tbody");
  tbody.innerHTML = "";
  for (const ativo of ativos) {
    if (ativo.codigo === "MINERIO_SINA") continue; // minério é mostrado separado

    const tr = document.createElement("tr");

    const tdCod = document.createElement("td");
    tdCod.textContent = ativo.codigo;
    tr.appendChild(tdCod);

    const tdNome = document.createElement("td");
    tdNome.textContent = ativo.nome;
    tr.appendChild(tdNome);

    const tdTipo = document.createElement("td");
    tdTipo.textContent = ativo.tipo === "risco" ? "Risco" : "Segurança";
    tdTipo.className = ativo.tipo === "risco" ? "tipo-risco" : "tipo-seguranca";
    tr.appendChild(tdTipo);

    const tdVar = document.createElement("td");
    const pct = ativo.variacao * 100;
    tdVar.textContent = isNaN(pct) ? "--" : pct.toFixed(2) + " %";
    tr.appendChild(tdVar);

    const tdStatus = document.createElement("td");
    const statusTag = document.createElement("span");
    const status = ativo.status || "NEUTRO";
    const tipoTag = status === "ALTA" ? "up" : status === "QUEDA" ? "down" : "neutral";
    setTag(statusTag, status, tipoTag);
    tdStatus.appendChild(statusTag);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  }
}

function atualizarPainel(opcoes = {}) {
  const registrarHistorico = opcoes.registrarHistorico !== false;
  const origem = opcoes.origem || "manual";
  const { riscoAlta, riscoQueda, segurAlta, segurQueda, neutros, score } =
    calcularScoreEDistribuicao();

  document.getElementById("risco-alta").textContent = riscoAlta;
  document.getElementById("risco-queda").textContent = riscoQueda;
  document.getElementById("segur-alta").textContent = segurAlta;
  document.getElementById("segur-queda").textContent = segurQueda;
  document.getElementById("total-neutro").textContent = neutros;
  document.getElementById("macro-score").textContent = score;

  const { tendencia, acao } = tendenciaEDecisaoDolar(score);
  const usdTrendEl = document.getElementById("usd-trend");
  const usdActionEl = document.getElementById("usd-action");

  if (tendencia === "ALTA") setTag(usdTrendEl, "ALTA", "up");
  else if (tendencia === "BAIXA") setTag(usdTrendEl, "BAIXA", "down");
  else setTag(usdTrendEl, "NEUTRO", "neutral");

  usdActionEl.textContent = acao;

  renderTabelaAtivos();
  if (registrarHistorico) {
    atualizarDirecionalMercado({ riscoAlta, riscoQueda, segurAlta, segurQueda, neutros, score }, origem);
  } else {
    const history = carregarHistoricoMercado();
    const fallbackSnapshot = { ts: Date.now(), ...calcularLeituraMercado({ riscoAlta, riscoQueda, segurAlta, segurQueda, neutros, score }) };
    renderDirecionalMercado(history.length ? history : [fallbackSnapshot], fallbackSnapshot);
  }

  return { riscoAlta, riscoQueda, segurAlta, segurQueda, neutros, score };
}

function atualizarPainelMinerio(variacaoDecimal, precoUltimo, opcoes = {}) {
  const priceEl = document.getElementById("iron-price");
  const chgEl = document.getElementById("iron-change");
  const classEl = document.getElementById("iron-class");

  if (precoUltimo != null && !isNaN(precoUltimo)) {
    priceEl.textContent = precoUltimo.toFixed(4);
  }

  if (variacaoDecimal == null || isNaN(variacaoDecimal)) {
    chgEl.textContent = "--";
    setTag(classEl, "--", "neutral");
    return;
  }

  const pct = variacaoDecimal * 100;
  chgEl.textContent = pct.toFixed(2) + " %";

  const minerio = ativos.find(a => a.codigo === "MINERIO_SINA");
  if (minerio) minerio.variacao = variacaoDecimal;

  const status = classificarAtivo(
    variacaoDecimal,
    LIMITE_MINERIO_ALTA,
    LIMITE_MINERIO_QUEDA
  );
  if (status === "ALTA") setTag(classEl, "ALTA", "up");
  else if (status === "QUEDA") setTag(classEl, "QUEDA", "down");
  else setTag(classEl, "NEUTRO", "neutral");

  atualizarPainel(opcoes);
}

// ========= 4) EVENTOS =========

document.addEventListener("DOMContentLoaded", () => {
  const sheetUrlInicial = carregarSheetUrlInicial();

  document
    .getElementById("btn-update-news")
    .addEventListener("click", atualizarResumoNews);

  document
    .getElementById("btn-load-sheet")
    .addEventListener("click", async () => {
      const url = getSheetUrl();
      if (!url) {
        setSheetStatus("Cole a URL CSV publicada da planilha primeiro.", "down");
        return;
      }
      salvarSheetUrl(url);
      iniciarAutoRefreshPlanilha();
      await carregarDadosDaPlanilha();
    });

  document
    .getElementById("btn-save-sheet")
    .addEventListener("click", () => {
      const url = getSheetUrl();
      if (!url) {
        localStorage.removeItem(STORAGE_KEY_SHEET_URL);
        history.replaceState({}, "", window.location.pathname);
        setSheetStatus("URL removida. Voltando ao modo manual.", "neutral");
        iniciarAutoRefreshPlanilha();
        return;
      }
      salvarSheetUrl(url);
      setSheetStatus("URL salva. Você pode compartilhar essa página com o parâmetro sheet.", "up");
      iniciarAutoRefreshPlanilha();
    });

  document
    .getElementById("btn-clear-sheet")
    .addEventListener("click", () => {
      setSheetUrl("");
      localStorage.removeItem(STORAGE_KEY_SHEET_URL);
      history.replaceState({}, "", window.location.pathname);
      setSheetStatus("URL limpa. Modo manual ativo.", "neutral");
      iniciarAutoRefreshPlanilha();
      atualizarPainel();
    });

  document
    .getElementById("btn-apply-iron")
    .addEventListener("click", () => {
      const variacaoStr = document.getElementById("iron-manual").value;
      const precoStr = document.getElementById("iron-price-manual").value;
      const variacaoPct = parseFloat(String(variacaoStr).replace(",", "."));
      const preco = parseFloat(String(precoStr).replace(",", "."));

      if (isNaN(variacaoPct)) {
        alert("Informe uma variação do minério em % válida (ex.: 3.5).");
        return;
      }
      const variacaoDecimal = variacaoPct / 100.0;
      atualizarPainelMinerio(variacaoDecimal, isNaN(preco) ? null : preco, { origem: "manual" });
    });

  document
    .getElementById("btn-apply-ativo")
    .addEventListener("click", () => {
      const cod = document.getElementById("ativo-codigo").value.trim();
      const varStr = document.getElementById("ativo-var").value;
      if (!cod) {
        alert("Informe o código do ativo (ex.: EWZ, DX, USD/MXN...).");
        return;
      }
      const ativo = ativos.find(a => a.codigo.toUpperCase() === cod.toUpperCase());
      if (!ativo) {
        alert("Ativo não encontrado na lista interna.");
        return;
      }
      const pct = parseFloat(String(varStr).replace(",", "."));
      if (isNaN(pct)) {
        alert("Informe uma variação em % válida.");
        return;
      }
      ativo.variacao = pct / 100.0;
      atualizarPainel({ origem: "manual" });
    });

  atualizarResumoNews();
  atualizarPainel({ origem: "init" });

  window.addEventListener("resize", () => {
    const history = carregarHistoricoMercado();
    const ultimo = history[history.length - 1];
    if (ultimo) renderDirecionalMercado(history, ultimo);
  });

  if (sheetUrlInicial) {
    iniciarAutoRefreshPlanilha();
    carregarDadosDaPlanilha();
  } else {
    setSheetStatus("Sem planilha carregada. Usando modo manual.", "neutral");
  }

  if (!window.__marketRefreshTimer) {
    window.__marketRefreshTimer = setInterval(() => {
      if (getSheetUrl()) {
        carregarDadosDaPlanilha();
      }
    }, SHEET_REFRESH_MS);
  }
});