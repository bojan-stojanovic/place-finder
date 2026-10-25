<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { loadMapsLibraries } from "../lib/maps";
import { photoUrl, type Place } from "../lib/api";
import { useSearchStore } from "../stores/search";


const store = useSearchStore();
const container = ref<HTMLDivElement>();
const map = shallowRef<google.maps.Map>();
let infoWindow: google.maps.InfoWindow | null = null;
let markers: { id: string; marker: google.maps.marker.AdvancedMarkerElement }[] = [];

/** Builds a pin with the place name next to it. Uses textContent, so names are never parsed as HTML. */
function createMarkerContent(name: string, selected: boolean) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex cursor-pointer items-center gap-1";

  const pin = document.createElement("div");
  pin.className = selected
    ? "h-5 w-5 rounded-full border-2 border-white bg-indigo-600 shadow-lg"
    : "h-4 w-4 rounded-full border-2 border-white bg-slate-700 shadow";

  const label = document.createElement("span");
  label.className =
    "whitespace-nowrap rounded bg-white px-2 py-0.5 text-xs font-medium text-slate-900 shadow";
  label.textContent = name;

  wrapper.append(pin, label);
  return wrapper;
}

function el(tag: string, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Builds the popover body. Every value goes through textContent, never innerHTML. */
/** Builds the popover body. Every value goes through textContent, never innerHTML. */
function buildPopover(place: Place, score: number) {
  const root = el("div", "w-80 p-1 text-slate-900");

  if (place.photos?.length) {
    root.append(buildPhotos(place));
  }

  const header = el("div", "mt-3 flex items-start justify-between gap-2");
  header.append(el("h3", "text-base font-semibold", place.displayName?.text ?? "Unnamed place"));

  const openNow = place.regularOpeningHours?.openNow;
  if (openNow !== undefined) {
    header.append(
      el(
        "span",
        `shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          openNow ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
        }`,
        openNow ? "Open now" : "Closed",
      ),
    );
  }

  root.append(
    header,
    el("p", "mt-1 text-sm text-slate-600", place.formattedAddress ?? "Address unavailable"),
  );

  const stats = el("div", "mt-3 grid grid-cols-3 gap-2 text-center");
  const stat = (label: string, value: string) => {
    const box = el("div", "rounded-lg bg-slate-100 px-2 py-1.5");
    box.append(el("p", "text-sm font-semibold", value), el("p", "text-xs text-slate-500", label));
    return box;
  };
  stats.append(
    stat("Rating", typeof place.rating === "number" ? `★ ${place.rating.toFixed(1)}` : "–"),
    stat("Reviews", String(place.userRatingCount ?? 0)),
    stat("Score", score.toFixed(2)),
  );
  root.append(stats);

  if (place.nationalPhoneNumber) {
    const phone = document.createElement("a");
    phone.href = `tel:${place.nationalPhoneNumber.replace(/[^\d+]/g, "")}`;
    phone.className = "mt-3 inline-block text-sm font-medium text-indigo-600 underline underline-offset-2";
    phone.textContent = place.nationalPhoneNumber;
    root.append(phone);
  }

  const hours = place.regularOpeningHours?.weekdayDescriptions;
  if (hours?.length) {
    const details = document.createElement("details");
    details.className = "mt-3 text-sm";

    const summary = el("summary", "cursor-pointer font-medium text-slate-800", "Working hours");
    const list = el("ul", "mt-2 space-y-1 text-xs text-slate-600");
    list.append(...hours.map((line) => el("li", "", line)));

    details.append(summary, list);
    root.append(details);
  }

  return root;
}

/** Horizontal photo strip with the photographer's name, as Google's terms require */
function buildPhotos(place: Place) {
  const wrap = el("div", "-mx-1");
  const row = el("div", "flex snap-x gap-2 overflow-x-auto px-1 pb-1");

  for (const photo of place.photos ?? []) {
    const img = document.createElement("img");
    img.src = photoUrl(photo.name, 400);
    img.alt = place.displayName?.text ?? "Place photo";
    img.loading = "lazy";
    img.className = "h-28 w-40 shrink-0 snap-start rounded-lg bg-slate-100 object-cover";
    row.append(img);
  }

  wrap.append(row);

  const author = place.photos?.[0]?.authorAttributions?.[0]?.displayName;
  if (author) {
    wrap.append(el("p", "mt-1 text-[10px] text-slate-400", `Photo: ${author}`));
  }

  return wrap;
}

function clearMarkers() {
  markers.forEach(({ marker }) => (marker.map = null));
  markers = [];
}

/** Opens the popover above the selected pin, or closes it when nothing is selected. */
function updatePopover() {
  if (!map.value || !infoWindow) return;

  const id = store.selectedId;
  const item = id ? store.ranked.find(({ place }) => place.id === id) : undefined;
  const entry = id ? markers.find((m) => m.id === id) : undefined;

  if (!item || !entry) {
    infoWindow.close();
    return;
  }

  infoWindow.setContent(buildPopover(item.place, item.weightedRating));
  infoWindow.open({ anchor: entry.marker, map: map.value });
}

function renderMarkers() {
  if (!map.value) return;
  clearMarkers();

  markers = store.visiblePlaces.map(({ place }) => {
    const name = place.displayName?.text ?? "";
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: map.value,
      position: {
        lat: place.location.latitude,
        lng: place.location.longitude,
      },
      title: name,
      content: createMarkerContent(name, place.id === store.selectedId),
    });

    // Clicking a pin selects that place, same as clicking its list card
    marker.addEventListener("gmp-click", () => store.select(place.id));
    return { id: place.id, marker };
  });

  updatePopover();
}

onMounted(async () => {
  try {
    await loadMapsLibraries();
    map.value = new google.maps.Map(container.value!, {
      center: { ...store.center },
      zoom: 14,
      mapId: import.meta.env.VITE_GOOGLE_MAP_ID,
    });

    infoWindow = new google.maps.InfoWindow({
      pixelOffset: new google.maps.Size(0, -28),
    });

    // Closing the popover deselects the place and shows all pins again
    infoWindow.addListener("closeclick", () => store.clearSelection());

    // Clicking empty map space clears the selection
    map.value.addListener("click", () => store.clearSelection());

    renderMarkers();
  } catch (err) {
    console.error("Failed to load Google Maps", err);
  }
});

// Re-render pins when results or the selection change. Rendering also updates the popover.
watch(() => [store.visiblePlaces, store.selectedId], renderMarkers);

// Pan to the selected place
watch(
  () => store.selectedId,
  (id) => {
    if (!id || !map.value) return;
    const selected = store.ranked.find(({ place }) => place.id === id);
    if (!selected) return;
    map.value.panTo({
      lat: selected.place.location.latitude,
      lng: selected.place.location.longitude,
    });
  },
);

watch(
  () => store.center,
  (c) => map.value?.panTo({ lat: c.lat, lng: c.lng }),
  { deep: true },
);

onBeforeUnmount(() => {
  clearMarkers();
  infoWindow?.close();
});
</script>

<template>
  <div
    ref="container"
    role="region"
    aria-label="Map of nearby places"
    class="h-full w-full overflow-hidden rounded-2xl border border-slate-200"
  />
</template>