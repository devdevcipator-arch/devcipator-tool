"use client";

import { useState } from "react";
import { Field, NumberInput } from "@/components/ui/controls";
import { cn } from "@/lib/cn";

/** The limits online forms and email ask for most; 100 KB is the most common. */
export const SIZE_PRESETS_KB = [20, 50, 100, 200, 500, 1024];
export const POPULAR_KB = 100;

export const formatKb = (kb: number) => (kb >= 1024 ? `${+(kb / 1024).toFixed(1)} MB` : `${kb} KB`);

/** Preset target sizes as a chip grid plus an exact KB input, styled like Segmented. */
export function TargetSizePicker({ value, onChange, min = 5, max = 51200 }: { value: number; onChange: (kb: number) => void; min?: number; max?: number }) {
  // The box keeps what is typed (e.g. the "1" on the way to "100"); only values in range reach the parent.
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }
  return (
    <Field label="Target size" hint="Each file is made smaller than this. 100 KB is the most common limit on online forms.">
      <div role="radiogroup" aria-label="Target size" className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface-2 p-0.5">
        {SIZE_PRESETS_KB.map((kb) => {
          const active = kb === value;
          return (
            <button
              key={kb}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(kb)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-md px-2 py-1.5 text-sm font-medium tabular-nums cursor-pointer pointer-coarse:min-h-11",
                active ? "bg-surface text-fg shadow-card ring-1 ring-border" : "text-fg-muted hover:text-fg",
              )}
            >
              {formatKb(kb)}
              {kb === POPULAR_KB && <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Popular</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="shrink-0 text-xs text-fg-muted">Or exactly</span>
        <NumberInput
          value={draft}
          onChange={(v) => {
            setDraft(v);
            if (Number.isFinite(v) && v >= min && v <= max) onChange(Math.round(v));
          }}
          min={min}
          max={max}
          step={1}
          suffix="KB"
          label="Target size in KB"
          className="flex-1"
        />
      </div>
    </Field>
  );
}
