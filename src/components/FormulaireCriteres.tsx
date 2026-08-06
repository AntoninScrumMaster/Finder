"use client";

import { useState } from "react";
import type { CriteresFormulaire, TypeBienFiltre, Regime } from "@/types-front";

interface Props {
  criteres: CriteresFormulaire;
  onChange: (criteres: CriteresFormulaire) => void;
  onAnalyser: () => void;
  analyseEnCours: boolean;
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

const inputClasses =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

export default function FormulaireCriteres({ criteres, onChange, onAnalyser, analyseEnCours }: Props) {
  const [avanceOuvert, setAvanceOuvert] = useState(false);

  function set<K extends keyof CriteresFormulaire>(cle: K, valeur: CriteresFormulaire[K]) {
    onChange({ ...criteres, [cle]: valeur });
  }

  function nombreOuNull(valeur: string): number | null {
    if (valeur.trim() === "") return null;
    const n = Number(valeur);
    return Number.isNaN(n) ? null : n;
  }

  function zonesDepuisTexte(valeur: string): string[] {
    return valeur
      .split(",")
      .map((z) => z.trim())
      .filter(Boolean);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAnalyser();
      }}
      className="flex flex-col gap-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
    >
      {/* --- Filtres --- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-100">Filtres</h2>

        <Champ label="Type de bien">
          <select
            className={inputClasses}
            value={criteres.typeBien}
            onChange={(e) => set("typeBien", e.target.value as TypeBienFiltre)}
          >
            <option value="tous">Tous</option>
            <option value="appartement">Appartement</option>
            <option value="maison">Maison</option>
            <option value="immeuble">Immeuble</option>
          </select>
        </Champ>

        <div className="grid grid-cols-2 gap-3">
          <Champ label="Prix min (€)">
            <input
              type="number"
              className={inputClasses}
              value={criteres.prixMin ?? ""}
              onChange={(e) => set("prixMin", nombreOuNull(e.target.value))}
            />
          </Champ>
          <Champ label="Prix max (€)">
            <input
              type="number"
              className={inputClasses}
              value={criteres.prixMax ?? ""}
              onChange={(e) => set("prixMax", nombreOuNull(e.target.value))}
            />
          </Champ>
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={criteres.inclureMargePrixMax}
            onChange={(e) => set("inclureMargePrixMax", e.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
          />
          Inclure ±5 % autour du prix max
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Champ label="Surface min (m²)">
            <input
              type="number"
              className={inputClasses}
              value={criteres.surfaceMin ?? ""}
              onChange={(e) => set("surfaceMin", nombreOuNull(e.target.value))}
            />
          </Champ>
          <Champ label="Surface max (m²)">
            <input
              type="number"
              className={inputClasses}
              value={criteres.surfaceMax ?? ""}
              onChange={(e) => set("surfaceMax", nombreOuNull(e.target.value))}
            />
          </Champ>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Champ label="Pièces min">
            <input
              type="number"
              className={inputClasses}
              value={criteres.piecesMin ?? ""}
              onChange={(e) => set("piecesMin", nombreOuNull(e.target.value))}
            />
          </Champ>
          <Champ label="Pièces max">
            <input
              type="number"
              className={inputClasses}
              value={criteres.piecesMax ?? ""}
              onChange={(e) => set("piecesMax", nombreOuNull(e.target.value))}
            />
          </Champ>
        </div>

        <Champ label="DPE plancher (le pire DPE encore acceptable — 'NC' n'écarte jamais)">
          <select
            className={inputClasses}
            value={criteres.dpeMax ?? ""}
            onChange={(e) => set("dpeMax", e.target.value === "" ? null : e.target.value)}
          >
            <option value="">Aucun</option>
            {["A", "B", "C", "D", "E", "F", "G"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Champ>

        <Champ label="Zones à inclure (villes ou départements, séparés par des virgules)">
          <input
            type="text"
            className={inputClasses}
            placeholder="ex. Dijon, 21"
            defaultValue={criteres.zonesInclure.join(", ")}
            onBlur={(e) => set("zonesInclure", zonesDepuisTexte(e.target.value))}
          />
        </Champ>
        <Champ label="Zones à exclure">
          <input
            type="text"
            className={inputClasses}
            placeholder="ex. Paris, 75"
            defaultValue={criteres.zonesExclure.join(", ")}
            onBlur={(e) => set("zonesExclure", zonesDepuisTexte(e.target.value))}
          />
        </Champ>

        <Champ label="Régime">
          <div className="flex gap-4 text-sm">
            {(["nu", "lmnp"] as Regime[]).map((r) => (
              <label key={r} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="regime"
                  checked={criteres.regime === r}
                  onChange={() => set("regime", r)}
                  className="h-3.5 w-3.5 border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                />
                {r === "nu" ? "Nu" : "Meublé (LMNP, +12 % loyer estimé)"}
              </label>
            ))}
          </div>
        </Champ>
      </section>

      {/* --- Financement --- */}
      <section className="flex flex-col gap-3 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3">
        <h2 className="text-sm font-semibold text-emerald-400">Financement</h2>

        <Champ label="Apport (€)">
          <input
            type="number"
            className={inputClasses}
            value={criteres.apport}
            onChange={(e) => set("apport", Number(e.target.value))}
          />
        </Champ>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Taux (%)">
            <input
              type="number"
              step="0.1"
              className={inputClasses}
              value={criteres.tauxPct}
              onChange={(e) => set("tauxPct", Number(e.target.value))}
            />
          </Champ>
          <Champ label="Durée (ans)">
            <input
              type="number"
              className={inputClasses}
              value={criteres.dureeAnnees}
              onChange={(e) => set("dureeAnnees", Number(e.target.value))}
            />
          </Champ>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Revenus du foyer (€/mois)">
            <input
              type="number"
              className={inputClasses}
              value={criteres.revenusFoyer}
              onChange={(e) => set("revenusFoyer", Number(e.target.value))}
            />
          </Champ>
          <Champ label="Crédits en cours (€/mois)">
            <input
              type="number"
              className={inputClasses}
              value={criteres.creditsEnCours}
              onChange={(e) => set("creditsEnCours", Number(e.target.value))}
            />
          </Champ>
        </div>
        <p className="text-xs text-zinc-500">
          Revenus et crédits en cours sont informatifs pour l'instant — non intégrés au calcul.
        </p>
      </section>

      {/* --- Avancé --- */}
      <section className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setAvanceOuvert((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-zinc-100"
        >
          <span className={`transition-transform ${avanceOuvert ? "rotate-90" : ""}`}>▶</span>
          Paramètres avancés
        </button>

        {avanceOuvert && (
          <div className="flex flex-col gap-3 border-l border-zinc-800 pl-3">
            <div className="grid grid-cols-2 gap-3">
              <Champ label="Frais de notaire (%)">
                <input
                  type="number"
                  step="0.1"
                  className={inputClasses}
                  value={criteres.fraisNotairePct * 100}
                  onChange={(e) => set("fraisNotairePct", Number(e.target.value) / 100)}
                />
              </Champ>
              <Champ label="Travaux (€)">
                <input
                  type="number"
                  className={inputClasses}
                  value={criteres.travaux}
                  onChange={(e) => set("travaux", Number(e.target.value))}
                />
              </Champ>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Champ label="Vacance (%)">
                <input
                  type="number"
                  step="0.1"
                  className={inputClasses}
                  value={criteres.vacancePct * 100}
                  onChange={(e) => set("vacancePct", Number(e.target.value) / 100)}
                />
              </Champ>
              <Champ label="Gestion (%)">
                <input
                  type="number"
                  step="0.1"
                  className={inputClasses}
                  value={criteres.gestionPct * 100}
                  onChange={(e) => set("gestionPct", Number(e.target.value) / 100)}
                />
              </Champ>
              <Champ label="Charges non récup. (%)">
                <input
                  type="number"
                  step="0.1"
                  className={inputClasses}
                  value={criteres.chargesNonRecupPct * 100}
                  onChange={(e) => set("chargesNonRecupPct", Number(e.target.value) / 100)}
                />
              </Champ>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Champ label="Seuil rendement brut min (%)">
                <input
                  type="number"
                  step="0.1"
                  className={inputClasses}
                  value={criteres.seuilRendementBrutMin ?? ""}
                  onChange={(e) => set("seuilRendementBrutMin", nombreOuNull(e.target.value))}
                />
              </Champ>
              <Champ label="Seuil rendement net min (%)">
                <input
                  type="number"
                  step="0.1"
                  className={inputClasses}
                  value={criteres.seuilRendementNetMin ?? ""}
                  onChange={(e) => set("seuilRendementNetMin", nombreOuNull(e.target.value))}
                />
              </Champ>
            </div>
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={analyseEnCours}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
      >
        {analyseEnCours ? "Analyse en cours..." : "Analyser"}
      </button>
    </form>
  );
}
