export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import { headers } from 'next/headers'; // Import headers
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid'; // For generating IDs

// Import the server-side Supabase client for user authentication
import 'dotenv/config'; // Load environment variables
import { createServerClient, type CookieOptions } from '@supabase/ssr';
// Import the admin client for database operations (bypassing RLS)
import { supabaseAdmin } from '@/lib/supabase/admin';
// Import standard client for auth check
import { createClient } from '@supabase/supabase-js';
import { processStory } from '../../../lib/supabaseStoryInserts';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Placeholder Parsing Functions ---
// These need robust implementation based on the expected Markdown structure
function parseAIResponse(markdown: string): {
    title: string;
    japanese_text: string;
    english_text: string;
    vocab_notes: string; // Raw section for now
    grammar_notes: string; // Raw section for now
    questions: string; // Raw section for now
    usage_tips: string; // Raw section for now
    // TODO: Add level/theme extraction if possible from context or response
} {
    console.log("Raw Markdown:", markdown); // Log raw markdown input for debugging
    // Basic parsing using headers - prone to errors if format varies
    // Refined regex for more precise header matching and content capture
    const titleMatch = markdown.match(/### Story Title \(Japanese with Romaji\)\s*\r?\n+([\s\S]+?)(?=\n###)/);
    const jpTextMatch = markdown.match(/### Japanese Text\s*\r?\n+([\s\S]+?)(?=\n### English Translation)/);
    const enTextMatch = markdown.match(/### English Translation\s*\r?\n+([\s\S]+?)(?=\n### Vocabulary Notes)/);
    const vocabMatch = markdown.match(/### Vocabulary Notes\s*\r?\n+([\s\S]+?)(?=\n### Detailed Grammar Discussion)/);
    const grammarMatch = markdown.match(/### Detailed Grammar Discussion\s*\r?\n+([\s\S]+?)(?=\n### Practice Questions)/);
    const questionsMatch = markdown.match(/### Practice Questions\s*\r?\n+([\s\S]+?)(?=\n### Usage Tips)/);
    const tipsMatch = markdown.match(/### Usage Tips\s*\r?\n+([\s\S]+)/); // Tips section is last, so no lookahead needed

    // Return extracted parts or defaults/errors
    return {
        title: titleMatch?.[1]?.trim() ?? 'Parsing Error: Title not found',
        japanese_text: jpTextMatch?.[1]?.trim() ?? 'Parsing Error: Japanese text not found',
        english_text: enTextMatch?.[1]?.trim() ?? 'Parsing Error: English text not found',
        vocab_notes: vocabMatch?.[1]?.trim() ?? 'Parsing Error: Vocab notes not found',
        grammar_notes: grammarMatch?.[1]?.trim() ?? 'Parsing Error: Grammar notes not found',
        questions: questionsMatch?.[1]?.trim() ?? 'Parsing Error: Questions not found',
        usage_tips: tipsMatch?.[1]?.trim() ?? 'Parsing Error: Usage tips not found',
    };
}

function extractVocabulary(vocabNotesSection: string): Array<{ word: string; kanji?: string; reading: string; meaning: string; context_sentence?: string }> {
  const vocabItems: Array<{ word: string; kanji?: string; reading: string; meaning: string; context_sentence?: string }> = [];
  if (!vocabNotesSection) return vocabItems;
  const lines = vocabNotesSection.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Flexible regex for: - **Word(Reading): Romaji** – Meaning; Kanji; Context
    const match = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*[–-]\s*([^;]+);\s*([^;]+);\s*(.+)$/u);
    if (match) {
      const [, word, reading, romaji, meaning, kanji, context_sentence] = match;
      vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim(), kanji: kanji.trim() === 'N/A' ? undefined : kanji.trim(), context_sentence: context_sentence.trim() });
      continue;
    }
    // Fallback: - **Word(Reading): Romaji** – Meaning; Context
    const fallback = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*[–-]\s*([^;]+);\s*(.+)$/u);
    if (fallback) {
      const [, word, reading, romaji, meaning, context_sentence] = fallback;
      vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim(), context_sentence: context_sentence.trim() });
      continue;
    }
    // Fallback: - **Word(Reading): Romaji** – Meaning
    const fallback2 = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*[–-]\s*([^;]+)$/u);
    if (fallback2) {
      const [, word, reading, romaji, meaning] = fallback2;
      vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim() });
      continue;
    }
    if (line) {
      console.warn('[SRS] Unmatched vocab line:', line);
    }
  }
  return vocabItems;
}

function extractGrammar(grammarNotesSection: string): Array<{ grammar_point: string; label: string; explanation: string; story_usage: string; narrative_connection: string; example_sentence: string }> {
  const grammarItems: Array<{ grammar_point: string; label: string; explanation: string; story_usage: string; narrative_connection: string; example_sentence: string }> = [];
  if (!grammarNotesSection) return grammarItems;
  // Split by grammar point headings (#### Grammar Point: ...)
  const points = grammarNotesSection.split(/####\s*Grammar Point:/).map((s, i) => (i === 0 ? s : 'Grammar Point:' + s)).filter(Boolean);
  for (const point of points) {
    let grammar_point = '', label = '', explanation = '', story_usage = '', narrative_connection = '', example_sentence = '';
    // Robustly extract each field
    const lines = point.split('\n').map(l => l.trim());
    for (const line of lines) {
      if (line.startsWith('Grammar Point:')) grammar_point = line.replace('Grammar Point:', '').trim();
      else if (line.startsWith('**English Name:**')) label = line.replace('**English Name:**', '').trim();
      else if (line.startsWith('**Explanation:**')) explanation = line.replace('**Explanation:**', '').trim();
      else if (line.startsWith('**Story Usage:**')) { story_usage = line.replace('**Story Usage:**', '').trim(); example_sentence = story_usage; }
      else if (line.startsWith('**Narrative Connection:**')) narrative_connection = line.replace('**Narrative Connection:**', '').trim();
    }
    // Only add if at least grammar_point and explanation are present
    if (grammar_point && explanation) {
      grammarItems.push({ grammar_point, label, explanation, story_usage, narrative_connection, example_sentence });
    } else if (point) {
      console.warn('[SRS] Unmatched grammar point:', point);
    }
  }
  return grammarItems;
}
// --- End Placeholder Parsing Functions ---


export async function POST(request: Request) {
  // Main try block for the entire request handling
  try {
    // --- Re-enable Authentication using Headers ---
    const headerMap = await headers();
    const authHeader = headerMap.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("Missing or invalid Authorization header in POST /api/chat.");
      return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
    }
    const jwt = authHeader.split(' ')[1]; // Extract the token

    // Create a standard Supabase client for auth check
    const supabaseAuthCheck = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Verify user authentication using the token from the header
    const { data: { user }, error: authError } = await supabaseAuthCheck.auth.getUser(jwt);

    if (authError || !user) {
      console.error("API Auth Error:", authError?.message || "User not found");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // --- Authentication Successful ---

    // 2. Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error("Error parsing request body as JSON:", parseError);
      return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
    }

    const body = requestData || {}; // Default to empty object if parsing failed
    // Handle both flat and nested message formats
    const userPrompt = (typeof body.message === 'object' && body.message !== null && 'content' in body.message)
      ? body.message.content
      : body.message;


    console.log("Parsed request body:", requestData); // Log the parsed request body

    if (!userPrompt) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 }); // Changed error message
    }

    // --- Save user prompt to DB ---
    const userMessageId = uuidv4(); // Generate ID for user message
    console.log(`Saving user (${user.id}) prompt to DB: ${userPrompt}`);
    try {
      const { error: userMsgError } = await supabaseAdmin
        .from('chat_messages')
        .insert({ id: userMessageId, user_id: user.id, message_type: 'user_prompt', content: userPrompt });
      if (userMsgError) { throw userMsgError; }
    } catch (dbError) {
      console.error("Error saving user prompt:", dbError);
      // Decide if you want to proceed or return an error
    }

    // --- Fetch last 10 chat messages for memory ---
    let chatHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    try {
      const { data: historyMessages, error: historyError } = await supabaseAdmin
        .from('chat_messages')
        .select('message_type, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(10);
      if (historyError) {
        console.error('Error fetching chat history for memory:', historyError);
      } else if (historyMessages) {
        chatHistory = historyMessages.map((msg: { message_type: string, content: string }) => ({
          role: msg.message_type === 'user_prompt' ? 'user' : 'assistant',
          content: msg.content,
        }));
      }
    } catch (historyCatchError) {
      console.error('Exception fetching chat history for memory:', historyCatchError);
    }

    // 3. Construct OpenAI Prompt with memory
    const systemPrompt = `
You are an expert Japanese language tutor specializing in creating Tadoku-style graded reader stories. Your goal is to generate a complete learning module based *exactly* on the user's request, adhering strictly to the specified Tadoku level, Genki chapter grammar/vocabulary, and theme.

**Input:** The user will provide a request like "Create a Level 1 story with Genki Chapter 5 grammar about a picnic" or "Level 3 story, Genki 6, festival theme."

**Output Structure (Use EXACTLY this Markdown structure and format—do not use cards, tables, or custom HTML):**

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

**Constraint Checklist (Mandatory):**
1.  **Adhere strictly to Tadoku level sentence count.**
2.  **Use ONLY grammar/vocab from specified Genki chapter(s) and level.**
3.  **Follow the EXACT output structure and Markdown formatting above.**
4.  **Apply furigana ONLY on the first instance of a reading.**
5.  **Ensure Vocabulary/Grammar notes match the required detail and format.**
6.  **Include a clear Goal-Obstacle-Resolution arc.**
7.  **Use appropriate connectors and explain them.**

Generate the response now based on the user's prompt.
`;

    // 4. Call OpenAI API with memory
    console.log("Calling OpenAI with streaming and memory...");
    try {
      // Generate the AI message ID before streaming
      const aiMessageId = uuidv4();
      const openaiStream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: userPrompt },
        ],
        stream: true,
      });

      let accumulatedAIResponse = '';
      let sentIdChunk = false;
      const stream = new ReadableStream({
        async start(controller) {
          // Send the real message ID as the first chunk (JSON, then newline)
          if (!sentIdChunk) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ id: aiMessageId }) + '\n'));
            sentIdChunk = true;
          }
          for await (const chunk of openaiStream) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
              accumulatedAIResponse += content;
            }
          }
          controller.close();
          console.log('[API] Stream completed and closed for message:', aiMessageId);
          // Save the full AI response to Supabase after streaming completes
          try {
            const { error: aiMsgError } = await supabaseAdmin
              .from('chat_messages')
              .insert({ id: aiMessageId, user_id: user.id, message_type: 'app_response', content: accumulatedAIResponse });
            if (aiMsgError) {
              console.error("Error saving streamed AI response to DB:", aiMsgError);
            } else {
              console.log("Streamed AI response saved successfully.");
            }
          } catch (dbSaveError) {
            console.error("Exception during AI response save operation (stream):", dbSaveError);
          }

          // --- SRS Extraction and Saving ---
          try {
            // Parse markdown for vocab and grammar
            const parsed = parseAIResponse(accumulatedAIResponse);
            console.log('[SRS] Parsed AI response:', parsed);
            // --- NEW: Process story for SRS pipeline ---
            if (parsed.japanese_text && !parsed.japanese_text.startsWith('Parsing Error')) {
              try {
                await processStory(parsed.japanese_text);
                console.log('[SRS] processStory completed for chat story.');
              } catch (err) {
                console.error('[SRS] processStory failed:', err);
              }
            }
            // --- END NEW ---
            const vocabItems = extractVocabulary(parsed.vocab_notes);
            const grammarItems = extractGrammar(parsed.grammar_notes);
            console.log('[SRS] Extracted vocab items:', vocabItems);
            console.log('[SRS] Extracted grammar items:', grammarItems);
            const now = new Date();
            const nextReview = now; // Available for review immediately
            let vocabAdded = 0;
            let grammarAdded = 0;
            // Insert vocab
            for (const v of vocabItems) {
              const { word, kanji, reading, meaning, context_sentence } = v;
              if (!word || !reading || !meaning) continue;
              // Check for duplicate
              const { data: existingVocab, error: vocabCheckError } = await supabaseAdmin
                .from('vocabulary')
                .select('id')
                .eq('user_id', user.id)
                .eq('word', word)
                .maybeSingle();
              if (vocabCheckError) console.error('[SRS] Error checking vocab duplicate:', vocabCheckError);
              if (!existingVocab) {
                console.log('[SRS] Inserting vocab:', { word, kanji, reading, meaning, context_sentence });
                const { error: vocabInsertError } = await supabaseAdmin.from('vocabulary').insert({
                  id: uuidv4(),
                  user_id: user.id,
                  word,
                  kanji,
                  reading,
                  meaning,
                  context_sentence,
                  chat_message_id: aiMessageId,
                  srs_level: 0,
                  next_review: nextReview,
                });
                if (vocabInsertError) {
                  console.error('[SRS] Error inserting vocab:', vocabInsertError);
                } else {
                  vocabAdded++;
                }
              }
              // Always insert vocab_story_links
              await supabaseAdmin.from('vocab_story_links').insert({
                user_id: user.id,
                vocab_word: word,
                chat_message_id: aiMessageId,
                example_sentence: context_sentence,
              });
            }
            // Insert grammar
            for (const g of grammarItems) {
              const { grammar_point, label, explanation, story_usage, narrative_connection, example_sentence } = g;
              if (!grammar_point || !explanation) continue;
              // Check for duplicate by grammar_point and label
              const { data: existingGrammar, error: grammarCheckError } = await supabaseAdmin
                .from('grammar')
                .select('id, explanation')
                .eq('user_id', user.id)
                .eq('grammar_point', grammar_point)
                .eq('label', label)
                .maybeSingle();
              if (grammarCheckError) console.error('[SRS] Error checking grammar duplicate:', grammarCheckError);
              // Only insert if not found, or if explanation is different enough
              let shouldInsert = true;
              if (existingGrammar) {
                const existingExp = (existingGrammar.explanation || '').trim().toLowerCase();
                const newExp = (explanation || '').trim().toLowerCase();
                // Basic similarity: if explanations are identical or one contains the other, skip
                if (existingExp === newExp || existingExp.includes(newExp) || newExp.includes(existingExp)) {
                  shouldInsert = false;
                }
              }
              if (shouldInsert) {
                console.log('[SRS] Inserting grammar:', { grammar_point, label, explanation, story_usage, narrative_connection, example_sentence });
                const { error: grammarInsertError } = await supabaseAdmin.from('grammar').insert({
                  id: uuidv4(),
                  user_id: user.id,
                  grammar_point,
                  label,
                  explanation,
                  story_usage,
                  narrative_connection,
                  example_sentence: example_sentence || '',
                  chat_message_id: aiMessageId,
                  srs_level: 0,
                  next_review: nextReview, // Ensure grammar is due immediately
                });
                if (grammarInsertError) {
                  console.error('[SRS] Error inserting grammar:', grammarInsertError);
                } else {
                  grammarAdded++;
                }
              }
              // Always insert grammar_story_links
              await supabaseAdmin.from('grammar_story_links').insert({
                user_id: user.id,
                grammar_point,
                chat_message_id: aiMessageId,
                example_sentence,
              });
            }
          } catch (srsError) {
            console.error('SRS extraction/saving error:', srsError);
          }
        }
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
        },
      });
    } catch (aiError) {
      console.error("OpenAI API Error (stream):", aiError);
      return NextResponse.json({ error: 'Failed to get response from AI', details: String(aiError) }, { status: 500 });
    }

    // --- Parsing and saving related story data (vocab, grammar) is commented out ---
    // --- This section would need the accumulatedAIResponse if re-enabled ---

  // Main catch block for the entire request handling
  } catch (error) {
    console.error('API Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
}