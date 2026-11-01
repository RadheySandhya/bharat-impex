/**
 * Phone layout for every data table: each row becomes a card, each cell shows its column name.
 *
 * Works on any <table> without per-page changes: column names are read from the header rows
 * (colspan / rowspan aware, so two-level headers become "Stage 1: Casting · Prod Qty"), written
 * to each body cell as data-label, and CSS in index.css (max-width: 767px) lays rows out as cards.
 * Opt a table out with data-no-cards. Desktop rendering is untouched.
 */

const PHONE_QUERY = '(max-width: 767px)';
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60);

// Header text with a space between separate elements, minus desktop-only helper tags like "Col A"
const headerText = (cell) => {
  const parts = [];
  const walk = (node) => {
    if (node.nodeType === 3) { if (node.nodeValue.trim()) parts.push(node.nodeValue.trim()); return; }
    if (node.nodeType === 1 && node.tagName !== 'SVG' && node.tagName !== 'svg') node.childNodes.forEach(walk);
  };
  walk(cell);
  return clean(parts.join(' ').replace(/(^|\s)Col [A-Z]{1,2}(?=\s|$)/g, ' '));
};

function headerRows(table) {
  if (table.tHead && table.tHead.rows.length) return [...table.tHead.rows];
  // Tables without <thead>: leading rows made only of <th>
  const rows = [];
  for (const tr of table.rows) {
    if (tr.cells.length && [...tr.cells].every((c) => c.tagName === 'TH')) rows.push(tr);
    else break;
  }
  return rows;
}

function columnLabels(rows) {
  const grid = [];
  rows.forEach((tr, r) => {
    grid[r] = grid[r] || [];
    let c = 0;
    for (const cell of tr.cells) {
      while (grid[r][c] !== undefined) c++;
      const cs = Math.max(1, cell.colSpan || 1);
      const rs = Math.max(1, cell.rowSpan || 1);
      const text = headerText(cell);
      for (let i = 0; i < rs; i++) {
        grid[r + i] = grid[r + i] || [];
        for (let j = 0; j < cs; j++) grid[r + i][c + j] = text;
      }
      c += cs;
    }
  });
  const cols = grid.reduce((m, g) => Math.max(m, g.length), 0);
  const labels = [];
  for (let c = 0; c < cols; c++) {
    const parts = [];
    grid.forEach((g) => {
      const t = g[c];
      if (t && t !== '#' && !parts.includes(t)) parts.push(t);
    });
    labels.push(parts.join(' · '));
  }
  return labels;
}

function labelTable(table) {
  if (table.hasAttribute('data-no-cards')) return;
  const head = headerRows(table);
  if (!head.length) return;
  const labels = columnLabels(head);
  if (!labels.length) return;
  if (!table.hasAttribute('data-bi-cards')) table.setAttribute('data-bi-cards', '');

  const headSet = new Set(head);
  for (const body of table.tBodies) {
    for (const tr of body.rows) {
      if (headSet.has(tr)) continue;
      let c = 0;
      for (const cell of tr.cells) {
        const span = Math.max(1, cell.colSpan || 1);
        if (span > 2 || (span > 1 && tr.cells.length === 1)) {
          if (!cell.hasAttribute('data-bi-full')) cell.setAttribute('data-bi-full', '');
        } else {
          const label = labels[c] || '';
          if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
        }
        c += span;
      }
    }
  }
}

export function initMobileTables() {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  const mq = window.matchMedia(PHONE_QUERY);
  let scheduled = false;

  const run = () => {
    scheduled = false;
    if (!mq.matches) return;
    document.querySelectorAll('table').forEach(labelTable);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => requestAnimationFrame(run), 120);
  };

  // Tables render and re-render as data loads; relabel after DOM changes (attributes do not retrigger this)
  const observer = new MutationObserver(schedule);
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();
  };
  if (document.body) start(); else window.addEventListener('DOMContentLoaded', start);
  mq.addEventListener?.('change', schedule);
}
