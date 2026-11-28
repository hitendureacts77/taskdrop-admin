/** Pure helpers for the Skills & categories page (migration 226 rows). */

export type CatalogKind = 'skill' | 'category';
export type CatalogStatus = 'live' | 'hidden' | 'merged';
export type CatalogFilter = 'all' | 'added' | 'new' | 'hidden';

export type CatalogRow = {
  id: string;
  label: string;
  status: CatalogStatus;
  source: 'builtin' | 'user';
  uses: number;
  rank: number | null;
  createdByName: string | null;
  createdAt: string;
  phrases: { id: string; phrase: string }[];
  mergedLabels: string[];
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function asKind(v: unknown): CatalogKind {
  return v === 'category' ? 'category' : 'skill';
}

export function asFilter(v: unknown): CatalogFilter {
  return v === 'added' || v === 'new' || v === 'hidden' ? v : 'all';
}

/** Added in the last 7 days (the "New this week" filter and the v2 pill). */
export function isNewThisWeek(r: Pick<CatalogRow, 'createdAt'>, now: Date): boolean {
  return now.getTime() - new Date(r.createdAt).getTime() <= WEEK_MS;
}

export function matchesFilter(r: CatalogRow, f: CatalogFilter, now: Date): boolean {
  if (r.status === 'merged') return false;
  if (f === 'added') return r.source === 'user';
  if (f === 'new') return isNewThisWeek(r, now);
  if (f === 'hidden') return r.status === 'hidden';
  return true;
}

export function filterCounts(rows: CatalogRow[], now: Date): Record<CatalogFilter, number> {
  const out: Record<CatalogFilter, number> = { all: 0, added: 0, new: 0, hidden: 0 };
  for (const f of Object.keys(out) as CatalogFilter[]) out[f] = rows.filter((r) => matchesFilter(r, f, now)).length;
  return out;
}

/** Live rows by rank first, then hidden rows (no rank) by most used. */
export function sortRows(rows: CatalogRow[]): CatalogRow[] {
  return [...rows].sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return b.uses - a.uses || a.label.localeCompare(b.label);
  });
}

/** "Also matches": phrases then merged labels, comma list, an en dash when none. */
export function alsoMatches(r: Pick<CatalogRow, 'phrases' | 'mergedLabels'>): string {
  const all = [...r.phrases.map((p) => p.phrase), ...r.mergedLabels];
  return all.length ? all.join(', ') : '–';
}

export function mapCatalogRow(raw: Record<string, unknown>): CatalogRow {
  const phrases = Array.isArray(raw.phrases) ? (raw.phrases as Record<string, unknown>[]) : [];
  const merged = Array.isArray(raw.merged_labels) ? (raw.merged_labels as unknown[]) : [];
  return {
    id: String(raw.id),
    label: String(raw.label ?? ''),
    status: raw.status === 'hidden' || raw.status === 'merged' ? raw.status : 'live',
    source: raw.source === 'user' ? 'user' : 'builtin',
    uses: Number(raw.uses ?? 0),
    rank: raw.rank == null ? null : Number(raw.rank),
    createdByName: raw.created_by_name ? String(raw.created_by_name) : null,
    createdAt: String(raw.created_at ?? ''),
    phrases: phrases.map((p) => ({ id: String(p.id), phrase: String(p.phrase ?? '') })),
    mergedLabels: merged.map(String),
  };
}

/** The merge explainer shown in the dialog. */
export function mergeExplainer(uses: number, from: string, to: string, kind: CatalogKind): string {
  const who = kind === 'skill' ? (uses === 1 ? 'worker’s profile changes' : 'workers’ profiles change') : uses === 1 ? 'task changes' : 'tasks change';
  const next = kind === 'skill' ? 'the next worker who types it is asked to pick' : 'the next person who types it is asked to pick';
  return `${uses} ${who} from ${from} to ${to}. “${from}” now points to ${to}, so ${next} ${to}.`;
}
