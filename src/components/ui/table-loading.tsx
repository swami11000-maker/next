'use client';

import { ImageIcon, Loader2 } from 'lucide-react';

import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface TableLoadingProps {
  message?: string;
  minHeight?: string;
}

export function TableLoading({ message = 'Loading...', minHeight = '300px' }: TableLoadingProps) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden bg-white text-black" style={{ minHeight }}>
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/5 blur-3xl" />

      <div className="relative flex flex-col items-center">
        {/* Spinner */}
        <div className="relative mb-4 flex h-11 w-11 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-orange-500/10" />

          <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white shadow-sm">
            <Loader2 className="h-4.5 w-4.5 animate-spin text-orange-600" />
          </span>
        </div>

        {/* Text */}
        <p className="text-sm font-semibold tracking-tight text-gray-800">{message}</p>

        <p className="mt-1 text-xs text-gray-400">Please wait a moment</p>

        {/* Animated progress */}
        <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full w-1/2 animate-[loading_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-orange-400 via-orange-600 to-orange-400" />
        </div>
      </div>

      <style jsx>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(250%);
          }
        }
      `}</style>
    </div>
  );
}
interface TableErrorProps {
  error?: string;
  onRetry: () => void;
  retryText?: string;
  minHeight?: string;
}

export function TableError({ error = 'Something went wrong.', onRetry, retryText = 'Try Again', minHeight = '300px' }: TableErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center bg-white px-4 text-black" style={{ minHeight }}>
      <div className="flex max-w-md flex-col items-center rounded-2xl border border-red-100 bg-red-50/60 px-6 py-5 text-center shadow-sm">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>

        <p className="text-sm font-medium text-red-700">{error}</p>

        <Button variant="outline" onClick={onRetry} className="mt-4 gap-2 rounded-lg border-gray-300 bg-white text-gray-700 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600">
          <RefreshCw className="h-4 w-4" />
          {retryText}
        </Button>
      </div>
    </div>
  );
}
export function ImagePreview({ src, label }: { src: string; label: string }) {
  if (!src) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500">
        <ImageIcon className="h-3 w-3" />
        {label}: —
      </span>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-600 hover:text-white"
    >
      <ImageIcon className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}