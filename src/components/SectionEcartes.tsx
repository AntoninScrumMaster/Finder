"use client";

import { useState } from "react";
import type { BienEcarte } from "@/types-front";
import { formatEuros } from "@/lib/format";

interface Props {
  biens: BienEcarte[];
}

export default function SectionEcartes({ biens }: Props) {
  const [ouvert, setOuvert] = useState(false);

  if (biens.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-zinc-400">
          Écartés ({biens.length})
        </span>
        <span className={`text-zinc-500 transition-transform ${ouvert ? "rotate-90" : ""}`}>▶</span>
      </button>

      {ouvert && (
        <ul className="flex flex-col gap-2 border-t border-zinc-800 px-4 py-3">
          {biens.map((bien) => (
            <li key={bien.listingId} className="text-sm">
              <span className="font-medium text-zinc-400">
                {bien.ville ?? "Ville inconnue"} — {formatEuros(bien.prix)}
              </span>
              <p className="text-xs text-zinc-600">{bien.raison}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
