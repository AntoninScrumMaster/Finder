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
(()=>{
    const e = new Error("Cannot find module './supabase.js'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module './rentabilite.js'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module './scoring.js'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module './geo.js'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
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
    const villeNorm = normaliser(ville);
    const zoneNorm = normaliser(zoneBrute);
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
    const { data, error } = await supabase.from("listings").select("id, ville, prix, surface, pieces, chambres, type_bien, code_postal, code_insee, dpe, url, images, titre");
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
        const departement = derivateDepartement(listing.code_insee, listing.code_postal);
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
            const zone = await loyerM2(listing.code_insee, departement, listing.type_bien ?? "autre");
            if (zone) {
                fiabiliteLoyer = zone.fiabilite;
                niveauLoyer = zone.niveau;
                loyerMensuelEstime = listing.surface * zone.loyerM2;
                if (criteres.regime === "lmnp") {
                    loyerMensuelEstime *= MAJORATION_LMNP;
                }
                const metriques = calculeRentabilite(listing.prix, loyerMensuelEstime, listing.surface, profile);
                rendementBrut = metriques.rendementBrut;
                rendementNet = metriques.rendementNet;
                cashflowMensuel = metriques.cashflow;
            }
        }
        // --- Scoring hybride (scoring.ts, inchangé) ---
        const sousScores = {
            scoreCashflow: scoreCashflow(cashflowMensuel),
            scoreRendement: scoreRendement(rendementNet),
            scoreFiabilite: scoreFiabilite(niveauLoyer, fiabiliteLoyer),
            scoreDpe: scoreDpe(listing.dpe)
        };
        const { etat, raison } = determinerEtat({
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
                cashflow: noteFinale(sousScores, "cashflow"),
                rendement: noteFinale(sousScores, "rendement"),
                securite: noteFinale(sousScores, "securite")
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
];

//# sourceMappingURL=%5Broot-of-the-server%5D__15-yt2p._.js.map