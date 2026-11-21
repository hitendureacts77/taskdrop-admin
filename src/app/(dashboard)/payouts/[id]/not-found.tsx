import Link from 'next/link';

export default function PayoutNotFound() {
  return (
    <div className="card card-body">
      <h1 className="card-title">Withdrawal not found</h1>
      <p className="card-sub">That withdrawal doesn’t exist, or the link is incomplete.</p>
      <p>
        <Link href="/payouts">Go to Payouts</Link>
      </p>
    </div>
  );
}
