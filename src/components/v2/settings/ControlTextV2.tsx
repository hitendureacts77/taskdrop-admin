'use client';

import { useActionState, useId, useState } from 'react';
import { lockReason } from '@/components/v2/roles';
import { useV2 } from '@/components/v2/V2Frame';
import { setControlText } from '@/lib/controls-actions';

export type ControlTextValues = {
  maintenance_message: string;
  min_version: string;
  update_url: string;
  banner_text: string;
  banner_level: string;
  banner_link: string;
  banner_ends_at: string;
};

const LOOK: Record<string, string> = { info: 'blue', warning: 'gold', critical: 'red' };

/**
 * Wording, versions and banner for one place (F413–F416), with a live banner preview. Saves through
 * today's setControlText (role check + admin_set_app_control + audit). A blank box clears that control.
 */
export function ControlTextV2({ platform, label, values }: { platform: string; label: string; values: ControlTextValues }) {
  const { role } = useV2();
  const locked = lockReason(role, 'admin');
  const [state, action, pending] = useActionState(setControlText, null);
  const [banner, setBanner] = useState(values.banner_text);
  const [level, setLevel] = useState(values.banner_level || 'info');
  const id = useId();
  return (
    <form action={action} className="wp8a-form">
      <input type="hidden" name="platform" value={platform} />
      <label htmlFor={`${id}-mm`}>Maintenance message</label>
      <input id={`${id}-mm`} name="maintenance_message" maxLength={500} defaultValue={values.maintenance_message} placeholder="We’ll be back soon." />
      <label htmlFor={`${id}-mv`}>Oldest app version allowed</label>
      <input id={`${id}-mv`} name="min_version" maxLength={20} defaultValue={values.min_version} placeholder="No minimum" inputMode="decimal" />
      <div className="hint">Older apps are asked to update. Web is not affected.</div>
      <label htmlFor={`${id}-uu`}>Update link</label>
      <input id={`${id}-uu`} name="update_url" maxLength={500} defaultValue={values.update_url} placeholder="https://…" />
      <label htmlFor={`${id}-bt`}>Banner text</label>
      <input id={`${id}-bt`} name="banner_text" maxLength={300} value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="No banner" />
      <div className="wp8a-g3">
        <div>
          <label htmlFor={`${id}-bl`}>Look</label>
          <select id={`${id}-bl`} name="banner_level" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="info">Information</option>
            <option value="warning">Warning</option>
            <option value="critical">Serious</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-blk`}>Link</label>
          <input id={`${id}-blk`} name="banner_link" maxLength={500} defaultValue={values.banner_link} placeholder="https://…" />
        </div>
        <div>
          <label htmlFor={`${id}-be`}>Ends on</label>
          <input id={`${id}-be`} name="banner_ends_at" type="date" defaultValue={values.banner_ends_at} />
        </div>
      </div>
      <div className={`v2-note ${LOOK[level] ?? 'blue'} wp8a-mt`} aria-live="polite">
        <b className="t">Preview</b>
        {banner.trim() || 'No banner'}
      </div>
      <div className="wp8a-actions">
        <button type="submit" className="v2-btn pri" disabled={pending || Boolean(locked)} title={locked ?? undefined}>
          {pending ? 'Saving…' : `Save for ${label}`}
        </button>
        {state ? (
          <span className={state.ok ? 'wp8a-ok' : 'wp8a-err'} role={state.ok ? 'status' : 'alert'}>
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
