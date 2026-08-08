/** The persisted report contract. Renderers must preserve paragraph boundaries. */
export interface ReportContent {
  paragraphs: string[];
  meta: {
    charCount: number;
    beats: string[];
    termsUsed: Array<{ term: string; gloss: string }>;
  };
}
