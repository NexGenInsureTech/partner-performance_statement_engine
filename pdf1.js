// js/pdf.js
import { BRAND } from "./config.js";
import {
  classifyLossRatio,
  generateAlerts,
  generateInsights,
  lossRatioIndicator,
  generateLobRecommendations,
  generateLobInsights,
  derivePartnerCategory,
} from "./analytics.js";
import {
  renderBarChart,
  renderLineChart,
  renderPieChart,
  renderLobBarChart,
} from "./charts.js";

const MARGIN_X = 15;
const HEADER_HEIGHT = 30;
const FOOTER_HEIGHT = 15;

const CATEGORY_BADGE = {
  gold: { bg: [255, 248, 220], text: [160, 120, 0] },
  silver: { bg: [240, 240, 240], text: [90, 90, 90] },
  bronze: { bg: [245, 235, 225], text: [120, 80, 40] },
};

function normalizeCategory(label) {
  return String(label || "")
    .trim()
    .toLowerCase();
}

function resolveCategoryStyle(label) {
  const key = normalizeCategory(label);
  return (
    CATEGORY_BADGE[key] || {
      bg: [245, 245, 245],
      text: [100, 100, 100],
    }
  );
}

function drawCategoryBadge(doc, label, x, y) {
  const style = resolveCategoryStyle(label);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  const paddingX = 4;
  const badgeH = 6;
  const textWidth = doc.getTextWidth(label);
  const badgeW = textWidth + paddingX * 2;

  // Background
  doc.setFillColor(style.bg[0], style.bg[1], style.bg[2]);
  doc.roundedRect(x, y - badgeH + 1, badgeW, badgeH, 2, 2, "F");

  // Text
  doc.setTextColor(style.text[0], style.text[1], style.text[2]);
  doc.text(label, x + paddingX, y);

  // Reset state
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  return badgeW;
}

function drawSectionDivider(doc, y) {
  doc.setDrawColor(220);
  doc.line(MARGIN_X, y, doc.internal.pageSize.getWidth() - MARGIN_X, y);
}

function contentStartY() {
  return HEADER_HEIGHT + 8;
}

function contentEndY(doc) {
  return doc.internal.pageSize.getHeight() - FOOTER_HEIGHT - 8;
}

/* ---------------- HEADER & FOOTER ---------------- */

let LOGO_BASE64 = null;
let LOGO_READY = false;

async function loadLogo() {
  const res = await fetch("./assets/logo.jpg");
  const blob = await res.blob();

  const reader = new FileReader();
  reader.onloadend = () => {
    LOGO_BASE64 = reader.result;
    LOGO_READY = true;
  };
  reader.readAsDataURL(blob);
}

loadLogo();

function drawHeader(doc) {
  const W = doc.internal.pageSize.getWidth();

  // --- LOGO ---
  if (LOGO_READY && LOGO_BASE64) {
    doc.addImage(
      LOGO_BASE64,
      "JPEG", // IMPORTANT: must match logo.jpg
      MARGIN_X,
      8,
      28,
      12,
    );
  }

  // --- RESET FONT AFTER IMAGE (CRITICAL FIX) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  // --- BRAND NAME ---
  doc.text(BRAND.name, MARGIN_X + 36, 16);

  // --- DOCUMENT TITLE ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Partner Performance Statement", W - MARGIN_X, 16, {
    align: "right",
  });

  // --- DIVIDER ---
  doc.setDrawColor(200);
  doc.line(MARGIN_X, HEADER_HEIGHT - 4, W - MARGIN_X, HEADER_HEIGHT - 4);
}

function drawFooter(doc, pageNo, totalPages) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(BRAND.footer, MARGIN_X, H - 6);
  doc.text(`Page ${pageNo} of ${totalPages}`, W - MARGIN_X, H - 6, {
    align: "right",
  });
  doc.setTextColor(0);
}

/* ---------------- LETTER ---------------- */

function renderLetter(doc, snapshot, y, width) {
  const lines = [
    `Dear ${snapshot.meta.partner_name},`,
    "",
    `Thank you for your continued partnership with ${BRAND.name}.`,
    "Please find below your business performance summary.",
    "",
    "Warm regards,",
    "Nikash Kr. Deka",
    `SME & Insurance Inclusion – ${BRAND.name}`,
  ];

  doc.setFontSize(11);
  lines.forEach((l) => {
    if (l === "") {
      y += 6;
    } else {
      doc.text(doc.splitTextToSize(l, width), MARGIN_X, y);
      y += 6;
    }
  });

  return y;
}

/* ---------------- MAIN PDF ---------------- */

export function renderPdf(snapshot) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const W = doc.internal.pageSize.getWidth();
  const CONTENT_W = W - MARGIN_X * 2;
  let y = contentStartY();

  /* ===== PAGE 1 : EXECUTIVE SUMMARY ===== */

  const alerts = generateAlerts(snapshot.month_wise);
  const lrClass = classifyLossRatio(snapshot.avg_loss_ratio);

  drawHeader(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Executive Summary", MARGIN_X, y);
  y += 8;

  if (lrClass) {
    doc.setFillColor(lrClass.color);
    doc.rect(MARGIN_X, y - 4, 4, 4, "F");
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const indicator = lossRatioIndicator(snapshot.avg_loss_ratio);

  // draw color box
  doc.setFillColor(indicator.color[0], indicator.color[1], indicator.color[2]);
  doc.rect(MARGIN_X, y - 4, 4, 4, "F");

  // reset text color & font
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");

  doc.text(`Overall Risk Status: ${indicator.label}`, MARGIN_X + 8, y);

  y += 6;

  doc.text(
    `Average Loss Ratio: ${
      typeof snapshot.avg_loss_ratio === "number"
        ? snapshot.avg_loss_ratio + "%"
        : "Not Available"
    }`,
    MARGIN_X,
    y,
  );
  y += 6;

  // Benchmark comparison
  if (
    snapshot.benchmark &&
    snapshot.benchmark.avg_loss_ratio != null &&
    typeof snapshot.avg_loss_ratio === "number"
  ) {
    const diff = snapshot.avg_loss_ratio - snapshot.benchmark.avg_loss_ratio;

    const benchmarkText =
      diff > 0
        ? `Loss ratio is ${diff.toFixed(2)}% higher than portfolio average.`
        : `Loss ratio is ${Math.abs(diff).toFixed(
            2,
          )}% better than portfolio average.`;

    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(benchmarkText, CONTENT_W), MARGIN_X, y);

    y += doc.splitTextToSize(benchmarkText, CONTENT_W).length * 6 + 2;
    // spacing after benchmark line
  }

  doc.text(`Key Alerts Identified: ${alerts.length}`, MARGIN_X, y);
  y += 10;

  const narrative = !lrClass
    ? "Insufficient loss ratio data to determine portfolio health."
    : lrClass.label === "Healthy"
      ? "Portfolio performance is stable with healthy loss ratios."
      : lrClass.label === "Watchlist"
        ? "Portfolio shows early signs of stress and should be monitored closely."
        : "Portfolio exhibits elevated risk levels and requires immediate corrective action.";

  doc.text(doc.splitTextToSize(narrative, CONTENT_W), MARGIN_X, y);
  y += 14;

  /* --------------------------- */
  /* ---- Intermediary Box ---- */
  /* --------------------------- */

  const boxX = MARGIN_X;
  const boxY = y;
  const boxW = CONTENT_W;
  const padding = 4;

  const leftX = boxX + padding;
  const rightX = boxX + boxW / 2 + padding;
  const rightWidth = boxW / 2 - padding * 2;

  let leftY = boxY + 7;
  let rightY = boxY + 7;

  // LEFT COLUMN (always show intermediary)
  doc.setFont("helvetica", "normal");
  doc.text(`Intermediary: ${snapshot.meta.partner_name}`, leftX, leftY);
  leftY += 6;

  // Optional: Code
  if (snapshot.meta.partner_code) {
    doc.text(`Code: ${snapshot.meta.partner_code}`, leftX, leftY);
    leftY += 6;
  }

  // RIGHT COLUMN

  // Optional: Category
  if (snapshot.meta.category) {
    snapshot.meta.category = derivePartnerCategory(snapshot);
    // 1. Draw label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Category: ", rightX, rightY);

    // 2. Measure label width
    const labelWidth = doc.getTextWidth("Category:");

    // 3. Draw badge
    drawCategoryBadge(
      doc,
      snapshot.meta.category,
      rightX + labelWidth + 4,
      rightY,
    );

    // 4. Move cursor
    rightY += 8;
  }

  // Optional: Branches / RM
  if (snapshot.meta.branches?.length) {
    const branchText = snapshot.meta.branches
      .map((b) => `${b.name} (RM: ${b.rm})`)
      .join(" | ");

    const wrappedBranches = doc.splitTextToSize(
      `Branches / RM: ${branchText}`,
      rightWidth,
    );

    doc.text(wrappedBranches, rightX, rightY);
    rightY += wrappedBranches.length * 6;
  }

  // Calculate box height AFTER content
  const contentBottom = Math.max(leftY, rightY);
  const boxH = Math.max(contentBottom - boxY + padding, 22);

  // Draw box LAST
  doc.rect(boxX, boxY, boxW, boxH);

  // Move cursor
  y += boxH + 10;

  // Continue with letter
  y = renderLetter(doc, snapshot, y, CONTENT_W);

  /* ===== PAGE 2 : BUSINESS SUMMARY ===== */

  doc.addPage();
  drawHeader(doc);
  y = contentStartY();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Business Summary", MARGIN_X, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Total Premium: ${snapshot.totals.premium.toLocaleString()}`,
    MARGIN_X,
    y,
  );
  doc.text(
    `Total Commission: ${snapshot.totals.commission.toLocaleString()}`,
    MARGIN_X + 70,
    y,
  );
  doc.text(`Policies: ${snapshot.totals.policies}`, MARGIN_X + 140, y);

  y += 8;

  doc.autoTable({
    startY: y,
    margin: { left: MARGIN_X, right: MARGIN_X },
    head: [["Month", "Premium", "Commission", "Policies", "Loss Ratio (%)"]],
    body: snapshot.month_wise.map((m) => [
      m.month,
      m.premium.toLocaleString(),
      m.commission.toLocaleString(),
      m.policies,
      m.loss_ratio != null ? m.loss_ratio + "%" : "—",
    ]),
  });

  drawSectionDivider(doc, y);
  y += 8;

  /* ===== PAGE 3 : KEY PERFORMANCE SIGNALS & ACTIONS ===== */

  doc.addPage();
  drawHeader(doc);
  y = contentStartY();

  // ==================================================
  // PAGE TITLE
  // ==================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Key Performance Signals & Actions", MARGIN_X, y);
  y += 10;

  // ==================================================
  // HERO INSIGHT (MOST IMPORTANT PART)
  // ==================================================
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");

  const heroInsight =
    typeof snapshot.avg_loss_ratio === "number"
      ? snapshot.avg_loss_ratio <= 65
        ? "Loss ratio remains within healthy limits, indicating disciplined underwriting."
        : "Loss ratio shows stress, primarily driven by adverse LOB performance."
      : "Insufficient loss ratio data to determine portfolio health.";

  doc.text("Key Signal", MARGIN_X, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(heroInsight, CONTENT_W), MARGIN_X, y);
  y += 14;

  // Divider
  doc.setDrawColor(220);
  doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);
  y += 8;

  // ==================================================
  // PRIMARY KPI — LOSS RATIO TREND (RISK FIRST)
  // ==================================================
  if (typeof snapshot.avg_loss_ratio === "number") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Loss Ratio Trend (Primary Risk Indicator)", MARGIN_X, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    const line = renderLineChart(
      snapshot.month_wise.map((m) => m.month),
      snapshot.month_wise.map((m) => m.loss_ratio),
    );
    doc.addImage(line, "PNG", MARGIN_X, y, CONTENT_W, 40);
    y += 50;
  }

  // Divider
  doc.setDrawColor(220);
  doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);
  y += 8;

  // ==================================================
  // SUPPORTING KPI — PREMIUM TREND
  // ==================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Premium Trend (Supporting Indicator)", MARGIN_X, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  const bar = renderBarChart(
    snapshot.month_wise.map((m) => m.month),
    snapshot.month_wise.map((m) => m.premium),
  );
  doc.addImage(bar, "PNG", MARGIN_X, y, CONTENT_W, 40);
  y += 50;

  // Divider
  doc.setDrawColor(220);
  doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);
  y += 8;

  // ==================================================
  // ACTIONS REQUIRED (DECISION SECTION)
  // ==================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Actions Required", MARGIN_X, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const recos = generateLobRecommendations(snapshot);

  if (recos.length) {
    recos.forEach((r) => {
      doc.text(`• ${r}`, MARGIN_X + 2, y);
      y += 6;
    });
  } else {
    doc.text("No immediate corrective actions required.", MARGIN_X, y);
    y += 6;
  }

  y += 6;

  /* ===== PAGE 4 : DIAGNOSTIC CONTEXT ===== */
  doc.addPage();
  drawHeader(doc);
  y = contentStartY();

  // ==================================================
  // PORTFOLIO CONTEXT (DE-EMPHASIZED BUT EXPLAINED)
  // ==================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Portfolio Context", MARGIN_X, y);
  y += 6;

  // ==================================================
  // LOB PERFORMANCE BREAKDOWN (RANKED)
  // ==================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("LOB Performance Breakdown", MARGIN_X, y);
  y += 6;

  const lobBar = renderLobBarChart(snapshot.lob_summary);
  doc.addImage(lobBar, "PNG", MARGIN_X, y, CONTENT_W, 70);
  y += 80;

  // --- INSIGHTS (RIGHT) ---
  const rightColX = MARGIN_X + 70;
  const rightColW = CONTENT_W - 70;
  let textY = y;

  const lobInsights = generateLobInsights(snapshot);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("LOB Performance Signals", rightColX, textY);
  textY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (lobInsights.length) {
    lobInsights.forEach((i) => {
      doc.text(`• ${i}`, rightColX, textY);
      textY += 6;
    });
  } else {
    doc.text(
      "No significant LOB concentration risks identified.",
      rightColX,
      textY,
    );
  }

  // Move cursor BELOW pie + text block
  y += Math.max(60, textY - y) + 10;

  /* ---- Apply Footer Everywhere ---- */

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  return doc;
}
