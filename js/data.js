// js/data.js (DATA NORMALIZATION + MERGE)

export function normalize(rows, map) {
  return rows.map((r) => ({
    intermediary: r[map.intermediary],
    month: String(r[map.month]).slice(0, 7),
    lob: map.lob ? r[map.lob] : "—",
    product: r[map.product],
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
        lob_set: new Set(),
      };
    }

    const p = map[r.intermediary];

    if (r.lob) {
      p.lob_set.add(r.lob);
    }

    p.totals.premium += r.premium;
    p.totals.commission += r.commission;
    p.totals.policies += r.policies;

    if (r.loss_ratio != null && r.premium > 0) {
      p.totals.loss_ratio_premium += r.loss_ratio * r.premium;
      p.totals.loss_ratio_base += r.premium;
    }

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
  });

  return Object.values(map).map((p) => ({
    meta: p.meta,
    totals: {
      premium: p.totals.premium,
      commission: p.totals.commission,
      policies: p.totals.policies,
    },
    lobs: Array.from(p.lob_set),
    avg_loss_ratio:
      p.totals.loss_ratio_base > 0
        ? +(p.totals.loss_ratio_premium / p.totals.loss_ratio_base).toFixed(2)
        : null,
    month_wise: Object.values(p.month_wise).sort(
      (a, b) => new Date(a.month) - new Date(b.month),
    ),
  }));
}
