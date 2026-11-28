'use server';

import { revalidatePath } from 'next/cache';
import { setSwitch } from '../admin-actions';
import { isUuid, requireAdmin } from '../data';
import { moneyMfaGate } from '../mfa';
import { staffGate } from '../staff';
import { createClient } from '../supabase/server';
import { presetFor } from '@/components/v2/settings/launch-presets';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Admin v2 (WP8a) writes for Settings: Developer sign-in, Pause all money, launch areas and the
 * walkthrough link. Every one: requireAdmin, the staff role check (full Admin), the money MFA gate
 * like today's settings writes, and a database function that checks the role again and writes the
 * audit row. The Confirm box in the page is only the front door.
 */

type Rpc = (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

function friendly(message: string): string {
  if (/does not exist|schema cache|could not find the function/i.test(message)) return 'This is not set up on this server yet.';
  if (/authenticator code/i.test(message)) return 'Enter your authenticator code on the Security page first, then try again.';
  return message.replace(/^(error:\s*)/i, '');
}

async function rpc(name: string, args: Record<string, unknown>) {
  const supabase = await createClient();
  return (supabase.rpc as unknown as Rpc)(name, args);
}

async function gate(): Promise<string | null> {
  await requireAdmin();
  const denied = await staffGate('admin');
  if (denied) return denied;
  return moneyMfaGate();
}

function refresh() {
  revalidatePath('/settings', 'layout');
}

/** Developer sign-in (dev_otp_for_all). Fields: on ("true" | "false"), confirm_word, reason. Today's setSwitch does the write. */
export async function v2SetDevOtp(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const on = str(form, 'on') === 'true';
  const reason = str(form, 'reason').slice(0, 200);
  if (!reason) return { ok: false, message: 'Say why, so the switch history explains it.' };
  if (str(form, 'confirm_word').toUpperCase() !== (on ? 'ON' : 'OFF')) return { ok: false, message: `Type ${on ? 'ON' : 'OFF'} to confirm.` };
  const fd = new FormData();
  fd.set('key', 'dev_otp_for_all');
  fd.set('on', String(on));
  fd.set('confirm', on ? 'ON' : 'OFF');
  // setSwitch runs requireAdmin, the Admin role check and the MFA gate itself.
  const res = await setSwitch(null, fd);
  if (!res?.ok) return res;
  // The settings trigger records before/after; this adds the reason next to it.
  await rpc('admin_log_event', { p_action: 'switch_reason', p_target: 'settings:dev_otp_for_all', p_detail: `reason: ${reason}` });
  return { ok: true, message: on ? 'Developer sign-in is ON. Any phone number gets an auto-filled code.' : 'Developer sign-in is off. People need a real SMS code again.' };
}

/** Pause all money (settings.money_paused). Fields: paused, confirm_word (PAUSE | RESUME), reason. */
export async function v2SetMoneyPaused(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return { ok: false, message: denied };
  const paused = str(form, 'paused') === 'true';
  const reason = str(form, 'reason').slice(0, 200);
  if (!reason) return { ok: false, message: 'Say why, so the switch history explains it.' };
  if (str(form, 'confirm_word').toUpperCase() !== (paused ? 'PAUSE' : 'RESUME')) return { ok: false, message: `Type ${paused ? 'PAUSE' : 'RESUME'} to confirm.` };
  const { error } = await rpc('admin_set_money_paused', { p_paused: paused, p_reason: reason });
  if (error) return { ok: false, message: friendly(error.message) };
  refresh();
  revalidatePath('/money');
  return { ok: true, message: paused ? 'Money is paused. Payments, releases and refunds wait until you resume.' : 'Money is running again.' };
}

/** Add or change a launch area. Fields: id (optional), preset (city key) or name + lat + lng; radius (km); reason. */
export async function v2SaveLaunchArea(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return { ok: false, message: denied };
  const preset = presetFor(str(form, 'preset'));
  const name = str(form, 'name') || preset?.name || '';
  const num = (k: string, fallback: number | undefined) => (str(form, k) ? Number(str(form, k)) : fallback);
  const lat = num('lat', preset?.lat);
  const lng = num('lng', preset?.lng);
  const radius = num('radius', preset?.radiusKm);
  if (!name) return { ok: false, message: 'Pick a city, or type a name with its latitude and longitude.' };
  if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false, message: 'Pick a city, or type the latitude and longitude of the centre.' };
  if (radius === undefined || !Number.isFinite(radius) || radius < 1 || radius > 300) return { ok: false, message: 'The radius is 1 to 300 km.' };
  const id = str(form, 'id');
  const { error } = await rpc('admin_save_launch_area', {
    p_id: isUuid(id) ? id : null,
    p_name: name.slice(0, 60),
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radius,
    p_active: str(form, 'active') !== 'false',
    p_reason: str(form, 'reason').slice(0, 200) || null,
  });
  if (error) return { ok: false, message: friendly(error.message) };
  refresh();
  return { ok: true, message: `${name} saved. The apps pick it up within a minute.` };
}

/** Remove a launch area. Fields: id, reason. */
export async function v2DeleteLaunchArea(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'id');
  if (!isUuid(id)) return { ok: false, message: 'Refresh the page and try again.' };
  const { error } = await rpc('admin_delete_launch_area', { p_id: id, p_reason: str(form, 'reason').slice(0, 200) || null });
  if (error) return { ok: false, message: friendly(error.message) };
  refresh();
  return { ok: true, message: 'Area removed.' };
}

/** Launch areas on/off and the message for other places. Fields: on, message, reason. */
export async function v2SetLaunchAreas(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return { ok: false, message: denied };
  const on = str(form, 'on') === 'true';
  const message = str(form, 'message').slice(0, 300);
  const { error } = await rpc('admin_set_launch_areas', { p_on: on, p_message: message || null, p_reason: str(form, 'reason').slice(0, 200) || null });
  if (error) return { ok: false, message: friendly(error.message) };
  refresh();
  return { ok: true, message: on ? 'Launch areas are on. Posting outside them is refused.' : 'Launch areas are off. People can post anywhere.' };
}

/** The walkthrough YouTube link. Fields: url (blank clears it), reason. */
export async function v2SetWalkthroughUrl(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return { ok: false, message: denied };
  const url = str(form, 'url').slice(0, 300);
  const { error } = await rpc('admin_set_walkthrough_url', { p_url: url, p_reason: str(form, 'reason').slice(0, 200) || null });
  if (error) return { ok: false, message: friendly(error.message) };
  refresh();
  return { ok: true, message: url ? 'Walkthrough video saved. The apps show it within a minute.' : 'Walkthrough video removed.' };
}
