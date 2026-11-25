'use server';

import { revalidatePath } from 'next/cache';
import { isUuid, requireAdmin } from './data';
import { staffGate } from './staff';
import { createClient } from './supabase/server';
import type { ActionResult } from '@/components/ConfirmAction';

/**
 * Writes for Skills & categories. Same staff access as changing a job's category
 * (the people area). Each calls a migration-226 function that checks staff again and logs it.
 */

function friendly(message: string): string {
  if (/admins only|staff only|not allowed|permission/i.test(message)) return 'Only staff can do this. Sign in again with a staff account.';
  if (/does not exist|schema cache/i.test(message)) return 'This needs a database update that has not been applied yet: apply migration 226.';
  if (/already|exists|duplicate/i.test(message)) return 'That name is already taken. Pick a different one.';
  if (/builtin|built-in|built in/i.test(message)) return 'Built-in skills and categories can only be renamed or given extra phrases.';
  if (/length|letters|between 2/i.test(message)) return 'Keep it between 2 and 30 letters.';
  return message.replace(/^(error:\s*)/i, '');
}

async function call(fn: string, args: Record<string, unknown>): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)(fn, args);
  return error ? friendly(error.message) : null;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

async function guard(): Promise<string | null> {
  await requireAdmin();
  return staffGate('people');
}

const BAD_ID = 'That id looks wrong. Refresh the page.';

export async function renameCatalogTerm(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'termId');
  const label = str(form, 'label').slice(0, 60);
  if (!isUuid(id)) return { ok: false, message: BAD_ID };
  if (!label) return { ok: false, message: 'Type the new name.' };
  const err = await call('admin_catalog_rename', { p_id: id, p_label: label });
  if (err) return { ok: false, message: err };
  revalidatePath('/catalog');
  return { ok: true, message: 'Renamed.' };
}

export async function addCatalogPhrase(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'termId');
  const phrase = str(form, 'phrase').slice(0, 60);
  if (!isUuid(id)) return { ok: false, message: BAD_ID };
  if (!phrase) return { ok: false, message: 'Type the words that should point here.' };
  const err = await call('admin_catalog_add_phrase', { p_id: id, p_phrase: phrase });
  if (err) return { ok: false, message: err };
  revalidatePath('/catalog');
  return { ok: true, message: 'Phrase added.' };
}

export async function removeCatalogPhrase(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'phraseId');
  if (!isUuid(id)) return { ok: false, message: BAD_ID };
  const err = await call('admin_catalog_remove_phrase', { p_phrase_id: id });
  if (err) return { ok: false, message: err };
  revalidatePath('/catalog');
  return { ok: true, message: 'Phrase removed.' };
}

export async function mergeCatalogTerm(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const from = str(form, 'fromId');
  const to = str(form, 'toId');
  if (!isUuid(from) || !isUuid(to)) return { ok: false, message: BAD_ID };
  if (from === to) return { ok: false, message: 'Pick a different one to merge into.' };
  const err = await call('admin_catalog_merge', { p_from: from, p_to: to });
  if (err) return { ok: false, message: err };
  revalidatePath('/catalog');
  return { ok: true, message: 'Merged.' };
}

async function setHidden(form: FormData, hidden: boolean): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const id = str(form, 'termId');
  if (!isUuid(id)) return { ok: false, message: BAD_ID };
  const err = await call('admin_catalog_set_hidden', { p_id: id, p_hidden: hidden });
  if (err) return { ok: false, message: err };
  revalidatePath('/catalog');
  return { ok: true, message: hidden ? 'Hidden. The app no longer offers it.' : 'Showing again.' };
}

export async function hideCatalogTerm(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return setHidden(form, true);
}

export async function unhideCatalogTerm(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return setHidden(form, false);
}
