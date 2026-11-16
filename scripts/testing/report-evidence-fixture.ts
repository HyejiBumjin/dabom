/** Transport fixtures only. Never imported by production or sent as examples. */
import type { ReportRenderPayload } from "../../src/lib/saju/report-payload";
import { BODY_SECTIONS, excerptMentionsEvidence, type EvidenceUse } from "../../src/lib/llm/report-evidence-review";
import { hasReadingMaterial } from "../../src/lib/saju/report-reading-plan";
import { stripReportDecorations } from "../../src/lib/report-emoticons";

export function fixtureEvidenceUses(id: string, paragraph: string, payload: ReportRenderPayload): EvidenceUse[] {
  if (!BODY_SECTIONS.includes(id)) return [];
  const section = payload.sections.find(section => section.id === id)!;
  const ids = [...new Set([...section.reading_plan.basis_ids, ...section.primary_evidence_ids, ...section.context_evidence_ids])];
  const excerpts = stripReportDecorations(paragraph).split(/[.!?。！？\n]/u).map(text => text.trim()).filter(text => text.length >= 8 && text.length <= 240);
  return ids.flatMap(evidence_id => {
    const observation = payload.observations.find(item => item.id === evidence_id)!;
    if (!hasReadingMaterial(observation)) return [];
    const excerpt = excerpts.find(text => excerptMentionsEvidence(observation, text, payload));
    return excerpt ? [{ evidence_id, excerpt }] : [];
  }).slice(0, 3);
}
