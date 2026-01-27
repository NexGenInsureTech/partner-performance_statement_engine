// js/utils.js (SAFE HELPERS)

export function setProgress(bar, pct) {
  bar.style.width = pct + "%";
  bar.textContent = pct + "%";
  return new Promise((r) => requestAnimationFrame(r));
}

export async function readSheet(file) {
  const wb = XLSX.read(await file.arrayBuffer());
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
}

export function assert(condition, message) {
  if (!condition) {
    alert(message);
    throw new Error(message);
  }
}

export function isEmpty(value) {
  return value === undefined || value === null || value === "";
}
