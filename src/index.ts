import "dotenv/config";
import { fetchRecentEmails } from "./imap.js";
import { extractListings, type Listing } from "./extract.js";
import { getProfile, processListing, type ResultatTraitement } from "./store.js";

/**
 * En dessous de ce seuil (€/m²), le prix/m² est presque toujours le signe
 * d'une surface mal extraite (terrain pris pour surface habitable, etc.).
 * Ce garde-fou est purement visuel : il n'affecte pas l'éligibilité stockée
 * en base, seulement l'affichage console.
 */
const SEUIL_PRIX_M2_PLAUSIBLE = 500;

function formatLigne(listing: Listing, resultat: ResultatTraitement): string {
  const surfaceSuspecte =
    resultat.prixM2 !== null && resultat.prixM2 < SEUIL_PRIX_M2_PLAUSIBLE;

  const alerte = surfaceSuspecte ? "⚠️ " : "   ";
  const statutNouveau = resultat.nouveau ? "🆕" : "↻ ";

  const ville = (listing.ville ?? "ville inconnue").padEnd(24);
  const prix =
    listing.prix !== null
      ? `${listing.prix.toLocaleString("fr-FR")} €`.padStart(10)
      : "prix inconnu".padStart(10);
  const prixM2 =
    resultat.prixM2 !== null
      ? `${resultat.prixM2.toFixed(0)} €/m²`.padStart(9)
      : "?/m²".padStart(9);

  const rendements =
    resultat.rendementBrut !== null && resultat.rendementNet !== null
      ? `${resultat.rendementBrut.toFixed(2)} % brut / ${resultat.rendementNet.toFixed(2)} % net`
      : "rendement inconnu";

  const cashflow =
    resultat.cashflow !== null
      ? `cashflow ${resultat.cashflow >= 0 ? "+" : ""}${resultat.cashflow.toFixed(0)} €/mois`
      : "cashflow inconnu";

  const zone = resultat.niveauLoyer
    ? `${resultat.niveauLoyer} (${resultat.fiabiliteLoyer ?? "?"})`
    : "zone inconnue";

  const verdict = resultat.eligible ? "✅" : `⛔ ${resultat.raison ?? "hors critères"}`;
  const mentionSurface = surfaceSuspecte ? " (surface à vérifier)" : "";

  return `    ${alerte}${statutNouveau} ${ville} — ${prix} — ${prixM2} — ${rendements} — ${cashflow} — ${zone} — ${verdict}${mentionSurface}`;
}

async function main() {
  console.log("📬 Connexion à la boîte IMAP et récupération des mails...");
  const emails = await fetchRecentEmails();
  console.log(`✅ ${emails.length} mail(s) récupéré(s).`);

  console.log("\n🔧 Chargement du profil de recherche...");
  const profile = await getProfile();
  console.log(`   Profil actif : "${profile.nom}"`);

  let total = 0;
  let nouvelles = 0;
  let eligibles = 0;
  let surfacesAVerifier = 0;

  for (const [index, email] of emails.entries()) {
    console.log(
      `\n[${index + 1}/${emails.length}] Extraction depuis "${email.subject}" (de ${email.from})...`,
    );
    const listings = await extractListings(email);
    console.log(`  → ${listings.length} annonce(s) extraite(s).`);

    for (const listing of listings) {
      total += 1;
      const resultat = await processListing(listing, profile);

      if (resultat.nouveau) nouvelles += 1;
      if (resultat.eligible) eligibles += 1;
      if (resultat.prixM2 !== null && resultat.prixM2 < SEUIL_PRIX_M2_PLAUSIBLE) {
        surfacesAVerifier += 1;
      }

      console.log(formatLigne(listing, resultat));
    }
  }

  console.log(
    `\n📦 Récap : ${total} annonce(s) au total, ${nouvelles} nouvelle(s), ${eligibles} éligible(s), ${surfacesAVerifier} surface(s) à vérifier.`,
  );
}

main().catch((error) => {
  console.error("❌ Erreur fatale :", error);
  process.exitCode = 1;
});
