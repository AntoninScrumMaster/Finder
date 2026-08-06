module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[project]/src/analyse.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "analyserListings",
    ()=>analyserListings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$supabase$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/supabase.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$rentabilite$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/rentabilite.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$scoring$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/scoring.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/geo.ts [app-route] (ecmascript)");
;
;
;
;
/**
 * Analyse "à la volée" des listings déjà en base, selon les critères d'un
 * formulaire — AUCUN appel LLM, AUCUNE écriture en base. Réutilise
 * loyerM2/calculeRentabilite (rentabilite.ts) et les fonctions de scoring
 * (scoring.ts) telles quelles ; la seule règle métier ajoutée ici est la
 * majoration LMNP du loyer estimé (+12 %), qui n'existe pas dans le pipeline
 * d'ingestion.
 */ const MAJORATION_LMNP = 1.12;
/**
 * Une zone du formulaire est soit un code département ("21", "971"), soit un
 * nom de ville (comparaison normalisée, sous-chaîne dans les deux sens pour
 * tolérer "Dijon" vs "Dijon Centre" par ex.). Pas de traduction nom de
 * département -> code : les entrées "département" doivent être des codes.
 */ function correspondAUneZone(ville, departement, zone) {
    const zoneBrute = zone.trim();
    if (/^\d{2,3}$/.test(zoneBrute)) {
        return departement === zoneBrute;
    }
    if (!ville) return false;
    const villeNorm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normaliser"])(ville);
    const zoneNorm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normaliser"])(zoneBrute);
    return villeNorm.includes(zoneNorm) || zoneNorm.includes(villeNorm);
}
function correspondAUneListeDeZones(ville, departement, zones) {
    return zones.some((zone)=>correspondAUneZone(ville, departement, zone));
}
/** Construit le SearchProfile attendu par rentabilite.ts/scoring.ts à partir du formulaire. apport_pct est dérivé par bien (voir plus bas), donc absent ici. */ function profilSansApport(criteres) {
    return {
        id: "formulaire",
        nom: "Formulaire",
        actif: true,
        frais_notaire_pct: criteres.fraisNotairePct,
        travaux_defaut: criteres.travaux,
        taux_credit: criteres.tauxPct / 100,
        duree_credit_annees: criteres.dureeAnnees,
        vacance_pct: criteres.vacancePct,
        charges_non_recup_pct: criteres.chargesNonRecupPct,
        gestion_pct: criteres.gestionPct,
        taxe_fonciere_estimee: null,
        prix_max: criteres.prixMax,
        surface_min: criteres.surfaceMin,
        seuil_rendement_brut_min: criteres.seuilRendementBrutMin,
        seuil_rendement_net_min: criteres.seuilRendementNetMin,
        dpe_max: criteres.dpeMax
    };
}
async function analyserListings(criteres) {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$supabase$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabase"].from("listings").select("id, ville, prix, surface, pieces, chambres, type_bien, code_postal, code_insee, dpe, url, images, titre");
    if (error) {
        throw new Error(`Lecture des listings échouée : ${error.message}`);
    }
    const listings = data ?? [];
    const base = profilSansApport(criteres);
    const ok = [];
    const aVerifier = [];
    const ecartes = [];
    for (const listing of listings){
        // --- Filtres du formulaire, avant tout calcul ---
        if (criteres.typeBien !== "tous" && listing.type_bien !== criteres.typeBien) {
            continue;
        }
        if (criteres.prixMin !== null && (listing.prix ?? -Infinity) < criteres.prixMin) {
            continue;
        }
        if (criteres.prixMax !== null) {
            const plafond = criteres.inclureMargePrixMax ? criteres.prixMax * 1.05 : criteres.prixMax;
            if ((listing.prix ?? Infinity) > plafond) continue;
        }
        if (criteres.surfaceMin !== null && (listing.surface ?? -Infinity) < criteres.surfaceMin) {
            continue;
        }
        if (criteres.surfaceMax !== null && (listing.surface ?? Infinity) > criteres.surfaceMax) {
            continue;
        }
        if (criteres.piecesMin !== null && (listing.pieces ?? -Infinity) < criteres.piecesMin) {
            continue;
        }
        if (criteres.piecesMax !== null && (listing.pieces ?? Infinity) > criteres.piecesMax) {
            continue;
        }
        const departement = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["derivateDepartement"])(listing.code_insee, listing.code_postal);
        if (criteres.zonesExclure.length > 0 && correspondAUneListeDeZones(listing.ville, departement, criteres.zonesExclure)) {
            continue;
        }
        if (criteres.zonesInclure.length > 0 && !correspondAUneListeDeZones(listing.ville, departement, criteres.zonesInclure)) {
            continue;
        }
        // --- Profil de calcul : apport (€) converti en fraction pour CE bien,
        // puisque coutTotal (donc le poids réel de l'apport) dépend du prix. ---
        const coutTotalEstime = (listing.prix ?? 0) * (1 + base.frais_notaire_pct) + base.travaux_defaut;
        const apportPct = coutTotalEstime > 0 ? criteres.apport / coutTotalEstime : 0;
        const profile = {
            ...base,
            apport_pct: apportPct
        };
        // --- Rentabilité (rentabilite.ts, inchangé) ---
        let loyerMensuelEstime = null;
        let fiabiliteLoyer = null;
        let niveauLoyer = null;
        let prixM2 = null;
        let rendementBrut = null;
        let rendementNet = null;
        let cashflowMensuel = null;
        if (listing.prix !== null && listing.surface !== null) {
            prixM2 = listing.prix / listing.surface;
        }
        if (listing.code_insee && listing.prix !== null && listing.surface !== null) {
            const zone = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$rentabilite$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loyerM2"])(listing.code_insee, departement, listing.type_bien ?? "autre");
            if (zone) {
                fiabiliteLoyer = zone.fiabilite;
                niveauLoyer = zone.niveau;
                loyerMensuelEstime = listing.surface * zone.loyerM2;
                if (criteres.regime === "lmnp") {
                    loyerMensuelEstime *= MAJORATION_LMNP;
                }
                const metriques = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$rentabilite$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["calculeRentabilite"])(listing.prix, loyerMensuelEstime, listing.surface, profile);
                rendementBrut = metriques.rendementBrut;
                rendementNet = metriques.rendementNet;
                cashflowMensuel = metriques.cashflow;
            }
        }
        // --- Scoring hybride (scoring.ts, inchangé) ---
        const sousScores = {
            scoreCashflow: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$scoring$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["scoreCashflow"])(cashflowMensuel),
            scoreRendement: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$scoring$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["scoreRendement"])(rendementNet),
            scoreFiabilite: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$scoring$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["scoreFiabilite"])(niveauLoyer, fiabiliteLoyer),
            scoreDpe: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$scoring$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["scoreDpe"])(listing.dpe)
        };
        const { etat, raison } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$scoring$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["determinerEtat"])({
            cashflowMensuel,
            rendementBrut,
            rendementNet,
            prixM2,
            loyerCalculable: niveauLoyer !== null,
            prix: listing.prix,
            surface: listing.surface,
            dpe: listing.dpe
        }, profile);
        const bien = {
            listingId: listing.id,
            ville: listing.ville,
            prix: listing.prix,
            surface: listing.surface,
            typeBien: listing.type_bien,
            dpe: listing.dpe,
            url: listing.url,
            images: listing.images ?? [],
            titre: listing.titre,
            prixM2,
            rendementBrut,
            rendementNet,
            cashflowMensuel,
            sousScores,
            notes: {
                cashflow: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$scoring$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["noteFinale"])(sousScores, "cashflow"),
                rendement: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$scoring$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["noteFinale"])(sousScores, "rendement"),
                securite: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$scoring$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["noteFinale"])(sousScores, "securite")
            },
            etat,
            raison
        };
        if (etat === "ok") ok.push(bien);
        else if (etat === "a_verifier") aVerifier.push(bien);
        else ecartes.push({
            listingId: listing.id,
            ville: listing.ville,
            prix: listing.prix,
            raison
        });
    }
    ok.sort((a, b)=>b.notes[criteres.mode] - a.notes[criteres.mode]);
    return {
        ok,
        aVerifier,
        ecartes
    };
}
}),
"[project]/src/app/api/analyser/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$analyse$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/analyse.ts [app-route] (ecmascript)");
;
;
async function POST(request) {
    try {
        const criteres = await request.json();
        const resultat = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$analyse$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyserListings"])(criteres);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(resultat);
    } catch (error) {
        console.error("Erreur /api/analyser :", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error instanceof Error ? error.message : "Erreur inconnue"
        }, {
            status: 500
        });
    }
}
}),
"[project]/src/geo.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "derivateDepartement",
    ()=>derivateDepartement,
    "normaliser",
    ()=>normaliser,
    "resoudreCommune",
    ()=>resoudreCommune
]);
function normaliser(texte) {
    return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
async function resoudreCommune(ville, codePostal) {
    if (!codePostal) return null;
    try {
        const url = `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(codePostal)}&fields=code,nom,codeDepartement`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const communes = await response.json();
        if (!Array.isArray(communes) || communes.length === 0) return null;
        let choisie = communes[0];
        if (communes.length > 1 && ville) {
            const villeNormalisee = normaliser(ville);
            const correspondance = communes.find((commune)=>normaliser(commune.nom) === villeNormalisee);
            if (correspondance) choisie = correspondance;
        }
        return {
            codeInsee: choisie.code,
            nom: choisie.nom,
            codeDepartement: choisie.codeDepartement
        };
    } catch (error) {
        console.warn(`Echec de resolution de commune pour le code postal ${codePostal} :`, error instanceof Error ? error.message : error);
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
 */ function departementDepuisCodeInsee(codeInsee) {
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
 */ function departementDepuisCodePostal(codePostal) {
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
function derivateDepartement(codeInsee, codePostal) {
    if (codeInsee) return departementDepuisCodeInsee(codeInsee);
    if (codePostal) return departementDepuisCodePostal(codePostal);
    return null;
}
}),
"[project]/src/rentabilite.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculeRentabilite",
    ()=>calculeRentabilite,
    "loyerM2",
    ()=>loyerM2
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$supabase$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/supabase.ts [app-route] (ecmascript)");
;
async function loyerM2(codeInsee, codeDepartement, typeBien) {
    const { data: communeData, error: erreurCommune } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$supabase$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabase"].from("zone_loyers").select("loyer_m2_appartement, loyer_m2_maison, fiabilite").eq("code_insee", codeInsee).maybeSingle();
    if (erreurCommune) {
        console.warn(`⚠️  Erreur zone_loyers pour ${codeInsee} :`, erreurCommune.message);
    }
    const commune = communeData;
    if (commune && commune.fiabilite !== "faible") {
        const valeur = typeBien === "maison" ? commune.loyer_m2_maison : commune.loyer_m2_appartement;
        if (valeur !== null) {
            return {
                loyerM2: valeur,
                fiabilite: commune.fiabilite,
                niveau: "commune"
            };
        }
    }
    // Repli sur la moyenne départementale.
    if (!codeDepartement) return null;
    const { data: deptData, error: erreurDept } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$supabase$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabase"].from("zone_loyers_dept").select("loyer_m2_appartement, loyer_m2_maison").eq("code_departement", codeDepartement).maybeSingle();
    if (erreurDept) {
        console.warn(`⚠️  Erreur zone_loyers_dept pour ${codeDepartement} :`, erreurDept.message);
    }
    const dept = deptData;
    if (!dept) return null;
    const valeurDept = typeBien === "maison" ? dept.loyer_m2_maison : dept.loyer_m2_appartement;
    if (valeurDept === null) return null;
    return {
        loyerM2: valeurDept,
        fiabilite: "faible",
        niveau: "departement"
    };
}
/** Mensualité d'un crédit amortissable classique ; gère un taux nul. */ function mensualiteCredit(emprunte, tauxAnnuel, dureeAnnees) {
    const nbMensualites = dureeAnnees * 12;
    if (emprunte <= 0 || nbMensualites <= 0) return 0;
    if (tauxAnnuel === 0) {
        return emprunte / nbMensualites;
    }
    const tauxMensuel = tauxAnnuel / 12;
    return emprunte * tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -nbMensualites));
}
function calculeRentabilite(prix, loyerMensuel, surface, profile) {
    const coutTotal = prix * (1 + profile.frais_notaire_pct) + profile.travaux_defaut;
    const apport = coutTotal * profile.apport_pct;
    const emprunte = Math.max(0, coutTotal - apport);
    const mensualite = mensualiteCredit(emprunte, profile.taux_credit, profile.duree_credit_annees);
    const loyerAnnuel = loyerMensuel * 12;
    const rendementBrut = loyerAnnuel / prix * 100;
    const loyerNetAnnuel = loyerAnnuel * (1 - (profile.vacance_pct + profile.charges_non_recup_pct + profile.gestion_pct));
    const tf = profile.taxe_fonciere_estimee ?? loyerMensuel;
    const rendementNet = (loyerNetAnnuel - tf) / coutTotal * 100;
    const cashflow = loyerMensuel - mensualite - (tf / 12 + loyerAnnuel * (profile.charges_non_recup_pct + profile.gestion_pct) / 12);
    return {
        prixM2: prix / surface,
        rendementBrut,
        rendementNet,
        cashflow
    };
}
}),
"[project]/src/scoring.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "determinerEtat",
    ()=>determinerEtat,
    "indexDpe",
    ()=>indexDpe,
    "noteFinale",
    ()=>noteFinale,
    "scoreCashflow",
    ()=>scoreCashflow,
    "scoreDpe",
    ()=>scoreDpe,
    "scoreFiabilite",
    ()=>scoreFiabilite,
    "scoreRendement",
    ()=>scoreRendement
]);
const ORDRE_DPE = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G"
];
function indexDpe(valeur) {
    return ORDRE_DPE.indexOf(valeur);
}
function clamp(valeur, min, max) {
    return Math.min(max, Math.max(min, valeur));
}
/**
 * Vecteurs de poids (cashflow, rendement, fiabilité, dpe) par mode. Chaque
 * vecteur somme à 100, donc noteFinale() reste dans l'échelle 0-100 des
 * sous-scores.
 */ const POIDS = {
    cashflow: {
        scoreCashflow: 50,
        scoreRendement: 25,
        scoreFiabilite: 15,
        scoreDpe: 10
    },
    rendement: {
        scoreCashflow: 25,
        scoreRendement: 50,
        scoreFiabilite: 15,
        scoreDpe: 10
    },
    securite: {
        scoreCashflow: 20,
        scoreRendement: 15,
        scoreFiabilite: 40,
        scoreDpe: 25
    }
};
function scoreCashflow(cashflowMensuel) {
    if (cashflowMensuel === null) return 0;
    return clamp(50 + cashflowMensuel / 6, 0, 100);
}
function scoreRendement(rendementNet) {
    if (rendementNet === null) return 0;
    return clamp((rendementNet - 2) / 6 * 100, 0, 100);
}
function scoreFiabilite(niveauLoyer, fiabiliteLoyer) {
    if (niveauLoyer === "commune") {
        if (fiabiliteLoyer === "fiable") return 100;
        if (fiabiliteLoyer === "moyenne") return 70;
        return 45; // 'faible' ou valeur inattendue : traiter prudemment.
    }
    if (niveauLoyer === "departement") return 35;
    return 0;
}
const BAREME_DPE = {
    A: 100,
    B: 90,
    C: 80,
    D: 60,
    E: 40,
    F: 20,
    G: 0,
    NC: 50
};
function scoreDpe(dpe) {
    return BAREME_DPE[dpe] ?? 50;
}
function noteFinale(scores, mode) {
    const poids = POIDS[mode];
    return (poids.scoreCashflow * scores.scoreCashflow + poids.scoreRendement * scores.scoreRendement + poids.scoreFiabilite * scores.scoreFiabilite + poids.scoreDpe * scores.scoreDpe) / 100;
}
function determinerEtat(donnees, profile) {
    if (donnees.cashflowMensuel !== null && donnees.cashflowMensuel < -400) {
        return {
            etat: "ecarte",
            raison: `Cashflow mensuel (${donnees.cashflowMensuel.toFixed(0)} €) inférieur au plancher (-400 €)`
        };
    }
    if (profile.prix_max !== null && donnees.prix !== null && donnees.prix > profile.prix_max) {
        return {
            etat: "ecarte",
            raison: `Prix (${donnees.prix} €) supérieur au maximum (${profile.prix_max} €)`
        };
    }
    if (profile.surface_min !== null && donnees.surface !== null && donnees.surface < profile.surface_min) {
        return {
            etat: "ecarte",
            raison: `Surface (${donnees.surface} m²) inférieure au minimum (${profile.surface_min} m²)`
        };
    }
    if (profile.dpe_max !== null && donnees.dpe !== "NC" && indexDpe(donnees.dpe) > indexDpe(profile.dpe_max)) {
        return {
            etat: "ecarte",
            raison: `DPE (${donnees.dpe}) moins bon que le maximum autorisé (${profile.dpe_max})`
        };
    }
    if (profile.seuil_rendement_brut_min !== null && donnees.rendementBrut !== null && donnees.rendementBrut < profile.seuil_rendement_brut_min) {
        return {
            etat: "ecarte",
            raison: `Rendement brut (${donnees.rendementBrut.toFixed(2)} %) inférieur au seuil (${profile.seuil_rendement_brut_min} %)`
        };
    }
    if (profile.seuil_rendement_net_min !== null && donnees.rendementNet !== null && donnees.rendementNet < profile.seuil_rendement_net_min) {
        return {
            etat: "ecarte",
            raison: `Rendement net (${donnees.rendementNet.toFixed(2)} %) inférieur au seuil (${profile.seuil_rendement_net_min} %)`
        };
    }
    if (donnees.prixM2 !== null && donnees.prixM2 < 500) {
        return {
            etat: "a_verifier",
            raison: `Prix/m² (${donnees.prixM2.toFixed(0)} €/m²) anormalement bas — surface probablement erronée`
        };
    }
    if (donnees.rendementBrut !== null && donnees.rendementBrut > 20) {
        return {
            etat: "a_verifier",
            raison: `Rendement brut (${donnees.rendementBrut.toFixed(2)} %) anormalement élevé — données à vérifier`
        };
    }
    if (!donnees.loyerCalculable) {
        return {
            etat: "a_verifier",
            raison: "Loyer non calculable (aucune donnée de zone pour ce bien)"
        };
    }
    return {
        etat: "ok",
        raison: null
    };
}
}),
"[project]/src/supabase.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Variables Supabase manquantes : vérifie SUPABASE_URL et SUPABASE_SERVICE_KEY dans .env");
}
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        persistSession: false
    }
});
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__16edh5p._.js.map