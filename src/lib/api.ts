export type PlaceType = "hair_salon" | "nail_salon" | "fast_food_restaurant";

export const CATEGORIES: { value: PlaceType; label: string }[] = [
  { value: "hair_salon", label: "Hair salons" },
  { value: "nail_salon", label: "Nail salons" },
  { value: "fast_food_restaurant", label: "Fast food" },
];

export interface OpeningHours {
  openNow?: boolean;
  weekdayDescriptions?: string[];
}

export interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: { displayName: string; uri?: string }[];
}

export interface Place {
  id: string;
  displayName?: { text: string; languageCode?: string };
  rating?: number;
  userRatingCount?: number;
  location: { latitude: number; longitude: number };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: OpeningHours;
  photos?: PlacePhoto[];
}

/** URL of a photo through our proxy, so the browser never sees the API key */
export function photoUrl(name: string, width = 400): string {
  return `/api/photo?${new URLSearchParams({ name, w: String(width) })}`;
}

export async function fetchPlaces(lat: number, lng: number, type: PlaceType): Promise<Place[]> {
  // Rounding to 3 decimals (about 100 m) lets nearby searches share cache entries
  const params = new URLSearchParams({
    lat: lat.toFixed(3),
    lng: lng.toFixed(3),
    type,
  });

  const res = await fetch(`/api/places?${params}`);
  if (!res.ok) {
    throw new Error(`Places request failed (${res.status})`);
  }
  return res.json();
}