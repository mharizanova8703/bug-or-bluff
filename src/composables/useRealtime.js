import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

/**
 * One Supabase Realtime channel per room, carrying:
 *   - postgres_changes on `rooms` (game state) and `players` (leaderboard / lobby)
 *   - presence (who is currently connected)
 *   - broadcast (ephemeral emoji reactions)
 *
 * Reliability: supabase-js rejoins the channel after a dropped socket and fires
 * SUBSCRIBED again, at which point we re-announce presence and ask the owner to
 * re-fetch state (`onResync`). A slow poll and visibility/online listeners are a
 * belt-and-braces fallback for flaky venue Wi-Fi or phones that slept.
 */
export function useRealtime({ code, roomId, onRoom, onPlayer, onReaction, onResync, pollMs = 6000 }) {
  const connected = ref(false)
  const presence = ref([])
  const presenceKey = crypto.randomUUID()

  let channel = null
  let pollTimer = null
  let trackMeta = null
  let closed = false

  const onlineIds = computed(() => new Set(presence.value.filter((m) => m.role === 'player').map((m) => m.id)))
  const onlinePlayerCount = computed(() => onlineIds.value.size)

  function open() {
    if (channel || closed) return
    channel = supabase
      .channel(`bugbluff:${code}`, { config: { presence: { key: presenceKey }, broadcast: { self: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (p) =>
        onRoom?.(p.new)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, (p) =>
        onPlayer?.(p)
      )
      .on('broadcast', { event: 'reaction' }, ({ payload }) => onReaction?.(payload))
      .on('presence', { event: 'sync' }, () => {
        presence.value = Object.values(channel.presenceState()).flat()
      })
      .subscribe(async (status) => {
        connected.value = status === 'SUBSCRIBED'
        if (status === 'SUBSCRIBED') {
          if (trackMeta) await channel.track(trackMeta).catch(() => {})
          onResync?.()
        }
      })

    pollTimer = setInterval(() => onResync?.(), pollMs)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onResync_)
  }

  const onVisible = () => document.visibilityState === 'visible' && onResync?.()
  const onResync_ = () => onResync?.()

  async function track(meta) {
    trackMeta = meta
    if (channel && connected.value) await channel.track(meta).catch(() => {})
  }

  function sendReaction(payload) {
    channel?.send({ type: 'broadcast', event: 'reaction', payload })
  }

  function close() {
    closed = true
    clearInterval(pollTimer)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onResync_)
    if (channel) supabase.removeChannel(channel)
    channel = null
  }

  return { connected, presence, onlineIds, onlinePlayerCount, open, track, sendReaction, close }
}
