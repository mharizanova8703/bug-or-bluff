<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LoaderCircle, WifiOff, Lock, Trophy, Lightbulb } from 'lucide-vue-next'
import { useGameRoom, useCountdown } from '../composables/useGameRoom'
import { submitAnswer } from '../lib/api'
import { getPlayerSession, clearPlayerSession } from '../lib/session'
import { pickMessage } from '../lib/messages'
import { play } from '../lib/sound'
import { focusHeading } from '../lib/a11y'
import QuestionCard from '../components/QuestionCard.vue'
import CountdownTimer from '../components/CountdownTimer.vue'
import Leaderboard from '../components/Leaderboard.vue'
import ReactionOverlay from '../components/ReactionOverlay.vue'
import ReactionBar from '../components/ReactionBar.vue'
import FeedbackBurst from '../components/FeedbackBurst.vue'
import WinnerCelebration from '../components/WinnerCelebration.vue'
import StatsPanel from '../components/StatsPanel.vue'
import AnimatedNumber from '../components/AnimatedNumber.vue'

const props = defineProps({ roomCode: { type: String, required: true } })
const router = useRouter()
const code = props.roomCode.toUpperCase()

const session = ref(getPlayerSession(code))
if (!session.value) router.replace(`/join/${code}`)

const overlay = ref(null)
const game = useGameRoom(code, {
  session,
  role: 'player',
  onReaction: (r) => overlay.value?.spawn(r)
})
const { room, question, myResult, me, myRank, sortedPlayers, ranks, loading, error } = game
const { remainingSeconds } = useCountdown(room, game.clockOffset)

const pending = ref(null) // optimistic pick while the request is in flight
const submitting = ref(false)
const submitError = ref('')
const announcement = ref('')

const status = computed(() => room.value?.status)
const answered = computed(() => !!(myResult.value?.answered && myResult.value.index === room.value?.current_index))
const selected = computed(() => (answered.value ? myResult.value.choice : pending.value))
const timeUp = computed(() => status.value === 'question' && !room.value.paused && remainingSeconds.value <= 0)
const reveal = computed(() => (status.value === 'reveal' && room.value.reveal?.index === room.value.current_index ? room.value.reveal : null))
const resultKind = computed(() => {
  if (!reveal.value || !myResult.value || myResult.value.index !== room.value.current_index) return null
  if (!myResult.value.answered) return 'none'
  if (myResult.value.is_correct === undefined) return null // optimistic copy, real result still loading
  return myResult.value.is_correct ? 'correct' : 'wrong'
})
const isLast = computed(() => room.value && room.value.current_index + 1 >= room.value.question_ids.length)

onMounted(async () => {
  if (!session.value) return
  const ok = await game.load()
  if (ok && room.value.status === 'lobby') router.replace(`/join/${code}`)
  focusHeading()
})

// lobby again (host restarted): go wait in the join screen
watch(status, (s, o) => {
  if (s === 'lobby') router.replace(`/join/${code}`)
  if (s === 'question') {
    pending.value = null
    submitError.value = ''
    announcement.value = `Round ${room.value.current_index + 1}. Question time!`
    play('start')
  } else if (s === 'reveal') {
    announcement.value = 'Answer revealed.'
  } else if (s === 'finished') {
    announcement.value = 'Game over! Final results are in.'
  }
  if (s !== o) focusHeading()
})
watch(resultKind, (k) => {
  if (k === 'correct') announcement.value = `Correct! Plus ${myResult.value.points} points.`
  else if (k === 'wrong') announcement.value = 'Incorrect.'
  else if (k === 'none') announcement.value = 'You did not answer in time.'
})
watch(timeUp, (t) => t && !answered.value && (announcement.value = "Time's up!"))

async function choose(i) {
  if (submitting.value || answered.value || timeUp.value) return
  submitting.value = true
  submitError.value = ''
  pending.value = i
  try {
    const res = await submitAnswer(code, session.value.playerId, session.value.token, i)
    if (res?.ok) {
      myResult.value = { answered: true, choice: i, index: room.value.current_index }
      play('lock')
      announcement.value = 'Answer locked in!'
    } else {
      await game.resync() // already answered elsewhere, e.g. a second tab
    }
  } catch (e) {
    pending.value = null
    if (e.code === 'invalid_session') {
      clearPlayerSession(code)
      router.replace(`/join/${code}`)
      return
    }
    submitError.value = e.message
  } finally {
    submitting.value = false
  }
}

function react(emoji) {
  const payload = { emoji, name: session.value.nickname }
  game.sendReaction(payload) // broadcast.self=true: we'll see our own too
}
</script>

<template>
  <div v-if="loading || !room" class="card mx-auto mt-8 max-w-md text-center" role="status">
    <LoaderCircle class="mx-auto animate-spin text-grape" :size="40" aria-hidden="true" />
    <p class="mt-3 text-mist-dim">Loading the game…</p>
  </div>

  <div v-else-if="error" class="card mx-auto mt-8 max-w-md text-center" role="alert">
    <p class="text-6xl" aria-hidden="true">🕸️</p>
    <h1 tabindex="-1" data-focus class="mt-2 font-display text-4xl text-pumpkin">Room not found</h1>
    <router-link to="/" class="btn btn-primary mt-5">Back home</router-link>
  </div>

  <div v-else class="mx-auto grid max-w-3xl gap-4">
    <ReactionOverlay ref="overlay" />
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>

    <!-- status strip -->
    <div class="flex items-center justify-between gap-3 rounded-2xl border border-grape/30 bg-dusk/90 px-4 py-2">
      <span class="min-w-0 truncate font-semibold">{{ session.nickname }}</span>
      <span v-if="!game.connected.value" class="flex items-center gap-1 text-sm font-medium text-pumpkin" role="status">
        <WifiOff :size="16" aria-hidden="true" /> Reconnecting…
      </span>
      <span class="flex items-center gap-3 text-lg">
        <span v-if="myRank" class="chip text-mist">Rank #{{ myRank }}</span>
        <span class="font-bold text-pumpkin"><AnimatedNumber :value="me?.score ?? 0" /> pts</span>
      </span>
    </div>

    <!-- ------------------------------------------------------ question -->
    <template v-if="status === 'question'">
      <div class="flex items-center gap-4">
        <CountdownTimer
          size="sm"
          :remaining="remainingSeconds"
          :total="room.question_seconds"
          :paused="room.paused"
          :sound="!answered"
        />
        <div class="flex-1" role="status">
          <p v-if="room.paused" class="text-xl font-semibold text-pumpkin">⏸ Paused by the host</p>
          <p v-else-if="timeUp" class="text-xl font-semibold text-bubblegum">⏰ Time's up! Waiting for the reveal…</p>
          <p v-else-if="!answered" class="text-xl font-semibold">Pick your answer!</p>
        </div>
      </div>

      <QuestionCard
        v-if="question"
        :question="question"
        :selected="selected"
        :locked="answered || submitting || timeUp || room.paused"
        :interactive="!room.paused"
        @select="choose"
      />
      <div v-else class="card text-center" role="status">
        <LoaderCircle class="mx-auto animate-spin text-grape" :size="32" aria-hidden="true" />
        <p class="mt-2 text-mist-dim">Fetching the question…</p>
      </div>

      <p v-if="submitError" class="rounded-2xl border border-bubblegum bg-bubblegum/10 p-3 text-center font-medium" role="alert">
        ⚠️ {{ submitError }}
      </p>

      <div v-if="answered" class="card flex items-center justify-center gap-3 border-slime text-center" role="status">
        <Lock class="text-slime" :size="28" aria-hidden="true" />
        <div>
          <p class="text-2xl font-bold text-slime">Answer Locked In!</p>
          <p class="text-mist-dim">Waiting for the host to reveal the answer…</p>
        </div>
      </div>
    </template>

    <!-- ------------------------------------------------------- reveal -->
    <template v-else-if="status === 'reveal'">
      <h2 tabindex="-1" data-focus class="sr-only">Round {{ room.current_index + 1 }} results</h2>
      <FeedbackBurst v-if="resultKind" :key="room.current_index + resultKind" :kind="resultKind" :points="myResult.points" />
      <div v-else class="card text-center text-mist-dim" role="status">Checking your answer…</div>

      <QuestionCard v-if="question && reveal" :question="question" :selected="answered ? myResult.choice : null" :reveal="reveal" locked />

      <div v-if="reveal" class="card flex gap-3">
        <Lightbulb class="mt-1 shrink-0 text-pumpkin" :size="24" aria-hidden="true" />
        <p class="text-lg"><strong class="text-pumpkin">Why? </strong>{{ reveal.explanation }}</p>
      </div>

      <div class="card">
        <Leaderboard :players="sortedPlayers" :ranks="ranks" :limit="5" :me-id="session.playerId" :rank-delta="game.rankDelta" title="Top 5" />
      </div>
      <p class="text-center text-lg text-mist-dim" aria-live="off">{{ pickMessage(room.current_index) }}</p>
      <p class="text-center text-mist-dim" role="status">
        {{ isLast ? 'Final results are coming up…' : 'Next question coming up — get ready!' }}
      </p>
    </template>

    <!-- ------------------------------------------------------ finished -->
    <template v-else-if="status === 'finished'">
      <div class="card">
        <WinnerCelebration :players="sortedPlayers" :me-id="session.playerId" />
      </div>
      <div class="card text-center">
        <Trophy class="mx-auto text-pumpkin" :size="32" aria-hidden="true" />
        <p class="mt-1 text-2xl font-bold">
          You finished <span class="text-slime">#{{ myRank }}</span> with
          <span class="text-pumpkin">{{ me?.score ?? 0 }}</span> points
        </p>
        <p class="text-mist-dim">{{ me?.correct_count ?? 0 }} of {{ room.question_ids.length }} correct</p>
      </div>
      <div class="card">
        <Leaderboard :players="sortedPlayers" :ranks="ranks" :me-id="session.playerId" title="Final standings" />
      </div>
      <StatsPanel :stats="room.stats" />
      <p class="text-center text-mist-dim">Thanks for playing, Coding Queens! 👑 Stay on this page if the host starts another game.</p>
    </template>

    <!-- reactions -->
    <div v-if="['question', 'reveal', 'finished'].includes(status)" class="card !p-3">
      <ReactionBar @react="react" />
    </div>
  </div>
</template>
