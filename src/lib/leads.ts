import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { namesFor } from './data';
import type { Read } from './growth';
import { createClient } from './supabase/server';

/**
 * Reads for Leads: people and businesses who are not in the app yet
 * (crm_leads, migration 097). Admins can read the table; every change goes
 * through crm_add_lead / crm_update_lead in lib/leads-actions.ts. Callers must
 * call requireAdmin() first.
 */

export type Lead = {
  id: string;
  name: string;
  contact: string | null;
  kind: string;
  source: string | null;
  stage: string;
  note: string | null;
  ownerId: string | null;
  owner: string | null;
  userId: string | null;
  createdBy: string | null;
  createdAt: string;
  stageChangedAt: string;
};

type Row = {
  id: string;
  name: string;
  contact: string | null;
  kind: string;
  source: string | null;
  stage: string;
  note: string | null;
  owner_id: string | null;
  user_id: string | null;
  created_by: string | null;
  created_at: string;
  stage_changed_at: string;
};

const NOT_THERE = /does not exist|could not find the table|schema cache|PGRST20[24]|42P01/i;

/** Newest first. A few thousand leads is far beyond what this list is for. */
export async function getLeads(): Promise<Read<Lead[]>> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data, error } = await supabase
    .from('crm_leads')
    .select('id, name, contact, kind, source, stage, note, owner_id, user_id, created_by, created_at, stage_changed_at')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) {
    const setup = NOT_THERE.test(`${error.code ?? ''} ${error.message}`);
    return { data: [], setup, error: setup ? null : error.message };
  }
  const rows = (data ?? []) as Row[];
  const names = await namesFor(rows.flatMap((r) => [r.owner_id ?? '', r.created_by ?? '']));
  return {
    setup: false,
    error: null,
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      contact: r.contact,
      kind: r.kind,
      source: r.source,
      stage: r.stage,
      note: r.note,
      ownerId: r.owner_id,
      owner: r.owner_id ? names.get(r.owner_id) ?? 'An admin' : null,
      userId: r.user_id,
      createdBy: r.created_by ? names.get(r.created_by) ?? 'An admin' : null,
      createdAt: r.created_at,
      stageChangedAt: r.stage_changed_at,
    })),
  };
}
