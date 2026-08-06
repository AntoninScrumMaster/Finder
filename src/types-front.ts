import type { EtatBien, SousScores, Mode } from "./scoring";

export type TypeBienFiltre = "appartement" | "maison" | "immeuble" | "tous";
export type Regime = "nu" | "lmnp";

/**
 * Critères soumis par le formulaire d'analyse. Construits côté client,
 * envoyés tels quels à /api/analyser — analyse.ts construit un SearchProfile
 * en mémoire à partir de ces valeurs (jamais celui stocké en base par le
 * pipeline d'ingestion, qui reste indépendant).
 */
export interface CriteresFormulaire {
  // Filtres
  typeBien: TypeBienFiltre;
  prixMin: number | null;
  prixMax: number | null;
  /** Inclut les biens jusqu'à prixMax * 1.05. */
  inclureMargePrixMax: boolean;
  surfaceMin: number | null;
  surfaceMax: number | null;
  piecesMin: number | null;
  piecesMax: number | null;
  /** DPE plancher (le pire DPE encore acceptable) ; NC n'écarte jamais. */
  dpeMax: string | null;
  /** Villes ou codes départements (ex. "21") — libre. */
  zonesInclure: string[];
  zonesExclure: string[];
  regime: Regime;
  mode: Mode;

  // Financement
  /** Apport en euros (pas une fraction) — converti par bien selon son coût total. */
  apport: number;
  tauxPct: number;
  dureeAnnees: number;
  /** Informational pour l'instant — non branché sur un calcul (pas de règle de capacité d'emprunt spécifiée). */
  revenusFoyer: number;
  creditsEnCours: number;

  // Avancé
  fraisNotairePct: number;
  travaux: number;
  vacancePct: number;
  gestionPct: number;
  chargesNonRecupPct: number;
  seuilRendementBrutMin: number | null;
  seuilRendementNetMin: number | null;
}

export const CRITERES_PAR_DEFAUT: CriteresFormulaire = {
  typeBien: "tous",
  prixMin: null,
  prixMax: null,
  inclureMargePrixMax: false,
  surfaceMin: null,
  surfaceMax: null,
  piecesMin: null,
  piecesMax: null,
  dpeMax: null,
  zonesInclure: [],
  zonesExclure: [],
  regime: "nu",
  mode: "cashflow",

  apport: 20000,
  tauxPct: 3.5,
  dureeAnnees: 20,
  revenusFoyer: 3000,
  creditsEnCours: 0,

  fraisNotairePct: 0.08,
  travaux: 0,
  vacancePct: 0.05,
  gestionPct: 0.07,
  chargesNonRecupPct: 0.1,
  seuilRendementBrutMin: null,
  seuilRendementNetMin: null,
};

/** Un bien après (re)calcul par analyse.ts, prêt à afficher côté front. */
export interface BienAnalyse {
  listingId: string;
  ville: string | null;
  prix: number | null;
  surface: number | null;
  typeBien: string | null;
  dpe: string;
  url: string | null;
  images: string[];
  titre: string | null;
  prixM2: number | null;
  rendementBrut: number | null;
  rendementNet: number | null;
  cashflowMensuel: number | null;
  sousScores: SousScores;
  /** Note finale précalculée pour les 3 modes — permet au front de re-trier au changement de mode sans rappeler l'API. */
  notes: Record<Mode, number>;
  etat: EtatBien;
  raison: string | null;
}

/** Version allégée d'un bien écarté — juste de quoi expliquer pourquoi, dans une section repliée. */
export interface BienEcarte {
  listingId: string;
  ville: string | null;
  prix: number | null;
  raison: string | null;
}

export interface ResultatAnalyse {
  ok: BienAnalyse[];
  aVerifier: BienAnalyse[];
  ecartes: BienEcarte[];
}

/** Récap renvoyé par /api/rechercher — ce que le clic sur "Rechercher" a coûté. */
export interface RecapRecherche {
  totalAnnonces: number;
  nouvellesAnnonces: number;
  mailsAnalyses: number;
  mailsIgnores: number;
  appelsLLM: number;
  tokensEntree: number;
  tokensSortie: number;
  coutEstime: number;
  dateRecherche: string;
}
