<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { Sparkles, LoaderCircle, WifiOff } from 'lucide-vue-next'
import { useGameRoom } from '../composables/useGameRoom'
import { joinRoom, rejoinRoom, GameError } from '../lib/api'
import { getPlayerSession, savePlayerSession, clearPlayerSession } from '../lib/session'
import { reducedMotion } from '../lib/prefs'
import { play, primeAudio } from '../lib/sound'
import { focusHeading } from '../lib/a11y'
import PlayerLobby from '../components/PlayerLobby.vue'

const props = defineProps({ roomCode: { type: String, required: true } })
const router = useRouter()
const code = props.roomCode.toUpperCase()

const session = ref(getPlayerSession(code))
const game = useGameRoom(code, { session, role: 'player' })
const { room, players, loading, error } = game

const nickname = ref('')
const busy = ref(false)
const formError = ref('')
const ready = ref(false) // session validated + room loaded

const errorText = computed(
  () =>
    ({
      room_not_found: "We couldn't find that room. Double-check the code with your host.",
      network: "Can't reach the game server. Check your connection."
    })[error.value] || 'Something spooky happened. Try refreshing.'
)

onMounted(async () => {
  if (session.value) {
    try {
      await rejoinRoom(code, session.value.playerId, session.value.token)
    } catch (e) {
      if (e.code === 'invalid_session' || e.code === 'room_not_found') {
        clearPlayerSession(code)
        session.value = null
      }
    }
  }
  await game.load()
  ready.value = true
  focusHeading()
  if (!reducedMotion.value) {
    gsap.from('[data-ghost]', { y: -120, opacity: 0, rotate: -20, duration: 1.1, ease: 'elastic.out(1, 0.55)' })
  }
})

async function submit() {
  if (busy.value) return
  primeAudio()
  busy.value = true
  formError.value = ''
  try {
    const res = await joinRoom(code, nickname.value)
    const s = { playerId: res.player_id, token: res.token, nickname: res.nickname }
    savePlayerSession(code, s)
    session.value = s
    play('join')
    await game.resync()
    focusHeading()
  } catch (e) {
    formError.value = e instanceof GameError ? e.message : 'Could not join. Please try again.'
  } finally {
    busy.value = false
  }
}

// Once the host starts, drop straight into the game.
watch(
  () => [session.value, room.value?.status],
  ([s, status]) => {
    if (s && ready.value && status && status !== 'lobby') router.replace(`/play/${code}`)
  },
  { immediate: false }
)
watch(ready, (r) => {
  if (r && session.value && room.value && room.value.status !== 'lobby') router.replace(`/play/${code}`)
})
</script>

<template>
  <div class="mx-auto grid max-w-xl gap-6 pt-4">
    <div v-if="loading || !ready" class="card text-center" role="status">
      <LoaderCircle class="mx-auto animate-spin text-grape" :size="40" aria-hidden="true" />
      <p class="mt-3 text-mist-dim">Summoning the room…</p>
    </div>

    <div v-else-if="error" class="card text-center" role="alert">
      <p class="text-6xl" aria-hidden="true">🕸️</p>
      <h1 tabindex="-1" data-focus class="mt-2 font-display text-4xl text-pumpkin">
        {{ error === 'room_not_found' ? 'Room not found' : 'Connection trouble' }}
      </h1>
      <p class="mt-2 text-mist-dim">{{ errorText }}</p>
      <router-link to="/" class="btn btn-primary mt-5">Try another code</router-link>
    </div>

    <template v-else>
      <div class="text-center">
        <p data-ghost class="text-7xl" aria-hidden="true">👻</p>
        <h1 tabindex="-1" data-focus class="mt-2 font-display text-5xl text-pumpkin glow-text sm:text-6xl">
          {{ session ? `You're in, ${session.nickname}!` : 'Bug or Bluff?' }}
        </h1>
        <p class="mt-2 text-lg text-mist">Welcome, Coding Queens! Ready to hunt some bugs?</p>
      </div>

      <!-- join form -->
      <form v-if="!session" class="card grid gap-4" @submit.prevent="submit">
        <div>
          <label for="nick" class="label">Pick a spooky nickname</label>
          <input
            id="nick"
            v-model="nickname"
            class="input"
            minlength="2"
            maxlength="16"
            required
            autocomplete="nickname"
            enterkeyhint="go"
            placeholder="e.g. BugSlayerBella"
            :aria-invalid="!!formError"
            aria-describedby="nick-help nick-error"
          />
          <p id="nick-help" class="mt-1 text-sm text-mist-dim">2–16 characters. No account needed.</p>
          <p id="nick-error" class="mt-1 min-h-[1.5rem] font-medium text-bubblegum" role="alert">
            <template v-if="formError">⚠️ {{ formError }}</template>
          </p>
        </div>
        <button class="btn btn-primary" :disabled="busy || nickname.trim().length < 2">
          <LoaderCircle v-if="busy" class="animate-spin" :size="20" aria-hidden="true" />
          <Sparkles v-else :size="20" aria-hidden="true" />
          Join Game
        </button>
      </form>

      <!-- waiting room -->
      <template v-else>
        <div class="card text-center" role="status" aria-live="polite">
          <p class="text-2xl font-semibold">Waiting for the host to start…</p>
          <p class="mt-1 text-mist-dim">Keep this page open. The game will begin automatically. 🎃</p>
          <div class="mt-3 flex items-center justify-center gap-2 text-sm" :class="game.connected.value ? 'text-slime' : 'text-pumpkin'">
            <WifiOff v-if="!game.connected.value" :size="16" aria-hidden="true" />
            <span v-else class="h-2.5 w-2.5 rounded-full bg-slime" aria-hidden="true" />
            {{ game.connected.value ? 'Connected' : 'Reconnecting…' }}
          </div>
        </div>
        <div class="card">
          <PlayerLobby :players="players" :online-ids="game.onlineIds.value" :me-id="session.playerId" />
        </div>
      </template>
    </template>
  </div>
</template>
