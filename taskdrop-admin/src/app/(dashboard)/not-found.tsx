import Link from 'next/link';

export default function NotFound() {
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
