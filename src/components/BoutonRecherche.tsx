"use client";

import type { RecapRecherche } from "@/types-front";
import { formatDate } from "@/lib/format";

interface Props {
  onClick: () => void;
  enCours: boolean;
  recap: RecapRecherche | null;
  erreur: string | null;
}

/**
 * Seul déclencheur du pipeline d'ingestion (coûteux). Affiche, après coup,
 * exactement ce que le clic a coûté — jamais lancé automatiquement.
 */
export default function BoutonRecherche({ onClick, enCours, recap, erreur }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Collecte</h2>
          <p className="text-xs text-zinc-500">
            Lit les mails, extrait les nouvelles annonces via Claude. Coûteux — à lancer
            explicitement.
          </p>
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={enCours}
          className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {enCours ? "Recherche en cours..." : "🔍 Rechercher de nouvelles annonces"}
        </button>
      </div>

      {erreur && (
        <p className="mt-3 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {erreur}
        </p>
      )}

      {recap && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-zinc-800 pt-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-zinc-500">Nouvelles annonces</dt>
            <dd className="font-medium text-zinc-100">{recap.nouvellesAnnonces}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Appels LLM</dt>
            <dd className="font-medium text-zinc-100">{recap.appelsLLM}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Tokens (entrée/sortie)</dt>
            <dd className="font-medium text-zinc-100">
              {recap.tokensEntree.toLocaleString("fr-FR")} / {recap.tokensSortie.toLocaleString("fr-FR")}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Coût estimé</dt>
            <dd className="font-medium text-emerald-400">${recap.coutEstime.toFixed(4)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-zinc-500">Dernière recherche</dt>
            <dd className="font-medium text-zinc-100">{formatDate(recap.dateRecherche)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
