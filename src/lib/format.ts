export function formatEuros(valeur: number | null): string {
  if (valeur === null) return "—";
  return `${valeur.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
}

export function formatPourcent(valeur: number | null, decimales = 2): string {
  if (valeur === null) return "—";
  return `${valeur.toFixed(decimales)} %`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
