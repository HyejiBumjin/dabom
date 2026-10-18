import { z } from "zod";
import { RELATIONSHIPS, type Relationship } from "./profile-input";

export const LIBRARY_PAGE_SIZE = 12;
export const LIBRARY_REPORT_LIMIT = 32;
export type LibraryFilter = Relationship | "ALL";
const cursorSchema = z.object({ time: z.number().int().min(0).max(253_402_300_799_999), id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) });
export function parseLibraryCursor(value?: string) {
  if (!value || value.length > 512) return null;
  try { return cursorSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8"))); }
  catch { return null; }
}
export function libraryFilter(value: unknown): LibraryFilter {
  return RELATIONSHIPS.some(item => item.value === value) ? value as Relationship : "ALL";
}
export function libraryPageHref(filter: LibraryFilter, cursor?: string | null) {
  const params = new URLSearchParams();
  if (filter !== "ALL") params.set("relationship", filter);
  if (cursor) params.set("after", cursor);
  return `/saju/library${params.size ? `?${params}` : ""}`;
}
export function libraryHistoryHref(profileId: string, cursor: string) {
  return `/saju/library?${new URLSearchParams({ profile: profileId, historyAfter: cursor })}`;
}
