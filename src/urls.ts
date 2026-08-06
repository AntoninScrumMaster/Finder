import type { Listing } from "./extract";

/**
 * Extrait, dans l'ordre d'apparition du HTML, les URLs de détail de chaque
 * annonce d'un mail SeLoger.
 *
 * Repose sur l'attribut `name="adprice..."` que SeLoger pose sur le lien
 * entourant le prix de chaque annonce : `name="adprice"` pour un mail à une
 * seule annonce, `name="adprice{position}_{total}"` pour un mail
 * multi-annonces (ex. "adprice3_7" = 3e annonce sur 7). Contrairement à
 * l'URL que Claude reproduit (peu fiable sur un jeton opaque de 140+
 * caractères), cette extraction est déterministe : même mail HTML → mêmes
 * URLs, à chaque appel.
 *
 * Ne couvre que les mails SeLoger pour l'instant — à étendre le jour où on
 * aura des exemples leboncoin/pap/bienici.
 */
export function extraireUrlsAnnonces(html: string): string[] {
  const re =
    /<a\s+href="(https:\/\/click\.by\.seloger\.com\/[^"]+)"[^>]*name="adprice(?:\d+_\d+)?"/gi;
  return [...html.matchAll(re)].map((m) => m[1]);
}

/**
 * Associe à chaque annonce extraite par Claude son URL déterministe, par
 * position d'apparition dans le mail.
 *
 * Garde-fou : si le nombre d'URLs trouvées dans le HTML ne correspond pas
 * exactement au nombre d'annonces extraites, on n'associe RIEN — `url` reste
 * `null` pour toutes les annonces de ce mail plutôt que de risquer une
 * association approximative par position (qui a déjà corrompu une ligne en
 * base par le passé).
 */
export function associerUrlsAnnonces(
  listings: Listing[],
  html: string | null,
  sujetMail: string,
): void {
  const urls = html ? extraireUrlsAnnonces(html) : [];

  if (urls.length !== listings.length) {
    console.warn(
      `⚠️  Correspondance urls/annonces impossible pour "${sujetMail}" : ${listings.length} annonce(s) vs ${urls.length} url(s) trouvée(s) — url laissée à null pour ce mail.`,
    );
    for (const listing of listings) {
      listing.url = null;
    }
    return;
  }

  listings.forEach((listing, i) => {
    listing.url = urls[i];
  });
}

/**
 * Extrait, par annonce, la ou les URLs de photo mms.seloger.com — la vraie
 * photo de l'annonce, pas le placeholder générique image.by.seloger.com.
 *
 * Découpe le HTML en blocs délimités par chaque marqueur `name="adprice..."`
 * (les images d'une annonce apparaissent toujours juste avant son marqueur
 * adprice/adimage). Dans chaque bloc, ne garde que les images
 * mms.seloger.com portant des paramètres de taille (`&h=`) — ce qui exclut
 * une éventuelle photo d'agent/profil, qui n'en a pas — puis déduplique par
 * chemin (la même photo apparaît en 2-3 tailles pour la compatibilité
 * multi-client email).
 */
export function extraireImagesAnnonces(html: string): string[][] {
  const marqueurs = [...html.matchAll(/name="adprice(?:\d+_\d+)?"/gi)].map((m) => m.index!);
  if (marqueurs.length === 0) return [];

  const blocs: string[] = [];
  let debut = 0;
  for (const fin of marqueurs) {
    blocs.push(html.slice(debut, fin));
    debut = fin;
  }

  return blocs.map((bloc) => {
    const brutes = [...bloc.matchAll(/https:\/\/mms\.seloger\.com\/[^"'\s)]+/gi)]
      .map((m) => m[0])
      .filter((url) => /[?&]h=\d+/.test(url));

    const dedupliquees: string[] = [];
    const basesVues = new Set<string>();
    for (const url of brutes) {
      const base = url.split("?")[0];
      if (!basesVues.has(base)) {
        basesVues.add(base);
        dedupliquees.push(url);
      }
    }
    return dedupliquees;
  });
}

/**
 * Associe à chaque annonce ses images déterministes, par position
 * d'apparition dans le mail. Même garde-fou que `associerUrlsAnnonces` : si
 * le nombre de blocs ne correspond pas au nombre d'annonces, on n'associe
 * rien — `images` reste `[]` pour tout le mail plutôt que d'associer au
 * hasard.
 */
export function associerImagesAnnonces(
  listings: Listing[],
  html: string | null,
  sujetMail: string,
): void {
  const images = html ? extraireImagesAnnonces(html) : [];

  if (images.length !== listings.length) {
    console.warn(
      `⚠️  Correspondance images/annonces impossible pour "${sujetMail}" : ${listings.length} annonce(s) vs ${images.length} bloc(s) trouvé(s) — images laissées à [] pour ce mail.`,
    );
    for (const listing of listings) {
      listing.images = [];
    }
    return;
  }

  listings.forEach((listing, i) => {
    listing.images = images[i];
  });
}
