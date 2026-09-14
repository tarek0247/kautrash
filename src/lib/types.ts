export type Lang = "en" | "lt";

export type WasteTypeId = "mixed" | "paper" | "glass" | "organic";

export type Address = {
  district: string;
  subDistrict: string;
  city: string;
  street: string;
  houseNumber: string;
};

export type CollectionDate = {
  iso: string;
  year: number;
  month: number;
  day: number;
};

export type Collection = {
  id: string;
  wasteObjectId: number;
  title: string;
  titleLt: string;
  wasteType: WasteTypeId;
  frequency: string;
  frequencyLt: string;
  address: string;
  street: string;
  house: string;
  containerFmt?: string;
  containerCount: number;
  hashedId?: string;
  subscriptionUrl?: string;
  dates: CollectionDate[];
};

export type NamedOption = {
  code?: number | string;
  name: string;
};

export type PageId = "home" | "calendar" | "settings";
