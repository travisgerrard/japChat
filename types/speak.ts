// Types for the Speak feature

export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  role: string;
  created_at: string;
  app_response?: string;
}

export type VocabNote = {
  word: string;
  reading?: string;
  kanji?: string;
  meaning?: string;
  context_sentence?: string;
};

export interface BreakdownItem {
  word: string;
  reading?: string;
  kanji: string;
  meaning?: string;
  explanation?: string;
  sentenceIdx?: number;
  romaji?: string;
}

export type BreakdownJSON = BreakdownItem[];

export interface ModalType {
  type: 'vocab' | 'grammar';
  item: BreakdownItem;
  existing: Record<string, unknown> | null;
} 