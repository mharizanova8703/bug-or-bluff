import { supabase } from './supabase'

const friendly = {
  not_authenticated: 'Please sign in as host first.',
  forbidden: "Only this room's host can do that.",
  room_not_found: "We couldn't find that room. Check the code?",
  room_expired: 'This room has expired. Ask the host for a new one.',
  room_full: 'This room is full. 👻',
  game_finished: 'That game has already finished.',
  game_in_progress: 'The game has already started.',
  bad_nickname: 'Pick a nickname with 2–16 characters.',
  nickname_taken: 'Someone already took that nickname. Try another!',
  invalid_session: 'Your session expired. Please join again.',
  round_closed: "Time's up! This round is closed.",
  bad_choice: 'That answer is not valid.',
  no_players: 'Wait for at least one player to join.',
  cannot_advance: "The round isn't ready to advance yet.",
  cannot_reveal: 'Nothing to reveal right now.',
  not_enough_questions: 'The question bank is empty. Did you run the seed migration?'
}

export class GameError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) {
    // our functions `raise exception '<code>'`, so message is the code
    throw new GameError(error.message, friendly[error.message] || error.message)
  }
  return data
}

// ---- host
export const createRoom = (seconds = 20) => rpc('create_room', { p_seconds: seconds })
export const setQuestionSeconds = (code, seconds) => rpc('set_question_seconds', { p_code: code, p_seconds: seconds })
export const advanceGame = (code) => rpc('advance_game', { p_code: code })
export const pauseRoom = (code) => rpc('pause_room', { p_code: code })
export const resumeRoom = (code) => rpc('resume_room', { p_code: code })
export const revealAnswer = (code) => rpc('reveal_answer', { p_code: code })
export const restartGame = (code) => rpc('restart_game', { p_code: code })

// ---- player
export const joinRoom = (code, nickname) => rpc('join_room', { p_code: code, p_nickname: nickname })
export const rejoinRoom = (code, playerId, token) =>
  rpc('rejoin_room', { p_code: code, p_player_id: playerId, p_token: token })
export const submitAnswer = (code, playerId, token, choice) =>
  rpc('submit_answer', { p_code: code, p_player_id: playerId, p_token: token, p_choice: choice })
export const getMyResult = (code, playerId, token) =>
  rpc('get_my_result', { p_code: code, p_player_id: playerId, p_token: token })

// ---- shared
export const getCurrentQuestion = (code) => rpc('get_current_question', { p_code: code })
export const serverNow = () => rpc('server_now')

export async function fetchRoom(code) {
  const { data, error } = await supabase.from('rooms').select('*').eq('code', code.toUpperCase()).maybeSingle()
  if (error) throw new GameError('network', error.message)
  return data
}

export async function fetchPlayers(roomId) {
  const { data, error } = await supabase
    .from('players')
    .select('id,room_id,nickname,score,correct_count,joined_at')
    .eq('room_id', roomId)
  if (error) throw new GameError('network', error.message)
  return data || []
}
