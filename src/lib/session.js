// Per-room player session, so a refresh or reconnect re-uses the same player row.
const playerKey = (code) => `bugbluff:player:${String(code).toUpperCase()}`
const HOST_KEY = 'bugbluff:hostRoom'

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}
function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode / storage blocked: the game still works for this tab */
  }
}

export const getPlayerSession = (code) => read(playerKey(code))
export const savePlayerSession = (code, s) => write(playerKey(code), s)
export const clearPlayerSession = (code) => write(playerKey(code), null)

export const getHostRoomCode = () => read(HOST_KEY)
export const saveHostRoomCode = (code) => write(HOST_KEY, code)
