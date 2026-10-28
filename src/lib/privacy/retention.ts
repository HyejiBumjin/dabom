/** Operational limits. TTL is asynchronous; authorization never relies on deletion timing. */
export const RETENTION = {
  oauthMinutes: 10,
  sessionDays: 14,
  abandonedCheckoutDays: 30,
  transactionYears: 5,
  complaintYears: 3,
  advertisingMonths: 6,
  defaultLogDays: 30,
  requiredAuditLogDays: 400,
  backupDays: 7,
} as const;

export function afterYears(date: Date, years: number) {
  if (!Number.isFinite(date.getTime())) throw new Error("INVALID_RETENTION_DATE");
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}
export function afterDays(date: Date, days: number) {
  if (!Number.isFinite(date.getTime())) throw new Error("INVALID_RETENTION_DATE");
  return new Date(date.getTime() + days * 86_400_000);
}
