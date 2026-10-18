import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { csvResponse, toCsv } from '@/lib/csv';
import { addIstDays, istDayKey, startOfIstDay } from '@/lib/days';
import { getBusinessDaily } from '@/lib/growth';
import { staffCanSee } from '@/lib/staff-roles';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * The day-by-day business figures as a spreadsheet. A route handler does not
 * inherit the dashboard's sign-in check, so this checks for an admin itself
 * and records the download before it reads anything.
 *
 *   ?days=7|30|90|365
 */
export async function GET(req: Request) {
  const who = await checkAdmin();
  if (who.status === 'unauthenticated') return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  if (who.status === 'forbidden') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  if (!staffCanSee(who.user.staffRole, 'money')) return NextResponse.json({ error: 'Your role does not include business figures' }, { status: 403 });

  const raw = Number(new URL(req.url).searchParams.get('days'));
  const days = [7, 30, 90, 365].includes(raw) ? raw : 30;
  const to = istDayKey(startOfIstDay());
  const from = istDayKey(addIstDays(startOfIstDay(), -(days - 1)));

  const supabase = await createClient();
  const { error: auditError } = await supabase.rpc(
    'admin_log_event' as never,
    { p_action: 'reports.export', p_target: `business:${days}d`, p_detail: `${from} to ${to}` } as never,
  );
  if (auditError) return NextResponse.json({ error: 'Could not record this export, so it was not produced' }, { status: 500 });

  const daily = await getBusinessDaily(from, to);
  if (daily.setup) return NextResponse.json({ error: 'The analytics database update has not been applied yet' }, { status: 409 });
  if (daily.error) return NextResponse.json({ error: daily.error }, { status: 500 });

  const head = ['Day', 'New people', 'Jobs posted', 'Jobs finished', 'Cancellations', 'Disputes decided', 'Paid in for jobs ₹', 'Wallet top-ups ₹', 'TaskDrop earned ₹'];
  const rupees = (m: number) => (m / 100).toFixed(2);
  const rows = daily.data.map((d) => [d.day, d.newPeople, d.jobsPosted, d.jobsFinished, d.cancellations, d.disputesDecided, rupees(d.fundedMinor), rupees(d.topupMinor), rupees(d.revenueMinor)]);
  return csvResponse(toCsv(head, rows), 'taskdrop-business');
}
