'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold">Something went wrong!</h2>
          <pre className="max-w-4xl overflow-auto rounded border bg-red-50 p-4 text-sm">
            {error.message}
            {error.stack && (
              <>
                {'\n\n'}
                {error.stack}
              </>
            )}
          </pre>
          <button
            onClick={reset}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

