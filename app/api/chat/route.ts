import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
export const runtime = "edge";
import { NextResponse } from 'next/server';
import { headers } from 'next/headers'; // Import headers
import { v4 as uuidv4 } from 'uuid'; // For generating IDs

// Import the server-side Supabase client for user authentication
// import 'dotenv/config'; // Load environment variables (removed for Edge Runtime)
import { createServerClient, type CookieOptions } from '@supabase/ssr';
// Import the admin client for database operations (bypassing RLS)
import { supabaseAdmin } from '@/lib/supabase/admin';
// Import standard client for auth check
import { createClient } from '@supabase/supabase-js';
import { processStory } from '../../../lib/supabaseStoryInserts';

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
    // New fallback: - **Word(Reading): Romaji** – Meaning; – Context (no kanji breakdown)
    const fallback3 = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*[–-]\s*([^;]+);\s*[–-]\s*(.+)$/u);
    if (fallback3) {
      const [, word, reading, romaji, meaning, context_sentence] = fallback3;
      vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim(), context_sentence: context_sentence.trim() });
      continue;
    }
    // New fallback: - **Word(Reading): Romaji** – Meaning (no kanji, no context)
    const fallback4 = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*[–-]\s*([^;]+)$/u);
    if (fallback4) {
      const [, word, reading, romaji, meaning] = fallback4;
      vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim() });
      continue;
    }
    // Katakana-only fallback: - **Word** – Meaning; Context
    const katakanaOnly = line.match(/^[-*]\s*\*\*([\p{Script=Katakana}]+)\*\*\s*[–-]\s*([^;]+);\s*(.+)$/u);
    if (katakanaOnly) {
      const [, word, meaning, context_sentence] = katakanaOnly;
      vocabItems.push({ word, reading: word, meaning: meaning.trim(), context_sentence: context_sentence.trim() });
      continue;
    }
    // Katakana-only fallback: - **Word** – Meaning
    const katakanaOnly2 = line.match(/^[-*]\s*\*\*([\p{Script=Katakana}]+)\*\*\s*[–-]\s*([^;]+)$/u);
    if (katakanaOnly2) {
      const [, word, meaning] = katakanaOnly2;
      vocabItems.push({ word, reading: word, meaning: meaning.trim() });
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
      if (userMsgError) throw userMsgError;
      console.log('[SRS] Inserted user_prompt:', { id: userMessageId, user_id: user.id });
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

    // 4. Call OpenAI API with memory (Markdown story only)
    console.log("Calling OpenAI for Markdown story with streaming and memory...");
    try {
      // Generate the AI message ID before streaming
      const aiMessageId = uuidv4();
      const response = streamText({
        model: openai('gpt-4o-mini'),
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: userPrompt },
        ],
      });

      // Post-stream SRS/DB logic
      const encoder = new TextEncoder();
      let fullText = '';
      const stream = new ReadableStream({
        async start(controller) {
          // 1. Send the real message ID as a JSON chunk (with key 'id' for frontend compatibility)
          controller.enqueue(encoder.encode(JSON.stringify({ id: aiMessageId }) + '\n'));

          // 2. Stream the AI response (Markdown)
          for await (const chunk of response.textStream) {
            fullText += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          // 3. After streaming, save the story, vocab, and grammar to DB
          try {
            // --- Log the full AI Markdown response for debugging ---
            console.log('[Daddy Long Legs][DEBUG] Full AI Markdown response:', fullText);

            // --- Save AI markdown response to chat_messages as app_response ---
            try {
              const { error: aiMsgError } = await supabaseAdmin.from('chat_messages').insert({
                id: aiMessageId,
                user_id: user.id,
                message_type: 'app_response',
                content: fullText,
                chat_message_id: userMessageId,
              });
              if (aiMsgError) throw aiMsgError;
              console.log('[SRS] Inserted chat_message:', { id: aiMessageId, user_id: user.id });
            } catch (err) {
              console.error('[SRS] Failed to insert AI app_response message:', err);
            }

            // --- SECOND CALL: Generate JSON from Markdown ---
            const jsonPrompt = `Given the following Tadoku story and notes in Markdown, output ONLY a valid JSON code block with the following fields, and nothing else.\n\nFields:\n- title\n- japanese_text\n- english_text\n- vocab_notes (array of objects)\n- grammar_notes (array of objects)\n- questions (array of strings)\n- usage_tips (array of strings)\n\nThe JSON must match the story content.\n\nMarkdown:\n\n${fullText}\n\nOutput ONLY the JSON code block, wrapped in triple backticks (\`\`\`json ... \`\`\`). Do not include any explanation or text before or after the code block.`;

            // Call OpenAI for JSON block
            const jsonResponse = await streamText({
              model: openai('gpt-4o-mini'),
              messages: [
                { role: "system", content: jsonPrompt },
              ],
            });

            let jsonText = '';
            for await (const chunk of jsonResponse.textStream) {
              jsonText += chunk;
            }
            console.log('[Daddy Long Legs][DEBUG] Full AI JSON response:', jsonText);

            // --- Extract JSON block from jsonText ---
            let jsonBlock = null;
            const match = jsonText.match(/```json\s*([\s\S]+?)\s*```/);
            if (match) {
              try {
                jsonBlock = JSON.parse(match[1]);
              } catch (e) {
                console.error("[SRS] Failed to parse JSON block from second call:", e);
              }
            } else {
              console.warn('[SRS] No JSON block found in AI JSON response for Daddy Long Legs. Skipping vocab/grammar import.');
            }

            // --- Insert vocab, grammar, and story as before ---
            if (jsonBlock) {
              const vocabItems = Array.isArray(jsonBlock.vocab_notes) ? jsonBlock.vocab_notes : [];
              const grammarItems = Array.isArray(jsonBlock.grammar_notes) ? jsonBlock.grammar_notes : [];
              const now = new Date();
              const nextReview = now;
              // --- Insert vocab ---
              for (const v of vocabItems) {
                const { word, kanji, reading, meaning, context_sentence } = v;
                if (!word || !reading || !meaning) continue;
                let retries = 2;
                while (retries > 0) {
                  try {
                    const { data: existingVocab, error: vocabCheckError } = await supabaseAdmin
                      .from('vocabulary')
                      .select('id')
                      .eq('user_id', user.id)
                      .eq('word', word)
                      .maybeSingle();
                    if (vocabCheckError) throw vocabCheckError;
                    if (!existingVocab) {
                      const { error: vocabInsertError } = await supabaseAdmin.from('vocabulary').insert({
                        id: uuidv4(),
                        user_id: user.id,
                        word,
                        kanji,
                        reading,
                        meaning,
                        context_sentence,
                        chat_message_id: userMessageId,
                        srs_level: 0,
                        next_review: nextReview,
                      });
                      if (vocabInsertError) throw vocabInsertError;
                      console.log('[SRS] Inserted vocab:', { word, reading, meaning, user_id: user.id });
                      // --- Insert vocab context/example into vocab_story_links ---
                      if (context_sentence) {
                        const { error: vocabLinkError } = await supabaseAdmin.from('vocab_story_links').insert({
                          id: uuidv4(),
                          user_id: user.id,
                          vocab_word: word,
                          example_sentence: context_sentence,
                          chat_message_id: userMessageId,
                          created_at: new Date(),
                        });
                        if (vocabLinkError) {
                          console.error('[SRS] Failed to insert vocab_story_link:', vocabLinkError);
                        } else {
                          console.log('[SRS] Inserted vocab_story_link:', { word, context_sentence });
                        }
                      }
                    }
                    break; // Success, exit retry loop
                  } catch (err) {
                    retries--;
                    if (retries === 0) {
                      console.error('[SRS] Failed to insert vocab after retries:', word, err);
                    } else {
                      await new Promise(res => setTimeout(res, 500));
                    }
                  }
                }
              }
              // --- Insert grammar ---
              for (const g of grammarItems) {
                const { grammar_point, label, explanation, story_usage, narrative_connection, example_sentence } = g;
                if (!grammar_point || !explanation) continue;
                let retries = 2;
                while (retries > 0) {
                  try {
                    const { data: existingGrammar, error: grammarCheckError } = await supabaseAdmin
                      .from('grammar')
                      .select('id, explanation')
                      .eq('user_id', user.id)
                      .eq('grammar_point', grammar_point)
                      .eq('label', label)
                      .maybeSingle();
                    if (grammarCheckError) throw grammarCheckError;
                    let shouldInsert = true;
                    if (existingGrammar) {
                      const existingExp = (existingGrammar.explanation || '').trim().toLowerCase();
                      const newExp = (explanation || '').trim().toLowerCase();
                      if (existingExp === newExp || existingExp.includes(newExp) || newExp.includes(existingExp)) {
                        shouldInsert = false;
                      }
                    }
                    if (shouldInsert) {
                      const { error: grammarInsertError } = await supabaseAdmin.from('grammar').insert({
                        id: uuidv4(),
                        user_id: user.id,
                        grammar_point,
                        label,
                        explanation,
                        story_usage,
                        narrative_connection,
                        example_sentence: example_sentence || '',
                        chat_message_id: userMessageId,
                        srs_level: 0,
                        next_review: nextReview,
                      });
                      if (grammarInsertError) throw grammarInsertError;
                      console.log('[SRS] Inserted grammar:', { grammar_point, explanation, user_id: user.id });
                      // --- Insert grammar context/example into grammar_story_links ---
                      if (example_sentence) {
                        const { error: grammarLinkError } = await supabaseAdmin.from('grammar_story_links').insert({
                          id: uuidv4(),
                          user_id: user.id,
                          grammar_point,
                          example_sentence,
                          chat_message_id: userMessageId,
                          created_at: new Date(),
                        });
                        if (grammarLinkError) {
                          console.error('[SRS] Failed to insert grammar_story_link:', grammarLinkError);
                        } else {
                          console.log('[SRS] Inserted grammar_story_link:', { grammar_point, example_sentence });
                        }
                      }
                    }
                    break;
                  } catch (err) {
                    retries--;
                    if (retries === 0) {
                      console.error('[SRS] Failed to insert grammar after retries:', grammar_point, err);
                    } else {
                      await new Promise(res => setTimeout(res, 500));
                    }
                  }
                }
              }
              // --- Insert story (title, japanese_text, english_text, etc.) ---
              if (jsonBlock && jsonBlock.title && jsonBlock.japanese_text && jsonBlock.english_text) {
                const now = new Date(); // Define 'now' here for story insert
                try {
                  const { error: storyInsertError } = await supabaseAdmin.from('stories').insert({
                    id: aiMessageId,
                    user_id: user.id,
                    title: jsonBlock.title,
                    japanese_text: jsonBlock.japanese_text,
                    english_text: jsonBlock.english_text,
                    chat_message_id: userMessageId,
                    created_at: now,
                    level: 1, // Default to 1; update as needed
                  });
                  if (storyInsertError) throw storyInsertError;
                  console.log('[SRS] Inserted story:', { title: jsonBlock.title, user_id: user.id });
                } catch (err) {
                  console.error('[SRS] Failed to insert story:', err);
                }
              }
            }
          } catch (err) {
            console.error('[SRS] Post-stream SRS/DB error:', err);
          }
          controller.close();
        }
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
        },
      });
    } catch (aiError) {
      console.error("OpenAI API Error (stream):", aiError);
      return NextResponse.json({ error: 'Failed to get response from AI', details: String(aiError) }, { status: 500 });
    }

  // Main catch block for the entire request handling
  } catch (error) {
    console.error('API Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
}

// Add a simple test function (not run by default)
// Place this outside the POST handler
async function testSRSInserts() {
  // Example: fetch and log all stories, vocab, grammar, and chat_messages for the user
  const userId = 'YOUR_USER_ID'; // Replace with a real user ID for testing
  const [stories, vocab, grammar, chatMessages] = await Promise.all([
    supabaseAdmin.from('stories').select('*').eq('user_id', userId),
    supabaseAdmin.from('vocabulary').select('*').eq('user_id', userId),
    supabaseAdmin.from('grammar').select('*').eq('user_id', userId),
    supabaseAdmin.from('chat_messages').select('*').eq('user_id', userId),
  ]);
  console.log('[TEST] Stories:', stories.data);
  console.log('[TEST] Vocab:', vocab.data);
  console.log('[TEST] Grammar:', grammar.data);
  console.log('[TEST] Chat Messages:', chatMessages.data);
}