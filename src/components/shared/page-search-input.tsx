"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function PageSearchInput({
  basePath,
  defaultValue,
  placeholder,
}: {
  basePath: string;
  defaultValue: string;
  placeholder: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(value ? `${basePath}?q=${encodeURIComponent(value)}` : basePath);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, router, basePath]);

  return (
    <div className="flex w-full max-w-xs items-center gap-2 rounded-full border border-hairline bg-white/70 px-4 py-2 text-sm text-muted-foreground focus-within:border-ring">
      <Search className="size-4 shrink-0" strokeWidth={2} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
