/**
 * Shiftaty Application Version Configuration
 * When releasing a new version, update APP_VERSION here.
 */
export const APP_VERSION = "1.5.0";
export const APP_BUILD_NUMBER = 15;

/**
 * Compares two semantic version strings (e.g. "1.5.0" vs "1.6.0").
 * Returns true if v1 is strictly older than v2 (v1 < v2).
 * Examples:
 *   isVersionOlder("1.5.0", "1.6.0") => true
 *   isVersionOlder("1.5.0", "1.5.0") => false
 *   isVersionOlder("1.5.1", "1.5.0") => false
 */
export function isVersionOlder(v1: string, v2: string): boolean {
  if (!v1 || !v2) return false;

  const clean = (v: string) => v.replace(/^v/i, "").trim();
  const parts1 = clean(v1).split(".").map((n) => parseInt(n, 10) || 0);
  const parts2 = clean(v2).split(".").map((n) => parseInt(n, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 < num2) return true;
    if (num1 > num2) return false;
  }

  return false;
}
