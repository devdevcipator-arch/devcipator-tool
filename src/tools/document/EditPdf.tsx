"use client";

import { useState, type KeyboardEvent } from "react";
import { FilePenLine, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/cn";
import FormFiller from "./edit-pdf/FormFiller";
import Builder from "./edit-pdf/Builder";

type Mode = "fill" | "build";

const TABS: Array<{ id: Mode; label: string; sub: string; icon: typeof FilePenLine }> = [
  { id: "fill", label: "Edit existing PDF", sub: "Fill in a PDF form's fields", icon: FilePenLine },
  { id: "build", label: "Custom PDF Builder", sub: "Design a PDF with per-letter styling", icon: LayoutTemplate },
];

/** Two workspaces: fill an existing AcroForm, or build a new styled document. Both stay mounted so switching keeps their state. */
export default function EditPdf() {
  const [mode, setMode] = useState<Mode>("fill");

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = mode === "fill" ? "build" : "fill";
    setMode(next);
    document.getElementById(`edit-pdf-tab-${next}`)?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Edit PDF mode" onKeyDown={onKeyDown} className="grid grid-cols-2 gap-1 self-stretch rounded-2xl border border-border bg-surface-2 p-1 sm:self-start">
        {TABS.map((t) => {
          const active = mode === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              id={`edit-pdf-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`edit-pdf-panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setMode(t.id)}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer sm:px-4",
                active ? "bg-surface shadow-card ring-1 ring-border" : "text-fg-muted hover:text-fg",
              )}
            >
              <Icon className={cn("size-5 shrink-0", active ? "text-primary" : "text-fg-subtle")} aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-fg">{t.label}</span>
                <span className="block truncate text-xs text-fg-muted max-sm:hidden">{t.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="edit-pdf-panel-fill" aria-labelledby="edit-pdf-tab-fill" hidden={mode !== "fill"}>
        <FormFiller onOpenBuilder={() => setMode("build")} />
      </div>
      <div role="tabpanel" id="edit-pdf-panel-build" aria-labelledby="edit-pdf-tab-build" hidden={mode !== "build"}>
        <Builder active={mode === "build"} />
      </div>
    </div>
  );
}
