import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRealtime } from './useRealtime'
import {
  fetchRoom,
  fetchPlayers,
  getCurrentQuestion,
  getMyResult,
  serverNow
} from '../lib/api'

/**
 * Shared game state for host and players. The server is the only authority:
 * this composable just mirrors `rooms` / `players` rows and asks the database
 * for the current question and the caller's own result.
 *
 * @param {string} code  room code
 * @param {{ session?: import('vue').Ref<{playerId:string, token:string, nickname:string}|null>,
 *           role?: 'host'|'player', onReaction?: Function }} opts
 */
export function useGameRoom(code, { session = ref(null), role = 'player', onReaction } = {}) {
  const roomCode = code.toUpperCase()
  const room = ref(null)
  const players = ref([])
  const question = ref(null)
  const myResult = ref(null)
  const loading = ref(true)
  const error = ref('')
  const clockOffset = ref(0) // serverTime - Date.now()
  const rankBaseline = ref({}) // ranks when the current round began, for ▲▼ arrows

  let rt = null
  let questionReq = 0

  // ------------------------------------------------------------- derived
  const sortedPlayers = computed(() =>
    [...players.value].sort(
      (a, b) => b.score - a.score || b.correct_count - a.correct_count || a.nickname.localeCompare(b.nickname)
    )
  )
  const ranks = computed(() => {
    const map = {}
    let prev = null
    sortedPlayers.value.forEach((p, i) => {
      const same = prev && prev.score === p.score && prev.correct_count === p.correct_count
      map[p.id] = same ? map[prev.id] : i + 1
      prev = p
    })
    return map
  })
  // ignore a stale question while the next one is still being fetched
  const currentQuestion = computed(() =>
    question.value && room.value && question.value.index === room.value.current_index ? question.value : null
  )
  const me = computed(() => players.value.find((p) => p.id === session.value?.playerId) || null)
  const myRank = computed(() => (me.value ? ranks.value[me.value.id] : null))
  const rankDelta = (id) =>
    room.value?.status === 'reveal' && rankBaseline.value[id] ? rankBaseline.value[id] - ranks.value[id] : 0

  // ------------------------------------------------------------ fetching
  async function syncClock() {
    let best = null
    for (let i = 0; i < 3; i++) {
      try {
        const t0 = Date.now()
        const s = await serverNow()
        const t1 = Date.now()
        const rtt = t1 - t0
        if (!best || rtt < best.rtt) best = { rtt, offset: new Date(s).getTime() + rtt / 2 - t1 }
      } catch {
        /* keep previous offset */
      }
    }
    if (best) clockOffset.value = best.offset
  }

  async function refreshQuestion() {
    const r = room.value
    if (!r || !['question', 'reveal'].includes(r.status)) {
      question.value = null
      return
    }
    if (question.value && question.value.index === r.current_index) return
    const req = ++questionReq
    try {
      const q = await getCurrentQuestion(roomCode)
      if (req === questionReq) question.value = q
    } catch {
      /* the next resync retries */
    }
  }

  async function refreshMyResult() {
    const r = room.value
    const s = session.value
    if (!s || !r || r.current_index < 0 || r.status === 'lobby') {
      myResult.value = null
      return
    }
    try {
      const res = await getMyResult(roomCode, s.playerId, s.token)
      if (room.value?.current_index === r.current_index) myResult.value = { ...res, index: r.current_index }
    } catch {
      /* ignore: invalid sessions are handled by the view */
    }
  }

  function applyRoom(row) {
    if (!row) return
    const prev = room.value
    room.value = prev ? { ...prev, ...row } : row
    const r = room.value

    if (prev && prev.status !== r.status && r.status === 'question') {
      rankBaseline.value = { ...ranks.value }
    }
    const changed = !prev || prev.status !== r.status || prev.current_index !== r.current_index
    if (changed) {
      if (!prev || prev.current_index !== r.current_index) myResult.value = null
      if (r.status === 'lobby') myResult.value = null
      refreshQuestion()
      refreshMyResult()
    }
  }

  function applyPlayerChange({ eventType, new: n, old: o }) {
    if (eventType === 'INSERT') {
      if (!players.value.some((p) => p.id === n.id)) players.value = [...players.value, n]
    } else if (eventType === 'UPDATE') {
      players.value = players.value.map((p) => (p.id === n.id ? { ...p, ...n } : p))
    } else if (eventType === 'DELETE') {
      players.value = players.value.filter((p) => p.id !== o.id)
    }
  }

  let resyncing = false
  async function resync() {
    if (resyncing || !room.value) return
    resyncing = true
    try {
      const [r, ps] = await Promise.all([fetchRoom(roomCode), fetchPlayers(room.value.id)])
      if (r) applyRoom(r)
      players.value = ps
      // the question/result may have been missed while offline
      await Promise.all([refreshQuestion(), refreshMyResult()])
    } catch {
      /* offline: try again on the next tick */
    } finally {
      resyncing = false
    }
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const r = await fetchRoom(roomCode)
      if (!r) {
        error.value = 'room_not_found'
        return false
      }
      room.value = r
      players.value = await fetchPlayers(r.id)
      await Promise.all([refreshQuestion(), refreshMyResult()])
      rt = useRealtime({
        code: roomCode,
        roomId: r.id,
        onRoom: applyRoom,
        onPlayer: applyPlayerChange,
        onReaction,
        onResync: resync
      })
      rt.open()
      identify()
      syncClock()
      return true
    } catch (e) {
      error.value = e.code || 'network'
      return false
    } finally {
      loading.value = false
    }
  }

  /** Announce ourselves on the presence channel (call again after joining). */
  function identify() {
    if (!rt) return
    if (role === 'host') rt.track({ role: 'host' })
    else if (session.value) rt.track({ role: 'player', id: session.value.playerId, name: session.value.nickname })
  }

  // keep the clock fresh (phones drift, tabs sleep)
  let clockTimer
  onMounted(() => (clockTimer = setInterval(syncClock, 60000)))
  onBeforeUnmount(() => {
    clearInterval(clockTimer)
    rt?.close() // useRealtime is created after an await, so it cannot register its own hook
  })

  watch(session, identify)

  return {
    code: roomCode,
    room,
    players,
    sortedPlayers,
    ranks,
    me,
    myRank,
    rankDelta,
    question: currentQuestion,
    myResult,
    loading,
    error,
    clockOffset,
    load,
    resync,
    identify,
    syncClock,
    applyRoom,
    get realtime() {
      return rt
    },
    connected: computed(() => rt?.connected.value ?? false),
    onlineIds: computed(() => rt?.onlineIds.value ?? new Set()),
    sendReaction: (payload) => rt?.sendReaction(payload)
  }
}

/**
 * Ticking countdown driven by the server-authoritative `question_ends_at`
 * (corrected for this device's clock offset). Honours pause.
 */
export function useCountdown(room, clockOffset) {
  const remainingMs = ref(0)
  let timer

  function tick() {
    const r = room.value
    if (!r || r.status !== 'question') {
      remainingMs.value = 0
    } else if (r.paused) {
      remainingMs.value = r.paused_remaining_ms ?? 0
    } else {
      remainingMs.value = Math.max(0, new Date(r.question_ends_at).getTime() - (Date.now() + clockOffset.value))
    }
  }

  onMounted(() => {
    tick()
    timer = setInterval(tick, 100)
  })
  onBeforeUnmount(() => clearInterval(timer))
  watch(room, tick)

  return {
    remainingMs,
    remainingSeconds: computed(() => remainingMs.value / 1000),
    timeUp: computed(() => room.value?.status === 'question' && !room.value.paused && remainingMs.value <= 0)
  }
}
