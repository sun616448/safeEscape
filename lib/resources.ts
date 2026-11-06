import data from "@/data/resources.bay-area.json";
import type { County, Resource } from "@/lib/types";

export const RESOURCES = data as Resource[];

const byId = new Map(RESOURCES.map((r) => [r.id, r]));

export function getResource(id: string): Resource | undefined {
  return byId.get(id);
}

/** Resources that serve a county (national/statewide entries always included). */
export function resourcesFor(county?: County): Resource[] {
  if (!county) return RESOURCES;
  return RESOURCES.filter((r) => r.counties.includes("all") || r.counties.includes(county));
}

const EMERGENCY_NATIONAL = ["national-dv-hotline", "988-lifeline"];

/** Instant, no-AI emergency resources: her county's 24/7 lines first, then the national DV hotline and 988. */
export function emergencyResources(county?: County): Resource[] {
  const local = county
    ? RESOURCES.filter(
        (r) =>
          r.counties.includes(county) &&
          (r.type === "hotline" || r.type === "shelter") &&
          /24/.test(r.hours ?? "")
      )
    : [];
  const national = EMERGENCY_NATIONAL.map(getResource).filter((r): r is Resource => !!r);
  return [...local, ...national];
}
