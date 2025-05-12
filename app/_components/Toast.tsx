import React from 'react';

function Toast({ message, type, onClose, retryFn }: { message: string, type: 'success' | 'error', onClose: () => void, retryFn?: (() => void) | null }) {
  return (
    <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg z-50 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
      onClick={onClose}
    >
      <span>{message}</span>
      {type === 'error' && retryFn && (
        <button
          className="ml-4 px-3 py-1 rounded bg-yellow-500 text-white font-bold text-xs hover:bg-yellow-600 transition-colors"
          onClick={e => { e.stopPropagation(); retryFn(); }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default Toast; 