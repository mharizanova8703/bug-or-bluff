<script setup>
import { computed } from 'vue'
import { BarChart3, Skull } from 'lucide-vue-next'
import { highlight } from '../lib/code'

const props = defineProps({ stats: { type: Object, default: null } })
const trick = computed(() => props.stats?.trickiest || null)
const trickHtml = computed(() => (trick.value?.code ? highlight(trick.value.code, trick.value.language) : ''))
</script>

<template>
  <section v-if="stats" class="card" aria-labelledby="stats-title">
    <h3 id="stats-title" class="mb-4 flex items-center gap-2 font-display text-3xl text-pumpkin">
      <BarChart3 :size="26" aria-hidden="true" /> Group stats
    </h3>
    <dl class="grid grid-cols-3 gap-3 text-center">
      <div class="rounded-2xl bg-midnight p-3">
        <dt class="text-sm text-mist-dim">Accuracy</dt>
        <dd class="text-3xl font-bold text-slime">{{ stats.accuracy ?? 0 }}%</dd>
      </div>
      <div class="rounded-2xl bg-midnight p-3">
        <dt class="text-sm text-mist-dim">Answers</dt>
        <dd class="text-3xl font-bold text-mist">{{ stats.answers ?? 0 }}</dd>
      </div>
      <div class="rounded-2xl bg-midnight p-3">
        <dt class="text-sm text-mist-dim">Correct</dt>
        <dd class="text-3xl font-bold text-pumpkin">{{ stats.correct ?? 0 }}</dd>
      </div>
    </dl>

    <div v-if="trick" class="mt-5">
      <h4 class="mb-2 flex items-center gap-2 text-lg font-semibold">
        <Skull :size="20" class="text-bubblegum" aria-hidden="true" /> The trickiest question
        <span class="chip text-bubblegum">only {{ trick.correct_pct }}% got it</span>
      </h4>
      <p class="text-lg">{{ trick.text }}</p>
      <pre v-if="trickHtml" class="code-block mt-2"><code v-html="trickHtml" /></pre>
      <p class="mt-2 text-mist-dim">Answer: <strong class="text-slime">{{ trick.answer }}</strong></p>
    </div>
  </section>
</template>
