import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

import { processStory } from '../lib/supabaseStoryInserts';

const story = `今日は新しい友達と公園に行きました。
私たちは一緒にお弁当を食べました！`;

async function main() {
  try {
    await processStory(story);
    console.log('Story processed and inserted into Supabase!');
  } catch (err) {
    console.error('Error processing story:', err);
  }
}

main(); 