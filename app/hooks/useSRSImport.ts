import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage } from '../_components/ChatWindow';

interface UseSRSImportArgs {
  supabase: SupabaseClient;
  setToast: (toast: { message: string, type: 'success' | 'error', retryFn?: (() => void) | null } | null) => void;
  setMessages: (msgs: ChatMessage[]) => void;
}

export function useSRSImport({ supabase, setToast, setMessages }: UseSRSImportArgs) {
  const [importing, setImporting] = useState(false);
  const [lastParsedJSON, setLastParsedJSON] = useState<Record<string, unknown> | null>(null);
  const [showImportingSnackbar, setShowImportingSnackbar] = useState(false);

  // Helper: Store new SRS IDs in localStorage for SRSReview highlighting
  function storeNewSRSIds(vocabArr: Record<string, unknown>[], grammarArr: Record<string, unknown>[]) {
    const vocabIds = (vocabArr || []).map((v) => v.id).filter(Boolean);
    const grammarIds = (grammarArr || []).map((g) => g.id).filter(Boolean);
    const allIds = [...vocabIds, ...grammarIds];
    if (allIds.length > 0) {
      localStorage.setItem('newSRSIds', JSON.stringify(allIds));
    }
  }

  async function importSRS(parsedJSON: Record<string, unknown>) {
    setImporting(true);
    setToast(null);
    setLastParsedJSON(parsedJSON);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.access_token) {
        const importRes = await fetch('/api/ai-story-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(parsedJSON),
        });
        setImporting(false);
        setShowImportingSnackbar(false);
        if (importRes.ok) {
          const result = await importRes.json();
          storeNewSRSIds(
            (parsedJSON.vocab_notes as Record<string, unknown>[]),
            (parsedJSON.grammar_notes as Record<string, unknown>[])
          );
          const vocabCount = Array.isArray(parsedJSON.vocab_notes) ? parsedJSON.vocab_notes.length : 0;
          const grammarCount = Array.isArray(parsedJSON.grammar_notes) ? parsedJSON.grammar_notes.length : 0;
          setToast({
            message: `Imported: ${parsedJSON.title} (Vocab: ${vocabCount}, Grammar: ${grammarCount})`,
            type: 'success',
            retryFn: null,
          });
          setMessages([]);
        } else {
          const err = await importRes.json();
          setToast({
            message: `Import failed: ${err.error || 'Unknown error'}`,
            type: 'error',
            retryFn: () => importSRS(parsedJSON),
          });
          console.error('[SRS/AI JSON] Import failed:', err, { payload: parsedJSON });
        }
      } else {
        setImporting(false);
        setShowImportingSnackbar(false);
        setToast({ message: 'Import failed: No session token', type: 'error', retryFn: () => importSRS(parsedJSON) });
        console.error('[SRS/AI JSON] No session token for import', { payload: parsedJSON });
      }
    } catch (err) {
      setImporting(false);
      setToast({ message: 'Import failed: Network error', type: 'error', retryFn: () => importSRS(parsedJSON) });
      console.error('[SRS/AI JSON] Import network error:', err, { payload: parsedJSON });
    }
  }

  return {
    importing,
    lastParsedJSON,
    showImportingSnackbar,
    setShowImportingSnackbar,
    setLastParsedJSON,
    importSRS,
  };
} 