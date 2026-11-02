import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { namesFor } from './data';
import type { Read } from './growth';
import { createClient } from './supabase/server';

/**
 * The feedback board (migration 136 in the app repo). Read as the signed-in
 * admin: the three tables' only policy is private.is_admin(), so staff see
 * hidden posts and comments too. Before 136 is applied the tables do not exist,
 * and the page says so instead of failing.
 */

export type BoardStatus = 'open' | 'under_review' | 'planned' | 'in_progress' | 'done' | 'declined';
export type BoardTab = BoardStatus | 'hidden';

export const BOARD_STATUS: { value: BoardStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'declined', label: 'Not planned' },
];

export const BOARD_KIND: Record<string, string> = {
  feature: 'New feature',
  improvement: 'Improvement',
  bug: 'Bug',
  other: 'Other',
};

export function asBoardTab(v: unknown): BoardTab {
  return v === 'hidden' || BOARD_STATUS.some((s) => s.value === v) ? (v as BoardTab) : 'open';
}

export type BoardComment = {
  id: string;
  body: string;
  isTeam: boolean;
  author: string;
  hidden: boolean;
  at: string;
};

export type BoardPost = {
  id: string;
  title: string;
  body: string;
  kind: string;
  status: BoardStatus;
  votes: number;
  author: string;
  authorId: string | null;
  hidden: boolean;
  hideReason: string | null;
  createdAt: string;
  statusChangedAt: string;
  comments: BoardComment[];
};

const NOT_THERE = /does not exist|could not find the (function|table)|schema cache|PGRST20[24]|42883|42P01/i;
const str = (v: unknown) => (v == null ? '' : String(v));

async function db(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

type Failure = { message: string; code?: string };

function failed<T>(empty: T, error: Failure): Read<T> {
  const setup = NOT_THERE.test(`${error.code ?? ''} ${error.message}`);
  return { data: empty, setup, error: setup ? null : error.message };
}

/** How many ideas sit under each tab, so the tabs can show a number. */
export async function getBoardCounts(): Promise<Read<Record<BoardTab, number>>> {
  const empty = { open: 0, under_review: 0, planned: 0, in_progress: 0, done: 0, declined: 0, hidden: 0 } as Record<BoardTab, number>;
  const supabase = await db();
  const { data, error } = await supabase.from('feedback_posts').select('status, hidden_at').limit(5000);
  if (error) return failed(empty, error);
  const out = { ...empty };
  for (const r of (data ?? []) as { status: BoardStatus; hidden_at: string | null }[]) {
    if (r.hidden_at) out.hidden += 1;
    else out[r.status] += 1;
  }
  return { data: out, setup: false, error: null };
}

/** Ideas under one tab, most voted first, each with its comments. */
export async function getBoardPosts(tab: BoardTab): Promise<Read<BoardPost[]>> {
  const supabase = await db();
  const base = supabase
    .from('feedback_posts')
    .select('id, author_id, title, body, category, status, vote_count, hidden_at, hide_reason, created_at, status_changed_at');
  const { data, error } = await (tab === 'hidden' ? base.not('hidden_at', 'is', null) : base.is('hidden_at', null).eq('status', tab))
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return failed([], error);
  const posts = (data ?? []) as Record<string, unknown>[];
  if (!posts.length) return { data: [], setup: false, error: null };

  const ids = posts.map((p) => str(p.id));
  const { data: cs, error: cerr } = await supabase
    .from('feedback_comments')
    .select('id, post_id, author_id, is_team, body, hidden_at, created_at')
    .in('post_id', ids)
    .order('created_at', { ascending: true })
    .limit(1000);
  if (cerr) return failed([], cerr);
  const comments = (cs ?? []) as Record<string, unknown>[];

  const names = await namesFor([...posts.map((p) => str(p.author_id)), ...comments.map((c) => str(c.author_id))].filter(Boolean));
  const byPost = new Map<string, BoardComment[]>();
  for (const c of comments) {
    const list = byPost.get(str(c.post_id)) ?? [];
    list.push({
      id: str(c.id),
      body: str(c.body),
      isTeam: Boolean(c.is_team),
      author: c.is_team ? `Team (${names.get(str(c.author_id)) ?? 'staff'})` : names.get(str(c.author_id)) ?? 'Someone',
      hidden: c.hidden_at != null,
      at: str(c.created_at),
    });
    byPost.set(str(c.post_id), list);
  }
  return {
    data: posts.map((p) => ({
      id: str(p.id),
      title: str(p.title),
      body: str(p.body),
      kind: str(p.category),
      status: str(p.status) as BoardStatus,
      votes: Number(p.vote_count ?? 0),
      author: p.author_id ? names.get(str(p.author_id)) ?? 'Someone' : 'Deleted account',
      authorId: p.author_id ? str(p.author_id) : null,
      hidden: p.hidden_at != null,
      hideReason: p.hide_reason ? str(p.hide_reason) : null,
      createdAt: str(p.created_at),
      statusChangedAt: str(p.status_changed_at),
      comments: byPost.get(str(p.id)) ?? [],
    })),
    setup: false,
    error: null,
  };
}
