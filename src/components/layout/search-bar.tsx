"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/app/api/search/route";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results ?? []);
          setOpen(true);
        })
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectResult(result: SearchResult) {
    setOpen(false);
    setQuery("");
    if (result.type === "client") router.push(`/clients?q=${encodeURIComponent(result.label)}`);
    else router.push(`/lots?q=${encodeURIComponent(result.label)}`);
  }

  const visibleResults = query.trim().length < 2 ? [] : results;

  return (
    <div ref={containerRef} className="relative flex w-full flex-col">
      <div className="shadow-card flex items-center gap-2 rounded-full border border-white/80 bg-white px-3.5 py-1.5 text-sm text-muted-foreground transition-shadow focus-within:border-ring">
        <Search className="size-3.5 shrink-0" strokeWidth={2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => visibleResults.length > 0 && setOpen(true)}
          placeholder="Search clients, lots, OR number…"
          className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && visibleResults.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-hairline bg-popover p-1.5 shadow-lg">
          {visibleResults.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => selectResult(r)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
              )}
            >
              <span className="font-medium text-foreground">{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.sublabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
