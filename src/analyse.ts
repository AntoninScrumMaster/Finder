import { supabase } from "./supabase";
import { loyerM2, calculeRentabilite, type SearchProfile } from "./rentabilite";
import {
  scoreCashflow,
  scoreRendement,
  scoreFiabilite,
  scoreDpe,
  determinerEtat,
  noteFinale,
  type Mode,
  type SousScores,
} from "./scoring";
import { derivateDepartement, normaliser } from "./geo";
import type { Listing } from "./extract";
import type { CriteresFormulaire, BienAnalyse, BienEcarte, ResultatAnalyse } from "./types-front";

/**
 * Analyse "à la volée" des listings déjà en base, selon les critères d'un
 * formulaire — AUCUN appel LLM, AUCUNE écriture en base. Réutilise
 * loyerM2/calculeRentabilite (rentabilite.ts) et les fonctions de scoring
 * (scoring.ts) telles quelles ; la seule règle métier ajoutée ici est la
 * majoration LMNP du loyer estimé (+12 %), qui n'existe pas dans le pipeline
 * d'ingestion.
 */

const MAJORATION_LMNP = 1.12;

interface ListingRow {
  id: string;
  ville: string | null;
  prix: number | null;
  surface: number | null;
  pieces: number | null;
  chambres: number | null;
  type_bien: Listing["type_bien"] | null;
  code_postal: string | null;
  code_insee: string | null;
  dpe: string;
  url: string | null;
  images: string[] | null;
  titre: string | null;
}

/**
 * Une zone du formulaire est soit un code département ("21", "971"), soit un
 * nom de ville (comparaison normalisée, sous-chaîne dans les deux sens pour
 * tolérer "Dijon" vs "Dijon Centre" par ex.). Pas de traduction nom de
 * département -> code : les entrées "département" doivent être des codes.
 */
function correspondAUneZone(
  ville: string | null,
  departement: string | null,
  zone: string,
): boolean {
  const zoneBrute = zone.trim();
  if (/^\d{2,3}$/.test(zoneBrute)) {
    return departement === zoneBrute;
  }
  if (!ville) return false;
  const villeNorm = normaliser(ville);
  const zoneNorm = normaliser(zoneBrute);
  return villeNorm.includes(zoneNorm) || zoneNorm.includes(villeNorm);
}

function correspondAUneListeDeZones(
  ville: string | null,
  departement: string | null,
  zones: string[],
): boolean {
  return zones.some((zone) => correspondAUneZone(ville, departement, zone));
}

/** Construit le SearchProfile attendu par rentabilite.ts/scoring.ts à partir du formulaire. apport_pct est dérivé par bien (voir plus bas), donc absent ici. */
function profilSansApport(
  criteres: CriteresFormulaire,
): Omit<SearchProfile, "apport_pct"> {
  return {
    id: "formulaire",
    nom: "Formulaire",
    actif: true,
    frais_notaire_pct: criteres.fraisNotairePct,
    travaux_defaut: criteres.travaux,
    taux_credit: criteres.tauxPct / 100,
    duree_credit_annees: criteres.dureeAnnees,
    vacance_pct: criteres.vacancePct,
    charges_non_recup_pct: criteres.chargesNonRecupPct,
    gestion_pct: criteres.gestionPct,
    taxe_fonciere_estimee: null,
    prix_max: criteres.prixMax,
    surface_min: criteres.surfaceMin,
    seuil_rendement_brut_min: criteres.seuilRendementBrutMin,
    seuil_rendement_net_min: criteres.seuilRendementNetMin,
    dpe_max: criteres.dpeMax,
  };
}

export async function analyserListings(criteres: CriteresFormulaire): Promise<ResultatAnalyse> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, ville, prix, surface, pieces, chambres, type_bien, code_postal, code_insee, dpe, url, images, titre",
    );

  if (error) {
    throw new Error(`Lecture des listings échouée : ${error.message}`);
  }

  const listings = (data ?? []) as ListingRow[];
  const base = profilSansApport(criteres);

  const ok: BienAnalyse[] = [];
  const aVerifier: BienAnalyse[] = [];
  const ecartes: BienEcarte[] = [];

  for (const listing of listings) {
    // --- Filtres du formulaire, avant tout calcul ---
    if (criteres.typeBien !== "tous" && listing.type_bien !== criteres.typeBien) {
      continue;
    }

    if (criteres.prixMin !== null && (listing.prix ?? -Infinity) < criteres.prixMin) {
      continue;
    }
    if (criteres.prixMax !== null) {
      const plafond = criteres.inclureMargePrixMax ? criteres.prixMax * 1.05 : criteres.prixMax;
      if ((listing.prix ?? Infinity) > plafond) continue;
    }

    if (criteres.surfaceMin !== null && (listing.surface ?? -Infinity) < criteres.surfaceMin) {
      continue;
    }
    if (criteres.surfaceMax !== null && (listing.surface ?? Infinity) > criteres.surfaceMax) {
      continue;
    }

    if (criteres.piecesMin !== null && (listing.pieces ?? -Infinity) < criteres.piecesMin) {
      continue;
    }
    if (criteres.piecesMax !== null && (listing.pieces ?? Infinity) > criteres.piecesMax) {
      continue;
    }

    const departement = derivateDepartement(listing.code_insee, listing.code_postal);

    if (
      criteres.zonesExclure.length > 0 &&
      correspondAUneListeDeZones(listing.ville, departement, criteres.zonesExclure)
    ) {
      continue;
    }
    if (
      criteres.zonesInclure.length > 0 &&
      !correspondAUneListeDeZones(listing.ville, departement, criteres.zonesInclure)
    ) {
      continue;
    }

    // --- Profil de calcul : apport (€) converti en fraction pour CE bien,
    // puisque coutTotal (donc le poids réel de l'apport) dépend du prix. ---
    const coutTotalEstime = (listing.prix ?? 0) * (1 + base.frais_notaire_pct) + base.travaux_defaut;
    const apportPct = coutTotalEstime > 0 ? criteres.apport / coutTotalEstime : 0;
    const profile: SearchProfile = { ...base, apport_pct: apportPct };

    // --- Rentabilité (rentabilite.ts, inchangé) ---
    let loyerMensuelEstime: number | null = null;
    let fiabiliteLoyer: string | null = null;
    let niveauLoyer: string | null = null;
    let prixM2: number | null = null;
    let rendementBrut: number | null = null;
    let rendementNet: number | null = null;
    let cashflowMensuel: number | null = null;

    if (listing.prix !== null && listing.surface !== null) {
      prixM2 = listing.prix / listing.surface;
    }

    if (listing.code_insee && listing.prix !== null && listing.surface !== null) {
      const zone = await loyerM2(listing.code_insee, departement, listing.type_bien ?? "autre");

      if (zone) {
        fiabiliteLoyer = zone.fiabilite;
        niveauLoyer = zone.niveau;
        loyerMensuelEstime = listing.surface * zone.loyerM2;

        if (criteres.regime === "lmnp") {
          loyerMensuelEstime *= MAJORATION_LMNP;
        }

        const metriques = calculeRentabilite(listing.prix, loyerMensuelEstime, listing.surface, profile);
        rendementBrut = metriques.rendementBrut;
        rendementNet = metriques.rendementNet;
        cashflowMensuel = metriques.cashflow;
      }
    }

    // --- Scoring hybride (scoring.ts, inchangé) ---
    const sousScores: SousScores = {
      scoreCashflow: scoreCashflow(cashflowMensuel),
      scoreRendement: scoreRendement(rendementNet),
      scoreFiabilite: scoreFiabilite(niveauLoyer, fiabiliteLoyer),
      scoreDpe: scoreDpe(listing.dpe),
    };

    const { etat, raison } = determinerEtat(
      {
        cashflowMensuel,
        rendementBrut,
        rendementNet,
        prixM2,
        loyerCalculable: niveauLoyer !== null,
        prix: listing.prix,
        surface: listing.surface,
        dpe: listing.dpe,
      },
      profile,
    );

    const bien: BienAnalyse = {
      listingId: listing.id,
      ville: listing.ville,
      prix: listing.prix,
      surface: listing.surface,
      typeBien: listing.type_bien,
      dpe: listing.dpe,
      url: listing.url,
      images: listing.images ?? [],
      titre: listing.titre,
      prixM2,
      rendementBrut,
      rendementNet,
      cashflowMensuel,
      sousScores,
      notes: {
        cashflow: noteFinale(sousScores, "cashflow" satisfies Mode),
        rendement: noteFinale(sousScores, "rendement" satisfies Mode),
        securite: noteFinale(sousScores, "securite" satisfies Mode),
      },
      etat,
      raison,
    };

    if (etat === "ok") ok.push(bien);
    else if (etat === "a_verifier") aVerifier.push(bien);
    else ecartes.push({ listingId: listing.id, ville: listing.ville, prix: listing.prix, raison });
  }

  ok.sort((a, b) => b.notes[criteres.mode] - a.notes[criteres.mode]);

  return { ok, aVerifier, ecartes };
}
