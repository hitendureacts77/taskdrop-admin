/**
 * Spreadsheet (CSV) building blocks shared by every export. Pure, so it is
 * unit-tested. A route handler that exports must still check for an admin and
 * record the export with admin_log_event before it builds any rows; see
 * api/crm/export/route.ts.
 */

export const csvCell = (v: unknown): string => {
  let s = String(v ?? '');
  // A spreadsheet runs a cell that starts with = + - @ as a formula; defuse it.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Header plus rows as CRLF-separated CSV text, ending with a newline. */
export function toCsv(head: readonly unknown[], rows: readonly (readonly unknown[])[]): string {
  const lines = [head.map(csvCell).join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  return lines.join('\r\n') + '\r\n';
}

/** A download response; the BOM makes Excel read the rupee sign and names as UTF-8. */
export function csvResponse(csv: string, baseName: string): Response {
  const day = new Date().toISOString().slice(0, 10);
  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${baseName}-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
