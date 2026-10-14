/** Six interpretation sections; message renderers also preserve inline breaks. */
export interface ReportContent {
  paragraphs: string[];
  meta: {
    presentation?: "letter" | "message";
    charCount: number;
    beats: string[];
    termsUsed: Array<{ term: string; gloss: string }>;
  };
}
