import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const searchSchema = z.object({
  search: z.string().optional(),
});

const municipalitySchema = z.object({
  municipalityCode: z.number(),
  search: z.string().optional(),
});

const citySchema = z.object({
  municipalityCode: z.number(),
  eldershipCode: z.number().optional(),
  search: z.string().optional(),
});

const streetSchema = z.object({
  municipalityCode: z.number(),
  residentialAreaCode: z.number().optional(),
  search: z.string().optional(),
});

const houseSchema = z.object({
  streetCode: z.number(),
});

const addressSchema = z.object({
  district: z.string(),
  subDistrict: z.string().optional(),
  city: z.string().optional(),
  street: z.string(),
  houseNumber: z.string(),
});

const geoSchema = z.object({
  lat: z.number(),
  lon: z.number(),
});

export const getDistrictsFn = createServerFn({ method: "POST" })
  .validator(searchSchema)
  .handler(async ({ data }) => {
    const api = await import("./address-api.server");
    return api.listDistricts(data.search ?? "");
  });

export const getSubDistrictsFn = createServerFn({ method: "POST" })
  .validator(municipalitySchema)
  .handler(async ({ data }) => {
    const api = await import("./address-api.server");
    return api.listSubDistricts(data.municipalityCode, data.search ?? "");
  });

export const getCitiesFn = createServerFn({ method: "POST" })
  .validator(citySchema)
  .handler(async ({ data }) => {
    const api = await import("./address-api.server");
    return api.listCities(data.municipalityCode, data.eldershipCode, data.search ?? "");
  });

export const getStreetsFn = createServerFn({ method: "POST" })
  .validator(streetSchema)
  .handler(async ({ data }) => {
    const api = await import("./address-api.server");
    return api.listStreets(data.municipalityCode, data.residentialAreaCode, data.search ?? "");
  });

export const getHouseNumbersFn = createServerFn({ method: "POST" })
  .validator(houseSchema)
  .handler(async ({ data }) => {
    const api = await import("./address-api.server");
    return api.listHouseNumbers(data.streetCode);
  });

export const findScheduleFn = createServerFn({ method: "POST" })
  .validator(addressSchema)
  .handler(async ({ data }) => {
    const api = await import("./svara-api.server");
    const address = {
      district: data.district.trim(),
      subDistrict: (data.subDistrict ?? "").trim(),
      city: (data.city ?? "").trim(),
      street: data.street.trim(),
      houseNumber: data.houseNumber.trim(),
    };
    const collections = await api.findSchedule(address);
    return { address, collections };
  });

export const reverseGeocodeFn = createServerFn({ method: "POST" })
  .validator(geoSchema)
  .handler(async ({ data }) => {
    const api = await import("./address-api.server");
    return api.reverseGeocode(data.lat, data.lon);
  });
