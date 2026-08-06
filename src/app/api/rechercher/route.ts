import { NextResponse } from "next/server";
import { lancerIngestion } from "@/index";

/**
 * Seule route qui déclenche le pipeline d'ingestion (IMAP + extraction LLM).
 * Coûteuse par nature — jamais appelée automatiquement, uniquement sur clic
 * explicite du bouton "Rechercher de nouvelles annonces".
 */
export async function POST() {
  try {
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
