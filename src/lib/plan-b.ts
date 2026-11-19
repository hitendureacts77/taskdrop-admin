import 'server-only';
import { isPlanBMissing, parseOverview, type PlanBOverview } from './plan-b-calc';
import { isStaffRefusal } from './ops-calc';
import { createClient } from './supabase/server';

/** Read for the Plan B money page. Callers must call requireSeeing('money') first. Never throws. */
export type PlanBRead = { data: PlanBOverview | null; setup: boolean; refused: boolean; error: string | null };

export async function getPlanBOverview(): Promise<PlanBRead> {
  const supabase = await createClient();
  // The function is new (migration 193), so it is not in the generated types yet.
  const { data, error } = await supabase.rpc('admin_plan_b_overview' as never);
  if (error) {
    if (isPlanBMissing(error.message, error.code)) return { data: null, setup: true, refused: false, error: null };
    if (isStaffRefusal(error.message, error.code)) return { data: null, setup: false, refused: true, error: null };
    return { data: null, setup: false, refused: false, error: error.message };
  }
  return { data: parseOverview(data), setup: false, refused: false, error: null };
}
