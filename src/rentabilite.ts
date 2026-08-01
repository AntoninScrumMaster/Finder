import { supabase } from "./supabase.js";
import type { Listing } from "./extract.js";

/**
 * Profil de recherche (table search_profiles). Les champs "..._pct" sont des
 * FRACTIONS (0.08 = 8 %) ; les "seuil_..." sont des POURCENTAGES (6 = 6 %).
 * `taux_credit` est aussi une fraction (0.035 = 3,5 %) : il est injecté tel
 * quel dans la formule d'amortissement du crédit.
 */
export interface SearchProfile {
  id: string;
  nom: string;
  actif: boolean;
  frais_notaire_pct: number;
  travaux_defaut: number;
  apport_pct: number;
  taux_credit: number;
  duree_credit_annees: number;
  vacance_pct: number;
  charges_non_recup_pct: number;
  gestion_pct: number;
  taxe_fonciere_estimee: number | null;
  prix_max: number | null;
  surface_min: number | null;
  seuil_rendement_brut_min: number | null;
  seuil_rendement_net_min: number | null;
  dpe_max: string | null;
}

export interface LoyerZone {
  loyerM2: number;
  fiabilite: string;
  niveau: "commune" | "departement";
}

interface ZoneLoyerRow {
  loyer_m2_appartement: number | null;
  loyer_m2_maison: number | null;
  fiabilite: string;
}

interface ZoneLoyerDeptRow {
  loyer_m2_appartement: number | null;
  loyer_m2_maison: number | null;
}

/**
 * Renvoie le loyer/m² applicable pour une commune (zone_loyers), avec repli
 * sur le loyer/m² départemental (zone_loyers_dept, fiabilite 'faible') si la
 * commune est absente, si sa fiabilité est 'faible', ou si elle n'a pas de
 * valeur pour le type de bien demandé. Renvoie null si aucune donnée n'est
 * disponible ni à l'échelle commune ni à l'échelle département.
 */
export async function loyerM2(
  codeInsee: string,
  codeDepartement: string | null,
  typeBien: Listing["type_bien"],
): Promise<LoyerZone | null> {
  const { data: communeData, error: erreurCommune } = await supabase
    .from("zone_loyers")
    .select("loyer_m2_appartement, loyer_m2_maison, fiabilite")
    .eq("code_insee", codeInsee)
    .maybeSingle();

  if (erreurCommune) {
    console.warn(
      `⚠️  Erreur zone_loyers pour ${codeInsee} :`,
      erreurCommune.message,
    );
  }

  const commune = communeData as ZoneLoyerRow | null;

  if (commune && commune.fiabilite !== "faible") {
    const valeur =
      typeBien === "maison" ? commune.loyer_m2_maison : commune.loyer_m2_appartement;
    if (valeur !== null) {
      return { loyerM2: valeur, fiabilite: commune.fiabilite, niveau: "commune" };
    }
  }

  // Repli sur la moyenne départementale.
  if (!codeDepartement) return null;

  const { data: deptData, error: erreurDept } = await supabase
    .from("zone_loyers_dept")
    .select("loyer_m2_appartement, loyer_m2_maison")
    .eq("code_departement", codeDepartement)
    .maybeSingle();

  if (erreurDept) {
    console.warn(
      `⚠️  Erreur zone_loyers_dept pour ${codeDepartement} :`,
      erreurDept.message,
    );
  }

  const dept = deptData as ZoneLoyerDeptRow | null;
  if (!dept) return null;

  const valeurDept =
    typeBien === "maison" ? dept.loyer_m2_maison : dept.loyer_m2_appartement;
  if (valeurDept === null) return null;

  return { loyerM2: valeurDept, fiabilite: "faible", niveau: "departement" };
}

export interface Rentabilite {
  prixM2: number;
  rendementBrut: number;
  rendementNet: number;
  cashflow: number;
}

/** Mensualité d'un crédit amortissable classique ; gère un taux nul. */
function mensualiteCredit(
  emprunte: number,
  tauxAnnuel: number,
  dureeAnnees: number,
): number {
  const nbMensualites = dureeAnnees * 12;
  if (emprunte <= 0 || nbMensualites <= 0) return 0;

  if (tauxAnnuel === 0) {
    return emprunte / nbMensualites;
  }

  const tauxMensuel = tauxAnnuel / 12;
  return (emprunte * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nbMensualites));
}

/**
 * Calcule les métriques de rentabilité d'un bien selon le profil de
 * recherche fourni. Formules imposées par le cahier des charges — ne pas
 * modifier sans revalider avec l'utilisateur.
 */
export function calculeRentabilite(
  prix: number,
  loyerMensuel: number,
  surface: number,
  profile: SearchProfile,
): Rentabilite {
  const coutTotal = prix * (1 + profile.frais_notaire_pct) + profile.travaux_defaut;
  const apport = coutTotal * profile.apport_pct;
  const emprunte = Math.max(0, coutTotal - apport);
  const mensualite = mensualiteCredit(
    emprunte,
    profile.taux_credit,
    profile.duree_credit_annees,
  );

  const loyerAnnuel = loyerMensuel * 12;
  const rendementBrut = (loyerAnnuel / prix) * 100;

  const loyerNetAnnuel =
    loyerAnnuel *
    (1 - (profile.vacance_pct + profile.charges_non_recup_pct + profile.gestion_pct));

  const tf = profile.taxe_fonciere_estimee ?? loyerMensuel;
  const rendementNet = ((loyerNetAnnuel - tf) / coutTotal) * 100;

  const cashflow =
    loyerMensuel -
    mensualite -
    (tf / 12 + (loyerAnnuel * (profile.charges_non_recup_pct + profile.gestion_pct)) / 12);

  return {
    prixM2: prix / surface,
    rendementBrut,
    rendementNet,
    cashflow,
  };
}
