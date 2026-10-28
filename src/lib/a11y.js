import { nextTick } from 'vue'

// Move keyboard / screen-reader focus to the current state's heading
// (any element marked `data-focus` with tabindex="-1") after a game state change.
export function focusHeading() {
  nextTick(() => {
    const el = document.querySelector('[data-focus]')
    el?.focus({ preventScroll: true })
  })
}
