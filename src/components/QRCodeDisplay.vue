<script setup>
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'
import { Copy, Check } from 'lucide-vue-next'

const props = defineProps({ url: { type: String, required: true }, size: { type: Number, default: 520 } })
const dataUrl = ref('')
const copied = ref(false)

async function render() {
  // dark modules on a white quiet zone: the most reliable thing for phone cameras
  dataUrl.value = await QRCode.toDataURL(props.url, {
    width: props.size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#120A24', light: '#FFFFFF' }
  })
}
onMounted(render)
watch(() => props.url, render)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* clipboard blocked: the URL is visible and selectable */
  }
}
</script>

<template>
  <figure class="mx-auto w-full max-w-md text-center">
    <div class="rounded-3xl bg-white p-3 shadow-glow-purple">
      <img
        v-if="dataUrl"
        :src="dataUrl"
        :alt="`QR code. Scan it to join the game at ${url}`"
        class="aspect-square w-full"
        width="520"
        height="520"
      />
      <div v-else class="aspect-square w-full animate-pulse rounded-2xl bg-mist-dim/30" />
    </div>
    <figcaption class="mt-4 flex flex-wrap items-center justify-center gap-2">
      <code class="select-all break-all rounded-xl bg-midnight px-3 py-2 text-base text-slime">{{ url }}</code>
      <button type="button" class="btn btn-ghost !min-h-[44px] !px-4 !py-2 !text-base" @click="copy">
        <component :is="copied ? Check : Copy" :size="18" aria-hidden="true" />
        {{ copied ? 'Copied!' : 'Copy link' }}
      </button>
      <span class="sr-only" role="status">{{ copied ? 'Link copied to clipboard' : '' }}</span>
    </figcaption>
  </figure>
</template>
