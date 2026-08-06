"use client";

import { useState } from "react";
import type { BienAnalyse } from "@/types-front";
import { formatEuros } from "@/lib/format";

interface Props {
  biens: BienAnalyse[];
}

export default function SectionAVerifier({ biens }: Props) {
  const [ouvert, setOuvert] = useState(false);

  if (biens.length === 0) return null;

  return (
    <div className="rounded-xl border border-yellow-900/50 bg-yellow-950/10">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-yellow-400">
          ⚠️ À vérifier ({biens.length})
        </span>
        <span className={`text-yellow-500 transition-transform ${ouvert ? "rotate-90" : ""}`}>▶</span>
      </button>

      {ouvert && (
        <ul className="flex flex-col gap-2 border-t border-yellow-900/50 px-4 py-3">
          {biens.map((bien) => (
            <li key={bien.listingId} className="text-sm">
              <a
                href={bien.url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-zinc-200 hover:text-emerald-400"
              >
                {bien.ville ?? "Ville inconnue"} — {formatEuros(bien.prix)}
              </a>
              <p className="text-xs text-zinc-500">{bien.raison}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
