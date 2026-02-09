// js/pdf.js
import { BRAND } from "./config.js";
import {
  classifyLossRatio,
  generateAlerts,
  lossRatioIndicator,
  generateLobRecommendations,
  generateLobInsights,
} from "./analytics.js";
import {
  renderBarChart,
  renderLineChart,
  renderLobBarChart,
} from "./charts.js";

/* ============================================================
   CONSTANTS
============================================================ */
const MARGIN_X = 15;
const HEADER_HEIGHT = 30;
const FOOTER_HEIGHT = 15;

/* ============================================================
   CATEGORY BADGES (VISUAL ONLY)
============================================================ */
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
  return (
    CATEGORY_BADGE[normalizeCategory(label)] || {
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
  const badgeW = doc.getTextWidth(label) + paddingX * 2;

  doc.setFillColor(...style.bg);
  doc.roundedRect(x, y - badgeH + 1, badgeW, badgeH, 2, 2, "F");

  doc.setTextColor(...style.text);
  doc.text(label, x + paddingX, y);

  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
}

/* ============================================================
   LAYOUT HELPERS
============================================================ */
function contentStartY() {
  return HEADER_HEIGHT + 8;
}

function drawSectionDivider(doc, y) {
  doc.setDrawColor(220);
  doc.line(MARGIN_X, y, doc.internal.pageSize.getWidth() - MARGIN_X, y);
}

/* ============================================================
   HEADER & FOOTER
============================================================ */
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

  if (LOGO_READY && LOGO_BASE64) {
    doc.addImage(LOGO_BASE64, "JPEG", MARGIN_X, 8, 28, 12);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Partner Performance Statement", W - MARGIN_X, 14, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(140);
  doc.text(BRAND.name, W - MARGIN_X, 20, { align: "right" });

  doc.setDrawColor(200);
  doc.line(MARGIN_X, HEADER_HEIGHT - 4, W - MARGIN_X, HEADER_HEIGHT - 4);
  doc.setTextColor(0);
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

/* ============================================================
   COVER LETTER
============================================================ */
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
    if (!l) y += 6;
    else {
      doc.text(doc.splitTextToSize(l, width), MARGIN_X, y);
      y += 6;
    }
  });

  return y;
}

/* ============================================================
   MAIN PDF
============================================================ */
export function renderPdf(snapshot) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const W = doc.internal.pageSize.getWidth();
  const CONTENT_W = W - MARGIN_X * 2;
  let y = contentStartY();

  /* ============================================================
     PAGE 1 : EXECUTIVE SUMMARY
  ============================================================ */
  drawHeader(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Executive Summary", MARGIN_X, y);
  y += 10;

  const alerts = generateAlerts(snapshot.month_wise);
  const indicator = lossRatioIndicator(snapshot.avg_loss_ratio) || {
    label: "Not Available",
    color: [180, 180, 180],
  };

  const cardX = MARGIN_X;
  const cardY = y;
  const cardW = CONTENT_W;
  const CARD_HEIGHT = 50;
  let cy = cardY + 10;

  // Card background
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(cardX, cardY, cardW, CARD_HEIGHT, 3, 3, "F");
  doc.setDrawColor(220);
  doc.roundedRect(cardX, cardY, cardW, CARD_HEIGHT, 3, 3, "S");

  // Risk status
  doc.setFillColor(...indicator.color);
  doc.rect(cardX + 6, cy - 4, 4, 4, "F");

  doc.setFontSize(11);
  doc.text("Overall Risk Status:", cardX + 14, cy);
  doc.setFont("helvetica", "bold");
  doc.text(indicator.label, cardX + 80, cy);

  cy += 10;

  // Loss ratio
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Average Loss Ratio:", cardX + 14, cy);
  doc.setFont("helvetica", "bold");
  doc.text(
    typeof snapshot.avg_loss_ratio === "number"
      ? `${snapshot.avg_loss_ratio}%`
      : "—",
    cardX + 80,
    cy,
  );

  cy += 8;

  // Alerts
  const alertColor =
    alerts.length === 0
      ? [120, 120, 120]
      : alerts.length <= 2
        ? [255, 165, 0]
        : [200, 60, 60];

  doc.setTextColor(...alertColor);
  doc.text("Key Alerts:", cardX + 14, cy);
  doc.text(String(alerts.length), cardX + 80, cy);
  doc.setTextColor(0);

  cy += 10;

  // Narrative (INSIDE CARD)
  const narrative =
    indicator.label === "Healthy"
      ? "Portfolio performance is stable with healthy loss ratios."
      : indicator.label === "Watchlist"
        ? "Portfolio shows early signs of stress and should be monitored closely."
        : "Portfolio exhibits elevated risk levels and requires immediate corrective action.";

  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(narrative, cardW - 28), cardX + 14, cy);

  y = cardY + CARD_HEIGHT + 10;

  /* ============================================================
     INTERMEDIARY CONTEXT
  ============================================================ */
  const boxX = MARGIN_X;
  const boxY = y;
  const boxW = CONTENT_W;
  const padding = 4;

  const leftX = boxX + padding;
  const rightX = boxX + boxW / 2 + padding;

  let leftY = boxY + 7;
  let rightY = boxY + 7;

  doc.text(`Intermediary: ${snapshot.meta.partner_name}`, leftX, leftY);
  leftY += 6;

  if (snapshot.meta.partner_code) {
    doc.text(`Code: ${snapshot.meta.partner_code}`, leftX, leftY);
    leftY += 6;
  }

  if (snapshot.meta.category) {
    doc.text("Category:", rightX, rightY);
    drawCategoryBadge(
      doc,
      snapshot.meta.category,
      rightX + doc.getTextWidth("Category:") + 4,
      rightY,
    );
    rightY += 8;
  }

  const boxH = Math.max(leftY, rightY) - boxY + padding;
  doc.rect(boxX, boxY, boxW, boxH);
  y += boxH + 10;

  y = renderLetter(doc, snapshot, y, CONTENT_W);

  /* ============================================================
     PAGE 2 : DIAGNOSTIC CONTEXT
  ============================================================ */
  doc.addPage();
  drawHeader(doc);
  y = contentStartY();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("LOB Performance Breakdown", MARGIN_X, y);
  y += 6;

  const lobBar = renderLobBarChart(snapshot.lob_summary);
  doc.addImage(lobBar, "PNG", MARGIN_X, y, CONTENT_W, 70);

  /* ============================================================
     PAGE 3 : KEY PERFORMANCE SIGNALS & ACTIONS
  ============================================================ */
  doc.addPage();
  drawHeader(doc);
  y = contentStartY();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Key Performance Signals & Actions", MARGIN_X, y);
  y += 10;

  const line = renderLineChart(
    snapshot.month_wise.map((m) => m.month),
    snapshot.month_wise.map((m) => m.loss_ratio),
  );
  doc.addImage(line, "PNG", MARGIN_X, y, CONTENT_W, 40);
  y += 50;

  const bar = renderBarChart(
    snapshot.month_wise.map((m) => m.month),
    snapshot.month_wise.map((m) => m.premium),
  );
  doc.addImage(bar, "PNG", MARGIN_X, y, CONTENT_W, 40);
  y += 50;

  doc.setFont("helvetica", "bold");
  doc.text("Actions Required", MARGIN_X, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  const recos = generateLobRecommendations(snapshot);
  recos.length
    ? recos.forEach((r) => {
        doc.text(`• ${r}`, MARGIN_X + 2, y);
        y += 6;
      })
    : doc.text("No immediate corrective actions required.", MARGIN_X, y);

  /* ============================================================
     PAGE 4 : BUSINESS SUMMARY
  ============================================================ */
  doc.addPage();
  drawHeader(doc);
  y = contentStartY();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Business Summary", MARGIN_X, y);
  y += 10;

  doc.setFont("helvetica", "normal");
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

  /* ============================================================
     FOOTERS (POST-PASS)
  ============================================================ */
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  return doc;
}
