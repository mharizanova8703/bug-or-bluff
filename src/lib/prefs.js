import { ref, watchEffect } from 'vue'

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}

export const muted = ref(load('bugbluff:muted', false))
watchEffect(() => {
  try {
    localStorage.setItem('bugbluff:muted', JSON.stringify(muted.value))
  } catch {
    /* ignore */
  }
})

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
export const reducedMotion = ref(mq ? mq.matches : false)
mq?.addEventListener?.('change', (e) => (reducedMotion.value = e.matches))
