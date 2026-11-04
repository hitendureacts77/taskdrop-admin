/**
 * Which filters an export used, by name only, for the audit log (task 2.14, B19). The values stay out of it: a
 * searched phone number or email would otherwise sit in the log for good. A name that is not plain letters (someone
 * typing a number as a parameter name) is dropped too.
 */
export function filterNames(sp: URLSearchParams): string {
  const names = [...new Set([...sp.keys()].filter((k) => /^[A-Za-z_]{1,30}$/.test(k)))].sort().slice(0, 12);
  return names.join(', ') || 'none';
}
