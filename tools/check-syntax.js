// ============================================================
// check-syntax.js — Verify all JS modules parse without errors.
// Uses Node's --check on each file. Run: node tools/check-syntax.js
// ============================================================

import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..', 'public', 'js');

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (extname(e.name) === '.js') yield p;
  }
}

let ok = 0, fail = 0;
for await (const f of walk(ROOT)) {
  try {
    execSync(`node --check "${f}"`, { stdio: 'pipe' });
    ok++;
  } catch (e) {
    fail++;
    console.error('FAIL:', f);
    console.error(e.stderr?.toString() || e.message);
  }
}
console.log(`\n${ok} OK, ${fail} failed`);
process.exit(fail ? 1 : 0);
