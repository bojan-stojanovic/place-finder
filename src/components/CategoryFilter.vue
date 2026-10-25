<script setup lang="ts">
import { CATEGORIES } from "../lib/api";
import { useSearchStore } from "../stores/search";

const store = useSearchStore();
</script>

<template>
  <div role="radiogroup" aria-label="Place category" class="flex flex-wrap gap-2">
    <button v-for="c in CATEGORIES" :key="c.value" type="button" role="radio" :aria-checked="store.category === c.value"
      class="cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95"
      :class="store.category === c.value
          ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm'
        " @click="store.setCategory(c.value)">
      {{ c.label }}
    </button>
  </div>
</template>