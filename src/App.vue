<script setup lang="ts">
import { onMounted } from "vue";
import CategoryFilter from "./components/CategoryFilter.vue";
import LocationPicker from "./components/LocationPicker.vue";
import MapView from "./components/MapView.vue";
import PlaceList from "./components/PlaceList.vue";
import { useSearchStore } from "./stores/search";
import CitySearch from "./components/CitySearch.vue";

const store = useSearchStore();

onMounted(() => store.search());
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50 text-slate-900 lg:h-dvh lg:overflow-hidden">
    <header class="shrink-0 border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <h1 class="text-xl font-bold">Place Finder</h1>
        <div class="flex flex-col gap-3 md:flex-row md:items-center">
          <CategoryFilter />
          <CitySearch />
          <LocationPicker />
        </div>
      </div>
    </header>

    <main
      class="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 lg:min-h-0 lg:grid-cols-[1fr_400px] lg:grid-rows-[minmax(0,1fr)]">
      <div class="h-[60vh] lg:h-full lg:min-h-0">
        <MapView />
      </div>
      <PlaceList />
    </main>

    <footer class="shrink-0 mx-auto w-full max-w-7xl px-4 pb-6 text-xs text-slate-500">
      Place data from Google. Ratings are weighted by review count.
    </footer>
  </div>
</template>