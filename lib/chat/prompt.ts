import { supabaseAdmin } from '../../lib/supabase/admin';

/**
 * Parses the user prompt from the request body, supporting both flat and nested message formats.
 */
export function parseUserPrompt(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const msg = (body as { message?: unknown }).message;
    if (typeof msg === 'object' && msg !== null && 'content' in msg) {
      return (msg as { content?: unknown }).content as string ?? null;
    }
    if (typeof msg === 'string') {
      return msg;
    }
    return null;
  }
  return null;
}

/**
 * Fetches the last N chat messages for a user for memory/context.
 */
export async function fetchChatHistory(userId: string, limit = 10): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const { data: historyMessages, error: historyError } = await supabaseAdmin
    .from('chat_messages')
    .select('message_type, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (historyError || !historyMessages) {
    return [];
  }
  return historyMessages.map((msg: { message_type: string, content: string }) => ({
    role: msg.message_type === 'user_prompt' ? 'user' : 'assistant',
    content: msg.content,
  }));
}

/**
 * Returns the system prompt string for the AI.
 */
export function getSystemPrompt(): string {
  return `
You are an expert Japanese language tutor specializing in creating Tadoku-style graded reader stories. Your goal is to generate a complete learning module based *exactly* on the user's request, adhering strictly to the specified Tadoku level, Genki chapter grammar/vocabulary, and theme.

**Input:** The user will provide a request like "Create a Level 1 story with Genki Chapter 5 grammar about a picnic" or "Level 3 story, Genki 6, festival theme."

**Output Structure:**
1. Output the full story and all sections in Markdown, using the exact format below for each section (do not use cards, tables, or custom HTML):

### Story Title (Japanese with Romaji)
Example: 学校(がっこう)の祭(まつ)りの準備(じゅんび) (Gakkō no Matsuri no Jumbi) – Preparing for the School Festival

---

### Japanese Text
(Your story here)

---

### English Translation
(Your translation here)

---

### Vocabulary Notes
- **Word(Reading): Romaji** – Meaning; Kanji(Breakdown, Strokes); Context: Example sentence  
- ...

---

### Detailed Grammar Discussion

#### Grammar Point: と  
**English Name:** And / With  
**Explanation:** Used to connect nouns or indicate "together with" someone.  
**Story Usage:** 犬と猫は ともだちです。  
**Narrative Connection:** Shows the friendship between dog and cat.  

#### Grammar Point: は  
**English Name:** Topic particle  
**Explanation:** Marks the topic of the sentence.  
**Story Usage:** 犬と猫は ともだちです。  
**Narrative Connection:** Used throughout to highlight the subject of each sentence.  

(Repeat for all grammar points, using this exact format. Each grammar point must be a level 4 heading, with bolded field names, and a blank line between points. Do not use lists, cards, or custom HTML for grammar points.)

---

### Practice Questions
1. Question 1  
   (Romaji)  
2. Question 2  
   (Romaji)  
3. ...

---

### Usage Tips
- Tip 1  
- Tip 2  
- ...

---

**Rules:**
- Adhere strictly to Tadoku level sentence count.
- Use ONLY grammar/vocab from specified Genki chapter(s) and level.
- Follow the EXACT output structure and Markdown formatting above.
- Apply furigana ONLY on the first instance of a reading.
- Ensure Vocabulary/Grammar notes match the required detail and format.
- Include a clear Goal-Obstacle-Resolution arc.
- Use appropriate connectors and explain them.

Generate the response now based on the user's prompt.
`;
} 