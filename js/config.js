// (BUSINESS CONSTANTS)

export const BRAND = {
  name: "SME & Insurance Inclusion",
  footer: "Confidential | For intended recipient only",
};

export const LOSS_RATIO_THRESHOLDS = {
  GOOD: { max: 60, label: "Healthy", color: "#9BBB59" },
  WATCH: { max: 80, label: "Watchlist", color: "#F79646" },
  POOR: { max: Infinity, label: "High Risk", color: "#C0504D" },
};

export const REQUIRED_FIELDS = ["intermediary", "month", "product", "premium"];
