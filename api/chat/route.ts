import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers'; // Import headers
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid'; // For generating IDs

// Import the server-side Supabase client for user authentication
import 'dotenv/config'; // Load environment variables
import { createServerClient, type CookieOptions } from '@supabase/ssr';
// Import the admin client for database operations (bypassing RLS)
import { supabaseAdmin } from '@/lib/supabase/admin';
// Import standard client for auth check
import { createClient } from '@supabase/supabase-js';

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
  // Matches: - **空港(くうこう): Kūkō** - Airport; 空(Sky, 8 strokes), 港(Harbor, 12 strokes); Context: 空港で友達を待ちます。
  const vocabItems: Array<{ word: string; kanji?: string; reading: string; meaning: string; context_sentence?: string }> = [];
  if (!vocabNotesSection) return vocabItems;
  const lines = vocabNotesSection.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Regex for: - **WORD(READING): Romaji** - Meaning; Kanji breakdown; Context: ...
    const match = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*-\s*([^;]+);\s*([^;]+);\s*Context:\s*(.+)$/u);
    if (match) {
      const [, word, reading, romaji, meaning, kanji, context_sentence] = match;
      vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim(), kanji: kanji.trim(), context_sentence: context_sentence.trim() });
    } else {
      // Fallback: try to match a simpler format
      const fallback = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*-\s*([^;]+);\s*Context:\s*(.+)$/u);
      if (fallback) {
        const [, word, reading, romaji, meaning, context_sentence] = fallback;
        vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim(), context_sentence: context_sentence.trim() });
      }
    }
  }
  return vocabItems;
}

function extractGrammar(grammarNotesSection: string): Array<{ grammar_point: string; explanation: string; example_sentence: string }> {
  // Each grammar point is like:
  // 1. **Past Tense (*-ました*/*-ませんでした*)**:  
  //    - **Story Usage:** ...
  //    - **Narrative Connection:** ...
  const grammarItems: Array<{ grammar_point: string; explanation: string; example_sentence: string }> = [];
  if (!grammarNotesSection) return grammarItems;
  // Split by numbered points
  const points = grammarNotesSection.split(/\n\d+\.\s+\*\*/).map((s, i) => (i === 0 ? s : '**' + s)).filter(Boolean);
  for (const point of points) {
    // Match: **Grammar Point:** Explanation
    const match = point.match(/^\*\*([^*]+)\*\*:?(.*)/);
    if (match) {
      const [, grammar_point, explanation] = match;
      // Try to find a story usage/example sentence (bolded)
      const exampleMatch = point.match(/-\s*\*\*Story Usage:\*\*:?\s*([^\n]+)/i);
      const example_sentence = exampleMatch ? exampleMatch[1].trim() : '';
      grammarItems.push({ grammar_point: grammar_point.trim(), explanation: explanation.trim(), example_sentence });
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

**Output Structure (Use EXACTLY these Markdown headers and format):**

### Story Title (Japanese with Romaji)
Example: 学校(がっこう)の祭(まつ)りの準備(じゅんび) (Gakkō no Matsuri no Jumbi) – Preparing for the School Festival

### Japanese Text
Generate a story adhering to the requested Tadoku level's sentence count:
- Level 0-1: 7-10 sentences
- Level 2-3: 10-14 sentences
- Level 4+: 15+ sentences
Use grammar and vocabulary appropriate for the specified Tadoku level AND specified Genki chapters.
Include a clear story arc: goal, obstacle(s), resolution, scaled to the level.
Apply furigana using the format Kanji(Furigana) ONLY on the *first* appearance of a specific kanji reading within this section. Example: 私(わたし)は 金曜日(きんようび)に 6時(じ)に 起(お)きました。 Later: 私は... (no furigana needed again for 私 or 時).

### English Translation
Provide a natural, sentence-by-sentence translation directly below the corresponding Japanese sentence.

### Vocabulary Notes
List 3-5 key vocabulary words relevant to the story and level. Use this exact format for each:
- **Word (Kanji): Reading** - Meaning; Kanji Breakdown (Kanji: Meaning, Strokes); Context Sentence Example from Story
Example: - **計画(けいかく): Keikaku** - Plan; 計(Measure, 9 strokes), 画(Draw, 8 strokes); Context: 祭(まつ)りを 計画(けいかく)しました

### Detailed Grammar Discussion
Explain 8-12 grammar points used in the story, relevant to the specified Genki chapters and level. Use this exact format for each:
1.  **Grammar Point:** Explanation of usage/meaning.
    - **Story Usage:** Quote the sentence(s) from the story using this grammar.
    - **Narrative Connection:** Explain how this grammar point contributes to the story's flow, plot, or character's actions/state.
Example: 1. **Past Tense (-ました/-ませんでした):** Used to narrate completed actions.
    - **Story Usage:** 起(お)きました, 計画(けいかく)しました, ありませんでした.
    - **Narrative Connection:** Establishes the sequence of past events in the festival preparation. The negative form highlights obstacles like missing ingredients.

### Practice Questions
Create 3-4 questions *in Japanese* (with Romaji) based on the story content. Ensure questions are answerable from the text and appropriate for the story's level.
Example: 1. わたしは なぜ 忙(いそが)しかったですか。 (Watashi wa naze isogashikatta desu ka?)

### Usage Tips
Provide 2-3 brief, actionable tips for the learner related to the story's content or level.
Example: - Trace connectors (から, が, て) to understand flow. - Practice writing key kanji: 祭(まつり), 計(けい), 画(かく).

**Constraint Checklist (Mandatory):**
1.  **Adhere strictly to Tadoku level sentence count.**
2.  **Use ONLY grammar/vocab from specified Genki chapter(s) and level.**
3.  **Follow the EXACT output structure and Markdown formatting.**
4.  **Apply furigana ONLY on the first instance of a reading.**
5.  **Ensure Vocabulary/Grammar notes match the required detail and format.**
6.  **Include a clear Goal-Obstacle-Resolution arc.**
7.  **Use appropriate connectors and explain them.**

Generate the response now based on the user's prompt.
`;

    // 4. Call OpenAI API with memory
    console.log("Calling OpenAI with streaming and memory...");
    try {
      const openaiStream = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: userPrompt },
        ],
        stream: true,
      });

      let accumulatedAIResponse = '';
      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of openaiStream) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
              accumulatedAIResponse += content;
            }
          }
          controller.close();
          // Save the full AI response to Supabase after streaming completes
          let aiMessageId: string | null = null;
          try {
            aiMessageId = uuidv4();
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
            const vocabItems = extractVocabulary(parsed.vocab_notes);
            const grammarItems = extractGrammar(parsed.grammar_notes);
            console.log('[SRS] Extracted vocab items:', vocabItems);
            console.log('[SRS] Extracted grammar items:', grammarItems);
            const now = new Date();
            const nextReview = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
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
            }
            // Insert grammar
            for (const g of grammarItems) {
              const { grammar_point, explanation, example_sentence } = g;
              if (!grammar_point || !explanation) continue;
              // Check for duplicate
              const { data: existingGrammar, error: grammarCheckError } = await supabaseAdmin
                .from('grammar')
                .select('id')
                .eq('user_id', user.id)
                .eq('grammar_point', grammar_point)
                .maybeSingle();
              if (grammarCheckError) console.error('[SRS] Error checking grammar duplicate:', grammarCheckError);
              if (!existingGrammar) {
                console.log('[SRS] Inserting grammar:', { grammar_point, explanation, example_sentence });
                const { error: grammarInsertError } = await supabaseAdmin.from('grammar').insert({
                  id: uuidv4(),
                  user_id: user.id,
                  grammar_point,
                  explanation,
                  example_sentence,
                  chat_message_id: aiMessageId,
                  srs_level: 0,
                  next_review: nextReview,
                });
                if (grammarInsertError) {
                  console.error('[SRS] Error inserting grammar:', grammarInsertError);
                } else {
                  grammarAdded++;
                }
              }
            }
            // Notify user in chat if anything was added
            if (vocabAdded > 0 || grammarAdded > 0) {
              const notification = `Added ${vocabAdded} vocabulary word${vocabAdded !== 1 ? 's' : ''} and ${grammarAdded} grammar point${grammarAdded !== 1 ? 's' : ''} from '${parsed.title}' to your SRS!`;
              console.log('[SRS] Inserting notification message:', notification);
              const { error: notifError } = await supabaseAdmin.from('chat_messages').insert({
                id: uuidv4(),
                user_id: user.id,
                message_type: 'app_response',
                content: notification,
              });
              if (notifError) console.error('[SRS] Error inserting notification message:', notifError);
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