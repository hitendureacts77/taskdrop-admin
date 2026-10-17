import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { summarizeRuleTasks } from './crm-calc';
import { namesFor } from './data';
import type { Read } from './growth';
import { createClient } from './supabase/server';

/**
 * Reads for the automation rules page (crm_rules, migration 097). Rules are
 * changed only through admin_save_crm_rule / admin_delete_crm_rule in
 * lib/rules-actions.ts. Callers must call requireAdmin() first.
 */

export type Rule = {
  id: string;
  name: string;
  kind: string;
  days: number;
  enabled: boolean;
  updatedAt: string;
  created: number;
  lastCreatedAt: string | null;
};

export type AutomationFollowUp = { id: string; title: string; userId: string | null; person: string | null; ruleName: string | null; status: string; createdAt: string };

export type RulesData = { rules: Rule[]; latest: AutomationFollowUp[] };

const NOT_THERE = /does not exist|could not find the (table|column)|schema cache|PGRST20[24]|42P01|42703/i;

export async function getRules(): Promise<Read<RulesData>> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [rules, made, latest] = await Promise.all([
    supabase.from('crm_rules').select('id, name, kind, days, enabled, updated_at').order('created_at', { ascending: true }),
    supabase.from('crm_tasks').select('rule_id, created_at').not('rule_id', 'is', null).limit(50000),
    supabase.from('crm_tasks').select('id, title, user_id, rule_id, status, created_at').eq('source', 'automation').order('created_at', { ascending: false }).limit(10),
  ]);
  const err = rules.error ?? made.error ?? latest.error;
  if (err) {
    const setup = NOT_THERE.test(`${err.code ?? ''} ${err.message}`);
    return { data: { rules: [], latest: [] }, setup, error: setup ? null : err.message };
  }
  const counts = summarizeRuleTasks((made.data ?? []) as { rule_id: string | null; created_at: string }[]);
  const ruleRows = (rules.data ?? []) as { id: string; name: string; kind: string; days: number; enabled: boolean; updated_at: string }[];
  const latestRows = (latest.data ?? []) as { id: string; title: string; user_id: string | null; rule_id: string | null; status: string; created_at: string }[];
  const names = await namesFor(latestRows.map((r) => r.user_id ?? ''));
  const ruleName = new Map(ruleRows.map((r) => [r.id, r.name]));
  return {
    setup: false,
    error: null,
    data: {
      rules: ruleRows.map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        days: Number(r.days),
        enabled: r.enabled,
        updatedAt: r.updated_at,
        created: counts.get(r.id)?.count ?? 0,
        lastCreatedAt: counts.get(r.id)?.last ?? null,
      })),
      latest: latestRows.map((r) => ({
        id: r.id,
        title: r.title,
        userId: r.user_id,
        person: r.user_id ? names.get(r.user_id) ?? 'A person' : null,
        ruleName: r.rule_id ? ruleName.get(r.rule_id) ?? null : null,
        status: r.status,
        createdAt: r.created_at,
      })),
    },
  };
}
