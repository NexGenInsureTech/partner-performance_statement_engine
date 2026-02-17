// js/charts.js (CANVAS → IMAGE)

/* ==========================================================
   HI-RES CANVAS FACTORY (CRISP PDF RENDERING)
========================================================== */
function createHiResCanvas(width, height, scale = 3) {
  const canvas = document.createElement("canvas");

  canvas.width = width * scale;
  canvas.height = height * scale;

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  return { canvas, ctx };
}

export function renderBarChart(labels, data) {
  const { canvas, ctx } = createHiResCanvas(800, 360);

  // 🔥 ADD THIS
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const max = Math.max(...data, 1);
  const padding = 60;
  const chartH = 220;
  const chartW = 640;
  const gap = 20;
  const barW = chartW / data.length - gap;
  const baseY = padding + chartH;

  // ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "12px Helvetica";

  data.forEach((v, i) => {
    const h = (v / max) * chartH;
    const x = padding + i * (barW + gap);

    ctx.fillStyle = i === data.length - 1 ? "#1F4E79" : "#9DC3E6";
    ctx.fillRect(x, baseY - h, barW, h);

    ctx.fillStyle = "#000";
    ctx.fillText(`₹${(v / 100000).toFixed(1)}L`, x, baseY - h - 8);
    ctx.fillText(labels[i]?.slice(5), x, baseY + 18);
  });

  return canvas.toDataURL("image/jpeg", 1.0);
}

export function renderLineChart(labels, data) {
  const { canvas, ctx } = createHiResCanvas(800, 360);

  // 🔥 ADD THIS
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const valid = data.filter((v) => v != null);
  if (!valid.length) return canvas.toDataURL("image/jpeg", 1.0);

  const max = Math.max(...valid, 85);
  const min = Math.min(...valid, 40);

  const padding = 60;
  const chartH = 220;
  const chartW = 640;
  const baseY = padding + chartH;

  function yFor(value) {
    return baseY - ((value - min) / (max - min)) * chartH;
  }

  // ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "12px Helvetica";

  /* ===== Risk Bands ===== */

  ctx.fillStyle = "#E2F0D9";
  ctx.fillRect(padding, yFor(60), chartW, baseY - yFor(60));

  ctx.fillStyle = "#FFF2CC";
  ctx.fillRect(padding, yFor(80), chartW, yFor(60) - yFor(80));

  ctx.fillStyle = "#F8D7DA";
  ctx.fillRect(padding, padding, chartW, yFor(80) - padding);

  /* ===== Line ===== */

  ctx.strokeStyle = "#C00000";
  ctx.lineWidth = 3;
  ctx.beginPath();

  data.forEach((v, i) => {
    if (v == null) return;
    const x = padding + (i / (data.length - 1)) * chartW;
    const y = yFor(v);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();

  /* ===== Points ===== */

  ctx.fillStyle = "#C00000";
  data.forEach((v, i) => {
    if (v == null) return;
    const x = padding + (i / (data.length - 1)) * chartW;
    const y = yFor(v);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  /* ===== Labels ===== */

  labels.forEach((l, i) => {
    const x = padding + (i / (labels.length - 1)) * chartW;
    ctx.fillStyle = "#000";
    ctx.fillText(l?.slice(5), x - 15, baseY + 20);
  });

  return canvas.toDataURL("image/jpeg", 1.0);
}

export function renderPieChart(items) {
  const { canvas, ctx } = createHiResCanvas(500, 500);

  // 🔥 ADD THIS
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = 250;
  const cy = 250;
  const radius = 200;

  const colors = [
    "#4F81BD",
    "#C0504D",
    "#9BBB59",
    "#8064A2",
    "#4BACC6",
    "#F79646",
  ];

  const total = items.reduce((sum, i) => sum + (i.value || 0), 0) || 1;

  let startAngle = 0;

  items.forEach((item, index) => {
    const sliceAngle = (item.value / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.fillStyle = colors[index % colors.length];
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    startAngle += sliceAngle;
  });

  return canvas.toDataURL("image/jpeg", 1.0);
}

export function renderLobBarChart(lobs) {
  const { canvas, ctx } = createHiResCanvas(900, 500);

  // 🔥 ADD THIS
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sorted = [...lobs].sort((a, b) => b.premium - a.premium);
  const max = sorted[0]?.premium || 1;

  const barH = 26;
  const gap = 16;
  const leftPad = 200;
  const topPad = 60;

  ctx.font = "14px Helvetica";

  sorted.forEach((l, i) => {
    const y = topPad + i * (barH + gap);
    const w = (l.premium / max) * 550;

    ctx.fillStyle =
      l.loss_ratio != null && l.loss_ratio > 75 ? "#C00000" : "#1F4E79";

    ctx.fillRect(leftPad, y, w, barH);

    ctx.fillStyle = "#000";
    ctx.fillText(l.lob, 20, y + 18);

    ctx.fillText(
      `${l.share_pct}%  |  LR: ${
        l.loss_ratio != null ? l.loss_ratio + "%" : "—"
      }`,
      leftPad + w + 10,
      y + 18,
    );
  });

  return canvas.toDataURL("image/jpeg", 1.0);
}

// export function renderBarChart(labels, data) {
//   const canvas = document.createElement("canvas");
//   canvas.width = 500;
//   canvas.height = 220;

//   const ctx = canvas.getContext("2d");

//   const max = Math.max(...data);
//   const padding = 40;
//   const chartH = 140;
//   const chartW = 420;
//   const barW = chartW / data.length - 10;
//   const baseY = padding + chartH;

//   ctx.clearRect(0, 0, canvas.width, canvas.height);
//   ctx.font = "10px Helvetica";

//   data.forEach((v, i) => {
//     const h = (v / max) * chartH;
//     const x = padding + i * (barW + 10);

//     // Highlight last bar
//     ctx.fillStyle = i === data.length - 1 ? "#2F5597" : "#9DC3E6";

//     ctx.fillRect(x, baseY - h, barW, h);

//     // Value label (₹ in lakhs)
//     ctx.fillStyle = "#000";
//     ctx.fillText(`₹${(v / 100000).toFixed(1)}L`, x, baseY - h - 4);

//     // Month label
//     ctx.fillText(labels[i].slice(5), x, baseY + 12);
//   });

//   return canvas.toDataURL("image/png");
// }

// export function renderLineChart(labels, data) {
//   const canvas = document.createElement("canvas");
//   canvas.width = 500;
//   canvas.height = 220;

//   const ctx = canvas.getContext("2d");

//   const valid = data.filter((v) => v != null);
//   if (!valid.length) return canvas.toDataURL("image/png");

//   const max = Math.max(...valid, 85);
//   const min = Math.min(...valid, 40);

//   const padding = 40;
//   const chartH = 140;
//   const chartW = 420;
//   const baseY = padding + chartH;

//   ctx.clearRect(0, 0, canvas.width, canvas.height);
//   ctx.font = "10px Helvetica";

//   /* ================= THRESHOLD BANDS ================= */

//   function yFor(value) {
//     return baseY - ((value - min) / (max - min)) * chartH;
//   }

//   // Healthy (<=60)
//   ctx.fillStyle = "#E2F0D9";
//   ctx.fillRect(padding, yFor(60), chartW, baseY - yFor(60));

//   // Watchlist (60–80)
//   ctx.fillStyle = "#FFF2CC";
//   ctx.fillRect(padding, yFor(80), chartW, yFor(60) - yFor(80));

//   // High Risk (>80)
//   ctx.fillStyle = "#F8D7DA";
//   ctx.fillRect(padding, padding, chartW, yFor(80) - padding);

//   /* ================= AXIS LABELS ================= */

//   ctx.fillStyle = "#000";
//   ctx.fillText("Healthy ≤60%", 10, yFor(55));
//   ctx.fillText("Watch 60–80%", 10, yFor(70));
//   ctx.fillText("High Risk >80%", 10, yFor(85));

//   /* ================= LOSS RATIO LINE ================= */

//   ctx.strokeStyle = "#C0504D";
//   ctx.lineWidth = 2;
//   ctx.beginPath();

//   data.forEach((v, i) => {
//     if (v == null) return;

//     const x = padding + (i / (data.length - 1)) * chartW;
//     const y = yFor(v);

//     i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
//   });

//   ctx.stroke();

//   /* ================= POINT MARKERS ================= */

//   ctx.fillStyle = "#C0504D";
//   data.forEach((v, i) => {
//     if (v == null) return;
//     const x = padding + (i / (data.length - 1)) * chartW;
//     const y = yFor(v);
//     ctx.beginPath();
//     ctx.arc(x, y, 3, 0, Math.PI * 2);
//     ctx.fill();
//   });

//   /* ================= X LABELS ================= */

//   labels.forEach((l, i) => {
//     const x = padding + (i / (labels.length - 1)) * chartW;
//     ctx.fillStyle = "#000";
//     ctx.fillText(l.slice(5), x - 10, baseY + 14);
//   });

//   return canvas.toDataURL("image/png");
// }

// export function renderPieChart(items) {
//   const canvas = document.createElement("canvas");
//   canvas.width = 300;
//   canvas.height = 300;

//   const ctx = canvas.getContext("2d");
//   const cx = 150;
//   const cy = 150;
//   const radius = 120;

//   const colors = [
//     "#4F81BD",
//     "#C0504D",
//     "#9BBB59",
//     "#8064A2",
//     "#4BACC6",
//     "#F79646",
//   ];

//   const total = items.reduce((sum, item) => sum + (item.value || 0), 0) || 1;

//   let startAngle = 0;

//   items.forEach((item, index) => {
//     const sliceAngle = (item.value / total) * Math.PI * 2;

//     ctx.beginPath();
//     ctx.moveTo(cx, cy);
//     ctx.fillStyle = colors[index % colors.length];
//     ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
//     ctx.closePath();
//     ctx.fill();

//     startAngle += sliceAngle;
//   });

//   return canvas.toDataURL("image/png");
// }

// export function renderLobBarChart(lobs) {
//   const canvas = document.createElement("canvas");
//   canvas.width = 400;
//   canvas.height = 200;

//   const ctx = canvas.getContext("2d");

//   const sorted = [...lobs].sort((a, b) => b.premium - a.premium);
//   const max = sorted[0]?.premium || 1;

//   const barH = 18;
//   const gap = 8;
//   const leftPad = 90;
//   const topPad = 20;

//   ctx.font = "10px Helvetica";

//   sorted.forEach((l, i) => {
//     const y = topPad + i * (barH + gap);
//     const w = (l.premium / max) * 260;

//     // Color by loss ratio
//     ctx.fillStyle =
//       l.loss_ratio != null && l.loss_ratio > 75 ? "#C0504D" : "#4F81BD";

//     ctx.fillRect(leftPad, y, w, barH);

//     // LOB name
//     ctx.fillStyle = "#000";
//     ctx.fillText(l.lob, 10, y + 12);

//     // % share
//     ctx.fillText(`${l.share_pct}%`, leftPad + w + 4, y + 12);
//   });

//   return canvas.toDataURL("image/png");
// }
