import { Loader2 } from 'lucide-react';

export function Loader() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-4" />
      <p className="text-zinc-400 text-sm font-mono">Mapping...</p>
    </div>
  );
}

