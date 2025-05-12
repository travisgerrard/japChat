import React from 'react';

const ImportSnackbarComponent = ({ show }: { show: boolean }) => {
  if (!show) return null;
  return (
    <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center space-x-2 bg-indigo-700 text-white px-4 py-2 rounded shadow-lg animate-fade-in">
        <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <span>Finalizing story import…</span>
      </div>
    </div>
  );
};

export const ImportSnackbar = React.memo(ImportSnackbarComponent); 