<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { Ghost, Crown, ArrowRight } from 'lucide-vue-next'
import { reducedMotion } from '../lib/prefs'

const router = useRouter()
const code = ref('')

function go() {
  const c = code.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (c.length >= 4) router.push(`/join/${c}`)
}

onMounted(() => {
  if (reducedMotion.value) return
  gsap.from('[data-hero] > *', { y: 30, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'back.out(1.6)' })
})
</script>

<template>
  <div class="mx-auto grid max-w-2xl gap-8 pt-6 text-center">
    <div data-hero class="grid gap-4">
      <p class="text-7xl anim-float" aria-hidden="true">👻</p>
      <h1 tabindex="-1" data-focus class="font-display text-6xl leading-none text-pumpkin glow-text sm:text-8xl">
        Bug or Bluff?
      </h1>
      <p class="text-xl text-mist sm:text-2xl">Welcome, Coding Queens! Ready to hunt some bugs?</p>
      <p class="text-mist-dim">A live Halloween coding game for the Frontend Queens Meet &amp; Greet. 🎃</p>
    </div>

    <form class="card grid gap-3 text-left" @submit.prevent="go">
      <label for="room-code" class="label">Got a room code? Enter it to join</label>
      <div class="flex flex-col gap-3 sm:flex-row">
        <input
          id="room-code"
          v-model="code"
          class="input text-center font-mono text-2xl uppercase tracking-[0.3em]"
          maxlength="8"
          autocomplete="off"
          autocapitalize="characters"
          inputmode="text"
          placeholder="ABCDE"
        />
        <button class="btn btn-primary sm:w-48" :disabled="code.trim().length < 4">
          Join <ArrowRight :size="20" aria-hidden="true" />
        </button>
      </div>
      <p class="text-sm text-mist-dim">Tip: scanning the host's QR code is even faster.</p>
    </form>

    <p>
      <router-link to="/host" class="btn btn-ghost">
        <Crown :size="20" aria-hidden="true" /> I'm the host <Ghost :size="20" aria-hidden="true" />
      </router-link>
    </p>
  </div>
</template>
