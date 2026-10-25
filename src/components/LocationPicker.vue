<script setup lang="ts">
import { ref } from "vue";
import { useSearchStore } from "../stores/search";

const store = useSearchStore();
const locating = ref(false);
const geoError = ref("");

function useMyLocation() {
  // Ignore repeat clicks while a location request or a search is already running
  if (locating.value || store.status === "loading") return;

  if (!navigator.geolocation) {
    geoError.value = "Geolocation is not supported in this browser";
    return;
  }

  locating.value = true;
  geoError.value = "";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating.value = false;
      store.setCenter(pos.coords.latitude, pos.coords.longitude);
      store.search();
    },
    () => {
      locating.value = false;
      geoError.value = "Location access denied. Showing the default area.";
    },
    { timeout: 10_000 },
  );
}
</script>

<template>
  <div class="flex items-center gap-3">
    <button
      type="button"
      :disabled="locating || store.status === 'loading'"
      class="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition duration-150 hover:-translate-y-px hover:bg-slate-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100"
      @click="useMyLocation"
    >
      {{ locating ? "Locating…" : "Use my location" }}
    </button>
    <p v-if="geoError" class="text-sm text-amber-700">{{ geoError }}</p>
  </div>
</template>