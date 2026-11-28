import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * Guard for the admin v2 gate: every selector in src/app/v2.css and
 * src/app/v2/*.css must start with [data-v2], so with the gate off (no
 * data-v2 on <html>) none of it can change today's admin.
 */
const appDir = join(import.meta.dirname, '..', 'app');
const files = [join(appDir, 'v2.css'), ...readdirSync(join(appDir, 'v2')).filter((f) => f.endsWith('.css')).map((f) => join(appDir, 'v2', f))];

/** Split a selector list at commas that are not inside brackets, e.g. :has(a, b). */
function splitTop(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function badSelectors(css: string): string[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const bad: string[] = [];
  // Walk blocks; a block header ending in "{" is a selector unless it is an at-rule.
  const stack: string[] = [];
  let buf = '';
  for (const ch of src) {
    if (ch === '{') {
      const head = buf.trim();
      buf = '';
      const inKeyframes = stack.some((h) => h.startsWith('@keyframes'));
      if (!head.startsWith('@') && !inKeyframes) {
        for (const sel of splitTop(head)) if (!sel.trim().startsWith('[data-v2]')) bad.push(sel.trim());
      }
      stack.push(head);
    } else if (ch === '}') {
      stack.pop();
      buf = '';
    } else if (ch === ';' && stack.length) {
      buf = '';
    } else {
      buf += ch;
    }
  }
  return bad;
}

test('every v2 CSS selector is scoped to [data-v2]', () => {
  assert.ok(files.length >= 2);
  for (const f of files) assert.deepEqual(badSelectors(readFileSync(f, 'utf8')), [], f);
});

test('the checker catches an unscoped rule', () => {
  assert.deepEqual(badSelectors('.card { color: red } [data-v2] .x, .y { a: b } @media (x) { .z { a: b } } @keyframes k { to { a: b } }'), ['.card', '.y', '.z']);
});
