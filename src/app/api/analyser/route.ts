import { NextResponse } from "next/server";
import { analyserListings } from "@/analyse";
import type { CriteresFormulaire } from "@/types-front";

/**
 * Analyse à la volée des listings déjà en base — zéro appel LLM, zéro
 * écriture en base. Appelée à chaque changement de critères ou clic sur
 * "Analyser".
 */
export async function POST(request: Request) {
  try {
    const criteres = (await request.json()) as CriteresFormulaire;
    const resultat = await analyserListings(criteres);
    return NextResponse.json(resultat);
  } catch (error) {
    console.error("Erreur /api/analyser :", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
