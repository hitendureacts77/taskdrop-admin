// What a secret looks like. One list, used by the commit guard (scripts/secret-guard.mjs), its
// tests and the client-bundle test (scripts/client-secrets.test.mjs). The gitleaks config
// (.gitleaks.toml) is the second net on GitHub; this one runs on the PC before a commit exists.
//
// A match prints the file, the line and the rule NAME. It never prints the matched text, so the
// guard itself cannot leak what it finds.

/** Made-up values that appear on purpose in tests and docs. */
const FAKE = /THROWAWAY|EXAMPLE|PLACEHOLDER|xxxx|\.\.\.|<[a-z_ -]+>|changeme|your[-_ ]?(key|secret|token)/i;

export const RULES = [
  { id: 'private-key-block', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/ },
  { id: 'razorpay-live-key', re: /rzp_live_[A-Za-z0-9]{10,}/ },
  { id: 'razorpay-test-key', re: /rzp_test_[A-Za-z0-9]{10,}/ },
  { id: 'supabase-secret-key', re: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  { id: 'supabase-access-token', re: /sbp_[a-f0-9]{40}/ },
  { id: 'aws-access-key-id', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { id: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b/ },
  { id: 'sentry-auth-token', re: /\bsntr[yu]s?_[A-Za-z0-9+/=_-]{40,}/ },
  { id: 'slack-token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { id: 'imagekit-private-key', re: /\bprivate_[A-Za-z0-9+/=]{20,}/ },
  { id: 'google-service-account', re: /"type"\s*:\s*"service_account"/ },
  {
    // A JWT whose payload says role=service_role is the Supabase master key.
    id: 'supabase-service-role-jwt',
    re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    verify: (m) => {
      try {
        const payload = JSON.parse(Buffer.from(m.split('.')[1], 'base64url').toString('utf8'));
        return payload.role === 'service_role';
      } catch {
        return false;
      }
    },
  },
  {
    // NAME = "long random literal" where the name says it is secret.
    id: 'secret-assignment',
    re: /\b[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY|ACCESS_TOKEN|AUTH_TOKEN|API_KEY)[A-Z0-9_]*\s*[:=]\s*['"]([A-Za-z0-9+/_=.-]{24,})['"]/,
    group: 1,
    // A variable NAME in a list (EXPO_GOOGLE_MAPS_API_KEY) is not a value.
    verify: (v) => !/^[A-Z][A-Z0-9_]+$/.test(v),
  },
];

/** Files that must never be committed, by name. `.env.example` is the one allowed .env file. */
export const FORBIDDEN_FILES = [
  /(^|\/)\.env(\.(?!example$)[^/]*)?$/,
  /(^|\/)\.env\.all-secrets/,
  /\.(keystore|jks|p12|pfx|7z)$/i,
  /(^|\/)google-services\.json$/,
  /(^|\/)GoogleService-Info\.plist$/,
  /(^|\/)id_(rsa|ed25519|ecdsa)$/,
];

export function forbiddenFile(path) {
  const p = path.replace(/\\/g, '/');
  return FORBIDDEN_FILES.some((re) => re.test(p));
}

/** Findings in one file's text: [{ line, rule }]. Never includes the secret itself. */
export function scanText(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 4000) continue; // minified or data blobs: the weekly gitleaks scan covers them
    if (/secret-guard:\s*allow/.test(line)) continue;
    for (const rule of RULES) {
      const m = rule.re.exec(line);
      if (!m) continue;
      const hit = rule.group ? m[rule.group] : m[0];
      if (FAKE.test(hit) || FAKE.test(line)) continue;
      if (rule.verify && !rule.verify(hit)) continue;
      out.push({ line: i + 1, rule: rule.id });
    }
  }
  return out;
}
