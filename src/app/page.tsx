"use client";

import { useMemo, useState } from "react";
import type { Mode } from "@/scoring";
import type { CriteresFormulaire, ResultatAnalyse, RecapRecherche } from "@/types-front";
import { CRITERES_PAR_DEFAUT } from "@/types-front";
import FormulaireCriteres from "@/components/FormulaireCriteres";
import BoutonRecherche from "@/components/BoutonRecherche";
import SelecteurMode from "@/components/SelecteurMode";
import ListeResultats from "@/components/ListeResultats";
import PanneauVerdict from "@/components/PanneauVerdict";

const N_VERDICT = 5;

export default function Page() {
  const [criteres, setCriteres] = useState<CriteresFormulaire>(CRITERES_PAR_DEFAUT);
  const [mode, setMode] = useState<Mode>("cashflow");

  const [resultat, setResultat] = useState<ResultatAnalyse | null>(null);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [erreurAnalyse, setErreurAnalyse] = useState<string | null>(null);

  const [recap, setRecap] = useState<RecapRecherche | null>(null);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState<string | null>(null);

  const [verdict, setVerdict] = useState<string | null>(null);
  const [verdictEnCours, setVerdictEnCours] = useState(false);
  const [erreurVerdict, setErreurVerdict] = useState<string | null>(null);

  const biensOkTries = useMemo(() => {
    if (!resultat) return [];
    return [...resultat.ok].sort((a, b) => b.notes[mode] - a.notes[mode]);
  }, [resultat, mode]);

  async function lancerAnalyse(criteresActuels: CriteresFormulaire) {
    setAnalyseEnCours(true);
    setErreurAnalyse(null);
    try {
      const reponse = await fetch("/api/analyser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteresActuels),
      });
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        throw new Error(corps.error ?? `Erreur ${reponse.status}`);
      }
      const donnees = (await reponse.json()) as ResultatAnalyse;
      setResultat(donnees);
    } catch (error) {
      setErreurAnalyse(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setAnalyseEnCours(false);
    }
  }

  async function lancerRecherche() {
    setRechercheEnCours(true);
    setErreurRecherche(null);
    try {
      const reponse = await fetch("/api/rechercher", { method: "POST" });
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        throw new Error(corps.error ?? `Erreur ${reponse.status}`);
      }
      const donnees = (await reponse.json()) as RecapRecherche;
      setRecap(donnees);
      // La recherche vient d'ajouter des annonces potentiellement nouvelles —
      // relancer l'analyse (gratuite) pour que les résultats affichés soient à jour.
      await lancerAnalyse(criteres);
    } catch (error) {
      setErreurRecherche(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setRechercheEnCours(false);
    }
  }

  async function genererVerdict() {
    setVerdictEnCours(true);
    setErreurVerdict(null);
    try {
      const reponse = await fetch("/api/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biens: biensOkTries.slice(0, N_VERDICT), mode }),
      });
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        throw new Error(corps.error ?? `Erreur ${reponse.status}`);
      }
      const donnees = (await reponse.json()) as { verdict: string };
      setVerdict(donnees.verdict);
    } catch (error) {
      setErreurVerdict(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setVerdictEnCours(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row">
      <aside className="flex w-full flex-col gap-4 lg:w-96 lg:shrink-0">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Agent Immo</h1>
          <p className="text-sm text-zinc-500">Recherche et analyse de biens locatifs</p>
        </div>

        <BoutonRecherche
          onClick={lancerRecherche}
          enCours={rechercheEnCours}
          recap={recap}
          erreur={erreurRecherche}
        />

        <FormulaireCriteres
          criteres={criteres}
          onChange={setCriteres}
          onAnalyser={() => lancerAnalyse(criteres)}
          analyseEnCours={analyseEnCours}
        />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SelecteurMode mode={mode} onChange={setMode} />
          {resultat && (
            <p className="text-sm text-zinc-500">
              {resultat.ok.length} bien(s) "ok" — {resultat.aVerifier.length} à vérifier —{" "}
              {resultat.ecartes.length} écarté(s)
            </p>
          )}
        </div>

        {erreurAnalyse && (
          <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {erreurAnalyse}
          </p>
        )}

        {resultat ? (
          <ListeResultats resultat={resultat} mode={mode} biensOkTries={biensOkTries} />
        ) : (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
            Ajustez les critères puis cliquez sur "Analyser".
          </p>
        )}

        <PanneauVerdict
          onClick={genererVerdict}
          enCours={verdictEnCours}
          verdict={verdict}
          erreur={erreurVerdict}
          desactive={biensOkTries.length === 0}
        />
      </section>
    </main>
  );
}
