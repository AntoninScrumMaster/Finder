import { supabase } from "./supabase";
import { fingerprint } from "./fingerprint";
import { resoudreCommune } from "./geo";
import { loyerM2, calculeRentabilite, type SearchProfile } from "./rentabilite";
import {
  scoreCashflow,
  scoreRendement,
  scoreFiabilite,
  scoreDpe,
  determinerEtat,
  type SousScores,
  type EtatBien,
} from "./scoring";
import type { Listing } from "./extract";

/**
 * Schéma Supabase attendu par ce module (à faire correspondre à la migration
 * SQL) :
 *
 * listings(id uuid pk, fingerprint text unique, source text,
 *   external_id text, url text, titre text, description text, prix numeric,
 *   surface numeric, pieces int, chambres int, type_bien text,
 *   code_postal text, ville text, code_insee text, dpe text,
 *   meuble boolean, images text[], first_seen_at timestamptz,
 *   last_seen_at timestamptz, created_at timestamptz default now())
 *
 * price_history(id uuid pk, listing_id uuid fk->listings, prix numeric,
 *   created_at timestamptz default now())
 *
 * analyses(id uuid pk, listing_id uuid fk->listings,
 *   profile_id uuid fk->search_profiles, loyer_mensuel_estime numeric,
 *   loyer_m2_zone numeric, prix_m2 numeric, rendement_brut numeric,
 *   rendement_net numeric, cashflow_mensuel numeric, fiabilite_loyer text,
 *   niveau_loyer text, eligible boolean, exclusion_raison text, verdict text,
 *   etat etat_bien ('ok'|'a_verifier'|'ecarte'), score_cashflow numeric,
 *   score_rendement numeric, score_fiabilite numeric, score_dpe numeric,
 *   unique(listing_id, profile_id))
 *
 * search_profiles(id uuid pk, nom text, actif boolean,
 *   frais_notaire_pct numeric, travaux_defaut numeric, apport_pct numeric,
 *   taux_credit numeric, duree_credit_annees numeric, vacance_pct numeric,
 *   charges_non_recup_pct numeric, gestion_pct numeric,
 *   taxe_fonciere_estimee numeric, prix_max numeric, surface_min numeric,
 *   seuil_rendement_brut_min numeric, seuil_rendement_net_min numeric,
 *   dpe_max text, created_at timestamptz default now())
 */

const PROFIL_DEFAUT = {
  nom: "Défaut",
  actif: true,
  frais_notaire_pct: 0.08,
  travaux_defaut: 0,
  apport_pct: 0.1,
  taux_credit: 0.035,
  duree_credit_annees: 20,
  vacance_pct: 0.05,
  charges_non_recup_pct: 0.05,
  gestion_pct: 0.07,
  taxe_fonciere_estimee: null,
  prix_max: null,
  surface_min: null,
  seuil_rendement_brut_min: null,
  seuil_rendement_net_min: null,
  dpe_max: null,
};

/**
 * Renvoie le 1er profil de recherche actif. S'il n'en existe aucun, crée un
 * profil "Défaut" avec tous les seuils à null (ne filtre rien), pour la
 * phase de test.
 */
export async function getProfile(): Promise<SearchProfile> {
  const { data, error } = await supabase
    .from("search_profiles")
    .select("*")
    .eq("actif", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Impossible de lire search_profiles : ${error.message}`);
  }

  if (data) return data as SearchProfile;

  const { data: cree, error: erreurCreation } = await supabase
    .from("search_profiles")
    .insert(PROFIL_DEFAUT)
    .select("*")
    .single();

  if (erreurCreation || !cree) {
    throw new Error(
      `Impossible de créer le profil "Défaut" : ${erreurCreation?.message}`,
    );
  }

  return cree as SearchProfile;
}

interface ListingRow {
  id: string;
  prix: number | null;
  code_insee: string | null;
}

export interface ResultatTraitement {
  nouveau: boolean;
  eligible: boolean;
  raison: string | null;
  prixM2: number | null;
  rendementBrut: number | null;
  rendementNet: number | null;
  cashflow: number | null;
  niveauLoyer: string | null;
  fiabiliteLoyer: string | null;
}

export interface ListingConnu {
  listingId: string;
  ville: string | null;
  prix: number | null;
  resultat: ResultatTraitement;
}

interface ListingParUrlRow {
  id: string;
  url: string;
  ville: string | null;
  prix: number | null;
}

interface AnalyseRow {
  listing_id: string;
  prix_m2: number | null;
  rendement_brut: number | null;
  rendement_net: number | null;
  cashflow_mensuel: number | null;
  niveau_loyer: string | null;
  fiabilite_loyer: string | null;
  eligible: boolean;
  exclusion_raison: string | null;
}

/**
 * Pré-filtrage sans LLM : pour une liste d'URLs déjà extraites
 * déterministiquement (urls.ts), renvoie celles déjà connues en base avec
 * leur dernière analyse pour le profil donné. Permet de sauter l'appel LLM
 * pour un mail entier si toutes ses annonces sont déjà connues.
 */
export async function trouverConnusParUrl(
  urls: string[],
  profileId: string,
): Promise<Map<string, ListingConnu>> {
  const resultat = new Map<string, ListingConnu>();
  if (urls.length === 0) return resultat;

  const { data: listingsData, error: erreurListings } = await supabase
    .from("listings")
    .select("id, url, ville, prix")
    .in("url", urls);

  if (erreurListings) {
    throw new Error(`Recherche de listings par url échouée : ${erreurListings.message}`);
  }

  const listings = (listingsData ?? []) as ListingParUrlRow[];
  if (listings.length === 0) return resultat;

  const ids = listings.map((l) => l.id);

  const { data: analysesData, error: erreurAnalyses } = await supabase
    .from("analyses")
    .select(
      "listing_id, prix_m2, rendement_brut, rendement_net, cashflow_mensuel, niveau_loyer, fiabilite_loyer, eligible, exclusion_raison",
    )
    .eq("profile_id", profileId)
    .in("listing_id", ids);

  if (erreurAnalyses) {
    throw new Error(`Recherche des analyses échouée : ${erreurAnalyses.message}`);
  }

  const analysesParListing = new Map<string, AnalyseRow>();
  for (const a of (analysesData ?? []) as AnalyseRow[]) {
    analysesParListing.set(a.listing_id, a);
  }

  for (const l of listings) {
    const analyse = analysesParListing.get(l.id);
    resultat.set(l.url, {
      listingId: l.id,
      ville: l.ville,
      prix: l.prix,
      resultat: {
        nouveau: false,
        eligible: analyse?.eligible ?? false,
        raison: analyse?.exclusion_raison ?? null,
        prixM2: analyse?.prix_m2 ?? null,
        rendementBrut: analyse?.rendement_brut ?? null,
        rendementNet: analyse?.rendement_net ?? null,
        cashflow: analyse?.cashflow_mensuel ?? null,
        niveauLoyer: analyse?.niveau_loyer ?? null,
        fiabiliteLoyer: analyse?.fiabilite_loyer ?? null,
      },
    });
  }

  return resultat;
}

/** Touche last_seen_at pour des listings déjà connus, sans appel LLM. */
export async function marquerVus(listingIds: string[]): Promise<void> {
  if (listingIds.length === 0) return;

  const { error } = await supabase
    .from("listings")
    .update({ last_seen_at: new Date().toISOString() })
    .in("id", listingIds);

  if (error) {
    throw new Error(`Mise à jour last_seen_at échouée : ${error.message}`);
  }
}

export interface BienAVerifier {
  ville: string | null;
  prix: number | null;
  raison: string | null;
}

interface AVerifierRow {
  exclusion_raison: string | null;
  listings: { ville: string | null; prix: number | null } | null;
}

/** Liste les biens à l'état 'a_verifier' pour un profil, avec leur raison. */
export async function listerAVerifier(profileId: string): Promise<BienAVerifier[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select("exclusion_raison, listings(ville, prix)")
    .eq("profile_id", profileId)
    .eq("etat", "a_verifier" satisfies EtatBien);

  if (error) {
    throw new Error(`Lecture des analyses 'a_verifier' échouée : ${error.message}`);
  }

  return ((data ?? []) as unknown as AVerifierRow[]).map((l) => ({
    ville: l.listings?.ville ?? null,
    prix: l.listings?.prix ?? null,
    raison: l.exclusion_raison,
  }));
}

export interface DonneesPourAnalyse {
  listingId: string;
  prix: number | null;
  surface: number | null;
  typeBien: Listing["type_bien"];
  dpe: string;
  codeInsee: string | null;
  codeDepartement: string | null;
}

/**
 * Calcule rentabilité + scoring hybride + etat pour un bien déjà en base
 * (commune déjà résolue) et enregistre le résultat dans `analyses`. Extrait
 * de processListing pour être réutilisable par un backfill (src/backfill.ts)
 * sans repasser par l'extraction LLM ni la résolution de commune.
 */
export async function calculerEtEnregistrerAnalyse(
  donnees: DonneesPourAnalyse,
  profile: SearchProfile,
): Promise<Omit<ResultatTraitement, "nouveau">> {
  // --- Rentabilité ---
  let loyerMensuelEstime: number | null = null;
  let loyerM2Zone: number | null = null;
  let fiabiliteLoyer: string | null = null;
  let niveauLoyer: string | null = null;
  let prixM2: number | null = null;
  let rendementBrut: number | null = null;
  let rendementNet: number | null = null;
  let cashflowMensuel: number | null = null;

  if (donnees.prix !== null && donnees.surface !== null) {
    prixM2 = donnees.prix / donnees.surface;
  }

  if (donnees.codeInsee && donnees.prix !== null && donnees.surface !== null) {
    const zone = await loyerM2(donnees.codeInsee, donnees.codeDepartement, donnees.typeBien);

    if (zone) {
      loyerM2Zone = zone.loyerM2;
      fiabiliteLoyer = zone.fiabilite;
      niveauLoyer = zone.niveau;
      loyerMensuelEstime = donnees.surface * zone.loyerM2;

      const metriques = calculeRentabilite(
        donnees.prix,
        loyerMensuelEstime,
        donnees.surface,
        profile,
      );

      rendementBrut = metriques.rendementBrut;
      rendementNet = metriques.rendementNet;
      cashflowMensuel = metriques.cashflow;
    }
  }

  // --- Scoring hybride : seule source de vérité pour eligible/verdict/etat.
  // Les seuils du profil (prix_max, surface_min, dpe_max,
  // seuil_rendement_brut_min, seuil_rendement_net_min) sont intégrés dans
  // determinerEtat() — il n'y a plus de calcul d'éligibilité séparé.
  const sousScores: SousScores = {
    scoreCashflow: scoreCashflow(cashflowMensuel),
    scoreRendement: scoreRendement(rendementNet),
    scoreFiabilite: scoreFiabilite(niveauLoyer, fiabiliteLoyer),
    scoreDpe: scoreDpe(donnees.dpe),
  };

  const { etat, raison } = determinerEtat(
    {
      cashflowMensuel,
      rendementBrut,
      rendementNet,
      prixM2,
      loyerCalculable: niveauLoyer !== null,
      prix: donnees.prix,
      surface: donnees.surface,
      dpe: donnees.dpe,
    },
    profile,
  );

  // Conservée par compat pour la colonne `eligible`, mais toujours dérivée
  // de `etat` — jamais recalculée indépendamment.
  const eligible = etat !== "ecarte";
  const verdict = eligible ? "a_voir" : "ecarte_filtre";

  const { error: erreurAnalyse } = await supabase.from("analyses").upsert(
    {
      listing_id: donnees.listingId,
      profile_id: profile.id,
      loyer_mensuel_estime: loyerMensuelEstime,
      loyer_m2_zone: loyerM2Zone,
      prix_m2: prixM2,
      rendement_brut: rendementBrut,
      rendement_net: rendementNet,
      cashflow_mensuel: cashflowMensuel,
      fiabilite_loyer: fiabiliteLoyer,
      niveau_loyer: niveauLoyer,
      eligible,
      exclusion_raison: raison,
      verdict,
      etat,
      score_cashflow: sousScores.scoreCashflow,
      score_rendement: sousScores.scoreRendement,
      score_fiabilite: sousScores.scoreFiabilite,
      score_dpe: sousScores.scoreDpe,
    },
    { onConflict: "listing_id,profile_id" },
  );

  if (erreurAnalyse) {
    throw new Error(`Upsert analyses échoué : ${erreurAnalyse.message}`);
  }

  return {
    eligible,
    raison,
    prixM2,
    rendementBrut,
    rendementNet,
    cashflow: cashflowMensuel,
    niveauLoyer,
    fiabiliteLoyer,
  };
}

/**
 * Enregistre (ou met à jour) une annonce dans Supabase, résout sa commune,
 * calcule sa rentabilité et met à jour son analyse pour le profil donné.
 */
export async function processListing(
  listing: Listing,
  profile: SearchProfile,
): Promise<ResultatTraitement> {
  const empreinte = fingerprint(listing);
  const commune = await resoudreCommune(listing.ville, listing.code_postal);
  const codeInsee = commune?.codeInsee ?? null;
  const maintenant = new Date().toISOString();

  const { data: existantData, error: erreurRecherche } = await supabase
    .from("listings")
    .select("id, prix, code_insee")
    .eq("fingerprint", empreinte)
    .maybeSingle();

  if (erreurRecherche) {
    throw new Error(
      `Recherche du listing par empreinte échouée : ${erreurRecherche.message}`,
    );
  }

  const existant = existantData as ListingRow | null;

  let listingId: string;
  const nouveau = existant === null;

  if (existant) {
    listingId = existant.id;

    const { error: erreurMaj } = await supabase
      .from("listings")
      .update({ last_seen_at: maintenant, code_insee: codeInsee })
      .eq("id", listingId);

    if (erreurMaj) {
      throw new Error(`Mise à jour du listing échouée : ${erreurMaj.message}`);
    }

    // On ne touche à l'historique/prix que si la nouvelle alerte apporte un
    // prix connu et différent — on ne veut jamais écraser un prix connu par
    // un prix absent.
    if (listing.prix !== null && listing.prix !== existant.prix) {
      const { error: erreurHistorique } = await supabase
        .from("price_history")
        .insert({ listing_id: listingId, prix: listing.prix });

      if (erreurHistorique) {
        throw new Error(
          `Insertion price_history échouée : ${erreurHistorique.message}`,
        );
      }

      const { error: erreurPrix } = await supabase
        .from("listings")
        .update({ prix: listing.prix })
        .eq("id", listingId);

      if (erreurPrix) {
        throw new Error(`Mise à jour du prix échouée : ${erreurPrix.message}`);
      }
    }
  } else {
    const { data: insereData, error: erreurInsertion } = await supabase
      .from("listings")
      .insert({
        fingerprint: empreinte,
        code_insee: codeInsee,
        source: listing.source,
        external_id: listing.external_id,
        url: listing.url,
        titre: listing.titre,
        description: listing.description,
        prix: listing.prix,
        surface: listing.surface,
        pieces: listing.pieces,
        chambres: listing.chambres,
        type_bien: listing.type_bien,
        code_postal: listing.code_postal,
        ville: listing.ville,
        dpe: listing.dpe,
        meuble: listing.meuble,
        images: listing.images,
        first_seen_at: maintenant,
        last_seen_at: maintenant,
      })
      .select("id")
      .single();

    if (erreurInsertion || !insereData) {
      throw new Error(
        `Insertion du listing échouée : ${erreurInsertion?.message}`,
      );
    }

    listingId = (insereData as { id: string }).id;

    if (listing.prix !== null) {
      const { error: erreurHistorique } = await supabase
        .from("price_history")
        .insert({ listing_id: listingId, prix: listing.prix });

      if (erreurHistorique) {
        throw new Error(
          `Insertion price_history échouée : ${erreurHistorique.message}`,
        );
      }
    }
  }

  const resultatAnalyse = await calculerEtEnregistrerAnalyse(
    {
      listingId,
      prix: listing.prix,
      surface: listing.surface,
      typeBien: listing.type_bien,
      dpe: listing.dpe,
      codeInsee,
      codeDepartement: commune?.codeDepartement ?? null,
    },
    profile,
  );

  return { nouveau, ...resultatAnalyse };
}
