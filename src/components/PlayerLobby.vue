<script setup>
import { ref, watch } from 'vue'
import { Users } from 'lucide-vue-next'
import { play } from '../lib/sound'

const props = defineProps({
  players: { type: Array, required: true },
  onlineIds: { type: Object, default: () => new Set() },
  meId: { type: String, default: '' },
  large: Boolean
})

// polite announcement + sound when someone arrives
const announcement = ref('')
watch(
  () => props.players.length,
  (n, o) => {
    if (n > o) {
      const newest = props.players[props.players.length - 1]
      announcement.value = `${newest?.nickname ?? 'A player'} joined. ${n} players in the lobby.`
      play('join')
    }
  }
)
</script>

<template>
  <section aria-labelledby="lobby-title">
    <h3 id="lobby-title" class="mb-3 flex items-center gap-2 text-xl font-semibold text-mist">
      <Users :size="22" class="text-grape" aria-hidden="true" />
      Players <span class="chip text-slime">{{ players.length }}</span>
      <span class="text-sm font-normal text-mist-dim">({{ onlineIds.size }} online now)</span>
    </h3>
    <p v-if="!players.length" class="rounded-2xl border border-dashed border-grape/40 p-6 text-center text-mist-dim">
      <span aria-hidden="true" class="mb-2 block text-4xl anim-float">👻</span>
      It's awfully quiet in here… waiting for brave coders to join.
    </p>
    <TransitionGroup v-else name="list" tag="ul" class="relative flex flex-wrap gap-2" role="list">
      <li
        v-for="p in players"
        :key="p.id"
        class="chip !px-4 !py-2"
        :class="[large ? '!text-xl' : '!text-base', p.id === meId ? 'border-slime text-slime' : 'text-mist']"
      >
        <span
          class="inline-block h-2.5 w-2.5 rounded-full"
          :class="onlineIds.has(p.id) ? 'bg-slime' : 'bg-mist-dim/50'"
          aria-hidden="true"
        />
        {{ p.nickname }}
        <span v-if="p.id === meId" class="text-xs font-bold">(you)</span>
        <span class="sr-only">{{ onlineIds.has(p.id) ? ', online' : ', offline' }}</span>
      </li>
    </TransitionGroup>
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </section>
</template>
