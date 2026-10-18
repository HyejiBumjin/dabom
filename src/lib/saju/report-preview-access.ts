/** Granted by an operator to a specific completed development report, never by a client. */
export type DevelopmentPreviewAccess = { userId: string; grantedAt: string };

export type PreviewReadableReport = {
  userId?: string;
  orderId?: string | null;
  status?: string;
  content?: unknown;
  developmentPreviewAccess?: DevelopmentPreviewAccess;
};

export function canReadDevelopmentPreview(report: PreviewReadableReport, userId: string) {
  const grant = report.developmentPreviewAccess;
  return Boolean(
    grant && grant.userId === userId && report.userId === userId &&
    Number.isFinite(Date.parse(grant.grantedAt)) &&
    report.orderId === null && report.status === "COMPLETED" && report.content,
  );
}
