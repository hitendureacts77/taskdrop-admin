/**
 * Pure helpers for leads, customer owners and automation rules. No database
 * access, so they are unit-tested (crm-calc.test.ts).
 */

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- owners --

/** 'anyone', 'me', 'nobody', or a staff member's id. */
export type OwnerFilter = string;

export function parseOwnerFilter(v: string | string[] | undefined): OwnerFilter {
  const s = (first(v) ?? '').trim().toLowerCase();
  if (s === 'me' || s === 'nobody') return s;
  return UUID.test(s) ? s : 'anyone';
}

/** Does a person (or lead) with this owner pass the filter? */
export function matchesOwner(ownerId: string | null | undefined, filter: OwnerFilter, meId: string): boolean {
  if (filter === 'anyone') return true;
  if (filter === 'nobody') return !ownerId;
  const want = filter === 'me' ? meId : filter;
  return Boolean(ownerId) && ownerId!.toLowerCase() === want.toLowerCase();
}

export const ownerFilterLabel = (filter: OwnerFilter, staff: { id: string; name: string }[]): string =>
  filter === 'anyone' ? 'Anyone’s' : filter === 'me' ? 'My' : filter === 'nobody' ? 'Nobody’s' : `${staff.find((s) => s.id === filter)?.name ?? 'A staff member'}’s`;

// ----------------------------------------------------------------- leads --

export const LEAD_STAGES = [
  { key: 'new', label: 'New', hint: 'Just added, nobody has reached out yet' },
  { key: 'contacted', label: 'Contacted', hint: 'We have sent a first message or made a call' },
  { key: 'talking', label: 'Talking', hint: 'They replied and it is going somewhere' },
  { key: 'won', label: 'Won', hint: 'They signed up or said yes' },
  { key: 'lost', label: 'Lost', hint: 'They said no or went quiet' },
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number]['key'];

export const LEAD_KINDS = [
  { key: 'business', label: 'Business' },
  { key: 'person', label: 'Person' },
  { key: 'other', label: 'Other' },
] as const;
export type LeadKind = (typeof LEAD_KINDS)[number]['key'];

export const asLeadStage = (v: unknown): LeadStage | null => (LEAD_STAGES.some((s) => s.key === v) ? (v as LeadStage) : null);
export const asLeadKind = (v: unknown): LeadKind => (LEAD_KINDS.some((k) => k.key === v) ? (v as LeadKind) : 'business');
export const leadStageLabel = (v: string) => LEAD_STAGES.find((s) => s.key === v)?.label ?? v;
export const leadKindLabel = (v: string) => LEAD_KINDS.find((k) => k.key === v)?.label ?? v;

export type LeadFilter = { stage: LeadStage | 'all'; owner: OwnerFilter };

export function parseLeadFilter(sp: SP): LeadFilter {
  return { stage: asLeadStage(first(sp.stage)) ?? 'all', owner: parseOwnerFilter(sp.owner) };
}

export function leadFilterQuery(f: LeadFilter): string {
  const p = new URLSearchParams();
  if (f.stage !== 'all') p.set('stage', f.stage);
  if (f.owner !== 'anyone') p.set('owner', f.owner);
  return p.toString();
}

export function countByStage(leads: { stage: string }[]): Record<LeadStage, number> {
  const out: Record<LeadStage, number> = { new: 0, contacted: 0, talking: 0, won: 0, lost: 0 };
  for (const l of leads) {
    const s = asLeadStage(l.stage);
    if (s) out[s] += 1;
  }
  return out;
}

/** Owner filter first (the counts above the list follow it), then the stage. */
export function filterLeads<T extends { stage: string; ownerId: string | null }>(leads: T[], f: LeadFilter, meId: string): T[] {
  return leads.filter((l) => matchesOwner(l.ownerId, f.owner, meId) && (f.stage === 'all' || l.stage === f.stage));
}

export type LeadInput = { name: string; contact: string | null; kind: LeadKind; source: string | null; note: string | null; owner: string | null };

/** Clean up the add-lead form. The database checks the owner is staff; this checks the text. */
export function parseLeadInput(raw: Record<string, string>): { ok: true; value: LeadInput } | { ok: false; message: string } {
  const name = (raw.name ?? '').trim();
  if (!name) return { ok: false, message: 'Type the lead’s name.' };
  if (name.length > 120) return { ok: false, message: 'Keep the name to 120 characters.' };
  const contact = (raw.contact ?? '').trim();
  if (contact.length > 200) return { ok: false, message: 'Keep the contact details to 200 characters.' };
  const source = (raw.source ?? '').trim();
  if (source.length > 120) return { ok: false, message: 'Keep the source to 120 characters.' };
  const note = (raw.note ?? '').trim();
  if (note.length > 2000) return { ok: false, message: 'Keep the note to 2000 characters.' };
  const owner = (raw.owner ?? '').trim();
  if (owner && !UUID.test(owner)) return { ok: false, message: 'That owner id looks wrong. Refresh the page.' };
  return { ok: true, value: { name, contact: contact || null, kind: asLeadKind(raw.kind), source: source || null, note: note || null, owner: owner || null } };
}

// ----------------------------------------------------------------- rules --

export const RULE_KINDS = [
  { key: 'funded_no_task', label: 'Paid in, then nothing posted' },
  { key: 'dispute_opened', label: 'Dispute opened' },
] as const;
export type RuleKind = (typeof RULE_KINDS)[number]['key'];

export const asRuleKind = (v: unknown): RuleKind | null => (RULE_KINDS.some((k) => k.key === v) ? (v as RuleKind) : null);
export const ruleKindLabel = (v: string) => RULE_KINDS.find((k) => k.key === v)?.label ?? v;

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/** What a rule does, in a sentence a non-technical admin can read. */
export function describeRule(kind: string, n: number): string {
  if (kind === 'funded_no_task') return `A customer paid in money ${days(n)} ago and has not posted a job since: a follow-up is created for them.`;
  if (kind === 'dispute_opened') return `A dispute was opened in the last ${days(n)}: a follow-up is created for the person who opened it.`;
  return 'An unknown kind of rule. It does nothing until you change its type.';
}

export type RuleInput = { id: string | null; name: string; kind: RuleKind; days: number; enabled: boolean };

export function parseRuleInput(raw: Record<string, string>): { ok: true; value: RuleInput } | { ok: false; message: string } {
  const name = (raw.name ?? '').trim();
  if (!name) return { ok: false, message: 'Give the rule a name.' };
  if (name.length > 120) return { ok: false, message: 'Keep the name to 120 characters.' };
  const kind = asRuleKind(raw.kind);
  if (!kind) return { ok: false, message: 'Choose what kind of rule this is.' };
  const n = Number(raw.days);
  if (!Number.isInteger(n) || n < 1 || n > 90) return { ok: false, message: 'Days must be a whole number from 1 to 90.' };
  const id = (raw.id ?? '').trim();
  if (id && !UUID.test(id)) return { ok: false, message: 'That rule id looks wrong. Refresh the page.' };
  return { ok: true, value: { id: id || null, name, kind, days: n, enabled: raw.enabled === 'true' } };
}

/** How many follow-ups each rule has created, and when it last did. */
export function summarizeRuleTasks(rows: { rule_id: string | null; created_at: string }[]): Map<string, { count: number; last: string }> {
  const out = new Map<string, { count: number; last: string }>();
  for (const r of rows) {
    if (!r.rule_id) continue;
    const cur = out.get(r.rule_id);
    if (!cur) out.set(r.rule_id, { count: 1, last: r.created_at });
    else {
      cur.count += 1;
      if (r.created_at > cur.last) cur.last = r.created_at;
    }
  }
  return out;
}
