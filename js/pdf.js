// js/pdf.js
import { BRAND } from "./config.js";
import { classifyLossRatio, generateAlerts } from "./analytics.js";
import { renderBarChart, renderLineChart, renderPieChart } from "./charts.js";
import { generateInsights } from "./analytics.js";

const MARGIN_X = 15;
const HEADER_HEIGHT = 30;
const FOOTER_HEIGHT = 15;

function contentStartY() {
  return HEADER_HEIGHT + 8;
}

function contentEndY(doc) {
  return doc.internal.pageSize.getHeight() - FOOTER_HEIGHT - 8;
}

/* ---------------- HEADER & FOOTER ---------------- */

function drawHeader(doc) {
  const W = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(BRAND.name, MARGIN_X, 16);

  doc.setFontSize(10);
  doc.text("Partner Performance Statement", W - MARGIN_X, 16, {
    align: "right",
  });

  doc.setDrawColor(200);
  doc.line(MARGIN_X, HEADER_HEIGHT - 4, W - MARGIN_X, HEADER_HEIGHT - 4);
}

function drawFooter(doc, pageNo, totalPages) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

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
  doc.setFontSize(12);
  doc.text("Executive Summary", MARGIN_X, y);
  y += 8;

  if (lrClass) {
    doc.setFillColor(lrClass.color);
    doc.rect(MARGIN_X, y - 4, 4, 4, "F");
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Overall Risk Status: ${lrClass ? lrClass.label : "Not Available"}`,
    MARGIN_X + 8,
    y,
  );
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
    snapshot.benchmark?.avg_loss_ratio != null &&
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
        : "Portfolio is high risk and requires immediate corrective action.";

  doc.text(doc.splitTextToSize(narrative, CONTENT_W), MARGIN_X, y);
  y += 14;

  /* ---- Intermediary Box ---- */

  const boxX = MARGIN_X;
  const boxY = y;
  const boxW = CONTENT_W;
  const padding = 4;

  const leftX = boxX + padding;
  const rightX = boxX + boxW / 2 + padding;
  const rightWidth = boxW / 2 - padding * 2;

  // Prepare wrapped branch text
  const branchText = snapshot.meta.branches?.length
    ? snapshot.meta.branches.map((b) => `${b.name} (RM: ${b.rm})`).join(" | ")
    : "—";

  const wrappedBranches = doc.splitTextToSize(
    `Branches / RM: ${branchText}`,

    rightWidth,
  );

  // Calculate dynamic height
  const lineHeight = 6;
  const boxH = Math.max(
    (2 + wrappedBranches.length) * lineHeight + padding * 2,
    22,
  );

  // Draw box
  doc.rect(boxX, boxY, boxW, boxH);

  // Left column
  doc.text(`Intermediary: ${snapshot.meta.partner_name}`, leftX, boxY + 7);
  doc.text(`Code: ${snapshot.meta.partner_code || "—"}`, leftX, boxY + 13);

  // Right column
  doc.text(`Category: ${snapshot.meta.category || "—"}`, rightX, boxY + 7);
  doc.text(wrappedBranches, rightX, boxY + 13);

  y += boxH + 10;

  y = renderLetter(doc, snapshot, y, CONTENT_W);

  /* ===== PAGE 2 : BUSINESS SUMMARY ===== */

  doc.addPage();
  drawHeader(doc);
  y = contentStartY();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
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

  /* ===== PAGE 3 : PORTFOLIO & TRENDS ===== */

  doc.addPage();
  drawHeader(doc);
  y = contentStartY();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Portfolio Mix & Performance Trends", MARGIN_X, y);
  y += 10;

  const bar = renderBarChart(
    snapshot.month_wise.map((m) => m.month),
    snapshot.month_wise.map((m) => m.premium),
  );
  doc.addImage(bar, "PNG", MARGIN_X, y, CONTENT_W, 50);
  y += 60;

  if (typeof snapshot.avg_loss_ratio === "number") {
    const line = renderLineChart(
      snapshot.month_wise.map((m) => m.month),
      snapshot.month_wise.map((m) => m.loss_ratio),
    );
    doc.text("Loss Ratio Trend (%)", MARGIN_X, y - 4);
    doc.addImage(line, "PNG", MARGIN_X, y, CONTENT_W, 40);
    y += 50;
  }

  const pie = renderPieChart(
    snapshot.product_summary?.map((p) => ({
      label: p.product,
      value: p.premium,
    })) || [],
  );
  doc.addImage(pie, "PNG", MARGIN_X, y, 70, 70);

  const insights = generateInsights(snapshot);

  doc.setFontSize(10);
  doc.text("Insights:", MARGIN_X + 80, y + 10);

  doc.text(
    doc.splitTextToSize(
      insights.length ? insights.join(" ") : "No insights available.",
      CONTENT_W - 80,
    ),
    MARGIN_X + 80,
    y + 16,
  );

  y += 50; // spacing after insights

  /* ---- Apply Footer Everywhere ---- */

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  return doc;
}
