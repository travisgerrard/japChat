import React from 'react';

interface EntryExistsModalProps {
  open: boolean;
  onClose: () => void;
  existing: Record<string, unknown> | null;
  saving: boolean;
  onAddAnyway: () => void;
}

const EntryExistsModal: React.FC<EntryExistsModalProps> = ({ open, onClose, existing, saving, onAddAnyway }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-lg w-full">
        <div className="font-bold mb-2">This entry already exists:</div>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs overflow-x-auto mb-2">{JSON.stringify(existing, null, 2)}</pre>
        <div className="mb-2">Do you want to add it anyway?</div>
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded mr-2" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 bg-green-600 text-white rounded" disabled={saving} onClick={onAddAnyway}>Add Anyway</button>
        </div>
      </div>
    </div>
  );
};

export default EntryExistsModal; 