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
function normaliser(texte: string): string {
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
