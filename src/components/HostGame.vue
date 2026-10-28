<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Play, Pause, Eye, SkipForward, RotateCcw, LogOut, Wifi, WifiOff, Lightbulb, Trophy } from 'lucide-vue-next'
import { useGameRoom, useCountdown } from '../composables/useGameRoom'
import { setQuestionSeconds, advanceGame, pauseRoom, resumeRoom, revealAnswer, restartGame } from '../lib/api'
import { pickMessage } from '../lib/messages'
import { play } from '../lib/sound'
import { focusHeading } from '../lib/a11y'
import QRCodeDisplay from './QRCodeDisplay.vue'
import PlayerLobby from './PlayerLobby.vue'
import QuestionCard from './QuestionCard.vue'
import CountdownTimer from './CountdownTimer.vue'
import Leaderboard from './Leaderboard.vue'
import ReactionOverlay from './ReactionOverlay.vue'
import WinnerCelebration from './WinnerCelebration.vue'
import StatsPanel from './StatsPanel.vue'

const props = defineProps({ code: { type: String, required: true } })
const emit = defineEmits(['exit'])

const overlay = ref(null)
const game = useGameRoom(props.code, { role: 'host', onReaction: (r) => overlay.value?.spawn(r) })
const { room, players, sortedPlayers, ranks, question, loading, error } = game
const { remainingSeconds, timeUp } = useCountdown(room, game.clockOffset)

const busy = ref(false)
const actionError = ref('')
const announcement = ref('')

// Players join on their phones: the QR must point at the *public* origin.
const appRoot = (import.meta.env.VITE_PUBLIC_URL || window.location.origin + import.meta.env.BASE_URL).replace(/\/$/, '')
const joinUrl = `${appRoot}/#/join/${props.code}`

const status = computed(() => room.value?.status)
const isLast = computed(() => room.value && room.value.current_index + 1 >= room.value.question_ids.length)
const reveal = computed(() => (status.value === 'reveal' && room.value.reveal?.index === room.value.current_index ? room.value.reveal : null))
const answeredPct = computed(() => (players.value.length ? Math.min(100, (room.value.answer_count / players.value.length) * 100) : 0))

onMounted(async () => {
  await game.load()
  focusHeading()
})

async function run(fn, doneMsg) {
  if (busy.value) return
  busy.value = true
  actionError.value = ''
  try {
    const row = await fn()
    if (row) game.applyRoom(row) // instant local update; realtime confirms for everyone
    if (doneMsg) announcement.value = doneMsg
  } catch (e) {
    actionError.value = e.message
  } finally {
    busy.value = false
  }
}

const start = () => run(() => advanceGame(props.code), 'Game started')
const next = () => run(() => advanceGame(props.code), 'Next question')
const reveal_ = () => run(() => revealAnswer(props.code), 'Answer revealed')
const togglePause = () => run(() => (room.value.paused ? resumeRoom(props.code) : pauseRoom(props.code)))
const restart = () => run(() => restartGame(props.code), 'New game ready')
const setSeconds = (s) => run(() => setQuestionSeconds(props.code, s))

// ---- host-authoritative auto-lock: when the timer hits zero, reveal.
let retry
function autoReveal() {
  clearTimeout(retry)
  if (!timeUp.value || status.value !== 'question') return
  revealAnswer(props.code)
    .then((row) => row && game.applyRoom(row))
    .catch(() => (retry = setTimeout(autoReveal, 1500)))
}
watch(timeUp, (t) => t && autoReveal())

watch(status, (s, o) => {
  if (s === o) return
  if (s === 'question') play('start')
  if (s === 'reveal') play('reveal')
  if (s === 'finished') announcement.value = 'Game over! The winner is on screen.'
  focusHeading()
})
watch(
  () => room.value?.answer_count,
  (n, o) => n > o && (announcement.value = `${n} of ${players.value.length} players have answered`)
)
</script>

<template>
  <div v-if="loading" class="card mx-auto max-w-md text-center" role="status">Loading room…</div>
  <div v-else-if="error" class="card mx-auto max-w-md text-center" role="alert">
    <p class="text-5xl" aria-hidden="true">🕸️</p>
    <p class="mt-2 text-xl">This room no longer exists.</p>
    <button class="btn btn-primary mt-4" @click="emit('exit')">Create a new room</button>
  </div>

  <div v-else-if="room" class="grid gap-5">
    <ReactionOverlay ref="overlay" />
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>

    <!-- top bar -->
    <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-grape/30 bg-dusk/90 px-4 py-3">
      <span class="text-mist-dim">Room</span>
      <span class="font-mono text-3xl font-bold tracking-[0.25em] text-pumpkin" aria-label="Room code">{{ code }}</span>
      <span class="chip text-slime">{{ players.length }} player{{ players.length === 1 ? '' : 's' }}</span>
      <span class="chip" :class="game.connected.value ? 'text-slime' : 'text-pumpkin'" role="status">
        <component :is="game.connected.value ? Wifi : WifiOff" :size="16" aria-hidden="true" />
        {{ game.connected.value ? 'Live' : 'Reconnecting…' }}
      </span>
      <button class="btn btn-ghost ml-auto !min-h-[44px] !px-4 !py-2 !text-base" @click="emit('exit')">
        <LogOut :size="18" aria-hidden="true" /> Leave room
      </button>
    </div>

    <p v-if="actionError" class="rounded-2xl border border-bubblegum bg-bubblegum/10 p-3 text-center font-medium" role="alert">
      ⚠️ {{ actionError }}
    </p>

    <!-- ===================================================== LOBBY -->
    <div v-if="status === 'lobby'" class="grid items-start gap-5 lg:grid-cols-2">
      <div class="card text-center">
        <h1 tabindex="-1" data-focus class="font-display text-4xl text-pumpkin glow-text sm:text-5xl">Scan to join the hunt!</h1>
        <p class="mb-4 mt-1 text-mist-dim">Or go to the link below and enter code <strong class="text-mist">{{ code }}</strong></p>
        <QRCodeDisplay :url="joinUrl" />
      </div>

      <div class="grid gap-5">
        <div class="card">
          <PlayerLobby :players="players" :online-ids="game.onlineIds.value" large />
        </div>
        <div class="card grid gap-4">
          <fieldset>
            <legend class="label">Seconds per question</legend>
            <div class="flex gap-2" role="radiogroup">
              <button
                v-for="s in [15, 20, 30]"
                :key="s"
                type="button"
                role="radio"
                :aria-checked="room.question_seconds === s"
                class="btn flex-1"
                :class="room.question_seconds === s ? 'btn-purple' : 'btn-ghost'"
                :disabled="busy"
                @click="setSeconds(s)"
              >
                {{ s }}s
              </button>
            </div>
          </fieldset>
          <button class="btn btn-primary !py-4 !text-2xl" :disabled="busy || !players.length" @click="start">
            <Play :size="26" aria-hidden="true" /> Start Game
          </button>
          <p v-if="!players.length" class="text-center text-sm text-mist-dim">Waiting for at least one player…</p>
          <p class="text-center text-sm text-mist-dim">{{ room.question_ids.length }} rounds · {{ room.question_seconds }}s each</p>
        </div>
      </div>
    </div>

    <!-- =================================================== QUESTION -->
    <div v-else-if="status === 'question'" class="grid gap-5">
      <div class="grid items-center gap-5 md:grid-cols-[auto_1fr]">
        <CountdownTimer :remaining="remainingSeconds" :total="room.question_seconds" :paused="room.paused" />
        <div class="card">
          <p class="text-lg text-mist-dim">Players locked in</p>
          <p class="text-5xl font-bold text-slime tabular-nums">
            {{ room.answer_count }} <span class="text-3xl text-mist-dim">/ {{ players.length }}</span>
          </p>
          <div
            class="mt-3 h-3 overflow-hidden rounded-full bg-midnight"
            role="progressbar"
            :aria-valuenow="room.answer_count"
            aria-valuemin="0"
            :aria-valuemax="players.length"
            aria-label="Answers submitted"
          >
            <div class="h-full rounded-full bg-slime transition-all duration-500" :style="{ width: answeredPct + '%' }" />
          </div>
        </div>
      </div>

      <QuestionCard v-if="question" :question="question" :interactive="false" large />

      <div class="flex flex-wrap justify-center gap-3">
        <button class="btn btn-ghost" :disabled="busy" @click="togglePause">
          <component :is="room.paused ? Play : Pause" :size="22" aria-hidden="true" />
          {{ room.paused ? 'Resume timer' : 'Pause timer' }}
        </button>
        <button class="btn btn-primary" :disabled="busy" @click="reveal_">
          <Eye :size="22" aria-hidden="true" /> Reveal Answer
        </button>
      </div>
    </div>

    <!-- ==================================================== REVEAL -->
    <div v-else-if="status === 'reveal'" class="grid gap-5">
      <h2 tabindex="-1" data-focus class="sr-only">Round {{ room.current_index + 1 }} answer</h2>
      <QuestionCard v-if="question && reveal" :question="question" :reveal="reveal" :interactive="false" locked large />
      <div v-if="reveal" class="card">
        <div class="flex gap-3">
          <Lightbulb class="mt-1 shrink-0 text-pumpkin" :size="26" aria-hidden="true" />
          <p class="text-xl"><strong class="text-pumpkin">Why? </strong>{{ reveal.explanation }}</p>
        </div>
        <p class="mt-3 text-mist-dim">
          {{ reveal.correct_total }} of {{ reveal.answered }} answered correctly ({{ players.length - reveal.answered }} didn't answer).
        </p>
      </div>
      <div class="card">
        <Leaderboard :players="sortedPlayers" :ranks="ranks" :limit="5" :rank-delta="game.rankDelta" title="Top 5 bug hunters" large />
      </div>
      <p class="text-center text-xl text-mist-dim">{{ pickMessage(room.current_index) }}</p>
      <div class="flex justify-center">
        <button class="btn btn-primary !px-10 !py-4 !text-2xl" :disabled="busy" @click="next">
          <component :is="isLast ? Trophy : SkipForward" :size="26" aria-hidden="true" />
          {{ isLast ? 'Final results' : 'Next Question' }}
        </button>
      </div>
    </div>

    <!-- =================================================== FINISHED -->
    <div v-else-if="status === 'finished'" class="grid gap-5">
      <div class="card"><WinnerCelebration :players="sortedPlayers" /></div>
      <div class="grid items-start gap-5 lg:grid-cols-2">
        <div class="card"><Leaderboard :players="sortedPlayers" :ranks="ranks" title="Final standings" /></div>
        <StatsPanel :stats="room.stats" />
      </div>
      <div class="flex justify-center">
        <button class="btn btn-green !px-10 !py-4 !text-2xl" :disabled="busy" @click="restart">
          <RotateCcw :size="26" aria-hidden="true" /> Start a new game
        </button>
      </div>
    </div>
  </div>
</template>
