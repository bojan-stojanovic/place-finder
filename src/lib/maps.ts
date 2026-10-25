import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_KEY,
  v: "weekly",
});

export function loadMapsLibraries() {
  return Promise.all([
    importLibrary("maps"),
    importLibrary("marker"),
  ]);
}

/** Loaded on demand, so the Places code only downloads when the city search is used */
export function loadPlacesLibrary() {
  return importLibrary("places");
}