"use client";

interface Props {
  onClick: () => void;
  enCours: boolean;
  verdict: string | null;
  erreur: string | null;
  desactive: boolean;
}

/**
 * Coût LLM explicite et isolé — seul bouton de cette section à appeler
 * Claude. Jamais déclenché par un changement de critères ou de mode.
 */
export default function PanneauVerdict({ onClick, enCours, verdict, erreur, desactive }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Verdict</h2>
          <p className="text-xs text-zinc-500">
            Analyse comparative rédigée par Claude sur le top des biens "ok" du mode actif.
          </p>
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={enCours || desactive}
          className="shrink-0 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
        >
          {enCours ? "Rédaction en cours..." : "🧭 Générer le verdict"}
        </button>
      </div>

      {erreur && (
        <p className="mt-3 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {erreur}
        </p>
      )}

      {verdict && (
        <div className="mt-4 whitespace-pre-wrap border-t border-zinc-800 pt-3 text-sm leading-relaxed text-zinc-300">
          {verdict}
        </div>
      )}
    </div>
  );
}
