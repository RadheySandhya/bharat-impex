import Papa from 'papaparse';

/**
 * Robust CSV reading shared by every importer.
 * - strips the UTF-8 BOM Excel adds (otherwise the first header, e.g. "Code", is not recognised)
 * - handles quoted cells with commas / line breaks, CRLF or LF, and ; or tab delimiters (auto-detect)
 * - drops blank lines, trims cells, turns Excel non-breaking spaces into normal spaces
 * Returns an array of rows; each row is an array of strings (row 0 = headers).
 */
export function parseCsvRows(text) {
  const clean = String(text || '').replace(/^﻿/, '');
  const res = Papa.parse(clean, { skipEmptyLines: 'greedy' });
  return (res.data || [])
    .map((r) => (Array.isArray(r) ? r : []).map((c) => String(c ?? '').replace(/ /g, ' ').trim()))
    .filter((r) => r.some((c) => c !== ''));
}

/** Header text -> comparable key: no BOM/quotes, single spaces, lower case. */
export const normHeader = (h) => String(h || '').replace(/^﻿/, '').replace(/['"]+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** "1,250.50", "₹ 1,250", " 12 " -> number (0 when empty / invalid). */
export const csvNumber = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[,₹\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
