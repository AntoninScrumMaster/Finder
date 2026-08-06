"use client";

import type { Mode } from "@/scoring";

const LABELS: Record<Mode, string> = {
  cashflow: "Cash-flow",
  rendement: "Rendement",
  securite: "Sécurité",
};

interface Props {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

/**
 * Change le mode de tri actif — purement client, aucun appel réseau : les
 * notes des 3 modes sont déjà précalculées par /api/analyser.
 */
export default function SelecteurMode({ mode, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
      {(Object.keys(LABELS) as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === m
              ? "bg-emerald-500 text-zinc-950"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          {LABELS[m]}
        </button>
      ))}
    </div>
  );
}
