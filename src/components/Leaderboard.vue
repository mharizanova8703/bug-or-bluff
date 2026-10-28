<script setup>
import { computed } from 'vue'
import { ArrowUp, ArrowDown, Minus, Target } from 'lucide-vue-next'
import AnimatedNumber from './AnimatedNumber.vue'

const props = defineProps({
  players: { type: Array, required: true }, // already sorted
  ranks: { type: Object, required: true }, // id -> rank
  limit: { type: Number, default: 0 }, // 0 = everyone
  meId: { type: String, default: '' },
  rankDelta: { type: Function, default: () => 0 },
  title: { type: String, default: 'Leaderboard' },
  large: Boolean
})

const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
const visible = computed(() => {
  if (!props.limit) return props.players
  const top = props.players.slice(0, props.limit)
  // always show the viewer even if they're outside the top N
  const me = props.players.find((p) => p.id === props.meId)
  return me && !top.includes(me) ? [...top, me] : top
})
</script>

<template>
  <section aria-labelledby="lb-title">
    <h3 id="lb-title" class="mb-3 font-display text-3xl text-pumpkin sm:text-4xl">{{ title }}</h3>
    <p v-if="!players.length" class="text-mist-dim">No players yet.</p>
    <TransitionGroup v-else name="list" tag="ol" class="relative grid gap-2" role="list">
      <li
        v-for="p in visible"
        :key="p.id"
        class="flex items-center gap-3 rounded-2xl border px-3 py-2.5"
        :class="[
          p.id === meId ? 'border-slime bg-slime/10' : 'border-grape/30 bg-midnight/80',
          large ? 'sm:py-3.5 sm:text-2xl' : 'text-lg'
        ]"
      >
        <span class="w-12 shrink-0 text-center font-bold tabular-nums" :aria-label="`Rank ${ranks[p.id]}`">
          <span v-if="medals[ranks[p.id]]" aria-hidden="true" class="mr-0.5">{{ medals[ranks[p.id]] }}</span>
          <span :class="medals[ranks[p.id]] ? 'sr-only' : ''">{{ ranks[p.id] }}</span>
          <span v-if="medals[ranks[p.id]]" class="sr-only">{{ ranks[p.id] }}</span>
        </span>

        <span class="min-w-0 flex-1 truncate font-semibold">
          {{ p.nickname }}
          <span v-if="p.id === meId" class="ml-1 rounded-md bg-slime px-1.5 py-0.5 text-xs font-bold text-midnight">YOU</span>
        </span>

        <span
          v-if="rankDelta(p.id) !== 0"
          class="flex items-center text-sm font-bold"
          :class="rankDelta(p.id) > 0 ? 'text-slime' : 'text-bubblegum'"
        >
          <ArrowUp v-if="rankDelta(p.id) > 0" :size="16" aria-hidden="true" />
          <ArrowDown v-else :size="16" aria-hidden="true" />
          {{ Math.abs(rankDelta(p.id)) }}
          <span class="sr-only">{{ rankDelta(p.id) > 0 ? 'places up' : 'places down' }}</span>
        </span>
        <Minus v-else :size="14" class="text-mist-dim/60" aria-hidden="true" />

        <span class="flex items-center gap-1 text-sm text-mist-dim" :title="`${p.correct_count} correct`">
          <Target :size="15" aria-hidden="true" />{{ p.correct_count }}<span class="sr-only"> correct answers</span>
        </span>
        <span class="w-20 shrink-0 text-right font-bold text-pumpkin">
          <AnimatedNumber :value="p.score" /><span class="sr-only"> points</span>
        </span>
      </li>
    </TransitionGroup>
  </section>
</template>
