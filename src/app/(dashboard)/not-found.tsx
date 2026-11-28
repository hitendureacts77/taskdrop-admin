import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { getV2 } from '@/lib/v2-gate-server';

export default async function NotFound() {
  if (await getV2()) {
    return (
      <>
        <v2.PageHeader crumbs={[{ label: 'Not found' }]} title="Not found" />
        <v2.Card>
          <v2.Empty title="We could not find that page" icon="help">
            That job or person doesn’t exist, or the link is incomplete.
            <div className="wp4-actlist wp4-center">
              <Link className="v2-btn sm" href="/tasks">
                Go to Jobs
              </Link>
              <Link className="v2-btn sm" href="/users">
                Go to People
              </Link>
            </div>
          </v2.Empty>
        </v2.Card>
      </>
    );
  }
  return (
    <div className="card card-body">
      <h1 className="card-title">Not found</h1>
      <p className="card-sub">That job or person doesn’t exist, or the link is incomplete.</p>
      <p>
        <Link href="/tasks">Go to Jobs</Link> · <Link href="/users">Go to People</Link>
      </p>
    </div>
  );
}
