// node --experimental-strip-types --test src/lib/view-only.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

// B133: a view-only role sees these pages read-only, like /settings and the team page. The server
// still refuses (staffGate('people')); this only stops showing buttons that cannot work.
const PAGES: [page: string, view: string][] = [
  ['../app/(dashboard)/copyright/page.tsx', '../components/views/CopyrightView.tsx'],
  ['../app/(dashboard)/feedback/page.tsx', '../components/views/FeedbackView.tsx'],
  ['../app/(dashboard)/reports-queue/page.tsx', '../components/views/ModerationViews.tsx'],
];

for (const [page, view] of PAGES) {
  test(`${page.split('/').at(-2)} passes canAct from the staff role, and the view uses it`, () => {
    assert.match(read(page), /canAct=\{staffCan\(me\.staffRole, 'people'\)\}/);
    const v = read(view);
    assert.match(v, /canAct: boolean/);
    assert.match(v, /canAct \?/);
  });
}
