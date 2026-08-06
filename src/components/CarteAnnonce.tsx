import type { BienAnalyse } from "@/types-front";
import type { Mode } from "@/scoring";
import { formatEuros, formatPourcent } from "@/lib/format";

interface Props {
  bien: BienAnalyse;
  mode: Mode;
}

const COULEUR_DPE: Record<string, string> = {
  A: "bg-emerald-500 text-zinc-950",
  B: "bg-emerald-600 text-zinc-950",
  C: "bg-lime-500 text-zinc-950",
  D: "bg-yellow-500 text-zinc-950",
  E: "bg-amber-600 text-zinc-950",
  F: "bg-orange-600 text-zinc-950",
  G: "bg-red-600 text-zinc-100",
  NC: "bg-zinc-700 text-zinc-300",
};

function badgeFiabilite(score: number): { label: string; classes: string } {
  if (score >= 90) return { label: "Fiable", classes: "bg-emerald-500/15 text-emerald-400" };
  if (score >= 60) return { label: "Correcte", classes: "bg-yellow-500/15 text-yellow-400" };
  if (score >= 35) return { label: "Faible", classes: "bg-orange-500/15 text-orange-400" };
  return { label: "Inconnue", classes: "bg-zinc-700/40 text-zinc-400" };
}

export default function CarteAnnonce({ bien, mode }: Props) {
  const note = bien.notes[mode];
  const fiabilite = badgeFiabilite(bien.sousScores.scoreFiabilite);
  const photo = bien.images[0] ?? null;

  return (
    <a
      href={bien.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-emerald-700"
    >
      <div className="relative aspect-[4/3] w-full bg-zinc-800">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={bien.titre ?? bien.ville ?? "Annonce"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
            Pas de photo
          </div>
        )}
        <span
          className={`absolute right-2 top-2 rounded px-1.5 py-0.5 text-xs font-bold ${COULEUR_DPE[bien.dpe] ?? COULEUR_DPE.NC}`}
        >
          {bien.dpe}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-100">{formatEuros(bien.prix)}</p>
            <p className="text-xs text-zinc-500">
              {bien.ville ?? "Ville inconnue"} — {bien.surface ?? "?"} m²
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-1 text-sm font-bold text-emerald-400">
            {note.toFixed(0)}/100
          </span>
        </div>

        <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
          <div>
            <span className="text-zinc-500">Rendement net</span>
            <p className="font-medium text-zinc-200">{formatPourcent(bien.rendementNet)}</p>
          </div>
          <div>
            <span className="text-zinc-500">Cash-flow/mois</span>
            <p className="font-medium text-zinc-200">
              {bien.cashflowMensuel !== null
                ? `${bien.cashflowMensuel >= 0 ? "+" : ""}${formatEuros(bien.cashflowMensuel)}`
                : "—"}
            </p>
          </div>
        </div>

        <span className={`mt-1 inline-block w-fit rounded px-2 py-0.5 text-xs font-medium ${fiabilite.classes}`}>
          Fiabilité loyer : {fiabilite.label}
        </span>
      </div>
    </a>
  );
}
