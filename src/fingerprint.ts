import { createHash } from "node:crypto";
import type { Listing } from "./extract";

/**
 * Calcule une empreinte SHA1 stable pour un bien immobilier, afin que deux
 * alertes différentes portant sur la même annonce produisent la même
 * empreinte (déduplication).
 *
 * Si `url` est présente (extraite de façon déterministe par urls.ts, pas par
 * Claude — voir associerUrlsAnnonces) :
 *   SHA1(source|url|code_postal|type_bien)
 *
 * Si `url` est absente (garde-fou de urls.ts déclenché pour ce mail, ou
 * source non couverte par l'extraction déterministe) :
 *   SHA1(source|prix|code_postal|type_bien)
 * Le prix sert de filet — moins précis qu'une url, mais bien plus stable
 * d'un appel Claude à l'autre que titre ou surface, volontairement exclus.
 */
export function fingerprint(listing: Listing): string {
  const composants =
    listing.url !== null
      ? [listing.source, listing.url, listing.code_postal ?? "", listing.type_bien]
      : [listing.source, listing.prix ?? "", listing.code_postal ?? "", listing.type_bien];

  return createHash("sha1").update(composants.join("|")).digest("hex");
}
