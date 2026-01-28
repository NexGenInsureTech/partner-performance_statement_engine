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
        level: "HIGH", // semantic, not visual
        message: `Loss ratio increased from ${prev}% to ${curr}% in ${sorted[i].month}.`,
      });
    }
  }

  return alerts;
}

export function generateInsights(snapshot) {
  const insights = [];

  // 1️⃣ Loss Ratio Insight
  if (typeof snapshot.avg_loss_ratio === "number") {
    if (snapshot.avg_loss_ratio > 80) {
      insights.push(
        "Loss ratio is high. Immediate corrective action recommended.",
      );
    } else if (snapshot.avg_loss_ratio > 60) {
      insights.push(
        "Loss ratio is elevated. Portfolio should be closely monitored.",
      );
    } else {
      insights.push(
        "Loss ratio is healthy. Current underwriting discipline should continue.",
      );
    }
  } else {
    insights.push("Loss ratio data is not available for this partner.");
  }

  // 2️⃣ Premium Trend Insight
  if (snapshot.month_wise.length >= 2) {
    const last = snapshot.month_wise.at(-1).premium;
    const prev = snapshot.month_wise.at(-2).premium;

    if (last > prev) {
      insights.push("Premium shows positive month-on-month growth.");
    } else if (last < prev) {
      insights.push("Premium declined in the most recent month.");
    }
  }

  // 3️⃣ LOB Concentration Insight
  if (snapshot.lobs.length === 1) {
    insights.push(
      `Business is concentrated in ${snapshot.lobs[0]} LOB. Diversification may reduce risk.`,
    );
  }

  return insights;
}

export function generateLobRecommendations(snapshot) {
  const recos = [];

  snapshot.lobs.forEach((lob) => {
    if (lob.toLowerCase().includes("motor")) {
      recos.push(
        "Motor LOB: Focus on claims control and underwriting discipline.",
      );
    } else if (lob.toLowerCase().includes("health")) {
      recos.push(
        "Health LOB: Stable performance observed. Consider scaling with caution.",
      );
    } else if (lob.toLowerCase().includes("sme")) {
      recos.push(
        "SME LOB: Portfolio diversification and pricing review recommended.",
      );
    }
  });

  return recos;
}

export function lossRatioIndicator(value) {
  if (typeof value !== "number") {
    return { color: [150, 150, 150], label: "Not Available" };
  }

  if (value <= 60) return { color: [155, 187, 89], label: "Healthy" };
  if (value <= 80) return { color: [247, 150, 70], label: "Watchlist" };
  return { color: [192, 80, 77], label: "High Risk" };
}
