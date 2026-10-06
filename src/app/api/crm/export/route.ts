import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { exportCsv, idsForCriteria, idsSuspended, idsWithTag, parseCriteria } from '@/lib/crm';
import { getUsers, isUuid, parseUserFilter } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * A spreadsheet of people. A route handler does not inherit the dashboard's
 * sign-in check, so this checks for an admin itself and answers 401 or 403 to
 * anyone else, before any person is read.
 *
 *   ?segment=1&role=worker&…   the people matching the Segments filters
 *   ?filter=workers&tag=<id>&q=…   the People page's current view
 */
export async function GET(req: Request) {
  const who = await checkAdmin();
  if (who.status === 'unauthenticated') return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  if (who.status === 'forbidden') return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  let ids: string[];
  if (sp.get('segment') === '1') {
    ids = await idsForCriteria(parseCriteria(Object.fromEntries(sp)));
  } else {
    const filter = parseUserFilter(sp.get('filter') ?? undefined);
    const tag = sp.get('tag') ?? '';
    let restrict: string[] | null = null;
    if (filter === 'suspended') restrict = await idsSuspended();
    if (tag && isUuid(tag)) {
      const tagged = await idsWithTag(tag);
      restrict = restrict ? restrict.filter((id) => tagged.includes(id)) : tagged;
    }
    ids = [];
    for (let page = 0; page < 40; page++) {
      const { rows, total } = await getUsers(filter, (sp.get('q') ?? '').slice(0, 80), page, 500, restrict);
      ids.push(...rows.map((r) => r.id));
      if (ids.length >= total || !rows.length) break;
    }
  }

  // Every export of people's details is recorded: who, which view, how many.
  // A failure to record it stops the export -- an unaudited download of personal
  // data is worse than a failed one.
  const supabase = await createClient();
  // `as never`: the generated types predate migration 076, like admin_money_position in data.ts.
  const { error: auditError } = await supabase.rpc(
    'admin_log_event' as never,
    {
      p_action: 'crm.export',
      p_target: sp.get('segment') === '1' ? 'segment' : `people:${sp.get('filter') ?? 'all'}`,
      p_detail: `${ids.length} people; ${req.url.split('?')[1] ?? ''}`.slice(0, 480),
    } as never,
  );
  if (auditError) {
    return NextResponse.json({ error: 'Could not record this export, so it was not produced' }, { status: 500 });
  }

  const csv = await exportCsv(ids);
  const day = new Date().toISOString().slice(0, 10);
  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="taskdrop-people-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
