import "dotenv/config";
import { fetchRecentEmails } from "./imap.js";
import { extractListings, type Listing } from "./extract.js";

async function main() {
  console.log("📬 Connexion à la boîte IMAP et récupération des mails...");
  const emails = await fetchRecentEmails();
  console.log(`✅ ${emails.length} mail(s) récupéré(s).`);

  const allListings: Listing[] = [];

  for (const [index, email] of emails.entries()) {
    console.log(
      `\n[${index + 1}/${emails.length}] Extraction depuis "${email.subject}" (de ${email.from})...`,
    );
    const listings = await extractListings(email);
    console.log(`  → ${listings.length} annonce(s) extraite(s).`);
    allListings.push(...listings);
  }

  console.log(
    `\n📦 Total : ${allListings.length} annonce(s) extraite(s) sur ${emails.length} mail(s).\n`,
  );
  console.log(JSON.stringify(allListings, null, 2));
}

main().catch((error) => {
  console.error("❌ Erreur fatale :", error);
  process.exitCode = 1;
});
