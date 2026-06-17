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

    const tdTipo = document.createElement("td");
    tdTipo.textContent = ativo.tipo === "risco" ? "Risco" : "Segurança";
    tdTipo.className = ativo.tipo === "risco" ? "tipo-risco" : "tipo-seguranca";
    tr.appendChild(tdTipo);

    const tdVar = document.createElement("td");
    const pct = ativo.variacao * 100;
    tdVar.textContent = isNaN(pct) ? "--" : pct.toFixed(2) + " %";
    tr.appendChild(tdVar);

    const tdStatus = document.createElement("td");
    tdStatus.textContent = ativo.status || "NEUTRO";
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  }
}

function atualizarPainel() {
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
}

function atualizarPainelMinerio(variacaoDecimal, precoUltimo) {
  const priceEl = document.getElementById("iron-price");
  const chgEl = document.getElementById("iron-change");
  const classEl = document.getElementById("iron-class");

  if (precoUltimo != null && !isNaN(precoUltimo)) {
    priceEl.textContent = precoUltimo.toFixed(4);
  } else {
    priceEl.textContent = "--";
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

  atualizarPainel();
}

// ========= 4) EVENTOS =========

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("btn-update-news")
    .addEventListener("click", atualizarResumoNews);

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
      atualizarPainelMinerio(variacaoDecimal, isNaN(preco) ? null : preco);
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
      atualizarPainel();
    });

  atualizarResumoNews();
  atualizarPainel();
});