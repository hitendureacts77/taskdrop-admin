'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/components/ConfirmAction';
import { isUuid } from '../data';
import { warnUser } from '../growth-actions';

/**
 * Admin v2 people actions (work package WP3). Each one keeps today's checks by calling today's action:
 * warnUser runs requireAdmin, the people-area staff gate, the per-staff "warn" rate limit, and the
 * admin_warn_user database function (which checks staff again, notifies the person and writes the audit log).
 */

/** Warn a person from their page (no report attached). Sent as `userId` + `reason`. */
export async function warnPerson(prev: ActionResult, form: FormData): Promise<ActionResult> {
  // A warning from the person page is never tied to a report.
  form.delete('reportId');
  const result = await warnUser(prev, form);
  const userId = String(form.get('userId') ?? '');
  if (result?.ok && isUuid(userId)) revalidatePath(`/users/${userId}`);
  return result;
}
