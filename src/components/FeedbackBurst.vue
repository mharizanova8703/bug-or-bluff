<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import gsap from 'gsap'
import { reducedMotion } from '../lib/prefs'
import { play } from '../lib/sound'

// 🎃 pumpkin party for a right answer, 👻 ghost for a wrong one or no answer.
const props = defineProps({
  kind: { type: String, required: true }, // 'correct' | 'wrong' | 'none'
  points: { type: Number, default: 0 }
})

const el = ref(null)
const emoji = { correct: '🎃', wrong: '👻', none: '🦗' }
const title = {
  correct: 'Correct!',
  wrong: 'Boo! Not quite…',
  none: 'No answer'
}
const sub = {
  correct: 'Pumpkin power! 🎃',
  wrong: 'The ghost got you this time.',
  none: 'Too slow — the crickets answered for you.'
}

async function animate() {
  await nextTick()
  if (!el.value) return
  play(props.kind === 'correct' ? 'correct' : 'wrong')
  if (reducedMotion.value) return
  const big = el.value.querySelector('[data-emoji]')
  if (props.kind === 'correct') {
    gsap.fromTo(big, { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' })
    gsap.to(big, { y: -10, repeat: -1, yoyo: true, duration: 0.6, ease: 'sine.inOut', delay: 0.7 })
  } else {
    gsap.fromTo(big, { y: 80, opacity: 0, scale: 0.6 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' })
    gsap.to(big, { x: 12, repeat: -1, yoyo: true, duration: 1.2, ease: 'sine.inOut', delay: 0.8 })
  }
}
onMounted(animate)
watch(() => props.kind, animate)
</script>

<template>
  <div
    ref="el"
    class="rounded-3xl border-2 p-5 text-center"
    :class="kind === 'correct' ? 'border-slime bg-slime/10' : kind === 'wrong' ? 'border-bubblegum bg-bubblegum/10' : 'border-grape/40 bg-dusk'"
  >
    <div data-emoji class="text-7xl sm:text-8xl" aria-hidden="true">{{ emoji[kind] }}</div>
    <p class="mt-2 text-3xl font-bold" :class="kind === 'correct' ? 'text-slime' : kind === 'wrong' ? 'text-bubblegum' : 'text-mist'">
      {{ title[kind] }}
    </p>
    <p class="text-mist-dim">{{ sub[kind] }}</p>
    <p v-if="kind === 'correct'" class="mt-1 text-2xl font-bold text-pumpkin">+{{ points }} points</p>
  </div>
</template>
