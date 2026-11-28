'use client';

import { useState, type ReactNode } from 'react';
import type { FormAction } from '@/components/ConfirmAction';
import { Confirm } from '@/components/v2/Confirm';
import { inr } from '@/lib/format';
import { splitAmounts, splitStart, splitStep, type HoldAmounts } from './split';

type Choice = 'worker' | 'poster' | 'split';

/**
 * The v2 "Your decision" block (design: job page, decide card). Three choices; Split is new
 * (owner decision 5) and only offered when the job was paid with pay per task (a Plan B hold),
 * because only then does the payment company hold money that can be divided.
 */
export function DecideDispute({
  action,
  taskId,
  title,
  poster,
  worker,
  workerGets,
  posterGets,
  workerWhen,
  posterWhere,
  hold,
}: {
  action: FormAction;
  taskId: string;
  title: string;
  poster: string;
  worker: string;
  /** What the worker gets if the work stands, in paise, or null when unknown. */
  workerGets: number | null;
  /** What the poster gets back if refunded, in paise, or null when unknown. */
  posterGets: number | null;
  /** "sent to their bank or UPI" (Plan B) or "withdrawable after 7 days" (wallet). */
  workerWhen: string;
  /** "back to the card or UPI they paid with" (Plan B) or "back to their TaskDrop wallet". */
  posterWhere: string;
  /** Plan B hold amounts; null hides Split. */
  hold: HoldAmounts | null;
}) {
  const [choice, setChoice] = useState<Choice>('worker');
  const [part, setPart] = useState(() => (hold ? splitStart(hold.offerMinor) : 0));
  const split = hold ? splitAmounts(hold, part) : null;

  const summary =
    choice === 'worker'
      ? `${workerGets !== null ? inr(workerGets) : 'Their share'} to ${worker}, ${workerWhen}. ${poster} gets nothing back.`
      : choice === 'poster'
        ? `${posterGets !== null ? inr(posterGets) : 'Everything paid'} ${posterWhere}, service fee included. ${worker} is paid nothing. The job is cancelled.`
        : split
          ? `${inr(split.workerMinor)} to ${worker} (for ${inr(split.partMinor)} of work, after commission) · ${inr(split.posterMinor)} back to ${poster}. TaskDrop keeps ${inr(split.taskdropMinor)}.`
          : 'Pick how much of the price the finished work is worth.';

  const opt = (c: Choice, head: string, small: string, extra?: ReactNode) => (
    <label className={`wp2-opt${choice === c ? ' sel' : ''}`}>
      <input type="radio" name={`decide-${taskId}`} checked={choice === c} onChange={() => setChoice(c)} />
      <span className="wp2-opt-b">
        <b>{head}</b>
        <small>{small}</small>
        {extra}
      </span>
    </label>
  );

  return (
    <div className="wp2-decide">
      <div className="wp2-decide-h">Your decision</div>
      {opt('worker', `The work stands: pay ${worker}`, `${workerGets !== null ? inr(workerGets) : 'Their share'} after the commission, ${workerWhen}.`)}
      {opt('poster', `Refund ${poster}`, `${posterGets !== null ? inr(posterGets) : 'Everything paid'}, service fee included, ${posterWhere}. The job is cancelled.`)}
      {hold
        ? opt(
            'split',
            'Split',
            'Pay for the part that was done; the rest goes back.',
            choice === 'split' ? (
              <span className="wp2-split">
                <input
                  type="range"
                  min={splitStep(hold.offerMinor)}
                  max={hold.offerMinor - splitStep(hold.offerMinor)}
                  step={splitStep(hold.offerMinor)}
                  value={part}
                  aria-label={`Part of the ${inr(hold.offerMinor)} price the finished work is worth`}
                  onChange={(e) => setPart(Number(e.target.value))}
                />
                <span className="wp2-split-line">
                  Work worth <b>{inr(part)}</b> of {inr(hold.offerMinor)}
                </span>
                {split ? (
                  <span className="wp2-split-bar" aria-hidden="true">
                    <span className="w" style={{ flexGrow: split.workerMinor }} />
                    <span className="t" style={{ flexGrow: split.taskdropMinor }} />
                    <span className="p" style={{ flexGrow: split.posterMinor }} />
                  </span>
                ) : null}
                {split ? (
                  <span className="wp2-split-line small">
                    <span className="w">{worker} {inr(split.workerMinor)}</span> · <span className="p">{poster} {inr(split.posterMinor)}</span> · TaskDrop {inr(split.taskdropMinor)}
                  </span>
                ) : null}
              </span>
            ) : null,
          )
        : null}
      <div className="wp2-decide-f">
        <span className="small muted">Promise: decide within 48 hours.</span>
        <Confirm
          action={action}
          hidden={{ taskId, outcome: choice, ...(choice === 'split' ? { part: String(part) } : {}) }}
          label="Confirm decision"
          tier={3}
          area="money"
          tone="pri"
          title={`Final decision: ${title}`}
          body={
            <>
              <p>
                <b>{summary}</b>
              </p>
              <ul>
                <li>Both people are told{choice === 'split' ? ', with your reason' : ''}.</li>
                <li>This closes the dispute and can’t be undone.</li>
              </ul>
            </>
          }
          reason={{ label: choice === 'split' ? 'Reason (both people see it)' : 'Reason (saved with the decision)', minLength: 5 }}
          word="DECIDE"
          confirmLabel="Confirm decision"
        />
      </div>
    </div>
  );
}
