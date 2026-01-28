// js/app.js (MAIN CONTROLLER)

import { state } from "./state.js";
import { setProgress, readSheet, assert, isEmpty } from "./utils.js";
import { normalize, mergeRows, buildSnapshots } from "./data.js";
import { renderPdf } from "./pdf.js";
import { lossRatioIndicator } from "./analytics.js";
import { computeLobMetrics } from "./data.js";

const AUTO_MAP_RULES = {
  intermediary: ["intermediary", "broker", "agent", "partner"],
  month: ["month", "period", "policy month"],
  lob: ["lob", "line of business", "business line"],
  product: ["product", "plan", "scheme"],
  policies: ["policy", "policies", "count"],
  premium: ["premium", "gwp", "written premium"],
  commission: ["commission", "brokerage"],
  loss_ratio: ["loss ratio", "lr"],
};

console.log("App loaded successfully");

function renderDashboard(snapshots) {
  const selectedLob = document.getElementById("lobFilter").value;

  const filtered =
    selectedLob === "ALL"
      ? snapshots
      : snapshots.filter((s) => s.lobs.includes(selectedLob));

  const limit = parseInt(document.getElementById("dashLimit").value, 10);

  let totalPremium = 0;
  let lossSum = 0;
  let lossCount = 0;

  filtered.forEach((s) => {
    totalPremium += s.totals.premium;
    if (typeof s.avg_loss_ratio === "number") {
      lossSum += s.avg_loss_ratio;
      lossCount++;
    }
  });

  const avgLoss =
    lossCount > 0 ? (lossSum / lossCount).toFixed(2) + "%" : "Not Available";
  document.getElementById("dashLossRatio").textContent = avgLoss;

  const highRisk = snapshots
    .filter((s) => s.avg_loss_ratio != null)
    .sort((a, b) => b.avg_loss_ratio - a.avg_loss_ratio)[0];

  document.getElementById("dashPremium").textContent =
    totalPremium.toLocaleString();
  document.getElementById("dashLossRatio").textContent = avgLoss;
  const indicator = highRisk
    ? lossRatioIndicator(highRisk.avg_loss_ratio)
    : { icon: "—", label: "" };

  document.getElementById("dashHighRisk").textContent = highRisk
    ? `${indicator.icon} ${highRisk.meta.partner_name}`
    : "—";

  const tbody = document.getElementById("dashTable");
  tbody.innerHTML = "";

  snapshots
    .slice()
    .sort((a, b) => b.totals.premium - a.totals.premium)
    .slice(0, limit)
    .forEach((s) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.meta.partner_name}</td>
        <td>${s.totals.premium.toLocaleString()}</td>
        <td>${s.avg_loss_ratio != null ? s.avg_loss_ratio + "%" : "—"}</td>
      `;
      tbody.appendChild(tr);
    });
}

function computeBenchmarks(snapshots) {
  let premiumSum = 0;
  let lossSum = 0;
  let lossCount = 0;

  snapshots.forEach((s) => {
    premiumSum += s.totals.premium;

    if (typeof s.avg_loss_ratio === "number") {
      lossSum += s.avg_loss_ratio;
      lossCount++;
    }
  });

  return {
    avg_premium: premiumSum / snapshots.length,
    avg_loss_ratio: lossCount ? +(lossSum / lossCount).toFixed(2) : null,
  };
}

function populateLobFilter(snapshots) {
  const select = document.getElementById("lobFilter");
  select.innerHTML = `<option value="ALL">All LOBs</option>`;

  const lobs = new Set();
  snapshots.forEach((s) => s.lobs.forEach((l) => lobs.add(l)));

  [...lobs].sort().forEach((lob) => {
    select.add(new Option(lob, lob));
  });
}

document.getElementById("dashLimit").onchange = () => {
  if (state.snapshots.length) {
    renderDashboard(state.snapshots);
  }
};

document.getElementById("lobFilter").onchange = () => {
  if (state.snapshots.length) {
    renderDashboard(state.snapshots);
  }
};

function autoDetectField(field, headers) {
  const rules = AUTO_MAP_RULES[field] || [];
  const normalizedHeaders = headers.map((h) => ({
    raw: h,
    norm: h.toLowerCase(),
  }));

  for (const rule of rules) {
    const match = normalizedHeaders.find((h) => h.norm.includes(rule));
    if (match) return match.raw;
  }

  return headers[0]; // safe fallback
}

async function yieldToUI() {
  return new Promise((r) => setTimeout(r, 0));
}

const progressBar = document.getElementById("progressBar");
const mappingUI = document.getElementById("mappingUI");
if (!mappingUI) {
  alert("Mapping UI container missing in HTML");
}

const partnerSelect = document.getElementById("partnerSelect");

document.getElementById("loadBtn").onclick = async () => {
  assert(premiumFile.files.length, "Please upload Premium file.");
  assert(commissionFile.files.length, "Please upload Commission file.");

  await setProgress(progressBar, 10);

  state.statementTill = statementTill.value || "—";

  state.premiumRaw = await readSheet(premiumFile.files[0]);
  state.commissionRaw = await readSheet(commissionFile.files[0]);

  assert(state.premiumRaw.length, "Premium file is empty.");
  assert(state.commissionRaw.length, "Commission file is empty.");

  const premiumHeaders = Object.keys(state.premiumRaw[0] || {});
  const commissionHeaders = Object.keys(state.commissionRaw[0] || {});

  const headers = Array.from(
    new Set([...premiumHeaders, ...commissionHeaders]),
  );

  mappingUI.innerHTML = "";

  const FIELDS = [
    "intermediary",
    "month",
    "lob",
    "product",
    "policies",
    "premium",
    "commission",
    "loss_ratio",
  ];

  FIELDS.forEach((field) => {
    const label = document.createElement("div");
    label.textContent = field;
    label.className = "fw-bold mt-2";

    const select = document.createElement("select");
    select.className = "form-select mb-2";

    headers.forEach((h) => select.add(new Option(h, h)));

    const detected = autoDetectField(field, headers);

    select.value = detected;
    state.columnMap[field] = detected;

    select.onchange = () => {
      state.columnMap[field] = select.value;
    };

    mappingUI.append(label, select);
  });

  await setProgress(progressBar, 40);
};

document.getElementById("processBtn").onclick = async () => {
  assert(Object.keys(state.columnMap).length, "Please load files first.");

  const required = ["intermediary", "month", "product", "premium"];
  required.forEach((f) =>
    assert(!isEmpty(state.columnMap[f]), `Please map column for "${f}".`),
  );

  await setProgress(progressBar, 60);

  // Normalize both files
  const p = normalize(state.premiumRaw, state.columnMap);
  const c = normalize(state.commissionRaw, state.columnMap);

  assert(p.length || c.length, "No valid rows after normalization.");

  // Merge premium + commission
  const merged = mergeRows(p, c);
  assert(merged.length, "No data after merging files.");

  // Build partner snapshots
  state.snapshots = buildSnapshots(merged, state.statementTill);

  /* ---------- OVERALL BENCHMARK (existing, correct) ---------- */
  const benchmarks = computeBenchmarks(state.snapshots);
  state.snapshots.forEach((s) => {
    s.benchmark = benchmarks;
  });

  /* ---------- LOB-WISE PORTFOLIO BENCHMARK (NEW, REQUIRED) ---------- */
  const lobBenchmarks = computeLobMetrics(merged);
  state.snapshots.forEach((s) => {
    s.lob_benchmarks = lobBenchmarks;
  });

  /* ---------- UI UPDATES ---------- */
  populateLobFilter(state.snapshots);
  renderDashboard(state.snapshots);

  assert(state.snapshots.length, "No partners found.");

  partnerSelect.innerHTML = "";
  state.snapshots.forEach((s, i) =>
    partnerSelect.add(new Option(s.meta.partner_name, i)),
  );

  await setProgress(progressBar, 100);
};

document.getElementById("previewPdfBtn").onclick = () => {
  assert(state.snapshots.length, "Please process data first.");
  assert(partnerSelect.value !== "", "Please select a partner.");

  const s = state.snapshots[partnerSelect.value];
  window.open(renderPdf(s).output("bloburl"));
};

document.getElementById("bulkBtn").onclick = async () => {
  assert(state.snapshots.length, "Please process data before bulk export.");

  const zip = new JSZip();
  const total = state.snapshots.length;

  for (let i = 0; i < total; i++) {
    await yieldToUI(); // critical: prevent UI freeze

    const s = state.snapshots[i];
    const fileName = s.meta.partner_name.replace(/[^a-z0-9]/gi, "_") + ".pdf";

    const pdf = renderPdf(s).output("arraybuffer");
    zip.file(fileName, pdf);

    const pct = Math.round(((i + 1) / total) * 100);
    await setProgress(progressBar, pct);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);

  window.open(url);
};
