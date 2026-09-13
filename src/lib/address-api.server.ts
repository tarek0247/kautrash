import type { Address, NamedOption } from "./types";

const ADDRESS_API = "https://boundaries.biip.lt/v1";
const UA = "KaunasSvaraAlmanac/1.0 (waste collection preview)";

type Filter = Record<string, unknown>;

type BiipItem = {
  code?: number;
  name?: string;
  full_name?: string;
  plot_or_building_number?: string;
  building_block_number?: string | null;
  municipality?: { code?: number; name?: string };
  residential_area?: {
    code?: number;
    name?: string;
    municipality?: { code?: number; name?: string };
  };
  street?: { code?: number; name?: string; full_name?: string };
  geometry?: { srid?: number; data?: string };
};

type Page = {
  items?: BiipItem[];
  next_page?: string | null;
  next_cursor?: string | null;
  total?: number;
};

let municipalitiesMemo: { at: number; items: NamedOption[] } | null = null;
const eldershipGeom = new Map<number, string>();

async function biipFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${ADDRESS_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": UA,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Address registry HTTP ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`);
  }
  return response.json();
}

async function fetchPages(
  endpoint: string,
  filters: Filter[] = [],
  options: { size?: number; sortBy?: string; maxPages?: number; extra?: string } = {},
): Promise<BiipItem[]> {
  const all: BiipItem[] = [];
  let cursor: string | null = null;
  const size = options.size ?? 100;
  const sortBy = options.sortBy ?? "name";
  const maxPages = options.maxPages ?? 40;

  for (let page = 0; page < maxPages; page += 1) {
    const query = new URLSearchParams({
      size: String(size),
      sort_by: sortBy,
      sort_order: "asc",
    });
    if (cursor) query.set("cursor", cursor);
    if (options.extra) {
      for (const [key, value] of new URLSearchParams(options.extra)) {
        query.set(key, value);
      }
    }
    const json = (await biipFetch(`${endpoint}?${query.toString()}`, {
      method: "POST",
      body: JSON.stringify({ filters }),
    })) as Page;
    const items = Array.isArray(json.items) ? json.items : [];
    all.push(...items);
    const next = json.next_page || json.next_cursor || null;
    if (!next || items.length === 0) break;
    cursor = String(next);
  }
  return all;
}

function uniqueOptions(items: NamedOption[]): NamedOption[] {
  const map = new Map<string, NamedOption>();
  for (const item of items) {
    const key = item.code != null ? `c:${item.code}` : `n:${item.name.toLowerCase()}`;
    if (!map.has(key) && item.name) map.set(key, item);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "lt"));
}

export async function listDistricts(search = ""): Promise<NamedOption[]> {
  const needle = search.trim();
  if (!needle && municipalitiesMemo && Date.now() - municipalitiesMemo.at < 12 * 60 * 60 * 1000) {
    return municipalitiesMemo.items;
  }
  const filters: Filter[] = needle
    ? [{ municipalities: { name: { contains: needle } } }]
    : [];
  const items = await fetchPages("/municipalities/search", filters);
  const options = uniqueOptions(
    items.map((item) => ({
      code: item.code,
      name: String(item.name ?? "").trim(),
    })),
  );
  if (!needle) municipalitiesMemo = { at: Date.now(), items: options };
  return options;
}

export async function listSubDistricts(
  municipalityCode: number,
  search = "",
): Promise<NamedOption[]> {
  const filter: Filter = { municipalities: { codes: [municipalityCode] } };
  const needle = search.trim();
  if (needle) filter.elderships = { name: { contains: needle } };
  const items = await fetchPages("/elderships/search", [filter]);
  return uniqueOptions(
    items.map((item) => ({
      code: item.code,
      name: String(item.name ?? "").trim(),
    })),
  );
}

async function eldershipGeometry(code: number): Promise<string | null> {
  const cached = eldershipGeom.get(code);
  if (cached) return cached;
  try {
    const json = (await biipFetch(
      `/elderships/${code}/geometry?geometry_output_format=ewkt&srid=4326`,
    )) as BiipItem;
    const ewkt = json.geometry?.data;
    if (ewkt) {
      eldershipGeom.set(code, ewkt);
      return ewkt;
    }
  } catch {
    return null;
  }
  return null;
}

export async function listCities(
  municipalityCode: number,
  eldershipCode?: number,
  search = "",
): Promise<NamedOption[]> {
  const filter: Filter = { municipalities: { codes: [municipalityCode] } };
  if (eldershipCode) {
    const ewkt = await eldershipGeometry(eldershipCode);
    if (ewkt) filter.geometry = { method: "intersects", ewkt };
  }
  const needle = search.trim();
  if (needle) filter.residential_areas = { name: { contains: needle } };
  const items = await fetchPages("/residential-areas/search", [filter]);
  return uniqueOptions(
    items.map((item) => ({
      code: item.code,
      name: String(item.name ?? "").trim(),
    })),
  );
}

export async function listStreets(
  municipalityCode: number,
  residentialAreaCode?: number,
  search = "",
): Promise<NamedOption[]> {
  const filter: Filter = residentialAreaCode
    ? { residential_areas: { codes: [residentialAreaCode] } }
    : { municipalities: { codes: [municipalityCode] } };
  const needle = search.trim();
  if (needle) filter.streets = { name: { contains: needle } };
  const items = await fetchPages("/streets/search", [filter], {
    maxPages: residentialAreaCode ? 20 : 30,
  });
  return uniqueOptions(
    items.map((item) => ({
      code: item.code,
      name: String(item.full_name || item.name || "").trim(),
    })),
  );
}

function formatHouse(item: BiipItem): string {
  const plot = String(item.plot_or_building_number ?? "").trim();
  const block = String(item.building_block_number ?? "").trim();
  if (!plot) return "";
  return block ? `${plot}-${block}` : plot;
}

export async function listHouseNumbers(streetCode: number): Promise<NamedOption[]> {
  const items = await fetchPages(
    "/addresses/search",
    [{ streets: { codes: [streetCode] } }],
    { sortBy: "plot_or_building_number", maxPages: 20 },
  );
  const numbers = items.map(formatHouse).filter(Boolean);
  const unique = Array.from(new Set(numbers)).sort((a, b) =>
    a.localeCompare(b, "lt", { numeric: true }),
  );
  return unique.map((name) => ({ code: name, name }));
}

function parsePoint(ewkt: string): { lon: number; lat: number } | null {
  const match = ewkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) return null;
  const lon = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return { lon, lat };
}

function dist2(a: { lon: number; lat: number }, b: { lon: number; lat: number }) {
  const dy = (a.lat - b.lat) * 111_320;
  const dx = (a.lon - b.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return dx * dx + dy * dy;
}

function boxFilter(lat: number, lon: number, dLat: number, dLon: number): Filter {
  const minLon = lon - dLon;
  const maxLon = lon + dLon;
  const minLat = lat - dLat;
  const maxLat = lat + dLat;
  return {
    geometry: {
      method: "intersects",
      ewkt: `SRID=4326;POLYGON((${minLon} ${minLat}, ${minLon} ${maxLat}, ${maxLon} ${maxLat}, ${maxLon} ${minLat}, ${minLon} ${minLat}))`,
    },
  };
}

export type GeocodedAddress = Partial<Address> & {
  districtCode?: number;
  subDistrictCode?: number;
  cityCode?: number;
  streetCode?: number;
};

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodedAddress> {
  const point: Filter = {
    geometry: { method: "intersects", ewkt: `SRID=4326;POINT(${lon} ${lat})` },
  };

  const [munis, elds] = await Promise.all([
    fetchPages("/municipalities/search", [point], { size: 5, maxPages: 1 }),
    fetchPages("/elderships/search", [point], { size: 5, maxPages: 1 }),
  ]);

  const guessed: GeocodedAddress = {
    district: munis[0]?.name,
    districtCode: munis[0]?.code,
    subDistrict: elds[0]?.name,
    subDistrictCode: elds[0]?.code,
  };

  let addresses: BiipItem[] = [];
  for (const [dLat, dLon] of [
    [0.0008, 0.0014],
    [0.0016, 0.0028],
    [0.003, 0.005],
  ] as const) {
    addresses = await fetchPages("/addresses/search", [boxFilter(lat, lon, dLat, dLon)], {
      size: 40,
      maxPages: 1,
      extra: "geometry_output_format=ewkt&srid=4326",
      sortBy: "code",
    });
    if (addresses.length) break;
  }

  if (addresses.length === 0) return guessed;

  const origin = { lat, lon };
  let best = addresses[0];
  let bestD = Infinity;
  for (const item of addresses) {
    const pt = item.geometry?.data ? parsePoint(item.geometry.data) : null;
    const d = pt ? dist2(origin, pt) : Infinity;
    if (d < bestD) {
      best = item;
      bestD = d;
    }
  }

  guessed.city = best.residential_area?.name || guessed.city;
  guessed.cityCode = best.residential_area?.code;
  guessed.street = best.street?.full_name || best.street?.name || guessed.street;
  guessed.streetCode = best.street?.code;
  guessed.houseNumber = formatHouse(best) || guessed.houseNumber;
  if (!guessed.district) {
    guessed.district = best.municipality?.name;
    guessed.districtCode = best.municipality?.code;
  }
  return guessed;
}
