// js/charts.js (CANVAS → IMAGE)

export function renderBarChart(labels, data) {
  const c = document.createElement("canvas");
  c.width = 500;
  c.height = 250;
  const ctx = c.getContext("2d");

  const max = Math.max(...data, 1);
  data.forEach((v, i) => {
    const h = (v / max) * 150;
    ctx.fillStyle = "#4F81BD";
    ctx.fillRect(40 + i * 50, 200 - h, 30, h);
    ctx.fillStyle = "#000";
    ctx.fillText(labels[i], 40 + i * 50, 220);
  });

  return c.toDataURL();
}

export function renderLineChart(labels, data) {
  const c = document.createElement("canvas");
  c.width = 500;
  c.height = 250;
  const ctx = c.getContext("2d");

  const valid = data.filter((v) => v != null);
  if (!valid.length) return c.toDataURL();

  const max = Math.max(...valid);
  const min = Math.min(...valid);

  const pad = 40;
  const h = 150;
  const w = 400;

  ctx.beginPath();
  data.forEach((v, i) => {
    if (v == null) return;
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / (max - min || 1)) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#C0504D";
  ctx.lineWidth = 2;
  ctx.stroke();

  labels.forEach((l, i) => {
    ctx.fillText(l, pad + i * (w / labels.length), pad + h + 15);
  });

  return c.toDataURL();
}

export function renderPieChart(items) {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 300;

  const ctx = canvas.getContext("2d");
  const cx = 150;
  const cy = 150;
  const radius = 120;

  const colors = [
    "#4F81BD",
    "#C0504D",
    "#9BBB59",
    "#8064A2",
    "#4BACC6",
    "#F79646",
  ];

  const total = items.reduce((sum, item) => sum + (item.value || 0), 0) || 1;

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

  return canvas.toDataURL("image/png");
}
