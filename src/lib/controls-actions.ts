'use server';

import { revalidatePath } from 'next/cache';
import { areaFor, asPlatform, FEATURE_SWITCHES, needsMfa, REQUIRE_PHONE, TEXT_KEYS } from './controls-meta';
import { requireAdmin } from './data';
import { moneyMfaGate } from './mfa';
import { staffGate } from './staff';
import { createClient } from './supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Changes to the per-platform app controls. The database function
 * admin_set_app_control checks the role and the authenticator code again and
 * writes the audit log; the checks here only give a plainer message first.
 */

function friendly(message: string): string {
  if (/admins only/i.test(message)) return 'Only admins can do this. Sign in again with an admin account.';
  if (/does not exist|schema cache/i.test(message)) return 'This needs a database update that has not been applied yet.';
  return message.replace(/^(error:\s*)/i, '');
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const BOOL_KEYS = new Set(['maintenance', REQUIRE_PHONE.key, ...FEATURE_SWITCHES.map((s) => s.key)]);

async function apply(platform: string, changes: Record<string, unknown>, reason: string): Promise<ActionResult> {
  await requireAdmin();
  const p = asPlatform(platform);
  if (!p) return { ok: false, message: 'Unknown platform.' };
  const keys = Object.keys(changes);
  if (keys.length === 0) return { ok: false, message: 'Nothing to change.' };
  const denied = await staffGate(areaFor(keys));
  if (denied) return { ok: false, message: denied };
  if (needsMfa(keys)) {
    const mfa = await moneyMfaGate();
    if (mfa) return { ok: false, message: mfa };
  }
  const supabase = await createClient();
  const { error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)('admin_set_app_control', {
    p_platform: p,
    p_changes: changes,
    p_reason: reason || null,
  });
  if (error) return { ok: false, message: friendly(error.message) };
  revalidatePath('/settings/controls');
  return { ok: true, message: 'Saved. Apps pick it up within about a minute.' };
}

/** One yes/no switch for one platform. Form fields: platform, key, value ("true" | "false"), reason. */
export async function setControlSwitch(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const key = str(form, 'key');
  if (!BOOL_KEYS.has(key)) return { ok: false, message: 'That switch can’t be changed from the panel.' };
  const value = str(form, 'value');
  if (value !== 'true' && value !== 'false') return { ok: false, message: 'Choose on or off.' };
  return apply(str(form, 'platform'), { [key]: value === 'true' }, str(form, 'reason').slice(0, 200));
}

/** The text controls (maintenance message, minimum version, banner…) for one platform. A blank value clears it. */
export async function setControlText(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const changes: Record<string, unknown> = {};
  for (const k of TEXT_KEYS) {
    if (!form.has(k)) continue;
    const v = str(form, k);
    if (k === 'banner_ends_at') {
      if (!v) changes[k] = null;
      else {
        // A date picked in the admin's browser means the end of that day, Indian time.
        const d = new Date(`${v}T23:59:00+05:30`);
        if (Number.isNaN(d.getTime())) return { ok: false, message: 'That end date is not valid.' };
        changes[k] = d.toISOString();
      }
    } else if (k === 'banner_level') {
      if (v) changes[k] = v; // the level can't be cleared, only changed; the database keeps 'info' by default
    } else {
      changes[k] = v === '' ? null : v.slice(0, 500);
    }
  }
  return apply(str(form, 'platform'), changes, 'text controls');
}
