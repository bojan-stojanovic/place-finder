// api/photo.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Photo names look like "places/ChIJ.../photos/AUc..."
const PHOTO_NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const name = String(req.query.name ?? "");
  const width = Math.min(Math.max(Number(req.query.w) || 400, 100), 1200);

  if (!PHOTO_NAME.test(name)) {
    return res.status(400).json({ error: "Invalid photo" });
  }

  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  try {
    // Ask Google for the photo URL instead of following the redirect,
    // so the API key is never sent to the image host
    const meta = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${width}&skipHttpRedirect=true`,
      { headers: { "X-Goog-Api-Key": apiKey } },
    );
    if (!meta.ok) {
      return res.status(502).json({ error: "Photo request failed" });
    }

    const { photoUri } = (await meta.json()) as { photoUri?: string };
    if (!photoUri) {
      return res.status(502).json({ error: "Photo request failed" });
    }

    const image = await fetch(photoUri);
    if (!image.ok) {
      return res.status(502).json({ error: "Photo request failed" });
    }

    const bytes = Buffer.from(await image.arrayBuffer());
    res.setHeader("Content-Type", image.headers.get("content-type") ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=3600");
    return res.status(200).send(bytes);
  } catch {
    return res.status(502).json({ error: "Photo request failed" });
  }
}