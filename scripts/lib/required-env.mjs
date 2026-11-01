// A deploy that is missing a required secret, or holds a stub that is too short to be real,
// fails with the NAME of the problem, never the value. Used by scripts/vercel-build.mjs here and
// by scripts/check-required-env.mjs in the admin repo (same rule, same wording).

/** @param {Record<string, string | undefined>} env @param {{name: string, min: number}[]} rules */
export function missingOrShort(env, rules) {
  const problems = [];
  for (const { name, min } of rules) {
    const v = (env[name] ?? '').trim();
    if (!v) problems.push(`${name} is not set`);
    else if (v.length < min) problems.push(`${name} is too short (needs at least ${min} characters)`);
  }
  return problems;
}
