import type { SearchProfile } from "./rentabilite";

export type EtatBien = "ok" | "a_verifier" | "ecarte";

export type Mode = "cashflow" | "rendement" | "securite";

export interface SousScores {
  scoreCashflow: number;
  scoreRendement: number;
  scoreFiabilite: number;
  scoreDpe: number;
}

const ORDRE_DPE = ["A", "B", "C", "D", "E", "F", "G"] as const;
type LettreDpe = (typeof ORDRE_DPE)[number];

export function indexDpe(valeur: string): number {
  return ORDRE_DPE.indexOf(valeur as LettreDpe);
}

function clamp(valeur: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valeur));
}

/**
 * Vecteurs de poids (cashflow, rendement, fiabilité, dpe) par mode. Chaque
 * vecteur somme à 100, donc noteFinale() reste dans l'échelle 0-100 des
 * sous-scores.
 */
const POIDS: Record<Mode, SousScores> = {
  cashflow: { scoreCashflow: 50, scoreRendement: 25, scoreFiabilite: 15, scoreDpe: 10 },
  rendement: { scoreCashflow: 25, scoreRendement: 50, scoreFiabilite: 15, scoreDpe: 10 },
  securite: { scoreCashflow: 20, scoreRendement: 15, scoreFiabilite: 40, scoreDpe: 25 },
};

/** cashflow_mensuel null (rentabilité non calculable) → pire cas, 0. */
export function scoreCashflow(cashflowMensuel: number | null): number {
  if (cashflowMensuel === null) return 0;
  return clamp(50 + cashflowMensuel / 6, 0, 100);
}

/** rendement_net null (rentabilité non calculable) → pire cas, 0. */
export function scoreRendement(rendementNet: number | null): number {
  if (rendementNet === null) return 0;
  return clamp(((rendementNet - 2) / 6) * 100, 0, 100);
}

/**
 * niveau 'commune' + fiabilite 'fiable'/'moyenne'/'faible' → 100/70/45.
 * niveau 'departement' → 35 (quelle que soit sa fiabilité, toujours 'faible'
 * en pratique côté rentabilite.ts). niveau null (aucune donnée de zone) →
 * pire cas, 0.
 */
export function scoreFiabilite(
  niveauLoyer: string | null,
  fiabiliteLoyer: string | null,
): number {
  if (niveauLoyer === "commune") {
    if (fiabiliteLoyer === "fiable") return 100;
    if (fiabiliteLoyer === "moyenne") return 70;
    return 45; // 'faible' ou valeur inattendue : traiter prudemment.
  }
  if (niveauLoyer === "departement") return 35;
  return 0;
}

const BAREME_DPE: Record<string, number> = {
  A: 100,
  B: 90,
  C: 80,
  D: 60,
  E: 40,
  F: 20,
  G: 0,
  NC: 50,
};

export function scoreDpe(dpe: string): number {
  return BAREME_DPE[dpe] ?? 50;
}

/** somme pondérée des 4 sous-scores / 100, pour le mode donné. */
export function noteFinale(scores: SousScores, mode: Mode): number {
  const poids = POIDS[mode];
  return (
    (poids.scoreCashflow * scores.scoreCashflow +
      poids.scoreRendement * scores.scoreRendement +
      poids.scoreFiabilite * scores.scoreFiabilite +
      poids.scoreDpe * scores.scoreDpe) /
    100
  );
}

export interface DonneesEtat {
  cashflowMensuel: number | null;
  rendementBrut: number | null;
  rendementNet: number | null;
  prixM2: number | null;
  loyerCalculable: boolean;
  prix: number | null;
  surface: number | null;
  dpe: string;
}

export interface ResultatEtat {
  etat: EtatBien;
  raison: string | null;
}

/**
 * Détermine l'état d'un bien — seule source de vérité pour l'affichage et le
 * classement (il n'y a plus de calcul d'éligibilité séparé) :
 * - 'ecarte' si cashflow_mensuel < -400, ou si un filtre dur du profil est
 *   violé : prix_max, surface_min, dpe_max, seuil_rendement_brut_min,
 *   seuil_rendement_net_min.
 * - 'a_verifier' si prix_m2 < 500, ou rendement_brut > 20, ou si le loyer
 *   n'a pas pu être calculé (aucune donnée de zone).
 * - 'ok' sinon.
 *
 * Priorité : 'ecarte' avant 'a_verifier' — un bien qui viole un filtre dur
 * n'a pas besoin d'être aussi signalé comme suspect.
 */
export function determinerEtat(donnees: DonneesEtat, profile: SearchProfile): ResultatEtat {
  if (donnees.cashflowMensuel !== null && donnees.cashflowMensuel < -400) {
    return {
      etat: "ecarte",
      raison: `Cashflow mensuel (${donnees.cashflowMensuel.toFixed(0)} €) inférieur au plancher (-400 €)`,
    };
  }

  if (
    profile.prix_max !== null &&
    donnees.prix !== null &&
    donnees.prix > profile.prix_max
  ) {
    return {
      etat: "ecarte",
      raison: `Prix (${donnees.prix} €) supérieur au maximum (${profile.prix_max} €)`,
    };
  }

  if (
    profile.surface_min !== null &&
    donnees.surface !== null &&
    donnees.surface < profile.surface_min
  ) {
    return {
      etat: "ecarte",
      raison: `Surface (${donnees.surface} m²) inférieure au minimum (${profile.surface_min} m²)`,
    };
  }

  if (
    profile.dpe_max !== null &&
    donnees.dpe !== "NC" &&
    indexDpe(donnees.dpe) > indexDpe(profile.dpe_max)
  ) {
    return {
      etat: "ecarte",
      raison: `DPE (${donnees.dpe}) moins bon que le maximum autorisé (${profile.dpe_max})`,
    };
  }

  if (
    profile.seuil_rendement_brut_min !== null &&
    donnees.rendementBrut !== null &&
    donnees.rendementBrut < profile.seuil_rendement_brut_min
  ) {
    return {
      etat: "ecarte",
      raison: `Rendement brut (${donnees.rendementBrut.toFixed(2)} %) inférieur au seuil (${profile.seuil_rendement_brut_min} %)`,
    };
  }

  if (
    profile.seuil_rendement_net_min !== null &&
    donnees.rendementNet !== null &&
    donnees.rendementNet < profile.seuil_rendement_net_min
  ) {
    return {
      etat: "ecarte",
      raison: `Rendement net (${donnees.rendementNet.toFixed(2)} %) inférieur au seuil (${profile.seuil_rendement_net_min} %)`,
    };
  }

  if (donnees.prixM2 !== null && donnees.prixM2 < 500) {
    return {
      etat: "a_verifier",
      raison: `Prix/m² (${donnees.prixM2.toFixed(0)} €/m²) anormalement bas — surface probablement erronée`,
    };
  }

  if (donnees.rendementBrut !== null && donnees.rendementBrut > 20) {
    return {
      etat: "a_verifier",
      raison: `Rendement brut (${donnees.rendementBrut.toFixed(2)} %) anormalement élevé — données à vérifier`,
    };
  }

  if (!donnees.loyerCalculable) {
    return {
      etat: "a_verifier",
      raison: "Loyer non calculable (aucune donnée de zone pour ce bien)",
    };
  }

  return { etat: "ok", raison: null };
}
