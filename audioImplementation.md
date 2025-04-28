# Audio Implementation v2: Integration Steps

## Overview
This document outlines the integration steps for using chat-generated stories as audio practice material in the pronunciation-proficiency app. The stack uses the Web Speech API for transcription and Supabase for persistence and SRS.

---

## 1. Story Generation & Extraction
- User chats with AI; AI generates a Japanese story.
- Check: **Extract sentences** from the Japanese text.
- Check: **Tokenize sentences into words** (using a Japanese tokenizer or simple split for MVP).
- Check: **Insert new sentences/words** into Supabase (`sentences`, `words` tables) if they don't already exist.
- Check: **Link sentences to words** in the `sentence_words` table.

---

## 2. Practice Flow
- User selects a sentence from the latest story (or review queue).
- **PracticePage** displays the sentence and uses the `SpeechRecognizer` (Web Speech API) to capture audio and return a transcript/confidence.
- **Aligner** maps transcript to expected words and computes per-word scores.
- **Save results** to Supabase (`recordings`, `word_scores`).

---

## 3. Review & SRS
- Use SRS logic (trigger/Edge Function) to update `review_queue` after each `word_scores` insert.
- **Dashboard/Review pages** query Supabase for weakest/due words and display them for further practice.

---

## 4. Integration Steps
1. **Supabase Setup**
   - Create tables: `words`, `sentences`, `sentence_words`, `recordings`, `word_scores`, `review_queue`.
   - Create `proficiency` view and SRS trigger.
2. **Frontend**
   - Implement `SpeechRecognizer.tsx` (Web Speech API).
   - Implement `aligner.ts` (scoreWords).
   - Implement `PracticePage.tsx`:
     - Load sentences/words from latest story or review queue.
     - Use `SpeechRecognizer` to get transcript.
     - Use `scoreWords` to align and score.
     - Save results to Supabase.
   - Implement `Dashboard.tsx` and review pages.
3. **Extraction Logic**
   - After story generation, extract and insert sentences/words.
   - Link sentences to words.
4. **Polish**
   - Color-code words by proficiency.
   - Add spinners, mobile styles, etc.

---

## 5. Example Flow
1. User chats with AI → gets a story.
2. System extracts sentences/words and saves to Supabase.
3. User practices sentences/words using PracticePage.
4. Scores and recordings are saved; SRS is updated.
5. Dashboard/Review pages surface weak/due words for further practice.

---

## 6. Next Steps
- [ ] Implement extraction and insertion logic.
- [ ] Scaffold PracticePage to pull sentences from latest chat story.
- [ ] Build and test end-to-end flow. 