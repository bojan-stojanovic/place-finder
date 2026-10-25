# Place Finder

A map-based finder for hair salons, nail salons, and fast food restaurants. Pick a category, search a city or use your location, and see places ranked by a weighted rating that accounts for how many reviews each place has.

## Features

- **Category filter** for hair salons, nail salons, and fast food
- **City search** with Google Places Autocomplete, debounced and billed per session
- **"Use my location"** with a clear fallback when location access is denied
- **Ranked list and map** that stay in sync. Click a card or a pin to highlight the other
- **Popover details** with photos, opening hours, open-now status, phone number, and the place's score
- **Responsive layout**: a scrolling list beside the map on desktop, and a normal page scroll on mobile
- **Accessible controls**: keyboard navigation, ARIA roles and states, focus rings, and reduced motion support

## How ranking works

Ranking by raw average rating is misleading. A place with a 5.0 from two reviews would beat one with a 4.7 from 2,000 reviews. SalonFinder uses a Bayesian average to pull places with few reviews toward the average of the current results:

```
weightedRating = (v / (v + m)) * R + (m / (v + m)) * C
```

- `R` is the place's average rating
- `v` is its number of reviews
- `m` is the minimum-reviews threshold (25 by default)
- `C` is the mean rating of the places in the current result set

Places without ratings are kept in the list and sorted to the bottom. The function is pure and covered by unit tests in `src/lib/ranking.test.ts`.

## Architecture

```
Browser (Vue 3 + Vite + Pinia)
  │  GET /api/places?lat=&lng=&type=
  │  GET /api/photo?name=&w=
  ▼
Vercel serverless functions (api/)
  │  adds PLACES_API_KEY from the environment
  ▼
Google Places API (New)
  searchText (up to 60 results over 3 pages)
  media (photo URLs)

Browser also loads:
  Google Maps JavaScript API (map, markers, popover)
  Places Autocomplete (city search)
```

The Places key never reaches the browser. The browser only calls the two `/api` functions, which validate their inputs before spending a billable request.

## Design decisions

- **Text Search instead of Nearby Search.** Google Maps' "hair salon" search also returns barbershops and beauty salons, which Nearby Search with a single type misses. Text Search matches the results people see on maps.google.com more closely.
- **Serverless proxy instead of a standalone backend.** The function only exists to hide the key and set cache headers, so it's small enough to keep in the same repository as the frontend.
- **Edge caching.** Search responses are cached for five minutes at Vercel's CDN, and photo responses for a day. Identical searches share one billable request.
- **Coordinates rounded to about 100 m.** Nearby searches share cache entries.
- **Photo proxy.** Photos are fetched through `/api/photo`, so the Places key never appears in image URLs or the browser.
- **Duplicate searches are skipped.** The Pinia store ignores a request for the same category and location that's already loaded or in progress.
- **Markers use `AdvancedMarkerElement`** with a vector Map ID, which the current