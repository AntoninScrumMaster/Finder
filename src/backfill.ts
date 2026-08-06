import "dotenv/config";
import { supabase } from "./supabase";
import { getProfile, calculerEtEnregistrerAnalyse } from "./store";
import { resoudreCommune, derivateDepartement } from "./geo";
import type { Listing } from "./extract";

/**
 * Utilitaire ponctuel : recalcule rentabilité + scoring hybride (sous-scores
 * + etat) pour tous les listings déjà en base, sans passer par le LLM.
 *
 * À exécuter quand des lignes `analyses` existent sans `etat` (ex. écrites
 * avant l'ajout du scoring, ou par un pré-filtrage qui saute
 * processListing). Idempotent : upsert sur (listing_id, profile_id), donc
 * relançable sans créer de doublon.
 *
 *   npx tsx src/backfill.ts
 */

interface ListingPourBackfill {
  id: string;
  prix: number | null;
  surface: number | null;
  type_bien: Listing["type_bien"];
  dpe: string;
  code_insee: string | null;
  ville: string | null;
  code_postal: string | null;
}

async function main() {
  const profile = await getProfile();
  console.log(`🔧 Profil actif : "${profile.nom}"\n`);

  const { data, error } = await supabase
    .from("listings")
    .select("id, prix, surface, type_bien, dpe, code_insee, ville, code_postal");

  if (error) {
    throw new Error(`Lecture des listings échouée : ${error.message}`);
  }

  const listings = (data ?? []) as ListingPourBackfill[];
  console.log(`${listings.length} listing(s) à traiter.\n`);

  let appelsGeo = 0;

  for (const [i, listing] of listings.entries()) {
    let codeInsee = listing.code_insee;
    let codeDepartement: string | null = null;

    if (codeInsee) {
      // Code déjà connu — pas de nouvel appel geo.api.gouv.fr, on dérive le
      // département localement (Corse/DOM-TOM gérés par derivateDepartement).
      codeDepartement = derivateDepartement(codeInsee, listing.code_postal);
    } else {
      // Code manquant : résolution complète nécessaire (seul cas où ce
      // script appelle geo.api.gouv.fr).
      appelsGeo += 1;
      const commune = await resoudreCommune(listing.ville, listing.code_postal);
      codeInsee = commune?.codeInsee ?? null;
      codeDepartement = commune?.codeDepartement ?? null;

      if (codeInsee) {
        const { error: erreurMaj } = await supabase
          .from("listings")
          .update({ code_insee: codeInsee })
          .eq("id", listing.id);
        if (erreurMaj) {
          console.warn(
            `⚠️  Mise à jour code_insee échouée pour ${listing.id} : ${erreurMaj.message}`,
          );
        }
      }
    }

    const resultat = await calculerEtEnregistrerAnalyse(
      {
        listingId: listing.id,
        prix: listing.prix,
        surface: listing.surface,
        typeBien: listing.type_bien,
        dpe: listing.dpe,
        codeInsee,
        codeDepartement,
      },
      profile,
    );

    const rendement =
      resultat.rendementBrut !== null ? `${resultat.rendementBrut.toFixed(2)} % brut` : "rendement inconnu";
    const statut = resultat.eligible ? "✅" : `⛔ ${resultat.raison ?? "écarté"}`;

    console.log(
      `[${i + 1}/${listings.length}] ${(listing.ville ?? "?").padEnd(24)} — ${rendement} — ${statut}`,
    );
  }

  console.log(
    `\n✅ ${listings.length} listing(s) recalculé(s), ${appelsGeo} appel(s) geo.api.gouv.fr (0 appel LLM).`,
  );
}

main().catch((error) => {
  console.error("❌ Erreur fatale :", error);
  process.exitCode = 1;
});
