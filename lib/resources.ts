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

/** Instant, no-AI emergency resources: her county's 24-hour lines first, then the National DV Hotline. */
export function emergencyResources(county?: County): Resource[] {
  const local = county
    ? RESOURCES.filter((r) => r.counties.includes(county) && r.is24h && !r.counties.includes("all"))
    : [];
  const national = getResource("ndvh");
  return national ? [...local, national] : local;
}
