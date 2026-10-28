<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { LoaderCircle, LogIn, UserPlus, Plus, LogOut } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'
import { createRoom, fetchRoom } from '../lib/api'
import { getHostRoomCode, saveHostRoomCode } from '../lib/session'
import { primeAudio } from '../lib/sound'
import { focusHeading } from '../lib/a11y'
import HostGame from '../components/HostGame.vue'

const user = ref(null)
const authReady = ref(false)
const roomCode = ref('')
const seconds = ref(20)
const busy = ref(false)
const error = ref('')
const notice = ref('')

// auth form
const email = ref('')
const password = ref('')
const mode = ref('signin') // 'signin' | 'signup'

let sub
onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  user.value = data.session?.user ?? null
  sub = supabase.auth.onAuthStateChange((_evt, session) => {
    user.value = session?.user ?? null
    if (!session) roomCode.value = ''
  }).data.subscription
  if (user.value) await restoreRoom()
  authReady.value = true
  focusHeading()
})
onBeforeUnmount(() => sub?.unsubscribe())

// If the host refreshes mid-game, jump straight back into their room.
async function restoreRoom() {
  const saved = getHostRoomCode()
  if (!saved) return
  try {
    const r = await fetchRoom(saved)
    if (r && r.host_id === user.value.id && new Date(r.expires_at) > new Date()) roomCode.value = r.code
    else saveHostRoomCode(null)
  } catch {
    /* offline: they can create a new one */
  }
}

async function submitAuth() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    if (mode.value === 'signin') {
      const { error: e } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
      if (e) throw e
      await restoreRoom()
    } else {
      const { data, error: e } = await supabase.auth.signUp({ email: email.value, password: password.value })
      if (e) throw e
      if (!data.session) notice.value = 'Check your inbox to confirm your email, then sign in.'
    }
  } catch (e) {
    error.value = e.message || 'Could not sign in.'
  } finally {
    busy.value = false
  }
}

async function create() {
  primeAudio()
  busy.value = true
  error.value = ''
  try {
    const room = await createRoom(seconds.value)
    roomCode.value = room.code
    saveHostRoomCode(room.code)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

function leaveRoom() {
  roomCode.value = ''
  saveHostRoomCode(null)
  focusHeading()
}

async function signOut() {
  saveHostRoomCode(null)
  await supabase.auth.signOut()
}
</script>

<template>
  <div v-if="!authReady" class="card mx-auto max-w-md text-center" role="status">
    <LoaderCircle class="mx-auto animate-spin text-grape" :size="36" aria-hidden="true" />
  </div>

  <!-- sign in -->
  <div v-else-if="!user" class="mx-auto grid max-w-md gap-5">
    <div class="text-center">
      <p class="text-6xl anim-float" aria-hidden="true">🧙‍♀️</p>
      <h1 tabindex="-1" data-focus class="font-display text-5xl text-pumpkin glow-text">Host sign in</h1>
      <p class="mt-1 text-mist-dim">Only signed-in hosts can create and control a game room.</p>
    </div>
    <form class="card grid gap-4" @submit.prevent="submitAuth">
      <div>
        <label for="email" class="label">Email</label>
        <input id="email" v-model="email" type="email" class="input" autocomplete="email" required />
      </div>
      <div>
        <label for="password" class="label">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="input"
          :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
          minlength="6"
          required
        />
      </div>
      <p v-if="error" class="font-medium text-bubblegum" role="alert">⚠️ {{ error }}</p>
      <p v-if="notice" class="font-medium text-slime" role="status">{{ notice }}</p>
      <button class="btn btn-primary" :disabled="busy">
        <component :is="mode === 'signin' ? LogIn : UserPlus" :size="20" aria-hidden="true" />
        {{ mode === 'signin' ? 'Sign in' : 'Create host account' }}
      </button>
      <button type="button" class="text-center text-mist-dim underline underline-offset-4 hover:text-mist" @click="mode = mode === 'signin' ? 'signup' : 'signin'">
        {{ mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in' }}
      </button>
    </form>
  </div>

  <!-- create a room -->
  <div v-else-if="!roomCode" class="mx-auto grid max-w-lg gap-5">
    <div class="text-center">
      <p class="text-6xl anim-float" aria-hidden="true">🎃</p>
      <h1 tabindex="-1" data-focus class="font-display text-5xl text-pumpkin glow-text">Host dashboard</h1>
      <p class="mt-1 text-lg">Welcome, Coding Queens! Ready to hunt some bugs?</p>
    </div>
    <div class="card grid gap-5">
      <fieldset>
        <legend class="label">Default seconds per question</legend>
        <div class="flex gap-2" role="radiogroup">
          <button
            v-for="s in [15, 20, 30]"
            :key="s"
            type="button"
            role="radio"
            :aria-checked="seconds === s"
            class="btn flex-1"
            :class="seconds === s ? 'btn-purple' : 'btn-ghost'"
            @click="seconds = s"
          >
            {{ s }}s
          </button>
        </div>
      </fieldset>
      <p v-if="error" class="font-medium text-bubblegum" role="alert">⚠️ {{ error }}</p>
      <button class="btn btn-primary !py-4 !text-2xl" :disabled="busy" @click="create">
        <LoaderCircle v-if="busy" class="animate-spin" :size="24" aria-hidden="true" />
        <Plus v-else :size="24" aria-hidden="true" />
        Create game room
      </button>
      <p class="text-center text-sm text-mist-dim">Signed in as {{ user.email }}</p>
      <button class="btn btn-ghost !min-h-[44px] !text-base" @click="signOut"><LogOut :size="18" aria-hidden="true" /> Sign out</button>
    </div>
  </div>

  <HostGame v-else :key="roomCode" :code="roomCode" @exit="leaveRoom" />
</template>
