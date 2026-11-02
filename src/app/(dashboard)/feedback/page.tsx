import { FeedbackView } from '@/components/views/FeedbackView';
import { requireAdmin } from '@/lib/data';
import { asBoardTab, getBoardCounts, getBoardPosts } from '@/lib/feedback';

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const tab = asBoardTab((await searchParams).tab);
  const [posts, counts] = await Promise.all([getBoardPosts(tab), getBoardCounts()]);
  return <FeedbackView tab={tab} posts={posts} counts={counts} now={new Date().toISOString()} />;
}
