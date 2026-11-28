import { NextResponse, type NextRequest } from 'next/server';
import type { TypeaheadGroup, TypeaheadResponse } from '@/components/v2/search/typeahead-types';
import { checkAdmin } from '@/lib/auth';
import { typeaheadReady } from '@/lib/data/search';
import { payoutStatus, taskStatus, TICKET_STATUS } from '@/lib/labels';
import { TOO_FAST, withinRate } from '@/lib/rate-limit';
import { staffCanSee } from '@/lib/staff-roles';
import { searchEverything } from '@/lib/v2/search-data';
import { getHideTestData, getV2 } from '@/lib/v2-gate-server';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

const inr = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * Admin v2 top-bar typeahead (people, jobs, payouts, help requests). Staff
 * only, rate-limited per staff member, and only while the v2 gate is on (off,
 * the route does not exist). Payouts only for a role that sees money.
 */
export async function GET(request: NextRequest) {
  if (!(await getV2())) return NextResponse.json({ ok: false }, { status: 404, headers: NO_STORE });
  const check = await checkAdmin();
  if (check.status !== 'ok') {
    return NextResponse.json({ ok: false }, { status: check.status === 'unauthenticated' ? 401 : 403, headers: NO_STORE });
  }
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80);
  if (!typeaheadReady(q)) return NextResponse.json({ ok: true, q, groups: [] } satisfies TypeaheadResponse, { headers: NO_STORE });
  // Typing sends one request per pause (debounced); 60 a minute is far above a person typing.
  if (!(await withinRate(check.user.id, 'admin-search', 60))) {
    return NextResponse.json({ ok: false, error: TOO_FAST } satisfies TypeaheadResponse, { status: 429, headers: NO_STORE });
  }
  const money = staffCanSee(check.user.staffRole, 'money');
  const found = await searchEverything(q, { limit: 5, money, hide: await getHideTestData() });
  const groups: TypeaheadGroup[] = [];
  if (found.people.rows.length) {
    groups.push({
      title: 'People',
      items: found.people.rows.map((p) => ({ href: `/users/${p.id}`, label: p.name || 'No name', note: p.username ? `@${p.username}` : '', test: p.test })),
    });
  }
  if (found.jobs.rows.length) {
    groups.push({ title: 'Jobs', items: found.jobs.rows.map((t) => ({ href: `/tasks/${t.id}`, label: t.title, note: taskStatus(t.status).label, test: t.test })) });
  }
  if (found.payouts?.rows.length) {
    groups.push({
      title: 'Payouts',
      items: found.payouts.rows.map((w) => ({ href: `/payouts/${w.id}`, label: `${inr(w.amountMinor)} to ${w.name}`, note: payoutStatus(w.status, w.name.split(' ')[0]).label, test: w.test })),
    });
  }
  if (found.tickets.rows.length) {
    groups.push({
      title: 'Help requests',
      items: found.tickets.rows.map((t) => ({ href: `/support/${t.id}`, label: t.subject, note: TICKET_STATUS[t.status]?.label ?? t.status, test: t.test })),
    });
  }
  return NextResponse.json({ ok: true, q, groups } satisfies TypeaheadResponse, { headers: NO_STORE });
}
