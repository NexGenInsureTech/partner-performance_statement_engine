// js/state.js (APP STATE – VERY IMPORTANT)

export const state = {
  premiumRaw: [],
  commissionRaw: [],
  columnMap: {},
  snapshots: [],
  statementTill: "",
};

// state.js
// Single source of truth for the entire application

window.AppState = {
  files: {
    premium: {
      loaded: false,
      data: null,
    },
    commission: {
      loaded: false,
      data: null,
    },
  },

  processing: {
    aggregated: false,
    intermediaryData: null,
  },

  output: {
    pdfReady: false,
    zipReady: false,
  },
};
