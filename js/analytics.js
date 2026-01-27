import { LOSS_RATIO_THRESHOLDS } from "./config.js";

export function classifyLossRatio(v) {
  if (v == null || isNaN(v)) return null;
  if (v <= LOSS_RATIO_THRESHOLDS.GOOD.max) return LOSS_RATIO_THRESHOLDS.GOOD;
  if (v <= LOSS_RATIO_THRESHOLDS.WATCH.max) return LOSS_RATIO_THRESHOLDS.WATCH;
  return LOSS_RATIO_THRESHOLDS.POOR;
}

export function generateAlerts(months) {
  const alerts = [];
  const sorted = [...months].sort(
    (a, b) => new Date(a.month) - new Date(b.month),
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].loss_ratio;
    const curr = sorted[i].loss_ratio;

    if (prev != null && curr != null && curr > prev) {
      alerts.push({
        icon: "🔴",
        message: `Loss ratio increased from ${prev}% to ${curr}% in ${sorted[i].month}`,
      });
    }
  }

  return alerts;
}
