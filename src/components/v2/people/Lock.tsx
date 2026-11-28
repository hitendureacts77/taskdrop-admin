'use client';

import type { ReactNode } from 'react';
import { lockReason, type V2Area } from '../roles';
import { useV2 } from '../V2Frame';

/**
 * Wraps one of today's small forms (note, tag, owner, follow-up, message) on the v2 person page so a role that
 * may not act sees it greyed out with the reason, like a locked v2 Confirm button. UI only: the server
 * action still checks the role.
 */
export function Lock({ area, children }: { area: V2Area; children: ReactNode }) {
  const { role } = useV2();
  const why = lockReason(role, area);
  return (
    <fieldset className="wp3-lock" disabled={Boolean(why)} title={why ?? undefined}>
      {why ? <p className="wp3-lock-why">{why}</p> : null}
      {children}
    </fieldset>
  );
}
