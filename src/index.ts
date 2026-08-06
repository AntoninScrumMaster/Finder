import "dotenv/config";
import { pathToFileURL } from "node:url";
import { fetchRecentEmails } from "./imap";
import { extractListings } from "./extract";
import {
  getProfile,
  processListing,
  trouverConnusParUrl,
  marquerVus,
  listerAVerifier,
  type ResultatTraitement,
} from "./store";
import { associerUrlsAnnonces, associerImagesAnnonces, extraireUrlsAnnonces } from "./urls";
import { classerBiensOk, genererVerdict } from "./verdict";
import type { Mode } from "./scoring";
import type { RecapRecherche } from "./types-front";

/** Mode de scoring affiché par défaut après ingestion (CLI uniquement). */
const MODE_PAR_DEFAUT: Mode = "cashflow";

/**
 * En dessous de ce seuil (€/m²), le prix/m² est presque toujours le signe
 * d'une surface mal extraite (terrain pris pour surface habitable, etc.).
 * Ce garde-fou est purement visuel : il n'affecte pas l'éligibilité stockée
 * en base, seulement l'affichage console.
 */
const SEUIL_PRIX_M2_PLAUSIBLE = 500;

/** Tarif intro Sonnet 5, en $ par million de tokens (jusqu'au 2026-08-31). */
const PRIX_INPUT_PAR_MTOK = 2;
const PRIX_OUTPUT_PAR_MTOK = 10;

function formatLigne(
  bien: { ville: string | null; prix: number | null },
  resultat: ResultatTraitement,
  viaLLM: boolean,
): string {
  const surfaceSuspecte =
    resultat.prixM2 !== null && resultat.prixM2 < SEUIL_PRIX_M2_PLAUSIBLE;

  const alerte = surfaceSuspecte ? "⚠️ " : "   ";
  const statutNouveau = resultat.nouveau ? "🆕" : "↻ ";

  const ville = (bien.ville ?? "ville inconnue").padEnd(24);
  const prix =
    bien.prix !== null
      ? `${bien.prix.toLocaleString("fr-FR")} €`.padStart(10)
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
  const mentionLLM = viaLLM ? "" : " [LLM ignoré]";

  return `    ${alerte}${statutNouveau} ${ville} — ${prix} — ${prixM2} — ${rendements} — ${cashflow} — ${zone} — ${verdict}${mentionSurface}${mentionLLM}`;
}

/**
 * Lance le pipeline d'ingestion complet : lecture IMAP, pré-filtrage par
 * URL (sans LLM), extraction Claude pour les mails contenant au moins une
 * annonce inconnue, dédup + rentabilité + scoring (store.ts). Réutilisé par
 * le CLI (main() ci-dessous) et par /api/rechercher — même code, pas de
 * pipeline dupliqué.
 */
export async function lancerIngestion(): Promise<RecapRecherche> {
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
  let appelsLLM = 0;
  let mailsIgnores = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const [index, email] of emails.entries()) {
    console.log(
      `\n[${index + 1}/${emails.length}] "${email.subject}" (de ${email.from})...`,
    );

    // Pré-filtrage sans LLM : si toutes les URLs de ce mail sont déjà
    // connues en base, pas besoin de renvoyer le mail au LLM du tout.
    const urls = email.html ? extraireUrlsAnnonces(email.html) : [];
    const connus = urls.length > 0 ? await trouverConnusParUrl(urls, profile.id) : new Map();

    if (urls.length > 0 && connus.size === urls.length) {
      mailsIgnores += 1;
      console.log(`  → ${urls.length} annonce(s) déjà connue(s), LLM ignoré.`);

      await marquerVus(urls.map((u) => connus.get(u)!.listingId));

      for (const url of urls) {
        const c = connus.get(url)!;
        total += 1;
        if (c.resultat.eligible) eligibles += 1;
        if (c.resultat.prixM2 !== null && c.resultat.prixM2 < SEUIL_PRIX_M2_PLAUSIBLE) {
          surfacesAVerifier += 1;
        }
        console.log(formatLigne({ ville: c.ville, prix: c.prix }, c.resultat, false));
      }
      continue;
    }

    const { listings, usage } = await extractListings(email);
    appelsLLM += 1;
    totalInputTokens += usage.inputTokens;
    totalOutputTokens += usage.outputTokens;
    console.log(`  → ${listings.length} annonce(s) extraite(s).`);

    associerUrlsAnnonces(listings, email.html, email.subject);
    associerImagesAnnonces(listings, email.html, email.subject);

    for (const listing of listings) {
      total += 1;
      const resultat = await processListing(listing, profile);

      if (resultat.nouveau) nouvelles += 1;
      if (resultat.eligible) eligibles += 1;
      if (resultat.prixM2 !== null && resultat.prixM2 < SEUIL_PRIX_M2_PLAUSIBLE) {
        surfacesAVerifier += 1;
      }

      console.log(formatLigne(listing, resultat, true));
    }
  }

  const coutEstime =
    (totalInputTokens / 1_000_000) * PRIX_INPUT_PAR_MTOK +
    (totalOutputTokens / 1_000_000) * PRIX_OUTPUT_PAR_MTOK;

  console.log(
    `\n📦 Récap : ${total} annonce(s) au total, ${nouvelles} nouvelle(s), ${eligibles} éligible(s), ${surfacesAVerifier} surface(s) à vérifier.`,
  );
  console.log(
    `🔢 LLM : ${appelsLLM} appel(s) (${mailsIgnores} mail(s) ignoré(s) sans appel) — ` +
      `${totalInputTokens} tokens entrée + ${totalOutputTokens} tokens sortie — ` +
      `coût estimé $${coutEstime.toFixed(4)} (tarif intro Sonnet 5 : $${PRIX_INPUT_PAR_MTOK}/$${PRIX_OUTPUT_PAR_MTOK} par MTok, jusqu'au 2026-08-31).`,
  );

  return {
    totalAnnonces: total,
    nouvellesAnnonces: nouvelles,
    mailsAnalyses: emails.length - mailsIgnores,
    mailsIgnores,
    appelsLLM,
    tokensEntree: totalInputTokens,
    tokensSortie: totalOutputTokens,
    coutEstime,
    dateRecherche: new Date().toISOString(),
  };
}

async function main() {
  await lancerIngestion();

  // --- Scoring hybride : classement, biens à vérifier, verdict rédigé ---
  const profile = await getProfile();

  console.log(`\n🏆 Classement (mode "${MODE_PAR_DEFAUT}") — biens à l'état "ok" :`);
  const classement = await classerBiensOk(MODE_PAR_DEFAUT, profile.id);
  if (classement.length === 0) {
    console.log("   Aucun bien à l'état 'ok'.");
  } else {
    classement.forEach((bien, i) => {
      const ville = (bien.ville ?? "ville inconnue").padEnd(24);
      const prix =
        bien.prix !== null
          ? `${bien.prix.toLocaleString("fr-FR")} €`.padStart(10)
          : "prix inconnu".padStart(10);
      const cashflow =
        bien.cashflowMensuel !== null
          ? `cashflow ${bien.cashflowMensuel >= 0 ? "+" : ""}${bien.cashflowMensuel.toFixed(0)} €/mois`
          : "cashflow inconnu";
      const rendement =
        bien.rendementBrut !== null ? `${bien.rendementBrut.toFixed(2)} % brut` : "rendement inconnu";
      console.log(
        `   ${String(i + 1).padStart(2)}. note ${bien.note.toFixed(1).padStart(5)}/100 — ${ville} — ${prix} — ${cashflow} — ${rendement}`,
      );
    });
  }

  console.log(`\n⚠️  Biens à l'état "à vérifier" :`);
  const aVerifier = await listerAVerifier(profile.id);
  if (aVerifier.length === 0) {
    console.log("   Aucun.");
  } else {
    for (const bien of aVerifier) {
      const ville = (bien.ville ?? "ville inconnue").padEnd(24);
      const prix = bien.prix !== null ? `${bien.prix.toLocaleString("fr-FR")} €` : "prix inconnu";
      console.log(`   ${ville} — ${prix} — ${bien.raison ?? "raison inconnue"}`);
    }
  }

  console.log(`\n🧭 Verdict Claude (mode "${MODE_PAR_DEFAUT}") :\n`);
  const verdict = await genererVerdict(MODE_PAR_DEFAUT);
  console.log(verdict);
}

// Ne lance main() que si ce fichier est exécuté directement (npm run ingest),
// jamais quand il est importé par une route API (lancerIngestion()) — sinon
// l'import déclencherait tout le pipeline CLI comme effet de bord.
const executeDirectement =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (executeDirectement) {
  main().catch((error) => {
    console.error("❌ Erreur fatale :", error);
    process.exitCode = 1;
  });
}
