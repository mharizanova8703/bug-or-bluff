<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { Check, X, Lock } from 'lucide-vue-next'
import { highlight } from '../lib/code'
import { categoryMeta } from '../lib/messages'

const props = defineProps({
  question: { type: Object, required: true },
  selected: { type: Number, default: null }, // this player's pick
  locked: Boolean, // answers can't be changed (answered / time up)
  reveal: { type: Object, default: null }, // { correct_index, counts, ... } once the host reveals
  interactive: { type: Boolean, default: true }, // false on the host's shared screen
  large: Boolean // bigger type for the shared screen
})
const emit = defineEmits(['select'])

const meta = computed(() => categoryMeta[props.question.category] || { label: props.question.category, emoji: '🎃' })
const html = computed(() => (props.question.code ? highlight(props.question.code, props.question.language) : ''))
const letters = ['A', 'B', 'C', 'D']
const total = computed(() => (props.reveal?.counts || []).reduce((a, b) => a + b, 0))
const closed = computed(() => !props.interactive || props.locked || !!props.reveal)

function state(i) {
  if (props.reveal) {
    if (i === props.reveal.correct_index) return 'correct'
    if (i === props.selected) return 'wrong'
    return 'dim'
  }
  return i === props.selected ? 'picked' : 'idle'
}

const classes = {
  idle: 'border-grape/50 bg-midnight hover:border-pumpkin hover:bg-dusk-2',
  picked: 'border-pumpkin bg-dusk-2 shadow-glow-orange',
  correct: 'border-slime bg-slime/15 shadow-glow-green',
  wrong: 'border-bubblegum bg-bubblegum/15',
  dim: 'border-grape/20 bg-midnight opacity-60'
}

function pick(i) {
  if (!closed.value) emit('select', i)
}

// Keyboard shortcuts: 1-4 or A-D
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input,textarea,select')) return
  const key = e.key.toLowerCase()
  const idx = '1234'.includes(key) && key.length === 1 ? '1234'.indexOf(key) : 'abcd'.indexOf(key)
  if (key.length === 1 && idx >= 0 && idx < props.question.options.length) pick(idx)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <section class="card" :aria-label="`${meta.label} question`">
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <span class="chip text-pumpkin"><span aria-hidden="true">{{ meta.emoji }}</span> {{ meta.label }}</span>
      <span class="chip capitalize text-mist-dim">{{ question.difficulty }}</span>
      <span class="chip ml-auto text-mist-dim">Round {{ question.index + 1 }} / {{ question.total }}</span>
    </div>

    <h2
      id="question-heading"
      data-focus
      tabindex="-1"
      class="font-semibold leading-snug"
      :class="large ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'"
    >
      {{ question.text }}
    </h2>

    <pre v-if="html" class="code-block mt-4" tabindex="0" :aria-label="`Code snippet in ${question.language}`"><code v-html="html" /></pre>

    <ul class="mt-5 grid gap-3 sm:grid-cols-2" role="list">
      <li v-for="(opt, i) in question.options" :key="i" class="relative isolate overflow-hidden rounded-2xl">
        <button
          type="button"
          class="relative flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition duration-150 active:scale-[0.98]"
          :class="[classes[state(i)], large ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl', closed && 'cursor-default']"
          :aria-pressed="selected === i"
          :aria-disabled="closed"
          @click="pick(i)"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-grape/25 font-bold text-mist" aria-hidden="true">
            <Check v-if="state(i) === 'correct'" :size="22" class="text-slime" />
            <X v-else-if="state(i) === 'wrong'" :size="22" class="text-bubblegum" />
            <Lock v-else-if="state(i) === 'picked' && locked" :size="18" class="text-pumpkin" />
            <template v-else>{{ letters[i] }}</template>
          </span>
          <span class="flex-1 leading-snug">{{ opt }}</span>
          <!-- reveal states are also announced as text, never colour alone -->
          <span v-if="state(i) === 'correct'" class="sr-only">Correct answer.</span>
          <span v-if="state(i) === 'wrong'" class="sr-only">Your answer, incorrect.</span>
          <span v-if="selected === i && !reveal" class="sr-only">Your answer.</span>
          <span v-if="reveal" class="shrink-0 text-base font-semibold tabular-nums text-mist-dim">
            {{ reveal.counts?.[i] ?? 0 }}<span class="sr-only"> players chose this</span>
          </span>
        </button>
        <span
          v-if="reveal && total"
          class="absolute inset-y-0 left-0 -z-10 bg-grape/20 transition-all duration-700"
          :style="{ width: ((reveal.counts?.[i] ?? 0) / total) * 100 + '%' }"
          aria-hidden="true"
        />
      </li>
    </ul>
    <p v-if="interactive && !closed" class="mt-3 hidden text-sm text-mist-dim sm:block">
      Tip: press 1–{{ question.options.length }} or A–{{ letters[question.options.length - 1] }} to answer.
    </p>
  </section>
</template>
