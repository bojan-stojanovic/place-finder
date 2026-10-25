<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from "vue";
import { loadPlacesLibrary } from "../lib/maps";
import { useSearchStore } from "../stores/search";

type PlacePrediction = google.maps.places.PlacePrediction;

const CITY_ZOOM = 12;
const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

const store = useSearchStore();
const query = ref("");
// shallowRef keeps Google's prediction objects from being wrapped in a Vue proxy
const suggestions = shallowRef<PlacePrediction[]>([]);
const open = ref(false);
const loading = ref(false);
const activeIndex = ref(-1);
const errorText = ref("");
const wrapper = ref<HTMLDivElement>();

// One session token covers all the keystrokes for one city choice,
// so Google bills the session once instead of per request
let sessionToken: google.maps.places.AutocompleteSessionToken | null = null;
let debounceTimer: number | undefined;
let requestId = 0;

function onInput() {
  window.clearTimeout(debounceTimer);
  const text = query.value.trim();

  if (text.length < MIN_CHARS) {
    suggestions.value = [];
    open.value = false;
    return;
  }

  debounceTimer = window.setTimeout(() => fetchSuggestions(text), DEBOUNCE_MS);
}

async function fetchSuggestions(text: string) {
  const id = ++requestId;
  loading.value = true;
  errorText.value = "";

  try {
    const { AutocompleteSuggestion, AutocompleteSessionToken } = await loadPlacesLibrary();
    sessionToken ??= new AutocompleteSessionToken();

    const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: text,
      sessionToken,
      includedPrimaryTypes: ["locality"], // cities and towns only
    });

    if (id !== requestId) return;

    suggestions.value = results
      .map((s) => s.placePrediction)
      .filter((p): p is PlacePrediction => p !== null);
    activeIndex.value = -1;
    open.value = true;
  } catch (err) {
    if (id !== requestId) return;
    console.error("City search failed", err);
    suggestions.value = [];
    errorText.value = "Couldn't load city suggestions.";
    open.value = true;
  } finally {
    if (id === requestId) loading.value = false;
  }
}

async function choose(prediction: PlacePrediction) {
  // Ignore new selections while a city is already being loaded
  if (loading.value) return;

  open.value = false;
  loading.value = true;
  errorText.value = "";

  try {
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ["location"] });

    const location = place.location;
    if (!location) throw new Error("No location returned");

    query.value = prediction.mainText?.text ?? prediction.text.text;
    sessionToken = null; // the session ends with the selection

    store.setCenter(location.lat(), location.lng(), CITY_ZOOM);
    await store.search();
  } catch (err) {
    console.error("Could not load city location", err);
    errorText.value = "Couldn't load that city. Try another.";
  } finally {
    loading.value = false;
  }
}

function onKeydown(e: KeyboardEvent) {
  const count = suggestions.value.length;

  if (e.key === "Escape") {
    open.value = false;
    return;
  }
  if (!open.value || count === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % count;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex.value = activeIndex.value <= 0 ? count - 1 : activeIndex.value - 1;
  } else if (e.key === "Enter" && activeIndex.value >= 0) {
    e.preventDefault();
    if (!loading.value) choose(suggestions.value[activeIndex.value]);
  }
}

function onFocusOut(e: FocusEvent) {
  // Close only when focus leaves the whole component, not when it moves to a suggestion
  if (!wrapper.value?.contains(e.relatedTarget as Node | null)) {
    open.value = false;
  }
}

onBeforeUnmount(() => window.clearTimeout(debounceTimer));
</script>

<template>
  <div ref="wrapper" class="relative w-full md:w-72" @focusout="onFocusOut">
    <label for="city-search" class="sr-only">Search for a city</label>
    <div class="relative">
      <input
        id="city-search"
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        placeholder="Search a city…"
        aria-autocomplete="list"
        :aria-expanded="open"
        aria-controls="city-suggestions"
        :aria-activedescendant="activeIndex >= 0 ? `city-option-${activeIndex}` : undefined"
        class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-9 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        @input="onInput"
        @keydown="onKeydown"
        @focus="onInput"
      />
      <span
        v-if="loading"
        class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
        aria-hidden="true"
      />
    </div>

    <ul
      v-show="open"
      id="city-suggestions"
      role="listbox"
      aria-label="City suggestions"
      class="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
    >
      <li
        v-for="(p, i) in suggestions"
        :id="`city-option-${i}`"
        :key="p.placeId"
        role="option"
        :aria-selected="i === activeIndex"
        class="cursor-pointer px-4 py-2 text-sm"
        :class="i === activeIndex ? 'bg-indigo-50 text-indigo-900' : 'text-slate-800 hover:bg-slate-50'"
        @mousedown.prevent="choose(p)"
        @mouseenter="activeIndex = i"
      >
        <span class="font-medium">{{ p.mainText?.text ?? p.text.text }}</span>
        <span v-if="p.secondaryText" class="ml-1 text-slate-500">{{ p.secondaryText.text }}</span>
      </li>

      <li v-if="errorText" class="px-4 py-2 text-sm text-red-700">{{ errorText }}</li>
      <li
        v-else-if="!loading && suggestions.length === 0 && query.trim().length >= MIN_CHARS"
        class="px-4 py-2 text-sm text-slate-500"
      >
        No cities found
      </li>
    </ul>
  </div>
</template>