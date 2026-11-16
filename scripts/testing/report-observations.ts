import assert from "node:assert/strict";
import type { buildReportRenderPayload } from "../../src/lib/saju/report-payload";
import { hasReadingMaterial } from "../../src/lib/saju/report-reading-plan";

export function checkObservationContract(context: ReturnType<typeof buildReportRenderPayload>) {
  const { payload } = context;
  const ids = new Set(payload.observations.map(item => item.id));
  assert.equal(ids.size, payload.observations.length, "Each observation must have one canonical value");
  const owned = payload.sections.flatMap(section => section.primary_evidence_ids);
  assert.equal(new Set(owned).size, owned.length, "Detailed evidence must have one topic owner");
  assert.deepEqual([...owned].sort(), [...ids].sort());
  for (const section of payload.sections) {
    for (const id of section.anchor_evidence_ids) assert(section.primary_evidence_ids.includes(id), `An anchor escaped its owner: ${id}`);
    assert.deepEqual(section.anchor_evidence_ids, section.reading_plan.basis_ids);
    for (const id of section.reading_plan.basis_ids) assert(hasReadingMaterial(payload.observations.find(item => item.id === id)!), `Empty primary material: ${id}`);
    for (const connection of section.reading_plan.connections) for (const id of connection.evidence_ids) assert(section.reading_plan.basis_ids.includes(id));
    for (const id of [...section.primary_evidence_ids, ...section.context_evidence_ids]) assert(ids.has(id), `Invented reference ${id}`);
    const allowed = new Set([...section.primary_evidence_ids, ...section.context_evidence_ids]);
    const calculatedTerms = payload.observations.filter(item => allowed.has(item.id)).flatMap(item => item.terms);
    for (const term of section.advanced_terms) assert(calculatedTerms.includes(term), `Uncalculated advanced term ${term}`);
  }
  const prohibitedKeys = new Set(["fragments", "translation", "mechanism", "mechanism_steps", "concreteScene", "sceneVariants", "decision_rule", "fortune_reading", "primary_interpretation", "opportunity", "tension", "interplay", "guidance"]);
  function inspect(value: unknown) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) { assert(!prohibitedKeys.has(key), `Authored prose field reentered model input: ${key}`); inspect(child); }
  }
  inspect(payload);
  const assigned = payload.sections.flatMap(section => section.required_timing_terms);
  assert.equal(new Set(assigned).size, assigned.length, "A date cannot be reused by multiple topics");
  assert.deepEqual([...assigned].sort(), payload.yearly_context.timing.map(item => item.month).sort());
  for (const [index, period] of payload.yearly_context.timing.entries()) {
    const observation = payload.observations.find(item => item.kind === "period" && (item.value as { timing_index: number }).timing_index === index)!;
    assert(observation);
    const owner = payload.sections.find(section => section.primary_evidence_ids.includes(observation.id))!;
    assert(owner.required_timing_terms.includes(period.month));
  }
}
