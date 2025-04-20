# Japanese Learning Chat App Specification

## 1. Overview

This app is a Japanese learning tool centered around a chat interface, allowing users to request Tadoku-style graded reader stories tailored to their specified proficiency level (e.g., *Genki I* Chapters 3–6) and Tadoku level (0–4 or higher, as requested). Stories are inspired by the provided example, featuring tightly connected narratives, explicit grammar connectors (e.g., から, が, て, たい), and a clear story arc with goals, obstacles, and resolutions. Each story includes highly detailed grammar and vocabulary notes, matching the example’s depth, with comprehensive explanations of grammar usage, kanji breakdowns, and narrative connections. Chat interactions (user prompts and app responses) are saved to the database. Vocabulary and grammar are extracted for Spaced Repetition System (SRS) review, with traceability to their originating stories. Users can browse saved grammar and vocabulary, identifying which items came from which stories via the UI. Additional features include speech synthesis and recognition, database storage for chats, stories, and progress, and a responsive design with dark mode support.

## 2. Functional Requirements

### 2.1 Chat Interface (Main Interface)

- **Feature**: The primary interface is a chat window for requesting and receiving stories, with all interactions saved to the database.
- **Details**:
  - Users input requests (e.g., “Create a Level 1 story with *Genki* Chapter 5 grammar about a picnic” or “Create a Level 3 story with *Genki* Chapter 6 about a festival”).
  - App responds with a Tadoku-style story tailored to the requested level (e.g., 7–10 sentences for Level 0–1, 10–14 for Level 2–3, 15+ for Level 4+), including:
    - **Japanese Text**: Uses hiragana, katakana, and kanji appropriate to the specified Tadoku level and *Genki* chapters, with furigana on first kanji use. Incorporates grammar like past tense (*-ました*/*-ませんでした*), で, あります, 好きです, たい, and connectors (から, が, て) for lower levels, or advanced structures (e.g., causatives, passives) for higher levels.
    - **English Translation**: Sentence-by-sentence, natural translation preserving the Japanese structure.
    - **Story Arc**: Clear goal (e.g., enjoy a festival), obstacles (e.g., no food), and resolution (e.g., find food), scaled to the level’s complexity.
    - **Vocabulary Notes**: Detailed breakdowns of 3–5 key words, including kanji components (e.g., 祭: festival/rite), readings, meanings, and story context.
    - **Detailed Grammar Discussion**: Comprehensive analysis of 8–12 grammar points (e.g., past tense, から, たい, particles for lower levels; conditionals, honorifics for higher levels), explaining usage, narrative connections, and story examples, matching the example’s depth.
    - **Practice Questions**: 3–4 Japanese questions (e.g., “なぜ 家に いませんでしたか。”) with story-based answers, adjusted for level complexity.
    - **Usage Tips**: Suggestions for tracing connectors, practicing kanji, retelling with swapped words, and grammar focus.
  - Response format is inspired by the example: cohesive narrative, explicit grammar connections, and sections for story, translation, vocab notes, grammar discussion, questions, and tips.
  - Supports specifying Tadoku level (0–4+), *Genki* chapter, or theme (e.g., festival, picnic).
  - Chat history is scrollable, with markdown rendering (e.g., bold vocab, italic translations).
  - Each chat interaction (user prompt and app response) is saved to the database automatically.
  - Buttons in the story response for:
    - Saving the story as a standalone entry (in addition to chat history).
    - Playing sentences via text-to-speech (TTS).
    - Recording user reading for speech recognition.

### 2.2 Story Generation Requirements

- **Feature**: Stories are generated at the user-specified Tadoku level, adhering to Tadoku standards and the example’s structure and detail.
- **Details**:
  - **Narrative Structure**:
    - Sentence count varies by level: 7–10 for Level 0–1, 10–14 for Level 2–3, 15+ for Level 4+.
    - Clear goal, obstacles, and resolution, scaled to level (e.g., simple goals like “eat food” for Level 0, complex goals like “organize an event” for Level 4).
    - Logical flow using connectors appropriate to the level (e.g., から, が, て for Level 0–2; ので, ば-conditionals for Level 3+).
    - Example: For Level 2, “祭りでしたから、家に いませんでした” (cause → action); for Level 4, “祭りを 計画しましたが、雨が 降りました” (planning → obstacle).
  - **Grammar**:
    - For *Genki* Chapters 3–5 (Levels 0–2): Numbers, time, te-form, adjectives (い/な), negatives, あります, 好きです.
    - For Chapter 6 (Levels 1–2): Past tense (*-ました*/*-ませんでした*), で, 帰ります, 会います, たい.
    - For higher levels (3+): Advanced grammar (e.g., て-form requests, causatives, passives, conditionals) based on user-specified *Genki* or other textbooks.
    - Connectors tie sentences, with explanations in notes.
  - **Vocabulary**:
    - Level-appropriate words: simple nouns/verbs/adjectives for Level 0–1 (e.g., 友達, 食べる, おいしい), intermediate for Level 2–3 (e.g., 祭り, 見つける, 楽しい), advanced for Level 4+ (e.g., 計画, 準備, 特別).
    - Katakana for variety (e.g., ジュース, テレビ for lower levels; レストラン, コンサート for higher levels).
    - Kanji from specified *Genki* chapters or level-appropriate sources, with furigana on first use.
  - **Cohesion**:
    - Recurring elements (e.g., festival theme drives actions).
    - Actions build on each other (e.g., no food → buy juice → find food).
  - **Detailed Vocabulary Notes**:
    - Cover 3–5 key words per story, scaled to level.
    - Include: word, kanji breakdown, reading, meaning, and story context.
    - Example: For Level 2, “祭り *matsuri*: Festival; 祭 (festival/rite, 11 strokes); used in ‘学校の 祭りでした’ to drive the narrative.” For Level 4, “計画 *keikaku*: Plan; 計 (measure, 9 strokes), 画 (draw, 8 strokes); used in ‘祭りを 計画しました’ to set the goal.”
  - **Detailed Grammar Discussion**:
    - Cover 8–12 grammar points, matching the example’s depth, adjusted for level.
    - Include: grammar point, explanation, story usage, narrative connections, and examples.
    - Example: For Level 2, “から (‘because’): Indicates cause/reason. In ‘祭りでしたから、家に いませんでした,’ it links the festival (cause) to not staying home.” For Level 4, “ば-conditional: Indicates hypothesis. In ‘雨が 降らなければ、祭りが できました,’ it shows a potential outcome.”
    - Address level-appropriate grammar (e.g., basic tenses/particles for Level 0–2, advanced forms for Level 3+).
  - **Usage Tips**:
    - Suggest tracing connectors, writing kanji, retelling with new words, and practicing grammar relevant to the level.

### 2.3 Vocabulary and Grammar Extraction for SRS

- **Feature**: Automatically extract vocabulary and grammar for SRS tables, linking each to its originating story.
- **Details**:
  - **Vocabulary Extraction**:
    - Identify key words based on the story’s level (e.g., 祭り for Level 2, 計画 for Level 4) using a *Genki*-based or level-appropriate dictionary or NLP rules.
    - Store each with:
      - Word (e.g., 祭り).
      - Kanji (e.g., 祭).
      - Reading (e.g., まつり).
      - Meaning (e.g., festival).
      - Context sentence (e.g., 学校の 祭りでした).
      - Story ID (links to `stories` table).
      - SRS level (0), next review (now + 1 day).
    - Example: Extract 見つけます (Level 2: kanji: 見, reading: みつけます, meaning: find, context: たこ焼きを 見つけました, story_id: UUID of “School Festival”).
  - **Grammar Extraction**:
    - Identify grammar points based on the story’s level and *Genki* chapters (e.g., から, たい for Level 2; ば-conditional for Level 4).
    - Store each with:
      - Grammar point (e.g., から).
      - Explanation (e.g., “Indicates cause/reason”).
      - Example sentence (e.g., 祭りでしたから、家に いませんでした).
      - Story ID (links to `stories` table).
      - SRS level (0), next review (now + 1 day).
    - Example: Extract たい (Level 2: explanation: expresses desire, example: たこ焼きを 食べたいです, story_id: UUID of “School Festival”).
  - **SRS Integration**:
    - Add to `vocabulary` and `grammar` tables in Supabase.
    - Skip duplicates (based on word/grammar point and user_id).
    - Notify user in chat (e.g., “Added 5 vocabulary words and 8 grammar points from ‘School Festival’ to your SRS!”).
  - **SRS Review**:
    - Vocabulary cards: Front (word/kanji), back (reading, meaning, context, source story title/link).
    - Grammar cards: Front (grammar point), back (explanation, example, source story title/link).
    - Leitner system: Correct answers increase interval (1, 3, 7 days); incorrect resets to 1 day.

### 2.4 Database Storage

- **Feature**: Store chat interactions, stories, vocabulary, grammar, and user progress, with vocabulary and grammar linked to source stories.
- **Details**:
  - **Chat History**: Save user prompts and app responses (including stories and metadata) in a `chat_messages` table.
  - **Stories**: Save Japanese text, English translation, vocab/grammar notes, questions, tips, and metadata (level, chapter, theme, date) as standalone entries.
  - **Vocabulary/Grammar**: Store extracted items with SRS metadata and `story_id` to trace back to source stories.
  - **User Progress**: Track stories read, SRS reviews, preferences (e.g., furigana).
  - Supabase PostgreSQL for all storage.

### 2.5 Speech Synthesis and Recognition

- **Feature**: Read stories aloud and evaluate pronunciation.
- **Details**:
  - **Text-to-Speech (TTS)**:
    - Web Speech API for Japanese sentences.
    - “Play” buttons per sentence (normal/slow speed).
  - **Speech Recognition**:
    - Web Speech API to record user reading.
    - Word-level accuracy check (e.g., matches 祭り in “学校の 祭りでした”).
    - Feedback: “Great!” or “Try pronouncing まつり again.”
    - Accessible in story response UI.

### 2.6 Secondary Interfaces

- **Review Page**:
  - Lists due vocabulary/grammar cards with flashcard interface (flip animation, correct/incorrect buttons).
  - Includes a “Browse SRS Items” section:
    - Displays all saved vocabulary and grammar in a table or grid.
    - Columns: Word/Grammar Point, Meaning/Explanation, Context Sentence, Source Story (title with link to story), SRS Level, Next Review.
    - Filters: By story (dropdown of story titles), level, *Genki* chapter, or review status (due/overdue).
    - Sorting: By word/grammar point, story, or review date.
  - Example: User filters by “School Festival” and sees 祭り, 見つけます, から, etc., with links to the story.
- **History Page**:
  - Lists saved stories and chat interactions with filters (level, chapter, theme, date).
  - Links to revisit stories or view full chat threads.
- **Settings**:
  - Toggle dark mode, furigana, TTS speed.

### 2.7 Authentication

- **Feature**: User accounts for personalized data.
- **Details**:
  - Supabase Authentication (email/password, OAuth: Google/GitHub).
  - Stores user-specific chats, stories, SRS data, preferences.
  - Guest mode with local storage (no database persistence).

## 3. Non-Functional Requirements

- **Performance**: Chat response < 3 seconds, page load < 2 seconds.
- **Scalability**: Supabase supports 1,000 concurrent users.
- **Accessibility**: WCAG 2.1 compliant.
- **Security**: Row-level security, HTTPS.
- **Responsive Design**: Mobile and desktop support.

## 4. Tech Stack

- **Frontend**: React with Next.js App Router (TypeScript), TailwindCSS (dark mode).
- **Backend**: Supabase (PostgreSQL, Authentication, Storage).
- **APIs**: Web Speech API (TTS/recognition), Supabase JavaScript client.
- **Deployment**: Vercel.
- **TypeScript**: Type safety for components, API, database schemas.

## 5. Database Schema (Supabase PostgreSQL)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  message_type TEXT CHECK (message_type IN ('user_prompt', 'app_response')),
  content TEXT NOT NULL,
  story_id UUID REFERENCES stories(id) NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stories
CREATE TABLE stories (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  japanese_text TEXT NOT NULL,
  english_text TEXT NOT NULL,
  vocab_notes TEXT,
  grammar_notes TEXT,
  questions TEXT,
  usage_tips TEXT,
  level TEXT NOT NULL, -- Supports any Tadoku level (e.g., '0', '1', '2', '3', '4')
  genki_chapter INTEGER,
  theme TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vocabulary
CREATE TABLE vocabulary (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  word TEXT NOT NULL,
  kanji TEXT,
  reading TEXT NOT NULL,
  meaning TEXT NOT NULL,
  context_sentence TEXT,
  story_id UUID REFERENCES stories(id), -- Links to source story
  srs_level INTEGER DEFAULT 0,
  next_review TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Grammar
CREATE TABLE grammar (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  grammar_point TEXT NOT NULL,
  explanation TEXT NOT NULL,
  example_sentence TEXT NOT NULL,
  story_id UUID REFERENCES stories(id), -- Links to source story
  srs_level INTEGER DEFAULT 0,
  next_review TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 6. User Flow

1. **Login**: User authenticates via Supabase.
2. **Chat**: User types a story request (e.g., “Level 3 story with *Genki* Chapter 6 about a festival”); interaction is saved to `chat_messages`.
3. **Story Response**: App generates story at specified level, saved to `chat_messages` and optionally to `stories` if user clicks “Save.”
4. **Extraction**: Vocabulary and grammar are extracted, linked to the story’s `story_id`, and added to SRS tables.
5. **Review**: User visits Review Page to browse SRS items, filter by source story, and review flashcards.
6. **Speech Practice**: User plays or records sentences in chat.
7. **History**: User browses saved stories and chat threads on History page.

## 7. UI Components

- **ChatWindow**: Scrollable chat with user prompts and responses.
- **ChatInput**: Textarea and submit button for requests.
- **StoryResponse**: Markdown-rendered story with Japanese text, translation, detailed vocab/grammar notes, questions, usage tips, and buttons (Save, Play, Record).
- **Flashcard**: SRS card with flip animation, showing source story title/link.
- **StoryList**: Filterable list of saved stories and chat threads.
- **ReviewBrowser**: Table/grid for browsing vocabulary/grammar, with filters (story, level, chapter, review status) and sorting.
- **SettingsPanel**: Toggles for dark mode, furigana, TTS speed.

## 8. Example Chat Flow

**User**: “Create a Level 3 story with *Genki* Chapter 6 grammar about a school festival.”  
**App**:  
> **Story: 学校の祭りの準備 (がっこうのまつりのじゅんび) – Preparing for the School Festival**  
> わたしは 金曜日(きんようび)に 6時(じ)に 起(お)きました。  
> 学校(がっこう)の 祭(まつ)りを 計画(けいかく)しましたから、忙(いそが)しかったです。  
> 教室(きょうしつ)で 友達(ともだち)に 会(あ)いました。  
> 友達は 「たこ焼きを 作(つく)りたいです」と言(い)いました。  
> スーパーに 行きましたが、材料(ざいりょう)が 全部(ぜんぶ) ありませんでした。  
> ジュースが ありましたから、ジュースを 買(か)いました。  
> でも、ジュースは 高(たか)くて、友達は 買(か)いませんでした。  
> わたしは 水(みず)を 飲(の)んで、ポスターを 書(か)きました。  
> ポスターは 大(おお)きくて、特別(とくべつ)でした。  
> 友達は ダンスを 練習(れんしゅう)したかったです。  
> 音楽(おんがく)が なかったから、歌(うた)を 歌(うた)いました。  
> わたしは ノートを 忘(わす)れましたが、友達が ノートを 貸(か)しました。  
> 屋台(やたい)の 材料(ざいりょう)を 見(み)つけましたから、たこ焼きを 作(つく)って、楽(たの)しかったです。  
> 家(いえ)に 帰(かえ)って、疲(つか)れました。  
>  
> **English Translation**:  
> I woke up on Friday at 6:00.  
> Because I planned the school festival, I was busy.  
> I met my friend in the classroom.  
> My friend said, “I want to make takoyaki.”  
> We went to the supermarket, but not all the ingredients were there.  
> Because there was juice, we bought juice.  
> But the juice was expensive, and my friend didn’t buy it.  
> I drank water and wrote a poster.  
> The poster was big and special.  
> My friend wanted to practice dancing.  
> Because there was no music, we sang a song.  
> I forgot my notebook, but my friend lent me one.  
> Because we found the ingredients for the stall, we made takoyaki and it was fun.  
> I returned home and was tired.  
>  
> **Vocabulary Notes**:  
> - 計画 *keikaku*: Plan; 計 (measure, 9 strokes), 画 (draw, 8 strokes); used in “祭りを 計画しました” to set the story’s goal.  
> - 材料 *zairyō*: Ingredients; 材 (material, 7 strokes), 料 (fee, 10 strokes); used in “材料が 全部 ありませんでした” to introduce an obstacle.  
> - 特別 *tokubetsu*: Special; 特 (special, 10 strokes), 別 (separate, 7 strokes); used in “ポスターは 特別でした” to describe the poster.  
> - 練習 *renshū*: Practice; 練 (refine, 13 strokes), 習 (learn, 11 strokes); used in “ダンスを 練習したかったです” to show the friend’s goal.  
> - 貸します *kashimasu*: To lend; 貸 (lend, 12 strokes); used in “ノートを 貸しました” to resolve a minor issue.  
>  
> **Detailed Grammar Discussion**:  
> 1. **Past Tense (*-ました*/*-ませんでした*)**:  
>    - Affirmative: 起きました (*okimashita* – woke up), 計画しました (*keikaku shimashita* – planned), 会いました (*aimashita* – met), 行きました (*ikimashita* – went), 買いました (*kaimashita* – bought), 飲みました (*nomimashita* – drank), 書きました (*kakimashita* – wrote), 忘れました (*wasuremashita* – forgot), 貸しました (*kashimashita* – lent), 作りました (*tsukurimashita* – made), 帰りました (*kaerimashita* – returned).  
>    - Negative: ありませんでした (*arimasen deshita* – there wasn’t), 買いませんでした (*kaimasen deshita* – didn’t buy).  
>    - **Connection**: Past tense narrates the preparation events, with から explaining decisions (e.g., planning festival → busy). Negative past tense highlights obstacles (e.g., missing ingredients).  
> 2. **Present Tense**:  
>    - Affirmative: 作りたいです (*tsukuritai desu* – want to make), 練習したかったです (*renshū shitakatta desu* – wanted to practice).  
>    - **Connection**: Used in dialogue to express desires, driving actions (e.g., making takoyaki). The たい form connects to obstacles via が (e.g., wanted ingredients, but not all available).  
> 3. **い-Adjectives**:  
>    - Affirmative: 忙しい (*isogashii* – busy), 大きい (*ōkii* – big), 楽しい (*tanoshii* – fun), 疲れた (*tsukareta* – tired).  
>    - Negative: 高くて (*takakute* – expensive, and) for sequence.  
>    - **Connection**: 高くて links the juice’s cost to the friend’s refusal, while 忙しい sets the story’s pace, enhancing flow.  
> 4. **な-Adjectives**:  
>    - Affirmative: 特別 (*tokubetsu* – special).  
>    - **Connection**: Describes the poster, emphasizing its role in the festival preparations.  
> 5. **あります / ありません**:  
>    - Affirmative: ジュースが ありました (*jūsu ga arimashita* – there was juice).  
>    - Negative: 材料が 全部 ありませんでした (*zairyō ga zenbu arimasen deshita* – not all ingredients were there), 音楽が ありませんでした (*ongaku ga arimasen deshita* – there was no music).  
>    - **Connection**: から ties existence to actions (juice → bought) and obstacles (no ingredients → search continues).  
> 6. **Particle で**:  
>    - 教室で (*kyōshitsu de* – in the classroom), スーパーで (*sūpā de* – at the supermarket), 屋台で (*yatai de* – at the stall).  
>    - **Connection**: Grounds actions in specific locations, structuring the narrative’s settings.  
> 7. **たい Form (Desire)**:  
>    - 作りたいです (*tsukuritai desu* – want to make), 練習したかったです (*renshū shitakatta desu* – wanted to practice).  
>    - **Connection**: Sparks actions (make takoyaki, practice dance), with から/が showing obstacles (e.g., no music).  
> 8. **Te-Form (Sequence/Cause)**:  
>    - 高くて (*takakute* – expensive, and), 飲んで (*nonde* – drank and).  
>    - **Connection**: Sequences actions (drank → wrote) or explains outcomes (expensive juice → didn’t buy).  
> 9. **Connectors**:  
>    - **から (‘because’)**: 計画しましたから (*keikaku shimashita kara* – because I planned), ジュースが ありましたから (*jūsu ga arimashita kara* – because there was juice), 音楽が なかったから (*ongaku ga nakatta kara* – because there was no music).  
>    - **が (‘but’)**: 行きましたが (*ikimashita ga* – went, but), 忘れましたが (*wasuremashita ga* – forgot, but).  
>    - **Connection**: から drives cause-and-effect (planning → busy), while が contrasts setbacks with progress (no ingredients → find juice).  
> 10. **Particles**:  
>    - **に**: Time (6時に *rokuji ni* – at 6:00), destination (スーパーに *sūpā ni* – to the supermarket).  
>    - **が**: Subject of あります/ありません, object of desires.  
>    - **を**: Direct object (ジュースを *jūsu o* – juice).  
>    - **で**: Location (教室で *kyōshitsu de* – in the classroom).  
>    - **Connection**: Structure the narrative’s temporal, spatial, and action elements.  
>  
> **Practice Questions**:  
> 1. わたしは なぜ 忙しかったですか。*Watashi wa naze isogashikatta desu ka?* – “Why was I busy?”  
> 2. スーパーで 何が ありませんでしたか。*Sūpā de nani ga arimasen deshita ka?* – “What wasn’t at the supermarket?”  
> 3. 友達は 何を 貸しましたか。*Tomodachi wa nani o kashimashita ka?* – “What did my friend lend?”  
> 4. 屋台で 何を しましたか。*Yatai de nani o shimashita ka?* – “What did we do at the stall?”  
>  
> **How to Use This Story**:  
> - Trace connectors (から, が, て) to understand the story’s flow.  
> - Practice writing kanji: 計 (9 strokes), 材 (7 strokes), 特 (10 strokes).  
> - Retell with a new item (e.g., swap たこ焼き for やきそば *yakisoba*).  
> - Focus on grammar: Practice past tense and たい forms.  
>  
> Added 5 vocabulary words (計画, 材料, 特別, 練習, 貸します) and 8 grammar points (past tense, たい, い-adjectives, な-adjectives, あります, で, て-form, から) from ‘Preparing for the School Festival’ to your SRS!  
> [Save Story] [Play Sentence] [Record Reading]

## 9. Future Enhancements

- Support custom textbook alignments beyond *Genki*.
- External dictionary API (e.g., Jisho.org).
- Pitch accent feedback for speech.
- Gamification (e.g., streaks).

## 10. Constraints

- Web Speech API requires Chrome/Safari.
- Speech recognition may misinterpret non-native pronunciation.
- Supabase free tier limits storage (500MB).

## 11. Acceptance Criteria

- Chat interface generates stories at user-specified Tadoku levels with cohesive narratives, *Genki* grammar, and connectors, inspired by the example’s structure.
- Chat interactions are saved to the database and retrievable.
- Vocabulary and grammar are extracted, linked to source stories, and added to SRS tables.
- Users can browse saved vocabulary/grammar, filtering by source story, via the Review Page.
- Stories are saved and retrievable with detailed notes.
- SRS schedules reviews correctly.
- TTS and speech recognition work in chat interface.
- App is responsive, accessible, and supports dark mode.
