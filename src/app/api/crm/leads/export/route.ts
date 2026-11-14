import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { filterLeads, leadKindLabel, leadStageLabel, parseLeadFilter } from '@/lib/crm-calc';
import { csvDay, csvResponse, toCsv } from '@/lib/csv';
import { getLeads } from '@/lib/leads';
import { TOO_FAST, withinRate } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * A spreadsheet of leads, for the stage and owner chosen on the Leads page.
 * A route handler does not inherit the dashboard's sign-in check, so this
 * checks for an admin itself, and records the export before building any rows
 * (same rule as api/crm/export).
 */
export async function GET(req: Request) {
  const who = await checkAdmin();
  if (who.status === 'unauthenticated') return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  if (who.status === 'forbidden') return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  if (!(await withinRate(who.user.id, 'admin-export', 10))) return NextResponse.json({ error: TOO_FAST }, { status: 429 });

  const filter = parseLeadFilter(Object.fromEntries(new URL(req.url).searchParams));
  const all = await getLeads(who.user.staffRole);
  if (all.error || all.setup) return NextResponse.json({ error: all.error ?? 'Leads are not set up yet' }, { status: 500 });
  const rows = filterLeads(all.data, filter, who.user.id);

  const supabase = await createClient();
  const { error: auditError } = await supabase.rpc(
    'admin_log_event' as never,
    { p_action: 'crm.export', p_target: 'leads', p_detail: `${rows.length} leads; stage ${filter.stage}, owner ${filter.owner}`.slice(0, 480) } as never,
  );
  if (auditError) return NextResponse.json({ error: 'Could not record this export, so it was not produced' }, { status: 500 });

  const head = ['Name', 'Kind', 'Stage', 'Contact', 'Source', 'Looked after by', 'Note', 'Added (India)', 'Stage since (India)', 'Added by', 'In the app', 'Lead id'];
  const lines = rows.map((l) => [l.name, leadKindLabel(l.kind), leadStageLabel(l.stage), l.contact ?? '', l.source ?? '', l.owner ?? '', l.note ?? '', csvDay(l.createdAt), csvDay(l.stageChangedAt), l.createdBy ?? '', l.userId ?? '', l.id]);
  return csvResponse(toCsv(head, lines), 'taskdrop-leads');
}
