import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  error: Error | string;
  retry?: () => void;
}

export default function ErrorMessage({ error, retry }: ErrorMessageProps) {
  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
      <p className="text-white/70 mb-4">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
