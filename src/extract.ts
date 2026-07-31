import Anthropic from "@anthropic-ai/sdk";
import type { RawEmail } from "./imap.js";

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
  type_bien: "appartement" | "maison" | "immeuble" | "terrain" | "autre";
  code_postal: string | null;
  ville: string | null;
  dpe: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "NC";
  meuble: boolean | null;
  images: string[];
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
  "meuble": boolean | null,
  "images": string[]           // URLs des images trouvées, tableau vide si aucune
}

Règles impératives :
- Si une information est absente du mail, mets null (ou "NC" pour le DPE, ou un tableau vide pour images) — n'invente JAMAIS un prix ou une surface.
- Un mail peut contenir plusieurs annonces : renvoie-les toutes dans le tableau.
- Si le mail ne contient aucune annonce exploitable, renvoie un tableau vide [].`;

/**
 * Envoie le contenu d'un mail à Claude et renvoie le tableau d'annonces
 * extraites. Ne lève jamais : en cas d'échec de parsing JSON, affiche un
 * avertissement et renvoie un tableau vide.
 */
export async function extractListings(email: RawEmail): Promise<Listing[]> {
  const body = email.html ?? email.text ?? "";

  const userContent = [
    `De : ${email.from}`,
    `Sujet : ${email.subject}`,
    `Date : ${email.date?.toISOString() ?? "inconnue"}`,
    "",
    "Contenu du mail :",
    body,
  ].join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4000,
    thinking: { type: "disabled" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const rawText = textBlock?.text ?? "";

  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? (parsed as Listing[]) : [];
  } catch (error) {
    console.warn(
      `⚠️  Échec du parsing JSON pour le mail "${email.subject}" :`,
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
