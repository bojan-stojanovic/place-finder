<script setup lang="ts">
import { nextTick, watch } from "vue";
import { useSearchStore } from "../stores/search";

const store = useSearchStore();

// When a pin is clicked on the map, bring its card into view in the list
watch(
  () => store.selectedId,
  async (id) => {
    if (!id) return;
    await nextTick();
    document
      .getElementById(`place-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },
);
</script>

<template>
  <!--
    Mobile: normal page flow, the whole page scrolls.
    Desktop (lg): fills the height of the layout and scrolls on its own.
  -->
  <section
    aria-label="Ranked places"
    class="space-y-3 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-2"
  >
    <div
      v-if="store.selectedId"
      class="sticky top-0 z-10 flex items-center justify-between bg-slate-50 py-1"
    >
      <p class="text-sm text-slate-600">Showing 1 place on the map</p>
      <button
        type="button"
        class="cursor-pointer rounded text-sm font-medium text-indigo-600 underline underline-offset-2 transition hover:text-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        @click="store.clearSelection()"
      >
        Show all
      </button>
    </div>

    <template v-if="store.status === 'loading'">
      <div
        v-for="n in 5"
        :key="n"
        class="h-20 animate-pulse rounded-xl bg-slate-200"
      />
    </template>

    <div
      v-else-if="store.status === 'error'"
      role="alert"
      class="rounded-xl bg-red-50 p-4 text-sm text-red-700"
    >
      {{ store.errorMessage }}.
      <button
        type="button"
        class="cursor-pointer rounded font-medium underline underline-offset-2 transition hover:text-red-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        @click="store.search({ force: true })"
      >
        Try again
      </button>
    </div>

    <p
      v-else-if="store.status === 'success' && store.ranked.length === 0"
      class="text-slate-600"
    >
      No places found in this area. Try a different location.
    </p>

    <ul v-else class="space-y-3">
      <li v-for="{ place, weightedRating } in store.ranked" :key="place.id">
        <button
          :id="`place-${place.id}`"
          type="button"
          :aria-pressed="store.selectedId === place.id"
          class="w-full cursor-pointer rounded-xl border p-4 text-left shadow-sm transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
          :class="
            store.selectedId === place.id
              ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600'
              : 'border-slate-200 bg-white hover:border-slate-300'
          "
          @click="store.select(place.id)"
        >
          <div class="flex justify-between gap-4">
            <div class="min-w-0">
              <h3 class="truncate font-semibold text-slate-900">
                {{ place.displayName?.text }}
              </h3>
              <p class="text-sm text-slate-500">{{ place.formattedAddress }}</p>
            </div>
            <div class="shrink-0 text-right text-sm">
              <p class="font-semibold">★ {{ place.rating?.toFixed(1) ?? "–" }}</p>
              <p class="text-slate-500">{{ place.userRatingCount ?? 0 }} reviews</p>
              <p class="text-xs text-slate-400">Score {{ weightedRating.toFixed(2) }}</p>
            </div>
          </div>
        </button>
      </li>
    </ul>
  </section>
</template>