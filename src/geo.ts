export interface Commune {
  codeInsee: string;
  nom: string;
  codeDepartement: string;
}

interface CommuneApi {
  code: string;
  nom: string;
  codeDepartement: string;
}

/** Normalise une chaine pour comparaison : sans accents, en minuscules. */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Resout un code postal (et eventuellement un nom de ville pour lever
 * l'ambiguite) en commune INSEE via l'API officielle geo.api.gouv.fr.
 * Renvoie null si le code postal est absent, si l'API ne repond rien, ou en
 * cas d'erreur reseau, cette fonction ne leve jamais.
 */
export async function resoudreCommune(
  ville: string | null,
  codePostal: string | null,
): Promise<Commune | null> {
  if (!codePostal) return null;

  try {
    const url = `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(
      codePostal,
    )}&fields=code,nom,codeDepartement`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const communes = (await response.json()) as CommuneApi[];
    if (!Array.isArray(communes) || communes.length === 0) return null;

    let choisie = communes[0];

    if (communes.length > 1 && ville) {
      const villeNormalisee = normaliser(ville);
      const correspondance = communes.find(
        (commune) => normaliser(commune.nom) === villeNormalisee,
      );
      if (correspondance) choisie = correspondance;
    }

    return {
      codeInsee: choisie.code,
      nom: choisie.nom,
      codeDepartement: choisie.codeDepartement,
    };
  } catch (error) {
    console.warn(
      `Echec de resolution de commune pour le code postal ${codePostal} :`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Derive le departement depuis un code INSEE commune (5 caracteres) : cas
 * particuliers geres explicitement plutot que de prendre aveuglement les 2
 * premiers caracteres.
 *
 * - Corse : geo.api.gouv.fr renvoie deja les codes commune modernes prefixes
 *   "2A"/"2B" (schema en vigueur depuis 1976) -> on les reprend tels quels.
 * - Ancien schema Corse numerique ("20xxx", pre-1976) : jamais renvoye par
 *   geo.api.gouv.fr, donc pas de table de correspondance ici -> on renvoie
 *   null plutot que de deviner a tort entre 2A et 2B.
 * - Outre-mer (971 Guadeloupe, 972 Martinique, 973 Guyane, 974 La Reunion,
 *   976 Mayotte) : departement sur 3 chiffres.
 * - France metropolitaine standard : 2 premiers caracteres.
 */
function departementDepuisCodeInsee(codeInsee: string): string | null {
  const code = codeInsee.trim().toUpperCase();
  if (code.length < 2) return null;

  if (code.startsWith("2A") || code.startsWith("2B")) {
    return code.slice(0, 2);
  }

  if (code.startsWith("97") && code.length >= 3) {
    return code.slice(0, 3);
  }

  if (code.startsWith("20") && /^\d+$/.test(code)) {
    return null;
  }

  return code.slice(0, 2);
}

/**
 * Derive le departement depuis un code postal (5 chiffres). Repli utilise
 * uniquement quand aucun code INSEE n'est disponible pour ce bien — moins
 * fiable qu'une derivation par code INSEE (un code postal peut chevaucher
 * plusieurs communes/departements en de rares cas), mais suffisant en dernier
 * recours.
 *
 * Corse : un code postal seul (ex. 20000-20620) ne permet pas de trancher
 * a coup sur entre 2A et 2B (la limite ne suit pas une coupure numerique
 * propre) -> repli sur "2A" par defaut plutot que null, en dernier recours.
 */
function departementDepuisCodePostal(codePostal: string): string | null {
  const cp = codePostal.trim();
  if (cp.length < 2) return null;

  if ((cp.startsWith("97") || cp.startsWith("98")) && cp.length >= 3) {
    return cp.slice(0, 3);
  }

  if (cp.startsWith("20")) {
    return "2A";
  }

  return cp.slice(0, 2);
}

/**
 * Derive le departement d'un bien pour le filtrage par zone et le repli
 * loyer/m2 departemental (rentabilite.ts::loyerM2) : prefere le code INSEE
 * (fiable) au code postal (repli uniquement si code_insee est absent).
 */
export function derivateDepartement(
  codeInsee: string | null,
  codePostal: string | null,
): string | null {
  if (codeInsee) return departementDepuisCodeInsee(codeInsee);
  if (codePostal) return departementDepuisCodePostal(codePostal);
  return null;
}
