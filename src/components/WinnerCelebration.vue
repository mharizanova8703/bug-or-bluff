<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import gsap from 'gsap'
import confetti from 'canvas-confetti'
import { reducedMotion } from '../lib/prefs'
import { play } from '../lib/sound'

const props = defineProps({
  players: { type: Array, required: true }, // sorted
  meId: { type: String, default: '' }
})

const root = ref(null)
let confettiTimer
const colors = ['#A855F7', '#FF8C32', '#7CFF8A', '#FF4FC3', '#F5EEFF']

function podiumOrder() {
  const [a, b, c] = props.players
  return [
    b && { p: b, place: 2, h: 'h-28', medal: '🥈' },
    a && { p: a, place: 1, h: 'h-40', medal: '🥇' },
    c && { p: c, place: 3, h: 'h-20', medal: '🥉' }
  ].filter(Boolean)
}
const podium = podiumOrder()

onMounted(async () => {
  play('win')
  await nextTick()
  if (reducedMotion.value) return
  gsap.from('[data-podium]', { y: 120, opacity: 0, duration: 0.9, stagger: 0.25, ease: 'back.out(1.6)', delay: 0.4 })
  gsap.from('[data-crown]', { y: -60, opacity: 0, scale: 0.4, duration: 1, ease: 'elastic.out(1, 0.5)', delay: 1.1 })
  gsap.from('[data-winner-name]', { scale: 0.3, opacity: 0, duration: 0.9, ease: 'back.out(2)', delay: 0.2 })
  const burst = () =>
    confetti({ particleCount: 70, spread: 80, startVelocity: 45, origin: { x: Math.random(), y: 0.2 }, colors, disableForReducedMotion: true })
  burst()
  confettiTimer = setInterval(burst, 1100)
  setTimeout(() => clearInterval(confettiTimer), 9000)
})
onBeforeUnmount(() => {
  clearInterval(confettiTimer)
  confetti.reset()
})
</script>

<template>
  <section ref="root" class="relative text-center" aria-labelledby="winner-title">
    <p class="flex justify-center gap-6 text-5xl" aria-hidden="true">
      <span class="anim-float">👻</span><span class="anim-float" style="animation-delay: 0.6s">🎃</span
      ><span class="anim-float" style="animation-delay: 1.2s">👻</span>
    </p>
    <h2 id="winner-title" data-focus tabindex="-1" class="font-display text-4xl text-pumpkin glow-text sm:text-6xl">
      👑 THE ULTIMATE BUG HUNTER!
    </h2>
    <p v-if="players[0]" data-winner-name class="mt-3 break-words text-5xl font-bold text-slime sm:text-7xl" style="text-shadow: 0 0 30px rgba(124, 255, 138, 0.6)">
      {{ players[0].nickname }}
    </p>
    <p v-if="players[0]" class="mt-1 text-xl text-mist-dim">
      {{ players[0].score }} points · {{ players[0].correct_count }} correct
    </p>

    <ol class="mx-auto mt-8 flex max-w-xl items-end justify-center gap-2 sm:gap-4" aria-label="Podium">
      <li v-for="s in podium" :key="s.p.id" data-podium class="flex w-1/3 flex-col items-center">
        <span v-if="s.place === 1" data-crown class="text-4xl" aria-hidden="true">👑</span>
        <span class="mb-1 max-w-full truncate px-1 text-lg font-semibold sm:text-xl" :class="s.p.id === meId && 'text-slime'">
          {{ s.p.nickname }}
        </span>
        <div
          class="flex w-full items-start justify-center rounded-t-2xl border-2 border-b-0 pt-2 text-3xl"
          :class="[s.h, s.place === 1 ? 'border-pumpkin bg-pumpkin/20 shadow-glow-orange' : 'border-grape/50 bg-grape/15']"
        >
          <span aria-hidden="true">{{ s.medal }}</span>
          <span class="sr-only">Place {{ s.place }}</span>
        </div>
        <span class="mt-1 font-bold text-pumpkin">{{ s.p.score }}<span class="sr-only"> points</span></span>
      </li>
    </ol>
  </section>
</template>
