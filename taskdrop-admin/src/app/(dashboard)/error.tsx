'use client';

/** Shown when a page's data can't be loaded. Nothing has been changed when this appears. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card card-body" role="alert">
      <h1 className="card-title">This page couldn’t load</h1>
      <p className="card-sub">
        Nothing was changed. The most common reasons: the database is waking up, your sign-in expired, or a setting is missing on the server.
      </p>
      <pre className="error-detail">{error.message}</pre>
      <button type="button" className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
