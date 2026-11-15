export function flattenEntregaPages(pagesByProf) {
  const seen = new Set();
  const rows = [];

  Object.values(pagesByProf || {}).forEach((entry) => {
    Object.keys(entry?.pages || {})
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((page) => {
        (entry.pages[page] || []).forEach((item) => {
          if (!item?.id || seen.has(item.id)) return;
          seen.add(item.id);
          rows.push(item);
        });
      });
  });

  return rows;
}

export function buildEntregaPagesByProf(rows, profissionalIds, current = {}) {
  const next = {};
  const grouped = new Map();

  for (const row of rows || []) {
    if (!row?.profissional_id) continue;
    if (!grouped.has(row.profissional_id)) grouped.set(row.profissional_id, []);
    grouped.get(row.profissional_id).push(row);
  }

  for (const profissionalId of profissionalIds || []) {
    const previous = current[profissionalId] || { pages: {}, totalCount: 0, version: 0 };
    const pageRows = grouped.get(profissionalId) || [];
    next[profissionalId] = {
      pages: {
        0: pageRows.map((row) => {
          const normalized = { ...row };
          delete normalized.total_count;
          return normalized;
        }),
      },
      totalCount: Number(pageRows[0]?.total_count || 0),
      loadingPage: null,
      version: previous.version + 1,
    };
  }

  return next;
}
