import { derivePartnerCategory } from './analytics.js';
// js/data.js (DATA NORMALIZATION + MERGE)

export function normalize(rows, map) {
  return rows.map((r) => ({
    intermediary: r[map.intermediary],
    month: String(r[map.month]).slice(0, 7),
    lob: map.lob ? r[map.lob] : null,
    product: r[map.product],

    // Business identifiers (NEW)
    partner_code: map.partner_code ? r[map.partner_code] : null,
    category: map.category ? r[map.category] : null,
    branch: map.branch ? r[map.branch] : null,
    rm: map.rm ? r[map.rm] : null,

    policies: +r[map.policies] || 0,
    premium: +r[map.premium] || 0,
    commission: +r[map.commission] || 0,
    loss_ratio: map.loss_ratio ? +r[map.loss_ratio] || null : null,
  }));
}

export function mergeRows(premiumRows, commissionRows) {
  const out = new Map();

  function key(r) {
    return `${r.intermediary}|${r.month}|${r.product}`;
  }

  [...premiumRows, ...commissionRows].forEach((r) => {
    const k = key(r);
    if (!out.has(k)) {
      out.set(k, { ...r });
      return;
    }
    const t = out.get(k);
    t.premium += r.premium;
    t.commission += r.commission;
    t.policies += r.policies;
    if (r.loss_ratio != null) t.loss_ratio = r.loss_ratio;
  });

  return [...out.values()];
}

export function buildSnapshots(rows, statementTill) {
  const map = {};

  rows.forEach((r) => {
    if (!map[r.intermediary]) {
      map[r.intermediary] = {
        meta: {
          partner_name: r.intermediary,
          partner_code: r.partner_code || null,
          category: r.category || null,
          branches: [],
          statement_till: statementTill,
        },
        totals: {
          premium: 0,
          commission: 0,
          policies: 0,
          loss_ratio_premium: 0,
          loss_ratio_base: 0,
        },
        month_wise: {},
        lob_summary: {}, // ✅ NEW
      };
    }

    const p = map[r.intermediary];

    /* ---------- Branch / RM (deduplicated) ---------- */
    if (r.branch && r.rm) {
      const exists = p.meta.branches.some(
        (b) => b.name === r.branch && b.rm === r.rm,
      );
      if (!exists) {
        p.meta.branches.push({ name: r.branch, rm: r.rm });
      }
    }

    /* ---------- Totals ---------- */
    p.totals.premium += r.premium;
    p.totals.commission += r.commission;
    p.totals.policies += r.policies;

    if (r.loss_ratio != null && r.premium > 0) {
      p.totals.loss_ratio_premium += r.loss_ratio * r.premium;
      p.totals.loss_ratio_base += r.premium;
    }

    /* ---------- Month-wise ---------- */
    if (!p.month_wise[r.month]) {
      p.month_wise[r.month] = {
        month: r.month,
        premium: 0,
        commission: 0,
        policies: 0,
        loss_ratio: null,
      };
    }

    p.month_wise[r.month].premium += r.premium;
    p.month_wise[r.month].commission += r.commission;
    p.month_wise[r.month].policies += r.policies;

    if (r.loss_ratio != null) {
      p.month_wise[r.month].loss_ratio = r.loss_ratio;
    }

    /* ---------- LOB Summary (NEW, CRITICAL) ---------- */
    if (r.lob) {
      if (!p.lob_summary[r.lob]) {
        p.lob_summary[r.lob] = {
          lob: r.lob,
          premium: 0,
          loss_ratio_sum: 0,
          loss_ratio_count: 0,
        };
      }

      p.lob_summary[r.lob].premium += r.premium;

      if (r.loss_ratio != null) {
        p.lob_summary[r.lob].loss_ratio_sum += r.loss_ratio;
        p.lob_summary[r.lob].loss_ratio_count++;
      }
    }
  });

  /* ---------- Finalize snapshots ---------- */
  return Object.values(map).map((p) => ({
    meta: p.meta,
    totals: {
      premium: p.totals.premium,
      commission: p.totals.commission,
      policies: p.totals.policies,
    },
    avg_loss_ratio:
      p.totals.loss_ratio_base > 0
        ? +(p.totals.loss_ratio_premium / p.totals.loss_ratio_base).toFixed(2)
        : null,
    month_wise: Object.values(p.month_wise).sort(
      (a, b) => new Date(a.month) - new Date(b.month),
    ),
    lob_summary: Object.values(p.lob_summary).map((l) => ({
      lob: l.lob,
      premium: l.premium,
      share_pct: +((l.premium * 100) / p.totals.premium).toFixed(2),
      loss_ratio:
        l.loss_ratio_count > 0
          ? +(l.loss_ratio_sum / l.loss_ratio_count).toFixed(2)
          : null,
    })),
  }));
}

export function computeLobMetrics(rows) {
  const map = {};

  rows.forEach((r) => {
    if (!r.lob || typeof r.loss_ratio !== "number") return;

    if (!map[r.lob]) {
      map[r.lob] = {
        premium: 0,
        weighted_lr: 0,
      };
    }

    map[r.lob].premium += r.premium;
    map[r.lob].weighted_lr += r.loss_ratio * r.premium;
  });

  return Object.entries(map).map(([lob, v]) => ({
    lob,
    avg_loss_ratio:
      v.premium > 0 ? +(v.weighted_lr / v.premium).toFixed(2) : null,
  }));
}
