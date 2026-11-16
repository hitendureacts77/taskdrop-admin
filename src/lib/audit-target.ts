/**
 * Which person an audit-log row is about (B108). The database trigger stores the changed row's own
 * id as target_id (a suspension's id, not the person's), staff actions store `user:<id>` or the
 * plain id, and a one-person message keeps the person in `to_user`. Pure, so it can be tested.
 */
export type AuditTargetRow = { table: string | null; targetId: string | null; before: unknown; after: unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s);

/** Tables whose rows carry the person in a `user_id` column. */
const PERSON_COLUMN_TABLES = new Set(['user_suspensions', 'user_roles', 'wallet_adjustments', 'payouts', 'crm_user_tags']);

export function auditPersonId(r: AuditTargetRow): string | null {
  const field = (k: string) => {
    for (const side of [r.after, r.before]) {
      const v = side && typeof side === 'object' ? (side as Record<string, unknown>)[k] : undefined;
      if (isUuid(v)) return v;
    }
    return null;
  };
  if (r.table === 'event') {
    const t = r.targetId ?? '';
    const id = t.startsWith('user:') ? t.slice(5) : t;
    return isUuid(id) ? id : null;
  }
  if (r.table === 'crm_broadcasts') return field('to_user');
  if (r.table && PERSON_COLUMN_TABLES.has(r.table)) return field('user_id');
  return null;
}

const TABLE_WORDS: Record<string, [insert: string, update: string, del: string]> = {
  user_suspensions: ['Suspended them', 'Changed their suspension', 'Removed a suspension'],
  user_roles: ['Gave them a role', 'Changed their role', 'Took a role away'],
  wallet_adjustments: ['Changed their wallet', 'Changed a wallet change', 'Removed a wallet change'],
  payouts: ['Withdrawal added', 'Withdrawal changed', 'Withdrawal removed'],
  crm_broadcasts: ['Sent them a message', 'Changed a sent message', 'Removed a sent message'],
};

/** A row's action in plain words for a person's Audit tab; `events` names the staff actions. */
export function auditWords(action: string, table: string | null, events: Record<string, string>): string {
  if (table === 'event') return events[action] ?? action.replace(/[._]/g, ' ');
  const words = table ? TABLE_WORDS[table] : undefined;
  const verb = action.split(' ')[0]?.toUpperCase();
  if (words) return verb === 'INSERT' ? words[0] : verb === 'DELETE' ? words[2] : words[1];
  return action;
}

/** A PostgREST `or` filter for every audit row that names this person. Refuses anything but a uuid. */
export function personAuditOr(userId: string): string {
  if (!isUuid(userId)) throw new Error('Not a person id');
  return [
    `target_id.eq.${userId}`,
    `target_id.eq.user:${userId}`,
    `after->>user_id.eq.${userId}`,
    `before->>user_id.eq.${userId}`,
    `after->>to_user.eq.${userId}`,
  ].join(',');
}
