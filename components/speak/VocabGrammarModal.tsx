import React from 'react';
import EntryExistsModal from './EntryExistsModal';

interface VocabGrammarModalProps {
  open: boolean;
  onClose: () => void;
  existing: Record<string, unknown> | null;
  saving: boolean;
  onAddAnyway: () => void;
}

const VocabGrammarModal: React.FC<VocabGrammarModalProps> = ({
  open,
  onClose,
  existing,
  saving,
  onAddAnyway,
}) => {
  return (
    <EntryExistsModal
      open={open}
      onClose={onClose}
      existing={existing}
      saving={saving}
      onAddAnyway={onAddAnyway}
    />
  );
};

export default VocabGrammarModal; 