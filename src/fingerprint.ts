import { createHash } from "node:crypto";
import type { Listing } from "./extract.js";

/**
 * Calcule une empreinte SHA1 stable pour un bien immobilier, afin que deux
 * alertes différentes portant sur la même annonce produisent la même
 * empreinte (déduplication).
 *
 * Basée sur : source + (external_id si présent, sinon url) + code_postal +
 * type_bien. Volontairement SANS surface ni pieces, qui varient d'un appel
 * Claude à l'autre sur le même mail.
 *
 * `code_postal` et `type_bien` sont là comme garde-fou : si Claude confond
 * l'url de deux annonces différentes d'un même mail (observé en pratique —
 * l'extraction n'est pas parfaitement déterministe), le code postal et le
 * type de bien diffèrent presque toujours entre deux biens distincts, ce
 * qui évite qu'une annonce en écrase une autre en base par erreur.
 *
 * Si `external_id` et `url` sont tous les deux absents, l'empreinte ne
 * repose plus que sur source + code_postal + type_bien : deux annonces
 * distinctes de même type dans la même commune finiraient avec la même
 * empreinte (collision). Ce cas n'est pas géré spécifiquement pour
 * l'instant.
 */
export function fingerprint(listing: Listing): string {
  const identifiant = listing.external_id ?? listing.url ?? "";

  const composants = [
    listing.source,
    identifiant,
    listing.code_postal ?? "",
    listing.type_bien,
  ];

  return createHash("sha1").update(composants.join("|")).digest("hex");
}
