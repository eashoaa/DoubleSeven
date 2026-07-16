"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function ClientCombobox({
  clients,
  name = "clientId",
  required,
}: {
  clients: { id: string; name: string }[];
  name?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered =
    query.trim().length === 0
      ? clients.slice(0, 50)
      : clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 50);

  function select(client: { id: string; name: string }) {
    setSelectedId(client.id);
    setQuery(client.name);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selectedId} required={required} />
      <div className="flex h-8 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <Search className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search for a client…"
          className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-hairline bg-popover p-1 shadow-lg">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c)}
              className={cn(
                "flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-accent",
                selectedId === c.id && "bg-accent"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
