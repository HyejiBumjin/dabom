/** Six interpretation sections; message renderers also preserve inline breaks. */
export interface ReportContent {
  paragraphs: string[];
  meta: {
    presentation?: "letter" | "message";
    synthesisRuleVersion?: string;
    synthesisEvidenceIds?: string[];
    interpretationRuleVersion?: string;
    interpretationEvidenceIds?: string[];
    readingAsOf?: string;
    charCount: number;
    beats: string[];
    termsUsed: Array<{ term: string; gloss: string }>;
    readingPlanVersion?: string;
    evidenceUses?: Array<{ sectionId: string; uses: Array<{ evidence_id: string; excerpt: string }> }>;
    editorialReview?: { status: "passed" | "needs-review"; issueCount: number; specificityIssueCount: number };
  };
}
