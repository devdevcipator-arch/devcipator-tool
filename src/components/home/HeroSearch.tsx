"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, X } from "lucide-react";
import { searchTools } from "@/lib/search";
import { ToolIcon } from "@/components/tool/ToolIcon";
import { cn } from "@/lib/cn";

const MAX_RESULTS = 8;

/** Home page search box with a live dropdown of matching tools. */
export function HeroSearch({ query, onQueryChange }: { query: string; onQueryChange: (query: string) => void }) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const hasQuery = query.trim().length > 0;
  const results = hasQuery ? searchTools(query).slice(0, MAX_RESULTS) : [];
  const showList = open && hasQuery;
  const optionId = (i: number) => `${listId}-option-${i}`;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (showList) document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId, showList]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key === "Escape" && showList) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown" && hasQuery) {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (results.length > 0) setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp" && showList && results.length > 0) {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && showList && results[active]) {
      e.preventDefault();
      setOpen(false);
      router.push(`/tools/${results[active].slug}`);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-4 top-7 size-5 -translate-y-1/2 text-fg-subtle" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search tools, e.g. “mp3”"
        aria-label="Search tools"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results[active] ? optionId(active) : undefined}
        autoComplete="off"
        className="h-14 w-full rounded-2xl border border-border-strong bg-surface pl-12 pr-12 text-base [&::-webkit-search-cancel-button]:appearance-none text-fg shadow-pop placeholder:text-fg-subtle focus:border-primary focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            onQueryChange("");
            setActive(0);
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-3 top-7 -translate-y-1/2 rounded-md p-1.5 text-fg-subtle hover:text-fg cursor-pointer pointer-coarse:right-1 pointer-coarse:p-3.5"
        >
          <X className="size-4" />
        </button>
      )}

      {showList && (
        <div className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-pop">
          {results.length > 0 ? (
            <ul id={listId} role="listbox" aria-label="Matching tools" className="max-h-[min(26rem,55vh)] overflow-y-auto p-2">
              {results.map((tool, i) => (
                <li key={tool.slug} role="presentation">
                  <Link
                    id={optionId(i)}
                    href={`/tools/${tool.slug}`}
                    role="option"
                    aria-selected={i === active}
                    tabIndex={-1}
                    onClick={() => setOpen(false)}
                    onMouseMove={() => setActive(i)}
                    className={cn("flex items-center gap-3 rounded-xl px-2 py-2 pointer-coarse:min-h-12", i === active && "bg-surface-2")}
                  >
                    <ToolIcon tool={tool} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fg">{tool.title}</span>
                      <span className="block truncate text-xs text-fg-muted">{tool.description}</span>
                    </span>
                    {i === active && <CornerDownLeft className="size-4 shrink-0 text-fg-subtle pointer-coarse:hidden" aria-hidden />}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p id={listId} className="px-4 py-6 text-center text-sm text-fg-muted">
              No tools match “{query.trim()}”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
