import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { exportCsv, idsForCriteria, idsSuspended, idsWithTag, parseCriteria } from '@/lib/crm';
import { getUsers, isUuid, parseUserFilter } from '@/lib/data';

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
