import { NextResponse } from "next/server";
import { redigerVerdict, type BienOk } from "@/verdict";
import type { BienAnalyse } from "@/types-front";
import type { Mode } from "@/scoring";

interface CorpsVerdict {
  biens: BienAnalyse[];
  mode: Mode;
}

/** Coût LLM volontairement plafonné : jamais plus de 5 biens dans un verdict. */
const N_MAX = 5;

/**
 * Coût LLM explicite et isolé : rédige un verdict comparatif sur le top N
 * (déjà calculé et classé côté client par /api/analyser) — jamais déclenché
 * par un simple changement de critères ou de mode.
 */
export async function POST(request: Request) {
  try {
    const { biens, mode } = (await request.json()) as CorpsVerdict;

    const top: BienOk[] = biens.slice(0, N_MAX).map((b) => ({
      listingId: b.listingId,
      ville: b.ville,
      prix: b.prix,
      surface: b.surface,
      typeBien: b.typeBien,
      prixM2: b.prixM2,
      rendementBrut: b.rendementBrut,
      rendementNet: b.rendementNet,
      cashflowMensuel: b.cashflowMensuel,
      sousScores: b.sousScores,
      note: b.notes[mode],
    }));

    const verdict = await redigerVerdict(top, mode);
    return NextResponse.json({ verdict });
  } catch (error) {
    console.error("Erreur /api/verdict :", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
