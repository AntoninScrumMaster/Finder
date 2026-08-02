import type { Listing } from "./extract.js";

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
