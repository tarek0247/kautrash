import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, LoaderCircle, LocateFixed, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PickerDrawer } from "@/components/picker-drawer";
import { t } from "@/lib/i18n";
import {
  findScheduleFn,
  getCitiesFn,
  getDistrictsFn,
  getHouseNumbersFn,
  getStreetsFn,
  getSubDistrictsFn,
  reverseGeocodeFn,
} from "@/lib/svara-fn";
import { useAppStore } from "@/lib/store";
import type { Address, NamedOption } from "@/lib/types";
import { cn } from "@/lib/utils";

type PickerKind = "district" | "subDistrict" | "city" | "street" | "house" | null;

function asCode(value: NamedOption["code"]): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function pickByName(items: NamedOption[], name: string) {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return (
    items.find((item) => item.name.toLowerCase() === needle) ??
    items.find(
      (item) =>
        item.name.toLowerCase().startsWith(needle) || needle.startsWith(item.name.toLowerCase()),
    )
  );
}

function emptyAddress(): Address {
  return { district: "", subDistrict: "", city: "", street: "", houseNumber: "" };
}

export function AddressSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const lang = useAppStore((s) => s.lang);
  const saved = useAppStore((s) => s.address);
  const setSchedule = useAppStore((s) => s.setSchedule);

  const [district, setDistrict] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");

  const [districtCode, setDistrictCode] = useState<number | undefined>();
  const [subDistrictCode, setSubDistrictCode] = useState<number | undefined>();
  const [cityCode, setCityCode] = useState<number | undefined>();
  const [streetCode, setStreetCode] = useState<number | undefined>();

  const [districts, setDistricts] = useState<NamedOption[]>([]);
  const [subDistricts, setSubDistricts] = useState<NamedOption[]>([]);
  const [cities, setCities] = useState<NamedOption[]>([]);
  const [streets, setStreets] = useState<NamedOption[]>([]);
  const [houses, setHouses] = useState<NamedOption[]>([]);

  const [picker, setPicker] = useState<PickerKind>(null);
  const [listLoading, setListLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const source = saved ?? emptyAddress();
    setDistrict(source.district);
    setSubDistrict(source.subDistrict);
    setCity(source.city);
    setStreet(source.street);
    setHouseNumber(source.houseNumber);
    setDistrictCode(undefined);
    setSubDistrictCode(undefined);
    setCityCode(undefined);
    setStreetCode(undefined);
    setHouses([]);
    setPicker(null);
    void hydrate(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function hydrate(source: Address) {
    try {
      setListLoading(true);
      const allDistricts = await getDistrictsFn({ data: { search: "" } });
      setDistricts(allDistricts);
      if (!source.district) return;

      const districtItem = pickByName(allDistricts, source.district);
      const mCode = asCode(districtItem?.code);
      setDistrictCode(mCode);
      if (!mCode) return;

      const [subs, cts] = await Promise.all([
        getSubDistrictsFn({ data: { municipalityCode: mCode, search: "" } }),
        getCitiesFn({ data: { municipalityCode: mCode, search: "" } }),
      ]);
      setSubDistricts(subs);
      const subItem = pickByName(subs, source.subDistrict);
      const eCode = asCode(subItem?.code);
      setSubDistrictCode(eCode);

      const cityList = eCode
        ? await getCitiesFn({
            data: { municipalityCode: mCode, eldershipCode: eCode, search: "" },
          })
        : cts;
      setCities(cityList);
      const cityItem = pickByName(cityList, source.city);
      const rCode = asCode(cityItem?.code);
      setCityCode(rCode);

      if (!rCode && !mCode) return;
      const streetList = await getStreetsFn({
        data: { municipalityCode: mCode, residentialAreaCode: rCode, search: "" },
      });
      setStreets(streetList);
      const streetItem = pickByName(streetList, source.street);
      const sCode = asCode(streetItem?.code);
      setStreetCode(sCode);
      if (sCode) {
        setHouses(await getHouseNumbersFn({ data: { streetCode: sCode } }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(lang, "connectionError"));
    } finally {
      setListLoading(false);
    }
  }

  async function selectDistrict(item: NamedOption) {
    const code = asCode(item.code);
    setDistrict(item.name);
    setDistrictCode(code);
    setSelectedSub(null);
    setSelectedCity(null);
    setSelectedStreet(null);
    setSubDistricts([]);
    setCities([]);
    setStreets([]);
    setPicker(null);
    if (!code) return;
    setListLoading(true);
    try {
      const [subs, cts] = await Promise.all([
        getSubDistrictsFn({ data: { municipalityCode: code, search: "" } }),
        getCitiesFn({ data: { municipalityCode: code, search: "" } }),
      ]);
      setSubDistricts(subs);
      setCities(cts);
      if (cts.length === 1) {
        await selectCity(cts[0], { municipalityCode: code });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(lang, "connectionError"));
    } finally {
      setListLoading(false);
    }
  }

  function setSelectedSub(item: NamedOption | null) {
    setSubDistrict(item?.name ?? "");
    setSubDistrictCode(asCode(item?.code));
  }

  function setSelectedCity(item: NamedOption | null) {
    setCity(item?.name ?? "");
    setCityCode(asCode(item?.code));
  }

  function setSelectedStreet(item: NamedOption | null) {
    setStreet(item?.name ?? "");
    setStreetCode(asCode(item?.code));
    setHouseNumber("");
    setHouses([]);
  }

  async function selectSubDistrict(item: NamedOption) {
    const eCode = asCode(item.code);
    setSelectedSub(item);
    setSelectedCity(null);
    setSelectedStreet(null);
    setCities([]);
    setStreets([]);
    setPicker(null);
    if (!districtCode) return;
    setListLoading(true);
    try {
      const cts = await getCitiesFn({
        data: { municipalityCode: districtCode, eldershipCode: eCode, search: "" },
      });
      setCities(cts);
      if (cts.length === 1) {
        await selectCity(cts[0], { municipalityCode: districtCode });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(lang, "connectionError"));
    } finally {
      setListLoading(false);
    }
  }

  async function selectCity(
    item: NamedOption,
    opts?: { municipalityCode?: number },
  ) {
    setCity(item.name);
    setCityCode(asCode(item.code));
    setSelectedStreet(null);
    setPicker(null);
    const mCode = opts?.municipalityCode ?? districtCode;
    const rCode = asCode(item.code);
    if (!mCode) return;
    setListLoading(true);
    try {
      setStreets(
        await getStreetsFn({
          data: { municipalityCode: mCode, residentialAreaCode: rCode, search: "" },
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(lang, "connectionError"));
    } finally {
      setListLoading(false);
    }
  }

  async function selectStreet(item: NamedOption) {
    setStreet(item.name);
    const code = asCode(item.code);
    setStreetCode(code);
    setHouseNumber("");
    setPicker(null);
    if (!code) return;
    setListLoading(true);
    try {
      setHouses(await getHouseNumbersFn({ data: { streetCode: code } }));
    } catch {
      setHouses([]);
    } finally {
      setListLoading(false);
    }
  }

  function selectHouse(item: NamedOption) {
    setHouseNumber(item.name);
    setPicker(null);
  }

  async function findLocation() {
    if (!navigator.geolocation) {
      toast.error(t(lang, "locationFail"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const guessed = await reverseGeocodeFn({
            data: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          });
          if (guessed.district) setDistrict(guessed.district);
          if (guessed.districtCode) setDistrictCode(guessed.districtCode);
          if (guessed.subDistrict) setSubDistrict(guessed.subDistrict);
          if (guessed.subDistrictCode) setSubDistrictCode(guessed.subDistrictCode);
          if (guessed.city) setCity(guessed.city);
          if (guessed.cityCode) setCityCode(guessed.cityCode);
          if (guessed.street) setStreet(guessed.street);
          if (guessed.streetCode) setStreetCode(guessed.streetCode);
          if (guessed.houseNumber) setHouseNumber(guessed.houseNumber);
          await hydrate({
            district: guessed.district ?? "",
            subDistrict: guessed.subDistrict ?? "",
            city: guessed.city ?? "",
            street: guessed.street ?? "",
            houseNumber: guessed.houseNumber ?? "",
          });
          toast.success(guessed.street ? t(lang, "locationFound") : t(lang, "locationPartial"));
        } catch {
          toast.error(t(lang, "locationFail"));
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === 1 ? t(lang, "locationDenied") : t(lang, "locationFail"));
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function submit() {
    const payload: Address = {
      district: district.trim(),
      subDistrict: subDistrict.trim(),
      city: city.trim(),
      street: street.trim(),
      houseNumber: houseNumber.trim(),
    };
    if (!payload.district || !payload.street || !payload.houseNumber) {
      toast.error(t(lang, "missingFields"));
      return;
    }
    setSaving(true);
    try {
      const result = await findScheduleFn({ data: payload });
      if (!result.collections.length) {
        toast.error(t(lang, "noSchedule"));
        return;
      }
      setSchedule(result.address, result.collections);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(lang, "connectionError"));
    } finally {
      setSaving(false);
    }
  }

  const pickerOptions =
    picker === "district"
      ? districts
      : picker === "subDistrict"
        ? subDistricts
        : picker === "city"
          ? cities
          : picker === "street"
            ? streets
            : picker === "house"
              ? houses
              : [];

  const pickerTitle =
    picker === "district"
      ? t(lang, "district")
      : picker === "subDistrict"
        ? t(lang, "subDistrict")
        : picker === "city"
          ? t(lang, "city")
          : picker === "house"
            ? t(lang, "house")
            : t(lang, "street");

  const houseQuery = houseNumber.trim().toLowerCase();
  const houseStem = houseQuery.split(/[-/]/)[0] ?? houseQuery;
  const houseMatches = houses
    .filter((item) => {
      if (!houseQuery) return true;
      const name = item.name.toLowerCase();
      return name === houseQuery || name.startsWith(houseStem) || name.includes(houseQuery);
    })
    .slice(0, 12);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-bg">
      <div className="flex items-center gap-1 px-3 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center gap-1 rounded-lg px-2 font-medium text-primary"
        >
          <ArrowLeft className="size-4" />
          {t(lang, "back")}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
          {t(lang, "yourAddress")}
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-ink">
          {t(lang, "addressTitle")}
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          {t(lang, "addressBody")}
        </p>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-primary-soft px-4 py-3">
          <Shield className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-ink-soft">{t(lang, "hideAddressOn")}</p>
        </div>

        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => void findLocation()}
          disabled={locating || saving}
        >
          {locating ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <LocateFixed className="size-4" />
          )}
          {locating ? t(lang, "locating") : t(lang, "findLocation")}
        </Button>

        <Field
          label={t(lang, "district")}
          value={district}
          placeholder={t(lang, "districtPlaceholder")}
          onClick={() => {
            if (districts.length === 0) void hydrate(saved ?? emptyAddress());
            setPicker("district");
          }}
        />
        <Field
          label={`${t(lang, "subDistrict")} · ${t(lang, "optional")}`}
          value={subDistrict}
          placeholder={district ? t(lang, "subDistrictPlaceholder") : t(lang, "subDistrictFirst")}
          disabled={!district}
          onClick={() => setPicker("subDistrict")}
        />
        <Field
          label={t(lang, "city")}
          value={city}
          placeholder={district ? t(lang, "cityPlaceholder") : t(lang, "cityFirst")}
          disabled={!district}
          onClick={() => setPicker("city")}
        />
        <Field
          label={t(lang, "street")}
          value={street}
          placeholder={city || district ? t(lang, "streetPlaceholder") : t(lang, "streetFirst")}
          disabled={!district}
          onClick={() => {
            if (streets.length === 0 && districtCode) {
              void (async () => {
                setListLoading(true);
                try {
                  setStreets(
                    await getStreetsFn({
                      data: {
                        municipalityCode: districtCode,
                        residentialAreaCode: cityCode,
                        search: "",
                      },
                    }),
                  );
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : t(lang, "connectionError"),
                  );
                } finally {
                  setListLoading(false);
                }
              })();
            }
            setPicker("street");
          }}
        />

        <label className="mt-4 block">
          <span className="text-[11px] font-semibold tracking-[0.16em] text-faint uppercase">
            {t(lang, "house")}
          </span>
          <Input
            className="mt-1.5"
            value={houseNumber}
            onChange={(e) => setHouseNumber(e.target.value)}
            placeholder={t(lang, "housePlaceholder")}
            disabled={saving}
          />
          <p className="mt-1.5 text-xs text-muted">{t(lang, "houseHint")}</p>
          {houses.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {houseMatches.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setHouseNumber(item.name)}
                  className={cn(
                    "h-9 rounded-md px-3 text-sm font-medium",
                    houseNumber === item.name
                      ? "bg-primary text-primary-fg"
                      : "bg-surface-2 text-ink-soft hover:bg-line",
                  )}
                >
                  {item.name}
                </button>
              ))}
              {houses.length > 12 ? (
                <button
                  type="button"
                  onClick={() => setPicker("house")}
                  className="h-9 rounded-md px-3 text-sm font-medium text-primary hover:bg-primary-soft"
                >
                  {t(lang, "houseBrowse")}
                </button>
              ) : null}
            </div>
          ) : null}
        </label>

        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={() => void submit()}
          disabled={saving}
        >
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {saving ? t(lang, "searching") : t(lang, "findSchedule")}
        </Button>
      </div>

      <PickerDrawer
        open={picker !== null}
        title={pickerTitle}
        placeholder={t(lang, "search")}
        options={pickerOptions}
        loading={listLoading}
        emptyTitle={t(lang, "noOptions")}
        emptyBody={t(lang, "noOptionsBody")}
        loadingLabel={t(lang, "loadingOfficial")}
        onClose={() => setPicker(null)}
        onSelect={(item) => {
          if (picker === "district") void selectDistrict(item);
          if (picker === "subDistrict") void selectSubDistrict(item);
          if (picker === "city") void selectCity(item);
          if (picker === "street") void selectStreet(item);
          if (picker === "house") selectHouse(item);
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  disabled,
  onClick,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-[11px] font-semibold tracking-[0.16em] text-faint uppercase">
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "mt-1.5 flex h-12 w-full items-center rounded-xl bg-surface px-4 text-left shadow-card",
          disabled && "opacity-55",
        )}
      >
        <span className={cn("flex-1 truncate text-base", value ? "text-ink" : "text-faint")}>
          {value || placeholder}
        </span>
        <ChevronRight className="size-5 text-faint" />
      </button>
    </label>
  );
}
