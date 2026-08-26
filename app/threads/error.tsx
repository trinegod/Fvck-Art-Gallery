"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThreadsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 text-zinc-100">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-8 text-amber-300" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-medium">The path went dark.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          NODEINE could not load World Threads right now. Your archive is
          untouched; try the connection again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={unstable_retry} className="rounded-full px-4">
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
          <Button variant="outline" className="rounded-full px-4" render={<Link href="/" />}>
            Archive
          </Button>
        </div>
      </div>
    </main>
  );
}
