import type { ResultatAnalyse } from "@/types-front";
import type { Mode } from "@/scoring";
import CarteAnnonce from "@/components/CarteAnnonce";
import SectionAVerifier from "@/components/SectionAVerifier";
import SectionEcartes from "@/components/SectionEcartes";

interface Props {
  resultat: ResultatAnalyse;
  mode: Mode;
  biensOkTries: ResultatAnalyse["ok"];
}

export default function ListeResultats({ resultat, mode, biensOkTries }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {biensOkTries.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
          Aucun bien "ok" pour ces critères.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {biensOkTries.map((bien) => (
            <CarteAnnonce key={bien.listingId} bien={bien} mode={mode} />
          ))}
        </div>
      )}

      <SectionAVerifier biens={resultat.aVerifier} />
      <SectionEcartes biens={resultat.ecartes} />
    </div>
  );
}
