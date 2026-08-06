import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "./supabase";
import { getProfile } from "./store";
import { noteFinale, type Mode, type SousScores } from "./scoring";

const client = new Anthropic();

export interface BienOk {
  listingId: string;
  ville: string | null;
  prix: number | null;
  surface: number | null;
  typeBien: string | null;
  prixM2: number | null;
  rendementBrut: number | null;
  rendementNet: number | null;
  cashflowMensuel: number | null;
  sousScores: SousScores;
  note: number;
}

interface AnalyseAvecListingRow {
  listing_id: string;
  prix_m2: number | null;
  rendement_brut: number | null;
  rendement_net: number | null;
  cashflow_mensuel: number | null;
  score_cashflow: number;
  score_rendement: number;
  score_fiabilite: number;
  score_dpe: number;
  listings: {
    ville: string | null;
    prix: number | null;
    surface: number | null;
    type_bien: string | null;
  } | null;
}

/**
 * Classe les biens à l'état 'ok' d'un profil pour un mode de scoring donné,
 * du meilleur au moins bon. Ne fait aucun appel LLM — pure lecture Supabase
 * + calcul de noteFinale() à partir des sous-scores déjà stockés par
 * store.ts::processListing.
 */
export async function classerBiensOk(mode: Mode, profileId: string): Promise<BienOk[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select(
      "listing_id, prix_m2, rendement_brut, rendement_net, cashflow_mensuel, score_cashflow, score_rendement, score_fiabilite, score_dpe, listings(ville, prix, surface, type_bien)",
    )
    .eq("profile_id", profileId)
    .eq("etat", "ok");

  if (error) {
    throw new Error(`Lecture des analyses 'ok' échouée : ${error.message}`);
  }

  const lignes = (data ?? []) as unknown as AnalyseAvecListingRow[];

  const biens: BienOk[] = lignes.map((ligne) => {
    const sousScores: SousScores = {
      scoreCashflow: ligne.score_cashflow,
      scoreRendement: ligne.score_rendement,
      scoreFiabilite: ligne.score_fiabilite,
      scoreDpe: ligne.score_dpe,
    };
    return {
      listingId: ligne.listing_id,
      ville: ligne.listings?.ville ?? null,
      prix: ligne.listings?.prix ?? null,
      surface: ligne.listings?.surface ?? null,
      typeBien: ligne.listings?.type_bien ?? null,
      prixM2: ligne.prix_m2,
      rendementBrut: ligne.rendement_brut,
      rendementNet: ligne.rendement_net,
      cashflowMensuel: ligne.cashflow_mensuel,
      sousScores,
      note: noteFinale(sousScores, mode),
    };
  });

  biens.sort((a, b) => b.note - a.note);
  return biens;
}

const SYSTEM_PROMPT = (nb: number, mode: Mode) => `Tu es un conseiller en investissement locatif. On te donne le top ${nb} des biens immobiliers les mieux notés pour le mode de scoring "${mode}", avec leurs métriques et sous-scores (0-100, 100 = excellent).

Rédige un verdict comparatif en français, structuré ainsi :
- Une recommandation claire : quel bien privilégier et pourquoi.
- Pour chaque bien, 2 à 3 points forts et 2 à 3 points faibles, basés strictement sur les chiffres fournis.

Reste factuel, appuie-toi uniquement sur les métriques données — n'invente aucune donnée absente et ne suppose rien sur des aspects non fournis (état du bien, quartier, etc.).`;

/**
 * Demande à Claude un verdict comparatif rédigé sur une liste de biens déjà
 * classée (top n) — indépendant de la source des biens (lecture DB via
 * classerBiensOk pour le CLI, ou calcul à la volée via analyse.ts pour l'API
 * /api/verdict). Seule fonction de ce module qui appelle le LLM.
 */
export async function redigerVerdict(biens: BienOk[], mode: Mode): Promise<string> {
  if (biens.length === 0) {
    return "Aucun bien à l'état 'ok' pour le moment — pas de verdict à établir.";
  }

  const donneesPourLLM = biens.map((b, i) => ({
    rang: i + 1,
    ville: b.ville,
    prix: b.prix,
    surface: b.surface,
    type_bien: b.typeBien,
    prix_m2: b.prixM2,
    rendement_brut: b.rendementBrut,
    rendement_net: b.rendementNet,
    cashflow_mensuel: b.cashflowMensuel,
    sous_scores: b.sousScores,
    note_finale: Math.round(b.note * 10) / 10,
  }));

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2000,
    thinking: { type: "disabled" },
    system: SYSTEM_PROMPT(biens.length, mode),
    messages: [
      {
        role: "user",
        content: `Mode de scoring : ${mode}\n\nBiens (JSON) :\n${JSON.stringify(donneesPourLLM, null, 2)}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}

/**
 * Sélectionne le top n des biens 'ok' pour un mode de scoring depuis la
 * base (dernière analyse stockée par le pipeline d'ingestion), puis rédige
 * le verdict. Utilisé par le CLI (src/index.ts).
 */
export async function genererVerdict(mode: Mode, n = 3): Promise<string> {
  const profile = await getProfile();
  const classement = await classerBiensOk(mode, profile.id);
  return redigerVerdict(classement.slice(0, n), mode);
}
