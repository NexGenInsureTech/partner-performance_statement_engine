import { BRAND } from "./config.js";
import { classifyLossRatio, generateAlerts } from "./analytics.js";
import { renderBarChart, renderLineChart } from "./charts.js";

export function renderPdf(snapshot) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 20;
  const W = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text("Partner Performance Statement", W / 2, y, { align: "center" });

  y += 10;
  doc.setFontSize(10);
  doc.text(`Partner: ${snapshot.meta.partner_name}`, 15, y);
  doc.text(`Statement Till: ${snapshot.meta.statement_till}`, 15, y + 6);

  y += 16;

  const lrClass = classifyLossRatio(snapshot.avg_loss_ratio);
  doc.text(
    `Average Loss Ratio: ${
      snapshot.avg_loss_ratio != null ? snapshot.avg_loss_ratio + "%" : "—"
    }`,
    15,
    y,
  );

  if (lrClass) {
    doc.setTextColor(lrClass.color);
    doc.text(lrClass.label, 90, y);
    doc.setTextColor(0);
  }

  y += 10;

  const bar = renderBarChart(
    snapshot.month_wise.map((m) => m.month),
    snapshot.month_wise.map((m) => m.premium),
  );
  doc.addImage(bar, "PNG", 15, y, 180, 55);

  y += 65;

  if (snapshot.avg_loss_ratio != null) {
    const line = renderLineChart(
      snapshot.month_wise.map((m) => m.month),
      snapshot.month_wise.map((m) => m.loss_ratio),
    );
    doc.text("Loss Ratio Trend", 15, y - 4);
    doc.addImage(line, "PNG", 15, y, 180, 45);
    y += 55;
  }

  const alerts = generateAlerts(snapshot.month_wise);
  if (alerts.length) {
    doc.addPage();
    y = 20;
    doc.setFontSize(12);
    doc.text("Key Alerts", 15, y);
    y += 8;
    doc.setFontSize(10);

    alerts.slice(0, 5).forEach((a) => {
      doc.text(`${a.icon} ${a.message}`, 18, y);
      y += 6;
    });
  }

  doc.setFontSize(8);
  doc.text(BRAND.footer, 15, 285);

  return doc;
}
