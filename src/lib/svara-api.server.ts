import type { Address, Collection, CollectionDate, NamedOption } from "./types";
import { titlesFromDescription, translateFrequency, wasteTypeFromDescription } from "./waste";

const BASE = "https://grafikai.svara.lt";
const TENANT_ID = 1;
const KNOWN_FN_ID =
  "540255adfb554d07c113b436aa5260c344d105f4d25780c646c3d51db39960be";

type Cache = { id: string; at: number };
let fnCache: Cache | null = null;
const FN_TTL_MS = 6 * 60 * 60 * 1000;

type SerovalNode = {
  t?: number;
  i?: number;
  s?: unknown;
  a?: SerovalNode[];
  p?: { k?: string[]; v?: SerovalNode[] };
  o?: number;
};

function encodeRequest(apiPath: string) {
  return JSON.stringify({
    t: {
      t: 10,
      i: 0,
      p: {
        k: ["data"],
        v: [
          {
            t: 10,
            i: 1,
            p: {
              k: ["apiPath", "tenantId"],
              v: [
                { t: 1, s: apiPath },
                { t: 2, s: TENANT_ID },
              ],
            },
            o: 0,
          },
        ],
      },
      o: 0,
    },
    f: 63,
    m: [],
  });
}

function decode(node: unknown): unknown {
  if (!node || typeof node !== "object") return node;
  const n = node as SerovalNode;
  if (typeof n.t !== "number") return node;
  if (n.t === 0 || n.t === 1 || n.t === 2 || n.t === 3) return n.s;
  if (n.t === 4) return null;
  if (n.t === 9) return (n.a ?? []).map(decode);
  if (n.t === 10 || n.t === 11) {
    const keys = n.p?.k ?? [];
    const vals = n.p?.v ?? [];
    const out: Record<string, unknown> = {};
    keys.forEach((key, index) => {
      out[key] = decode(vals[index]);
    });
    return out;
  }
  return null;
}

async function callFn(fnId: string, apiPath: string) {
  const payload = encodeURIComponent(encodeRequest(apiPath));
  const response = await fetch(`${BASE}/_serverFn/${fnId}?payload=${payload}`, {
    headers: {
      Accept: "application/json",
      "x-tsr-serverFn": "true",
      "User-Agent": "KaunasSvaraAlmanac/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`Švara HTTP ${response.status}`);
  }
  const json: unknown = await response.json();
  return decode(json);
}

function isDistrictList(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const result = (value as { result?: unknown }).result;
  return Array.isArray(result);
}

async function candidateFnIds(): Promise<string[]> {
  const html = await fetch(`${BASE}/`, {
    headers: { "User-Agent": "KaunasSvaraAlmanac/1.0" },
  }).then((r) => r.text());
  const bundles = [...html.matchAll(/\/assets\/[A-Za-z0-9._-]+\.js/g)].map((m) => m[0]);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const bundle of [...new Set(bundles)]) {
    const js = await fetch(`${BASE}${bundle}`, {
      headers: { "User-Agent": "KaunasSvaraAlmanac/1.0" },
    }).then((r) => r.text());
    for (const match of js.matchAll(/['"`]([0-9a-f]{64})['"`]/g)) {
      const id = match[1];
      if (id && !seen.has(id)) {
        seen.add(id);
        ordered.push(id);
      }
    }
  }
  return ordered;
}

async function resolveFnId(force = false): Promise<string> {
  if (!force && fnCache && Date.now() - fnCache.at < FN_TTL_MS) {
    return fnCache.id;
  }
  const tryIds = [fnCache?.id, KNOWN_FN_ID].filter((id): id is string => Boolean(id));
  for (const id of tryIds) {
    try {
      const decoded = await callFn(id, "/schedule/getdistricts?search=");
      if (isDistrictList(decoded)) {
        fnCache = { id, at: Date.now() };
        return id;
      }
    } catch {
      // stale
    }
  }
  for (const id of await candidateFnIds()) {
    if (tryIds.includes(id)) continue;
    try {
      const decoded = await callFn(id, "/schedule/getdistricts?search=");
      if (isDistrictList(decoded)) {
        fnCache = { id, at: Date.now() };
        return id;
      }
    } catch {
      // next
    }
  }
  throw new Error("Could not reach the Švara schedule service.");
}

async function svara<T>(apiPath: string): Promise<T> {
  const run = async (force: boolean) => {
    const id = await resolveFnId(force);
    const decoded = await callFn(id, apiPath);
    if (!decoded || typeof decoded !== "object") {
      throw new Error("Unexpected Švara response.");
    }
    const wrapped = decoded as { result?: T; error?: unknown };
    if (wrapped.result === undefined) {
      throw new Error("Švara returned an empty result.");
    }
    return wrapped.result;
  };
  try {
    return await run(false);
  } catch {
    fnCache = null;
    return await run(true);
  }
}

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.set(key, value == null ? "" : String(value));
  }
  return search.toString();
}

function namesFrom(result: unknown, key: string): NamedOption[] {
  if (!Array.isArray(result)) return [];
  const seen = new Set<string>();
  const out: NamedOption[] = [];
  for (const row of result) {
    if (!row || typeof row !== "object") continue;
    const name = String((row as Record<string, unknown>)[key] ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "lt"));
}

export async function listDistricts(search = ""): Promise<NamedOption[]> {
  const result = await svara<unknown>(`/schedule/getdistricts?${qs({ search })}`);
  return namesFrom(result, "district");
}

export async function listSubDistricts(region: string, search = ""): Promise<NamedOption[]> {
  const result = await svara<unknown>(
    `/schedule/getsubdistricts?${qs({ region, search })}`,
  );
  return namesFrom(result, "subdistrict");
}

export async function listCities(
  region: string,
  subDistrict = "",
  search = "",
): Promise<NamedOption[]> {
  const result = await svara<unknown>(
    `/schedule/getcities?${qs({ region, subDistrict, search })}`,
  );
  return namesFrom(result, "city");
}

export async function listStreets(
  region: string,
  subDistrict = "",
  city = "",
  search = "",
): Promise<NamedOption[]> {
  const result = await svara<unknown>(
    `/schedule/getstreets?${qs({ region, subDistrict, city, search })}`,
  );
  return namesFrom(result, "street");
}

type RawContract = {
  id?: string;
  description?: string;
  descriptionFmt?: string;
  descriptionPlural?: string;
  frequency?: string;
  street?: string;
  fullAddress?: string;
  house?: string;
  city?: string;
  wasteObjectId?: number;
  hashedId?: string;
  subscriptionUrl?: string;
  containerFmt?: string;
};

type ContractsPage = {
  data?: RawContract[];
  totalRecords?: number;
};

type RawDate = {
  date?: string;
  dateFmt?: string;
  year?: number;
  month?: number;
  day?: number;
};

function toDate(row: RawDate): CollectionDate | null {
  const iso = (row.dateFmt || row.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return { iso, year, month, day };
}

async function listSchedule(wasteObjectId: number): Promise<CollectionDate[]> {
  const result = await svara<unknown>(
    `/schedule/getschedule?${qs({
      wasteObjectId,
      address: "-",
      subDistrict: "-",
      region: "-",
      houseNumber: "-",
      pageIndex: 0,
      pageSize: 80,
    })}`,
  );
  const rows = Array.isArray(result) ? result : [];
  const dates: CollectionDate[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const parsed = toDate(row as RawDate);
    if (!parsed || seen.has(parsed.iso)) continue;
    seen.add(parsed.iso);
    dates.push(parsed);
  }
  dates.sort((a, b) => a.iso.localeCompare(b.iso));
  return dates;
}

export async function findSchedule(address: Address): Promise<Collection[]> {
  const houseStem = address.houseNumber.split(/[-/]/)[0]?.trim() || address.houseNumber;
  const attempts: Address[] = [
    address,
    houseStem !== address.houseNumber
      ? { ...address, houseNumber: houseStem }
      : null,
    address.city ? { ...address, city: "" } : null,
    address.subDistrict ? { ...address, subDistrict: "" } : null,
    address.city || address.subDistrict
      ? { ...address, city: "", subDistrict: "" }
      : null,
  ].filter((item): item is Address => Boolean(item));

  const seen = new Set<string>();
  let last: Collection[] = [];
  for (const attempt of attempts) {
    const key = `${attempt.district}|${attempt.subDistrict}|${attempt.city}|${attempt.street}|${attempt.houseNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);
    last = await findScheduleOnce(attempt);
    if (last.length) return last;
  }
  return last;
}

async function findScheduleOnce(address: Address): Promise<Collection[]> {
  const result = await svara<ContractsPage>(
    `/schedule/getcontracts?${qs({
      region: address.district,
      subDistrict: address.subDistrict || "",
      city: address.city || "",
      address: address.street,
      houseNumber: address.houseNumber,
      matchHouseNumber: "true",
      pageIndex: 0,
      pageSize: 50,
    })}`,
  );
  const rows = Array.isArray(result?.data) ? result.data : [];
  const unique = new Map<number, RawContract>();
  for (const row of rows) {
    const id = Number(row.wasteObjectId);
    if (!Number.isFinite(id) || unique.has(id)) continue;
    unique.set(id, row);
  }
  const contracts = [...unique.values()].slice(0, 12);
  const schedules = await Promise.all(
    contracts.map(async (row) => {
      const wasteObjectId = Number(row.wasteObjectId);
      try {
        return await listSchedule(wasteObjectId);
      } catch {
        return [] as CollectionDate[];
      }
    }),
  );

  const grouped = new Map<string, Collection>();
  contracts.forEach((row, index) => {
    const description = String(row.descriptionFmt || row.description || "");
    const wasteType = wasteTypeFromDescription(
      `${description} ${row.descriptionPlural ?? ""}`,
    );
    const titles = titlesFromDescription(description);
    const key = `${wasteType}|${row.frequency ?? ""}`;
    const dates = schedules[index] ?? [];
    const existing = grouped.get(key);
    if (existing) {
      existing.containerCount += 1;
      const seen = new Set(existing.dates.map((d) => d.iso));
      for (const date of dates) {
        if (!seen.has(date.iso)) existing.dates.push(date);
      }
      existing.dates.sort((a, b) => a.iso.localeCompare(b.iso));
      return;
    }
    grouped.set(key, {
      id: String(row.id || row.wasteObjectId || index),
      wasteObjectId: Number(row.wasteObjectId) || index,
      title: titles.en,
      titleLt: titles.lt,
      wasteType,
      frequency: translateFrequency(String(row.frequency ?? "")),
      frequencyLt: String(row.frequency ?? ""),
      address: String(row.fullAddress || `${address.street} ${address.houseNumber}`),
      street: String(row.street || address.street),
      house: String(row.house || address.houseNumber),
      containerFmt: row.containerFmt,
      containerCount: 1,
      hashedId: row.hashedId,
      subscriptionUrl: row.subscriptionUrl
        ? `${BASE}${row.subscriptionUrl}`
        : undefined,
      dates,
    });
  });
  return [...grouped.values()];
}

type Nominatim = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    suburb?: string;
    city_district?: string;
    road?: string;
    house_number?: string;
    hamlet?: string;
  };
};

function normalizeMunicipality(value: string) {
  const v = value.trim();
  if (/kauno miesto/i.test(v) || v === "Kaunas") return "Kauno m. sav.";
  if (/kauno rajono/i.test(v)) return "Kauno r. sav.";
  return v
    .replace(/miesto savivaldybė/i, "m. sav.")
    .replace(/rajono savivaldybė/i, "r. sav.")
    .replace(/savivaldybė/i, "sav.");
}

function bestMatch(options: NamedOption[], candidates: string[]) {
  const lowered = options.map((item) => ({
    name: item.name,
    key: item.name.toLowerCase(),
  }));
  for (const raw of candidates) {
    const needle = raw.toLowerCase().trim();
    if (!needle) continue;
    const exact = lowered.find((item) => item.key === needle);
    if (exact) return exact.name;
    const starts = lowered.find(
      (item) => item.key.startsWith(needle) || needle.startsWith(item.key.replace(/\s+sav\.$/, "")),
    );
    if (starts) return starts.name;
    const contains = lowered.find(
      (item) => item.key.includes(needle) || needle.includes(item.key.replace(/\.$/, "")),
    );
    if (contains) return contains.name;
  }
  return "";
}

export async function reverseGeocode(lat: number, lon: number): Promise<Partial<Address>> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=lt`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "KaunasSvaraAlmanac/1.0 (waste collection preview)",
    },
  });
  if (!response.ok) throw new Error("Reverse geocode failed");
  const json = (await response.json()) as Nominatim;
  const a = json.address ?? {};
  const municipality = normalizeMunicipality(a.municipality || a.county || a.city || "");
  const districts = await listDistricts("");
  const district = bestMatch(districts, [municipality, a.city || "", a.town || ""]);
  const guessed: Partial<Address> = {
    district,
    houseNumber: a.house_number || "",
  };
  if (!district) return guessed;

  const subDistricts = await listSubDistricts(district, "");
  guessed.subDistrict = bestMatch(subDistricts, [
    a.suburb || "",
    a.city_district || "",
    `${a.suburb || ""} sen.`,
  ]);

  const cities = await listCities(district, guessed.subDistrict || "", "");
  guessed.city = bestMatch(cities, [
    a.city || "",
    a.town || "",
    a.village || "",
    a.hamlet || "",
    `${a.town || ""} mstl.`,
    `${a.village || ""} k.`,
  ]);

  const streets = await listStreets(district, guessed.subDistrict || "", guessed.city || "", "");
  const road = (a.road || "")
    .replace(/gatvė/i, "g.")
    .replace(/prospektas/i, "pr.")
    .replace(/alėja/i, "al.")
    .replace(/skersgatvis/i, "skg.");
  guessed.street = bestMatch(streets, [road, `${road} g.`, a.road || ""]);
  return guessed;
}
