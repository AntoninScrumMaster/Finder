import { NextResponse } from "next/server";

/**
 * Ingestion (IMAP + extraction LLM) désactivée par défaut — réservée à
 * l'usage local (npm run dev avec NEXT_PUBLIC_ENABLE_INGEST=true, ou
 * npm run ingest en CLI). Sur Vercel, où seul le front est déployé, cette
 * route reste absente/désactivée : le flag est laissé à false, donc la
 * requête est rejetée AVANT tout import de src/index.ts (et donc de
 * imap.ts) — le code d'ingestion n'est jamais chargé ni exécuté en prod.
 */
const INGESTION_ACTIVEE = process.env.NEXT_PUBLIC_ENABLE_INGEST === "true";

export async function POST() {
  if (!INGESTION_ACTIVEE) {
    return NextResponse.json(
      { error: "Ingestion désactivée sur ce déploiement (NEXT_PUBLIC_ENABLE_INGEST n'est pas actif)." },
      { status: 404 },
    );
  }

  try {
    const { lancerIngestion } = await import("@/index");
    const recap = await lancerIngestion();
    return NextResponse.json(recap);
  } catch (error) {
    console.error("Erreur /api/rechercher :", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
