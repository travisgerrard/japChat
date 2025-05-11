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
import { supabaseAdmin } from '../../../lib/supabase/admin';
// Import standard client for auth check
import { createClient } from '@supabase/supabase-js';
import { processStory } from '../../../lib/supabaseStoryInserts';
import { extractJsonFromMarkdown } from '../../../utils/extractJsonFromMarkdown';
import { z } from 'zod';
import { authenticateRequest } from '../../../lib/chat/auth';
import { parseUserPrompt, fetchChatHistory, getSystemPrompt } from '../../../lib/chat/prompt';
import { parseAIResponse, extractVocabulary, extractGrammar } from '../../../lib/chat/markdownParser';
import {
  insertChatMessage,
  insertVocabulary,
  insertVocabStoryLink,
  insertGrammar,
  insertGrammarStoryLink,
  insertStory
} from '../../../lib/chat/db';

// Zod schema for AI JSON block
const aiJsonSchema = z.object({
  title: z.string().min(1),
  japanese_text: z.string().min(1),
  english_text: z.string().min(1),
  vocab_notes: z.array(z.object({
    word: z.string().min(1),
    kanji: z.string().optional(),
    reading: z.string().min(1),
    meaning: z.string().min(1),
    context_sentence: z.string().optional(),
  })).optional(),
  grammar_notes: z.array(z.object({
    grammar_point: z.string().min(1),
    label: z.string().optional(),
    explanation: z.string().min(1),
    story_usage: z.string().optional(),
    narrative_connection: z.string().optional(),
    example_sentence: z.string().optional(),
  })).optional(),
  questions: z.array(z.string()).optional(),
  usage_tips: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  // Main try block for the entire request handling
  try {
    // --- Re-enable Authentication using Headers ---
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      // console.error("API Auth Error:", authError || "User not found");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // --- Authentication Successful ---

    // 2. Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      // console.error("Error parsing request body as JSON:", parseError);
      return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
    }

    const body = requestData || {};
    const userPrompt = parseUserPrompt(body);

    // console.log("Parsed request body:", requestData); // Log the parsed request body

    if (!userPrompt) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }

    // --- Save user prompt to DB ---
    const userMessageId = uuidv4(); // Generate ID for user message
    // console.log(`Saving user (${user.id}) prompt to DB: ${userPrompt}`);
    try {
      await insertChatMessage({
        id: userMessageId,
        user_id: user.id,
        message_type: 'user_prompt',
        content: userPrompt,
      });
      // console.log('[SRS] Inserted user_prompt:', { id: userMessageId, user_id: user.id });
    } catch (dbError) {
      // console.error("Error saving user prompt:", dbError);
      // Decide if you want to proceed or return an error
    }

    // --- Fetch last 10 chat messages for memory ---
    const chatHistory = await fetchChatHistory(user.id, 10);

    // 3. Construct OpenAI Prompt with memory
    const systemPrompt = getSystemPrompt();

    // 4. Call OpenAI API with memory (Markdown story only)
    // console.log("Calling OpenAI for Markdown story with streaming and memory...");
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
            // console.log('[Daddy Long Legs][DEBUG] Full AI Markdown response:', fullText);

            // --- Save AI markdown response to chat_messages as app_response ---
            try {
              await insertChatMessage({
                id: aiMessageId,
                user_id: user.id,
                message_type: 'app_response',
                content: fullText,
                chat_message_id: userMessageId,
              });
              // console.log('[SRS] Inserted chat_message:', { id: aiMessageId, user_id: user.id });
            } catch (err) {
              // console.error('[SRS] Failed to insert AI app_response message:', err);
            }

            // --- SECOND CALL: Generate JSON from Markdown ---
            const jsonPrompt = `You are a Japanese language teaching assistant.\nGiven a Japanese story and its English translation, extract vocabulary and grammar points for language learners.\nReturn your response as a single JSON object with the following structure and requirements:\n\n---\n\nJSON Structure:\n\n{\n  \"title\": \"<Story Title>\",\n  \"japanese_text\": \"<Full Japanese Story Text>\",\n  \"english_text\": \"<Full English Translation>\",\n  \"vocab_notes\": [\n    {\n      \"word\": \"<Vocabulary word (kanji or kana)>\",\n      \"kanji\": \"<Kanji breakdown: each kanji, its reading in parentheses, and stroke counts in parentheses, joined by +. Example: 美(び) (6, 6) + 味(あじ) (6, 6)>\",\n      \"reading\": \"<Full reading in hiragana/katakana>\",\n      \"meaning\": \"<English meaning>\",\n      \"context_sentence\": \"<A sentence from the story where the word appears in context. Do not create new sentences.>\"\n    }\n    // ...more vocab items\n  ],\n  \"grammar_notes\": [\n    {\n      \"grammar_point\": \"<Grammar point>\",\n      \"label\": \"<Short English label>\",\n      \"explanation\": \"<Brief explanation in English>\",\n      \"story_usage\": \"<A sentence from the story where this grammar point is used>\",\n      \"narrative_connection\": \"<How this grammar point is used in the story>\",\n      \"example_sentence\": \"<A simple example sentence in Japanese using this grammar point>\"\n    }\n    // ...more grammar items\n  ],\n  \"questions\": [\n    \"<Comprehension question in Japanese>\",\n    // ...more questions\n  ],\n  \"usage_tips\": [\n    \"<Tip for using a vocab or grammar point in conversation>\",\n    // ...more tips\n  ]\n}\n\n---\n\nSpecial Instructions:\n- For each vocab item:\n  - kanji: Break down the word into its kanji components. For each kanji, show the kanji character, its reading in parentheses, and stroke counts in parentheses (use the format (X, X); if you don't know the actual stroke count, use (6, 6) as a placeholder). Join multiple kanji with +. Example: \"美(び) (6, 6) + 味(あじ) (6, 6)\"\n  - context_sentence: Must be a sentence from the provided story text where the word appears. Do not create new sentences.\n- For each grammar point:\n  - story_usage: Must be a sentence from the story where the grammar point is used.\n- All fields must be present and non-empty unless otherwise specified.\n- The JSON must be valid and parseable.\n\nMarkdown:\n\n${fullText}\n\nOutput ONLY the JSON code block, wrapped in triple backticks (\`\`\`json ... \`\`\`). Do not include any explanation or text before or after the code block. Ensure grammar_notes uses the exact field names: grammar_point, label, explanation, story_usage, narrative_connection, example_sentence.`;

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
            // console.log('[Daddy Long Legs][DEBUG] Full AI JSON response:', jsonText);

            // --- Extract JSON block from jsonText ---
            let jsonBlock = null;
            try {
              const extracted = extractJsonFromMarkdown(jsonText);
              const parsed = aiJsonSchema.safeParse(extracted);
              if (!parsed.success) {
                // console.error('[SRS] AI JSON block failed schema validation:', parsed.error);
              } else {
                jsonBlock = parsed.data;
              }
            } catch (e) {
              // console.error('[SRS] Failed to extract/parse JSON block from AI response:', e);
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
                    // Check for existing vocab (not modularized yet)
                    const { data: existingVocab, error: vocabCheckError } = await supabaseAdmin
                      .from('vocabulary')
                      .select('id')
                      .eq('user_id', user.id)
                      .eq('word', word)
                      .maybeSingle();
                    if (vocabCheckError) throw vocabCheckError;
                    if (!existingVocab) {
                      await insertVocabulary({
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
                      // console.log('[SRS] Inserted vocab:', { word, reading, meaning, user_id: user.id });
                      // --- Insert vocab context/example into vocab_story_links ---
                      if (context_sentence) {
                        await insertVocabStoryLink({
                          user_id: user.id,
                          vocab_word: word,
                          example_sentence: context_sentence,
                          chat_message_id: userMessageId,
                        });
                        // console.log('[SRS] Inserted vocab_story_link:', { word, context_sentence });
                      }
                    }
                    break; // Success, exit retry loop
                  } catch (err) {
                    retries--;
                    if (retries === 0) {
                      // console.error('[SRS] Failed to insert vocab after retries:', word, err);
                    } else {
                      await new Promise(res => setTimeout(res, 500));
                    }
                  }
                }
              }
              // --- Insert grammar ---
              for (const g of grammarItems) {
                // Map model fields to expected fields
                const grammar_point = g.grammar_point;
                const label = g.label || '';
                const explanation = g.explanation || '';
                const story_usage = g.story_usage || '';
                const narrative_connection = g.narrative_connection || '';
                const example_sentence = g.example_sentence || story_usage || '';
                if (!grammar_point || !explanation) continue;
                let retries = 2;
                while (retries > 0) {
                  try {
                    // Check for existing grammar (not modularized yet)
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
                      await insertGrammar({
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
                      // console.log('[SRS] Inserted grammar:', { grammar_point, explanation, user_id: user.id });
                      // --- Insert grammar context/example into grammar_story_links ---
                      if (example_sentence) {
                        await insertGrammarStoryLink({
                          user_id: user.id,
                          grammar_point,
                          example_sentence,
                          chat_message_id: userMessageId,
                        });
                        // console.log('[SRS] Inserted grammar_story_link:', { grammar_point, example_sentence });
                      }
                    }
                    break;
                  } catch (err) {
                    retries--;
                    if (retries === 0) {
                      // console.error('[SRS] Failed to insert grammar after retries:', grammar_point, err);
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
                  await insertStory({
                    id: aiMessageId,
                    user_id: user.id,
                    title: jsonBlock.title,
                    japanese_text: jsonBlock.japanese_text,
                    english_text: jsonBlock.english_text,
                    chat_message_id: userMessageId,
                    created_at: now,
                    level: 1, // Default to 1; update as needed
                  });
                  // console.log('[SRS] Inserted story:', { title: jsonBlock.title, user_id: user.id });
                } catch (err) {
                  // console.error('[SRS] Failed to insert story:', err);
                }
              }
            }
          } catch (err) {
            // console.error('[SRS] Post-stream SRS/DB error:', err);
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
      // console.error("OpenAI API Error (stream):", aiError);
      return NextResponse.json({ error: 'Failed to get response from AI', details: String(aiError) }, { status: 500 });
    }

  // Main catch block for the entire request handling
  } catch (error) {
    // console.error('API Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
}