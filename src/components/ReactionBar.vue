<script setup>
import { ref } from 'vue'
import { reactionEmojis } from '../lib/messages'
import { play } from '../lib/sound'

const emit = defineEmits(['react'])
const cooling = ref(false)
const status = ref('')

function send(emoji) {
  if (cooling.value) return
  cooling.value = true // 1 reaction / 1.2s per player keeps the screen readable
  setTimeout(() => (cooling.value = false), 1200)
  play('pop')
  status.value = `Sent ${emoji}`
  emit('react', emoji)
}
</script>

<template>
  <div role="group" aria-label="Send a reaction" class="flex flex-wrap justify-center gap-2">
    <button
      v-for="e in reactionEmojis"
      :key="e"
      type="button"
      class="flex h-12 w-12 items-center justify-center rounded-2xl border border-grape/40 bg-midnight/80 text-2xl transition active:scale-90 hover:bg-grape/25 disabled:opacity-50"
      :disabled="cooling"
      :aria-label="`Send ${e} reaction`"
      @click="send(e)"
    >
      {{ e }}
    </button>
    <span class="sr-only" role="status" aria-live="polite">{{ status }}</span>
  </div>
</template>
