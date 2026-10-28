<script setup>
import { ref } from 'vue'
import { reducedMotion } from '../lib/prefs'

// Floating emoji reactions. Call spawn() from the parent via a template ref.
const items = ref([])
let id = 0

function spawn({ emoji, name }) {
  // cap on-screen reactions so 25 excited players can't melt a phone
  if (items.value.length > 40) items.value.shift()
  const key = ++id
  items.value.push({ key, emoji, name, left: 8 + Math.random() * 84, dur: 2.6 + Math.random() * 1.6 })
  setTimeout(() => (items.value = items.value.filter((i) => i.key !== key)), 4500)
}
defineExpose({ spawn })
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
    <div
      v-for="i in items"
      :key="i.key"
      class="absolute bottom-0 flex flex-col items-center"
      :style="{
        left: i.left + '%',
        animation: reducedMotion ? 'none' : `float-up ${i.dur}s ease-out forwards`,
        bottom: reducedMotion ? '40%' : '0'
      }"
    >
      <span class="text-5xl drop-shadow-lg">{{ i.emoji }}</span>
      <span class="mt-1 max-w-[7rem] truncate rounded-full bg-midnight/80 px-2 py-0.5 text-xs text-mist">{{ i.name }}</span>
    </div>
  </div>
</template>
