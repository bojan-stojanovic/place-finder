import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { fetchPlaces, type Place, type PlaceType } from "../lib/api";
import { rankPlaces } from "../lib/ranking";

// Demo default. Replace with the city you want as the fallback.
export const DEFAULT_CENTER = { lat: 44.8125, lng: 20.4612 };
export const DEFAULT_ZOOM = 14;

/** Same key as the API cache: coordinates rounded to 3 decimals plus category */
function searchKey(lat: number, lng: number, category: PlaceType) {
  return `${lat.toFixed(3)},${lng.toFixed(3)},${category}`;
}

export const useSearchStore = defineStore("search", () => {
  const center = ref({ ...DEFAULT_CENTER });
  const zoom = ref(DEFAULT_ZOOM);
  const category = ref<PlaceType>("hair_salon");
  const places = ref<Place[]>([]);
  const status = ref<"idle" | "loading" | "success" | "error">("idle");
  const errorMessage = ref("");
  const selectedId = ref<string | null>(null);

  // Used to discard responses from searches that were superseded
  let requestId = 0;
  // Key and promise of the request currently in flight
  let inFlightKey: string | null = null;
  let inFlight: Promise<void> | null = null;
  // Key of the results currently shown
  let loadedKey: string | null = null;

  const ranked = computed(() => rankPlaces(places.value));

  // With a selection, only the selected place is shown on the map
  const visiblePlaces = computed(() =>
    selectedId.value
      ? ranked.value.filter(({ place }) => place.id === selectedId.value)
      : ranked.value,
  );

  /**
   * Runs a search. Skips the request when the same search is already loading
   * or its results are already shown. Pass force to always fetch (used by Try again).
   */
  function search({ force = false } = {}): Promise<void> {
    const key = searchKey(center.value.lat, center.value.lng, category.value);

    if (!force) {
      if (key === inFlightKey && inFlight) return inFlight;
      if (key === loadedKey) return Promise.resolve();
    }

    const id = ++requestId;
    inFlightKey = key;
    status.value = "loading";
    errorMessage.value = "";
    selectedId.value = null;

    const { lat, lng } = center.value;
    const type = category.value;

    inFlight = (async () => {
      try {
        const result = await fetchPlaces(lat, lng, type);
        if (id !== requestId) return;
        places.value = result;
        loadedKey = key;
        status.value = "success";
      } catch (e) {
        if (id !== requestId) return;
        loadedKey = null;
        errorMessage.value = e instanceof Error ? e.message : "Something went wrong";
        status.value = "error";
      } finally {
        if (id === requestId) {
          inFlightKey = null;
          inFlight = null;
        }
      }
    })();

    return inFlight;
  }

  /** Moves the search center. A city search passes a lower zoom so the whole city fits. */
  function setCenter(lat: number, lng: number, nextZoom = DEFAULT_ZOOM) {
    center.value = { lat, lng };
    zoom.value = nextZoom;
  }

  function setCategory(value: PlaceType) {
    // Clicking the category that's already active does nothing
    if (value === category.value) return Promise.resolve();
    category.value = value;
    return search();
  }

  /** Selects a place. Selecting the same place again clears the selection. */
  function select(id: string) {
    selectedId.value = selectedId.value === id ? null : id;
  }

  function clearSelection() {
    selectedId.value = null;
  }

  return {
    center,
    zoom,
    category,
    places,
    ranked,
    visiblePlaces,
    selectedId,
    status,
    errorMessage,
    search,
    setCenter,
    setCategory,
    select,
    clearSelection,
  };
});