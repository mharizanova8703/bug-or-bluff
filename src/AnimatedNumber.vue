<script setup>
import { ref, watch, onMounted } from 'vue'
import gsap from 'gsap'
import { reducedMotion } from '../lib/prefs'

const props = defineProps({ value: { type: Number, default: 0 }, duration: { type: Number, default: 1.1 } })
const shown = ref(props.value)

onMounted(() => (shown.value = props.value))
watch(
  () => props.value,
  (v) => {
    if (reducedMotion.value) return (shown.value = v)
    const state = { n: shown.value }
    gsap.to(state, { n: v, duration: props.duration, ease: 'power2.out', onUpdate: () => (shown.value = Math.round(state.n)) })
  }
)
</script>

<template>
  <span class="tabular-nums">{{ shown }}</span>
</template>
