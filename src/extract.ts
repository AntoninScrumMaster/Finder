import Anthropic from "@anthropic-ai/sdk";
import type { RawEmail } from "./imap";

export interface Listing {
  source: "leboncoin" | "seloger" | "pap" | "bienici" | "autre";
  external_id: string | null;
  url: string | null;
  titre: string | null;
  description: string | null;
  prix: number | null;
  surface: number | null;
  pieces: number | null;
  chambres: number | null;
  // "autre" sert aussi de repli pour les biens atypiques/inclassables (ex.
  // hôtel particulier) : sur ce genre de bien, le LLM peut classer
  // différemment d'un appel à l'autre (observé en validation : "autre" vs
  // "immeuble" pour le même hôtel particulier, "maison" vs "autre" pour un
  // autre bien). Non bloquant — 2 cas sur 31 en validation, écart cantonné à
  // ce champ (surface/pieces/chambres/dpe/prix identiques dans les deux
  // modes) — mais garder en tête que ça peut faire diverger le fingerprint
  // (qui inclut type_bien) et le choix loyer_m2_maison/appartement dans
  // rentabilite.ts pour ces biens précis.
  type_bien: "appartement" | "maison" | "immeuble" | "terrain" | "autre";
  code_postal: string | null;
  ville: string | null;
  dpe: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "NC";
  meuble: boolean | null;
  images: string[];
}

export interface UsageExtraction {
  inputTokens: number;
  outputTokens: number;
}

export interface ResultatExtraction {
  listings: Listing[];
  usage: UsageExtraction;
}

const client = new Anthropic();

const SYSTEM_PROMPT = `Tu es un extracteur d'annonces immobilières. On te donne le contenu d'un email d'alerte immobilière (leboncoin, SeLoger, PAP, BienIci, ou autre). Ce mail peut contenir une ou plusieurs annonces.

Renvoie UNIQUEMENT un tableau JSON pur (pas de texte avant/après, pas de balises markdown \`\`\`json). Chaque élément du tableau représente une annonce et doit respecter exactement ce schéma :

{
  "source": "leboncoin" | "seloger" | "pap" | "bienici" | "autre",
  "external_id": string | null,
  "url": string | null,
  "titre": string | null,
  "description": string | null,
  "prix": number | null,       // en euros, nombre pur sans symbole
  "surface": number | null,    // en m², nombre pur
  "pieces": number | null,
  "chambres": number | null,
  "type_bien": "appartement" | "maison" | "immeuble" | "terrain" | "autre",
  "code_postal": string | null,
  "ville": string | null,
  "dpe": "A" | "B" | "C" | "D" | "E" | "F" | "G" | "NC",
  "meuble": boolean | null
}

Règles impératives :
- Si une information est absente du mail, mets null (ou "NC" pour le DPE) — n'invente JAMAIS un prix ou une surface.
- Un mail peut contenir plusieurs annonces : renvoie-les toutes dans le tableau.
- Si le mail ne contient aucune annonce exploitable, renvoie un tableau vide [].`;

/**
 * Nettoie le texte brut (déjà dé-taggé par mailparser) : retire les lignes
 * qui ne sont qu'une URL (les liens de tracking ne servent plus au LLM,
 * l'URL de chaque annonce est désormais extraite déterministiquement par
 * urls.ts) et les lignes vides.
 */
export function nettoyerTexte(text: string): string {
  return text
    .split("\n")
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne.length > 0 && !/^https?:\/\//i.test(ligne))
    .join("\n")
    .replace(/\n{2,}/g, "\n");
}

/**
 * Nettoie le HTML brut : retire <style>/<script>/commentaires, préserve le
 * texte des attributs alt (une info comme le DPE peut n'exister que là, sous
 * forme de badge image), convertit les séparateurs de bloc (tr/td/table/p/li
 * fermants, <br>) en sauts de ligne, puis retire toutes les balises et leurs
 * attributs restants (dont les href — l'URL de chaque annonce est désormais
 * extraite déterministiquement par urls.ts, plus besoin de la donner au LLM).
 */
export function nettoyerHtml(html: string): string {
  let s = html;
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, " $1 ");
  s = s.replace(/<\/(tr|td|table|div|p|li)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&middot;/gi, "·")
    .replace(/&rarr;/gi, "→")
    .replace(/&eacute;/gi, "é")
    .replace(/&egrave;/gi, "è")
    .replace(/&agrave;/gi, "à")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&amp;/gi, "&");

  return s
    .split("\n")
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne.length > 0)
    .join("\n")
    .replace(/\n{2,}/g, "\n");
}

/**
 * Envoie un contenu déjà préparé (texte ou HTML nettoyé) à Claude et renvoie
 * le tableau d'annonces extraites ainsi que l'usage de tokens de l'appel. Ne
 * lève jamais : en cas d'échec de parsing JSON, affiche un avertissement et
 * renvoie un tableau vide. `images` est toujours initialisé à [] ici — c'est
 * urls.ts (associerImagesAnnonces) qui le remplit de façon déterministe.
 */
export async function extraireDepuisContenu(
  contenu: string,
  meta: { from: string; subject: string; date: Date | null },
): Promise<ResultatExtraction> {
  const userContent = [
    `De : ${meta.from}`,
    `Sujet : ${meta.subject}`,
    `Date : ${meta.date?.toISOString() ?? "inconnue"}`,
    "",
    "Contenu du mail :",
    contenu,
  ].join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4000,
    thinking: { type: "disabled" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const usage: UsageExtraction = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };

  const textBlock = response.content.find((block) => block.type === "text");
  const rawText = textBlock?.text ?? "";

  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    const listings = Array.isArray(parsed)
      ? (parsed as Array<Omit<Listing, "images">>).map((l) => ({ ...l, images: [] as string[] }))
      : [];
    return { listings, usage };
  } catch (error) {
    console.warn(
      `⚠️  Échec du parsing JSON pour le mail "${meta.subject}" :`,
      error instanceof Error ? error.message : error,
    );
    return { listings: [], usage };
  }
}

/**
 * Envoie le contenu d'un mail à Claude et renvoie les annonces extraites +
 * l'usage de tokens.
 *
 * Privilégie `email.text` nettoyé (moins cher) — validé par comparaison A/B
 * contre du HTML nettoyé sur 31 annonces réelles × 6 champs sensibles
 * (surface, pieces, chambres, dpe, type_bien, prix) : 0 écart, et ~3% de
 * tokens d'entrée en moins. Repli sur le HTML nettoyé si `text` est absent.
 */
export async function extractListings(email: RawEmail): Promise<ResultatExtraction> {
  const contenu = email.text
    ? nettoyerTexte(email.text)
    : email.html
      ? nettoyerHtml(email.html)
      : "";
  return extraireDepuisContenu(contenu, email);
}
