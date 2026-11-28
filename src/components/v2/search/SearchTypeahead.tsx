'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Icon } from '@/components/Icon';
import type { TypeaheadGroup, TypeaheadResponse } from './typeahead-types';

const MIN = 2;
const WAIT_MS = 200;

/**
 * Admin v2 top-bar search with instant results (people, jobs, payouts, help
 * requests) from /api/search. Still a plain GET form to /search, so Enter (and
 * a browser without scripts) opens the full search page. Arrow keys move
 * through the results, Enter opens the highlighted one, Escape closes the list.
 */
export function SearchTypeahead({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<TypeaheadGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [hl, setHl] = useState(-1);
  const boxRef = useRef<HTMLFormElement>(null);

  const term = q.trim();
  const allHref = `/search?q=${encodeURIComponent(term)}`;
  const items = [...groups.flatMap((g) => g.items.map((i) => i.href)), allHref];

  useEffect(() => {
    if (term.length < MIN) {
      setGroups([]);
      setNote(null);
      setBusy(false);
      return;
    }
    const ctrl = new AbortController();
    setBusy(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
        const out = (await res.json().catch(() => ({ ok: false }))) as TypeaheadResponse;
        if (ctrl.signal.aborted) return;
        if (out.ok) {
          setGroups(out.groups);
          setNote(null);
        } else {
          setGroups([]);
          setNote(res.status === 429 ? (out.error ?? 'Going too fast. Wait a moment.') : res.status === 401 ? 'Your session ended. Sign in again.' : 'Instant results are not available. Press Enter to search.');
        }
        setHl(-1);
      } catch {
        if (!ctrl.signal.aborted) {
          setGroups([]);
          setNote('Could not reach the server. Press Enter to search.');
        }
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, WAIT_MS);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [term]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
    router.push(href);
  };

  const showList = open && term.length >= MIN;
  const starts = groups.map((_, gi) => groups.slice(0, gi).reduce((sum, g) => sum + g.items.length, 0));
  const optId = (i: number) => `${listId}-o${i}`;

  return (
    <form
      ref={boxRef}
      action="/search"
      method="get"
      className="v2-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (!term) return;
        go(hl >= 0 && hl < items.length ? items[hl]! : allHref);
      }}
    >
      <Icon name="search" size={16} />
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={q}
        autoComplete="off"
        placeholder="Search people, jobs, payouts, help requests"
        aria-label="Search people, jobs, payouts and help requests"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && hl >= 0 ? optId(hl) : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            return;
          }
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          e.preventDefault();
          setOpen(true);
          const len = items.length;
          setHl((h) => (e.key === 'ArrowDown' ? (h + 1) % len : h <= 0 ? len - 1 : h - 1));
        }}
      />
      <kbd aria-hidden="true">/</kbd>
      <div className={`v2-sres${showList ? ' show' : ''}`} id={listId} role="listbox" aria-label="Search results" aria-busy={busy}>
        {showList
          ? groups.map((g, gi) => (
              <div key={g.title} role="group" aria-label={g.title}>
                <h6 aria-hidden="true">{g.title}</h6>
                {g.items.map((it, ii) => {
                  const i = starts[gi]! + ii;
                  return (
                    <a
                      key={it.href}
                      id={optId(i)}
                      href={it.href}
                      role="option"
                      aria-selected={hl === i}
                      className={hl === i ? 'hl' : undefined}
                      onMouseEnter={() => setHl(i)}
                      onClick={(e) => {
                        e.preventDefault();
                        go(it.href);
                      }}
                    >
                      <span>
                        {it.label}
                        {it.test ? <span className="v2-tag-test">TEST</span> : null}
                      </span>
                      {it.note ? <small>{it.note}</small> : null}
                    </a>
                  );
                })}
              </div>
            ))
          : null}
        {showList ? (
          <>
            {busy && !groups.length ? <p className="v2-sres-note">Searching…</p> : null}
            {note ? <p className="v2-sres-note">{note}</p> : null}
            <a
              id={optId(items.length - 1)}
              href={allHref}
              role="option"
              aria-selected={hl === items.length - 1}
              className={`all${hl === items.length - 1 ? ' hl' : ''}`}
              onMouseEnter={() => setHl(items.length - 1)}
              onClick={(e) => {
                e.preventDefault();
                go(allHref);
              }}
            >
              <span>
                {groups.length || busy ? 'See all results' : 'Nothing matches yet. Open the search page'} for “{term}”
              </span>
              <small>Enter</small>
            </a>
          </>
        ) : null}
      </div>
    </form>
  );
}
