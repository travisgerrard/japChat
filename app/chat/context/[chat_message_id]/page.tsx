import { supabaseAdmin } from '../../../../src/lib/supabase/admin';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * @param {{ params: { chat_message_id: string } }} props
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function Page({ params }: any) {
  const { chat_message_id } = params;
  // Fetch the chat message and app response
  const { data: message, error } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('id', chat_message_id)
    .maybeSingle();
  if (error || !message) {
    notFound();
  }
  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Chat Context</h1>
      <div className="mb-4">
        <div className="font-semibold text-gray-700 mb-1">You said:</div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded p-4 mb-2 prose dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
      </div>
      {message.app_response && (
        <div>
          <div className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
            App Response:
            <a href={`/speak/${chat_message_id}`} title="Practice Speaking" className="inline-block align-middle">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 hover:text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6a2 2 0 012-2h2a2 2 0 012 2v13m-6 0h6m-6 0a2 2 0 01-2-2v-1a2 2 0 012-2h6a2 2 0 012 2v1a2 2 0 01-2 2m-6 0v1a2 2 0 002 2h2a2 2 0 002-2v-1" /></svg>
            </a>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900 rounded p-4 prose dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.app_response}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
} 