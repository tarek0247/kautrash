import type { Address } from "./types";
import { findEcoserviceSchedule, providerRegion } from "./ecoservice-api.server";

export async function findSchedule(address: Address) {
  if (address.district === "Kauno m. sav." || address.district === "Kauno r. sav.") {
    return { address, collections: [], status: "verification_required" as const };
  }
  if (!providerRegion(address.district))
    return { address, collections: [], status: "unsupported" as const };
  try {
    const collections = await findEcoserviceSchedule(address);
    return {
      address,
      collections,
      status: collections.length ? ("ready" as const) : ("not_found" as const),
    };
  } catch {
    return { address, collections: [], status: "unavailable" as const };
  }
}
