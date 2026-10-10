export type ScheduleSource = { name: string; url: string; operatorCheck?: boolean };

// These city pages are linked from Ecoservice's public 2026 schedule directory.
const ecoservicePages: Record<string, string> = {
  "Biržų r. sav.": "birzugrafikai",
  "Jurbarko r. sav.": "jurbarkografikai",
  "Kalvarijos sav.": "kalvarijosgrafikai",
  "Kazlų Rūdos sav.": "kazlurudosgrafikai",
  "Klaipėdos m. sav.": "klaipedosgrafikai",
  "Lazdijų r. sav.": "lazdijugrafikai",
  "Marijampolės sav.": "marijampolesgrafikai",
  "Mažeikių r. sav.": "mazeikiugrafikai",
  "Pagėgių sav.": "pagegiugrafikai",
  "Plungės r. sav.": "plungesgrafikai",
  "Radviliškio r. sav.": "radviliskiografikai",
  "Šakių r. sav.": "sakiugrafikai",
  "Šalčininkų r. sav.": "salcininkugrafikai",
  "Šiaulių m. sav.": "siauliugrafikai",
  "Trakų r. sav.": "trakugrafikai",
  "Vilkaviškio r. sav.": "vilkaviskiografikai",
};

export function scheduleSources(district: string): ScheduleSource[] {
  if (district === "Kauno m. sav." || district === "Kauno r. sav.")
    return [{ name: "Švara / Švara ID", url: "https://grafikai.svara.lt/", operatorCheck: true }];
  const sources: ScheduleSource[] = [];
  if (district === "Vilniaus m. sav.")
    sources.push({ name: "VASA", url: "https://vasa.lt/atlieku-isvezimo-grafikai" });
  if (district === "Alytaus m. sav." || district === "Alytaus r. sav.")
    sources.push({ name: "ARATC", url: "https://www.aratc.lt/atlieku-surinkimo-grafikai/" });
  if (district === "Klaipėdos m. sav.")
    sources.push({ name: "KRATC", url: "https://www.kratc.lt/lt/klaipeda/atlieku-surinkimo-tvarka-grafikai/" });
  if (district === "Šiaulių m. sav." || district === "Šiaulių r. sav.")
    sources.push({ name: "ŠRATC", url: "https://www.sratc.lt/kalendoriaus-grafikai/" });
  const page = ecoservicePages[district];
  sources.push({
    name: "Ecoservice",
    url: page ? `https://ecoservice.lt/${page}/` : "https://ecoservice.lt/grafikai/",
    operatorCheck: true,
  });
  return sources;
}
