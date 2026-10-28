<script setup>
import { computed, ref, watch } from 'vue'
import gsap from 'gsap'
import { Pause } from 'lucide-vue-next'
import { reducedMotion } from '../lib/prefs'
import { play } from '../lib/sound'

const props = defineProps({
  remaining: { type: Number, required: true }, // seconds (float)
  total: { type: Number, default: 20 },
  paused: Boolean,
  size: { type: String, default: 'lg' }, // 'lg' | 'sm'
  sound: { type: Boolean, default: true }
})

const secondsLeft = computed(() => Math.ceil(props.remaining))
const fraction = computed(() => Math.max(0, Math.min(1, props.remaining / props.total)))
const urgent = computed(() => !props.paused && secondsLeft.value > 0 && secondsLeft.value <= 5)

const R = 52
const C = 2 * Math.PI * R
const dash = computed(() => `${C * fraction.value} ${C}`)
const stroke = computed(() => (urgent.value ? '#FF4FC3' : fraction.value < 0.5 ? '#FF8C32' : '#7CFF8A'))

const numberEl = ref(null)
watch(secondsLeft, (n, o) => {
  if (!urgent.value || n === o) return
  if (props.sound) play('tick')
  if (!reducedMotion.value && numberEl.value) {
    gsap.fromTo(numberEl.value, { scale: 1.8, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' })
  }
})

// Screen readers: a calm, infrequent announcement rather than a tick every second.
const announcement = ref('')
watch(secondsLeft, (n) => {
  if (props.paused) return
  if ([10, 5].includes(n)) announcement.value = `${n} seconds left`
  else if (n === 0) announcement.value = "Time's up"
})
watch(
  () => props.paused,
  (p) => (announcement.value = p ? 'Timer paused' : 'Timer resumed')
)
</script>

<template>
  <div
    class="relative mx-auto aspect-square"
    :class="size === 'lg' ? 'w-44 sm:w-56' : 'w-24 sm:w-28'"
    role="timer"
    aria-live="off"
    :aria-label="`${secondsLeft} seconds remaining`"
  >
    <svg viewBox="0 0 120 120" class="h-full w-full -rotate-90" aria-hidden="true">
      <circle cx="60" cy="60" :r="R" fill="#120A24" stroke="#2A1850" stroke-width="10" />
      <circle
        cx="60"
        cy="60"
        :r="R"
        fill="none"
        :stroke="stroke"
        stroke-width="10"
        stroke-linecap="round"
        :stroke-dasharray="dash"
        :style="{ filter: `drop-shadow(0 0 6px ${stroke})`, transition: 'stroke 0.3s' }"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
      <span
        ref="numberEl"
        class="font-bold leading-none tabular-nums"
        :class="[size === 'lg' ? 'text-6xl sm:text-7xl' : 'text-4xl', urgent ? 'text-bubblegum anim-urgent' : 'text-mist']"
      >
        {{ secondsLeft }}
      </span>
      <Pause v-if="paused" :size="size === 'lg' ? 28 : 18" class="mt-1 text-pumpkin" />
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
