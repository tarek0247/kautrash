import type { WasteTypeId } from "./types";

export const WASTE_TYPES: {
  id: WasteTypeId;
  nameEn: string;
  nameLt: string;
  hintEn: string;
  hintLt: string;
  bodyEn: string;
  bodyLt: string;
  yesEn: string[];
  yesLt: string[];
  noEn: string[];
  noLt: string[];
}[] = [
  {
    id: "mixed",
    nameEn: "Mixed waste",
    nameLt: "Mišrios atliekos",
    hintEn: "Grey / black bin",
    hintLt: "Pilkas / juodas konteineris",
    bodyEn:
      "Household leftovers that cannot be recycled or composted. Keep bags tied and put the bin out the evening before collection.",
    bodyLt:
      "Buitinės atliekos, kurių negalima perdirbti ar kompostuoti. Maišus suriškite ir konteinerį pastatykite vakare prieš išvežimą.",
    yesEn: ["Dirty packaging", "Hygiene products", "Broken ceramics", "Vacuum dust"],
    yesLt: ["Nešvarūs pakuočių likučiai", "Higienos priemonės", "Sudužusi keramika", "Dulkių siurblio turinys"],
    noEn: ["Glass bottles", "Clean paper", "Garden waste", "Electronics"],
    noLt: ["Stiklo buteliai", "Švarus popierius", "Žaliosios atliekos", "Elektronika"],
  },
  {
    id: "paper",
    nameEn: "Paper & plastic",
    nameLt: "Popierius ir plastikas",
    hintEn: "Yellow / blue packaging bin",
    hintLt: "Geltonas / mėlynas pakuočių konteineris",
    bodyEn:
      "Clean, dry packaging collected as secondary raw materials. Rinse food trays and flatten cardboard so the truck can take more.",
    bodyLt:
      "Švarios, sausos pakuotės, surenkamos kaip antrinės žaliavos. Išskalaukite indelius ir suplokštinkite kartoną.",
    yesEn: ["Newspapers & cardboard", "Plastic bottles", "Metal cans", "Clean tetra packs"],
    yesLt: ["Laikraščiai ir kartonas", "Plastikiniai buteliai", "Metalinės skardinės", "Švarūs tetra pakai"],
    noEn: ["Greasy pizza boxes", "Cling film with food", "Receipts", "Styrofoam peanuts"],
    noLt: ["Riebaluotos picos dėžės", "Plėvelė su maistu", "Kasiniai čekiai", "Putplastis"],
  },
  {
    id: "glass",
    nameEn: "Glass",
    nameLt: "Stiklas",
    hintEn: "Green / white glass bin",
    hintLt: "Žalias / baltas stiklo konteineris",
    bodyEn:
      "Bottles and jars only. Remove lids when you can. Do not bag glass — it belongs loose in the container.",
    bodyLt:
      "Tik buteliai ir stiklainiai. Dangtelius nuimkite. Stiklo nemeskite maišuose — jis turi būti palaidas.",
    yesEn: ["Wine & beer bottles", "Jam jars", "Cosmetic glass"],
    yesLt: ["Vyno ir alaus buteliai", "Stiklainiai", "Kosmetikos stiklas"],
    noEn: ["Window panes", "Mirrors", "Light bulbs", "Ceramics"],
    noLt: ["Langų stiklai", "Veidrodžiai", "Lemputės", "Keramika"],
  },
  {
    id: "organic",
    nameEn: "Green waste",
    nameLt: "Žaliosios atliekos",
    hintEn: "Brown garden bin",
    hintLt: "Rudas sodo konteineris",
    bodyEn:
      "Garden and park waste collected on a seasonal rhythm, usually April–November. Keep it free of soil, stones and plastic pots.",
    bodyLt:
      "Sodo ir parko atliekos, dažniausiai renkamos balandį–lapkritį. Be žemės, akmenų ir plastikinių vazonų.",
    yesEn: ["Grass clippings", "Leaves", "Small branches", "Weeds"],
    yesLt: ["Nupjauta žolė", "Lapai", "Smulkios šakos", "Piktžolės"],
    noEn: ["Cooked food", "Soil & stones", "Plastic plant pots", "Animal waste"],
    noLt: ["Termiškai apdorotas maistas", "Žemė ir akmenys", "Plastikiniai vazonai", "Gyvūnų atliekos"],
  },
];

export function wasteTypeFromDescription(description: string): WasteTypeId {
  const value = description.toLowerCase();
  if (value.includes("stikl")) return "glass";
  if (value.includes("popier") || value.includes("plastik") || value.includes("antrin")) {
    if (value.includes("stikl")) return "glass";
    return "paper";
  }
  if (value.includes("žali") || value.includes("zali")) return "organic";
  return "mixed";
}

export function titlesFromDescription(description: string): { en: string; lt: string } {
  const type = wasteTypeFromDescription(description);
  const row = WASTE_TYPES.find((item) => item.id === type);
  if (type === "mixed" && !/mišr|misr|komunal/i.test(description)) {
    return { en: description, lt: description };
  }
  return {
    en: row?.nameEn ?? description,
    lt: row?.nameLt ?? description,
  };
}

export function translateFrequency(raw: string): string {
  if (!raw) return "Scheduled collection";
  const everyDays = raw.match(/kas\s+(\d+)\s+dien/i);
  if (everyDays) return `Every ${everyDays[1]} days`;
  const everyWeeks = raw.match(/kas\s+(\d+)\s+savait/i);
  if (everyWeeks) return `Every ${everyWeeks[1]} weeks`;
  if (/kas savait/i.test(raw)) return "Every week";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
