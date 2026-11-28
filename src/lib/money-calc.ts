/**
 * Splits admin_money_position's "ready to withdraw" (earnings + clearing + on
 * the way) into what each part means. Pure, so it is unit-tested.
 */
export function withdrawalMoney(pos: { earningsMinor: number; clearingMinor: number; inFlightMinor: number }): {
  /** Earnings people can still ask to withdraw. */
  askMinor: number;
  /** Earnings still clearing: not withdrawable yet. */
  clearingMinor: number;
  /** Already asked for and not yet settled. */
  onTheWayMinor: number;
  /** What the payout account must be able to send right now. */
  coverMinor: number;
} {
  return {
    askMinor: pos.earningsMinor,
    clearingMinor: pos.clearingMinor,
    onTheWayMinor: pos.inFlightMinor,
    coverMinor: pos.earningsMinor + pos.inFlightMinor,
  };
}

const FUNCTION_MISSING = /could not find the function|does not exist|PGRST202|42883/i;

/**
 * What to say when admin_money_position fails (B137). Only a missing function is a setup gap (migration 066); any
 * other failure (an outage, a permission change) is shown as it is, so it is not mistaken for a setup notice.
 */
export function positionProblem(error: { message: string; code?: string } | null): string | null {
  if (!error) return null;
  if (FUNCTION_MISSING.test(`${error.code ?? ''} ${error.message}`)) return 'The money position function is missing on this database (migration 066).';
  return `Could not read the money position: ${error.message}`;
}

// ----------------------------------------------------------- admin v2 (WP1) --

/** A Money check line, as far as matching a staff note goes. */
export type CheckLine = { code: string; refType: string; refId: string; at: string | null };
export type CheckNoteKey = { code: string; refType: string; refId: string | null; at: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The id a line points at, or null when it points at nothing readable. */
export function lineRefId(line: { refId: string }): string | null {
  return UUID.test(line.refId) ? line.refId.toLowerCase() : null;
}

/**
 * Whether a staff note (migration 250) belongs to this line: same check, same kind of thing and same id.
 * A line that points at nothing also has to have the same time, so one note never hides another line.
 */
export function noteMatches(line: CheckLine, note: CheckNoteKey): boolean {
  if (line.code !== note.code || (line.refType || '') !== (note.refType || '')) return false;
  const id = lineRefId(line);
  if (id) return note.refId?.toLowerCase() === id;
  if (note.refId) return false;
  if (!line.at || !note.at) return !line.at && !note.at;
  return new Date(line.at).getTime() === new Date(note.at).getTime();
}

/** Splits Money check lines into the ones still to look at and the ones staff explained (with the note). */
export function splitExplained<L extends CheckLine, N extends CheckNoteKey>(lines: L[], notes: N[]): { open: L[]; explained: { line: L; note: N }[] } {
  const open: L[] = [];
  const explained: { line: L; note: N }[] = [];
  for (const line of lines) {
    const note = notes.find((x) => noteMatches(line, x));
    if (note) explained.push({ line, note });
    else open.push(line);
  }
  return { open, explained };
}

export type MoveStatus = { label: string; tone: 'ok' | 'earn' | 'wait' | 'bad' | 'mut'; move: 'release' | 'refund' | 'split' | 'none' };

/** Plain words for a Plan B hold in the money moves table. */
export function moveStatus(h: { status: string; failedFrom: string | null; attempts: number }): MoveStatus {
  const moveOf = (s: string | null): MoveStatus['move'] => (s?.startsWith('release') || s === 'released' ? 'release' : s?.startsWith('refund') ? 'refund' : s?.startsWith('split') ? 'split' : 'none');
  switch (h.status) {
    case 'failed':
      return { label: `Failed · try ${Math.max(1, h.attempts)} of 5`, tone: 'bad', move: moveOf(h.failedFrom) };
    case 'release_asked':
      return { label: 'Sending', tone: 'earn', move: 'release' };
    case 'refund_asked':
      return { label: 'Sending', tone: 'earn', move: 'refund' };
    case 'split_asked':
      return { label: 'Sending', tone: 'earn', move: 'split' };
    case 'released':
      return { label: 'Landed', tone: 'ok', move: 'release' };
    case 'refunded':
      return { label: 'Landed', tone: 'ok', move: 'refund' };
    case 'split':
      return { label: 'Landed', tone: 'ok', move: 'split' };
    case 'expired':
      return { label: 'Expired unpaid', tone: 'mut', move: 'none' };
    default:
      return { label: h.status.replace(/_/g, ' '), tone: 'wait', move: 'none' };
  }
}

/** The amount a move sends: the worker's release, the poster's refund, or both for a split. */
export function moveAmountMinor(h: { status: string; failedFrom: string | null; releaseMinor: number; refundMinor: number; chargedMinor: number }): number {
  const m = moveStatus({ status: h.status, failedFrom: h.failedFrom, attempts: 0 }).move;
  if (m === 'release') return h.releaseMinor || h.chargedMinor;
  if (m === 'refund') return h.refundMinor || h.chargedMinor;
  if (m === 'split') return h.releaseMinor + h.refundMinor;
  return h.chargedMinor;
}
