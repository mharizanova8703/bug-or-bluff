<script setup>
import { Volume2, VolumeX } from 'lucide-vue-next'
import { isConfigured } from './lib/supabase'
import { muted } from './lib/prefs'
import { primeAudio } from './lib/sound'
import HalloweenBackground from './components/HalloweenBackground.vue'

function toggleSound() {
  muted.value = !muted.value
  primeAudio()
}
</script>

<template>
  <HalloweenBackground />
  <a
    href="#main"
    class="sr-only z-[100] rounded-xl bg-slime px-4 py-2 font-semibold text-midnight focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
  >
    Skip to game
  </a>

  <header class="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-3 py-2 sm:px-6" @pointerdown.once="primeAudio">
    <router-link to="/" class="flex items-center gap-2 rounded-xl px-2 py-1 text-mist-dim hover:text-mist">
      <span aria-hidden="true" class="text-xl">👑</span>
      <span class="text-sm font-semibold tracking-wide sm:text-base">Frontend Queens</span>
    </router-link>
    <button
      type="button"
      class="flex h-12 w-12 items-center justify-center rounded-full border border-grape/50 bg-midnight/80 text-mist hover:bg-grape/30"
      :aria-pressed="muted"
      :aria-label="muted ? 'Sound is off. Turn sound on' : 'Sound is on. Turn sound off'"
      @click="toggleSound"
    >
      <VolumeX v-if="muted" aria-hidden="true" :size="22" />
      <Volume2 v-else aria-hidden="true" :size="22" />
    </button>
  </header>

  <main id="main" tabindex="-1" class="relative z-10 mx-auto min-h-dvh w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6">
    <div v-if="!isConfigured" class="card mx-auto max-w-xl text-center" role="alert">
      <p class="text-5xl" aria-hidden="true">🕸️</p>
      <h1 class="mt-3 font-display text-4xl text-pumpkin">Supabase isn't connected</h1>
      <p class="mt-3 text-mist-dim">
        Copy <code class="rounded bg-midnight px-1.5">.env.example</code> to
        <code class="rounded bg-midnight px-1.5">.env</code>, add your project URL and anon key, then restart the dev
        server. See the README for the full setup.
      </p>
    </div>
    <router-view v-else />
  </main>
</template>
