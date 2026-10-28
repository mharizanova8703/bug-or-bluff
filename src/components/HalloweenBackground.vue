<script setup>
// Purely decorative: hidden from assistive tech, animations stop under reduced motion.
const stars = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 53) % 100,
  top: (i * 37) % 70,
  size: 2 + (i % 3),
  delay: (i % 7) * 0.5
}))
const bats = [
  { top: 8, dur: 26, delay: 0, size: 28 },
  { top: 22, dur: 34, delay: 9, size: 22 },
  { top: 14, dur: 30, delay: 17, size: 34 }
]
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    <span
      v-for="(s, i) in stars"
      :key="'s' + i"
      class="absolute rounded-full bg-mist"
      :style="{ left: s.left + '%', top: s.top + '%', width: s.size + 'px', height: s.size + 'px', animation: `twinkle ${3 + (i % 4)}s ease-in-out ${s.delay}s infinite` }"
    />
    <span
      class="absolute right-[8%] top-[6%] h-24 w-24 rounded-full bg-pumpkin/90 sm:h-32 sm:w-32"
      style="box-shadow: 0 0 80px 20px rgba(255, 140, 50, 0.35)"
    />

    <span
      v-for="(b, i) in bats"
      :key="'b' + i"
      class="absolute left-0"
      :style="{ top: b.top + '%', fontSize: b.size + 'px', animation: `drift-x ${b.dur}s linear ${b.delay}s infinite` }"
    >
      <span class="inline-block" style="animation: flap 0.6s ease-in-out infinite">🦇</span>
    </span>

    <!-- spiderwebs -->
    <svg class="absolute left-0 top-0 h-40 w-40 text-mist/25 sm:h-56 sm:w-56" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="0.8">
      <path d="M0 0 L100 0 M0 0 L0 100 M0 0 L85 55 M0 0 L55 85 M0 0 L100 25 M0 0 L25 100" />
      <path d="M18 0 Q14 14 0 18 M38 0 Q30 30 0 38 M60 0 Q48 48 0 60 M82 0 Q65 65 0 82" />
    </svg>

    <span class="anim-float absolute bottom-[12%] left-[4%] text-4xl opacity-50 sm:text-6xl">👻</span>
    <span class="anim-float absolute bottom-[30%] right-[3%] text-3xl opacity-40 sm:text-5xl" style="animation-delay: 1.5s">👻</span>

    <div class="absolute inset-x-0 bottom-0 flex items-end justify-between px-2 text-4xl opacity-60 sm:text-6xl">
      <span class="anim-wobble">🎃</span>
      <span class="hidden sm:inline">🕸️</span>
      <span class="anim-wobble" style="animation-delay: 1s">🎃</span>
      <span class="hidden sm:inline">🕯️</span>
      <span class="anim-wobble" style="animation-delay: 0.5s">🎃</span>
    </div>
    <div class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-midnight via-midnight/70 to-transparent" />
  </div>
</template>
