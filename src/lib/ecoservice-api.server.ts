import type { Address, Collection } from "./types";

const API = "https://wabi-west-europe-d-primary-api.analysis.windows.net/public/reports";
const RESOURCE = "6689ce06-85f4-4c23-baf0-318c087fd486";
export const ECOSERVICE_REPORT = "https://ecoservice.lt/grafikai/";
const headers = { "Content-Type": "application/json", "X-PowerBI-ResourceKey": RESOURCE };
const regions: Record<string, string> = {
  birzu: "Biržų sav.",
  kalvarijos: "Kalvarijos sav.",
  kazlurudos: "Kazlų rudos sav.",
  klaipedos: "Klaipėdos sav.",
  lazdiju: "Lazdijų r. sav.",
  marijampoles: "Marijampolės sav.",
  mazeikiu: "Mažeikių sav.",
  neringos: "Neringos sav.",
  plunges: "Plungės sav.",
  radviliskio: "Radviliškio sav.",
  sakiu: "Šakių r. sav.",
  salcininku: "Šalčininkų sav.",
  siauliu: "Šiaulių sav.",
  silutes: "Šilutės sav.",
  sirvintu: "Širvintų sav.",
  taurages: "Tauragės sav.",
  traku: "Trakų sav.",
  varenos: "Varėnos r. sav.",
  vilkaviskio: "Vilkaviškio r. sav.",
  vilniaus: "Vilniaus m.",
};
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
export function providerRegion(district: string) {
  if (district === "Vilniaus r. sav.") return undefined;
  return regions[normalize(district.replace(/\s+[mr]\.\s*sav\./, "").replace(/\s+sav\./, ""))];
}
function settlement(value: string) {
  return normalize(value.replace(/\s+(?:m\.|mstl\.|k\.|vs\.)\s*$/, ""));
}
export function matchesAddress(raw: string, address: Address) {
  const parts = raw.split(",").map((part) => part.trim());
  const point = (parts[0] ?? "").match(/^(.*?)\s+(\d+[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)$/);
  const house = (value: string) =>
    value.trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "");
  // Never let house 3 match 33, or match a street in a different settlement.
  return (
    !!point &&
    normalize(point[1]) === normalize(address.street) &&
    house(point[2]) === house(address.houseNumber) &&
    !!address.city &&
    parts.slice(1).some((part) => settlement(part) === settlement(address.city))
  );
}

type Column = { N: string; DN?: string };
type DataRow = { S?: Column[]; C?: unknown[]; R?: number; Ø?: number; [key: string]: unknown };
type Dataset = { IC?: boolean; PH?: { DM0?: DataRow[] }[]; ValueDicts?: Record<string, unknown[]> };
export function decodeRows(dataset: Dataset): unknown[][] {
  const output: unknown[][] = [];
  let columns: Column[] = [];
  let previous: unknown[] = [];
  for (const row of dataset.PH?.[0]?.DM0 ?? []) {
    if (row.S) columns = row.S;
    if (!row.C && row.R === undefined && row.Ø === undefined && !columns.some((c) => c.N in row))
      continue;
    let index = 0;
    const values = columns.map((column, position) => {
      if (((row.R ?? 0) & (1 << position)) !== 0) return previous[position];
      if (((row.Ø ?? 0) & (1 << position)) !== 0) return null;
      const raw = row.C ? row.C[index++] : row[column.N];
      return column.DN && typeof raw === "number" ? dataset.ValueDicts?.[column.DN]?.[raw] : raw;
    });
    previous = values;
    output.push(values);
  }
  return output;
}

type Model = { id: number; dbName: string };
let metadata: { model: Model; report: string; expires: number } | null = null;
async function reportMetadata() {
  if (metadata && metadata.expires > Date.now()) return metadata;
  const response = await fetch(
    `${API}/${RESOURCE}/modelsAndExploration?preferReadOnlySession=true`,
    {
      headers,
      signal: AbortSignal.timeout(12000),
    },
  );
  if (!response.ok) throw new Error(`Ecoservice metadata: ${response.status}`);
  const data = await response.json();
  const model = data.models?.[0];
  const report = data.exploration?.report?.objectId;
  if (!model?.id || !model?.dbName || typeof report !== "string")
    throw new Error("Ecoservice report changed");
  metadata = { model, report, expires: Date.now() + 3600000 };
  return metadata;
}
const column = (property: string) => ({
  Column: { Expression: { SourceRef: { Source: "i" } }, Property: property },
});
const literal = (value: string) => ({ Literal: { Value: `'${value.replaceAll("'", "''")}'` } });
const equal = (property: string, value: string) => ({
  Condition: { Comparison: { ComparisonKind: 0, Left: column(property), Right: literal(value) } },
});
async function query(properties: string[], where: unknown[], limit: number) {
  const meta = await reportMetadata();
  const response = await fetch(`${API}/querydata`, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      version: "1.0.0",
      modelId: meta.model.id,
      cancelQueries: [],
      queries: [
        {
          Query: {
            Commands: [
              {
                SemanticQueryDataShapeCommand: {
                  Query: {
                    Version: 2,
                    From: [{ Name: "i", Entity: "InventoryDays", Type: 0 }],
                    Select: properties.map((p) => ({ ...column(p), Name: `InventoryDays.${p}` })),
                    Where: where,
                  },
                  Binding: {
                    Primary: { Groupings: [{ Projections: properties.map((_, i) => i) }] },
                    DataReduction: { DataVolume: 4, Primary: { Window: { Count: limit } } },
                    Version: 1,
                  },
                  ExecutionMetricsKind: 1,
                },
              },
            ],
          },
          ApplicationContext: {
            DatasetId: meta.model.dbName,
            Sources: [{ ReportId: meta.report, VisualId: "01b060d5bfd1adacfcf5" }],
          },
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Ecoservice query: ${response.status}`);
  const data = await response.json();
  const dataset: Dataset | undefined = data.results?.[0]?.result?.data?.dsr?.DS?.[0];
  if (!dataset || dataset.IC === false) throw new Error("Incomplete Ecoservice result");
  return decodeRows(dataset);
}

export async function findEcoserviceSchedule(address: Address): Promise<Collection[]> {
  const region = providerRegion(address.district);
  if (!region) return [];
  const candidates = await query(
    ["Adresas", "Inventorinis numeris"],
    [
      equal("Sav.", region),
      {
        Condition: { Contains: { Left: column("Adresas"), Right: literal(address.street.trim()) } },
      },
    ],
    300,
  );
  const matching = candidates.filter(
    (row) => typeof row[0] === "string" && matchesAddress(row[0], address),
  );
  const locations = new Set(matching.map((row) => row[0]));
  if (locations.size !== 1) return [];
  const location = String(matching[0][0]);
  const today = new Date().toISOString().slice(0, 10);
  const end = `${Number(today.slice(0, 4)) + 2}${today.slice(4)}`;
  const rows = await query(
    ["Inventorinis numeris", "Date"],
    [
      equal("Sav.", region),
      equal("Adresas", location),
      {
        Condition: {
          Comparison: {
            ComparisonKind: 2,
            Left: column("Date"),
            Right: { Literal: { Value: `datetime'${today}T00:00:00'` } },
          },
        },
      },
      {
        Condition: {
          Comparison: {
            ComparisonKind: 4,
            Left: column("Date"),
            Right: { Literal: { Value: `datetime'${end}T00:00:00'` } },
          },
        },
      },
    ],
    2000,
  );
  const dates = new Map<string, Set<string>>();
  for (const [inventory, timestamp] of rows) {
    if (
      typeof inventory !== "string" ||
      typeof timestamp !== "number" ||
      !Number.isFinite(timestamp)
    )
      continue;
    const iso = new Date(timestamp).toISOString().slice(0, 10);
    if (iso < today || iso > end) continue;
    if (!dates.has(inventory)) dates.set(inventory, new Set());
    dates.get(inventory)!.add(iso);
  }
  return [...dates].map(([inventory, days]) => ({
    id: `ecoservice:${inventory}`,
    wasteObjectId: 0,
    wasteType: "unspecified",
    title: `Ecoservice · ${inventory}`,
    titleLt: `Ecoservice · ${inventory}`,
    frequency: "Provider schedule · waste type not specified",
    frequencyLt: "Tiekėjo grafikas · atliekų rūšis nenurodyta",
    address: location,
    street: address.street,
    house: address.houseNumber,
    containerCount: 1,
    provider: "ecoservice",
    sourceUrl: ECOSERVICE_REPORT,
    checkedAt: new Date().toISOString(),
    dates: [...days].sort().map((iso) => {
      const [year, month, day] = iso.split("-").map(Number);
      return { iso, year, month, day };
    }),
  }));
}
