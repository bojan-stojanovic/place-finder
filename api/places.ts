// api/places.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const QUERIES: Record<string, string> = {
  hair_salon: "hair salon",
  nail_salon: "nail salon",
  fast_food_restaurant: "fast food restaurant",
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.rating",
  "places.userRatingCount",
  "places.location",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.regularOpeningHours",
  "places.photos",
  "nextPageToken",
].join(",");

const MAX_PAGES = 3;
const RADIUS_METERS = 5000;
const MAX_PHOTOS_PER_PLACE = 6;

/** Keeps only the fields the frontend uses, so the response stays small */
function trimPlace(place: any) {
  return {
    ...place,
    photos: (place.photos ?? []).slice(0, MAX_PHOTOS_PER_PLACE).map((p: any) => ({
      name: p.name,
      widthPx: p.widthPx,
      heightPx: p.heightPx,
      authorAttributions: p.authorAttributions,
    })),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const type = String(req.query.type ?? "");

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({ error: "Invalid latitude" });
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Invalid longitude" });
  }
  const textQuery = QUERIES[type];
  if (!textQuery) {
    return res.status(400).json({ error: "Unsupported category" });
  }

  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  try {
    const places: unknown[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const upstream = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: 20,
          locationBias: {
            circle: { center: { latitude: lat, longitude: lng }, radius: RADIUS_METERS },
          },
          ...(pageToken ? { pageToken } : {}),
        }),
      });

      if (!upstream.ok) {
        return res.status(502).json({ error: "Places request failed" });
      }

      const data = (await upstream.json()) as { places?: any[]; nextPageToken?: string };
      places.push(...(data.places ?? []).map(trimPlace));

      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;

      // Google needs a moment before a new page token becomes valid
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json(places);
  } catch {
    return res.status(502).json({ error: "Places request failed" });
  }
}