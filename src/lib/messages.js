// Funny interludes shown between rounds.
export const roundMessages = [
  'Tip: the console is just a ghost telling you what went wrong. 👻',
  "It's not a bug, it's a haunted feature. 🧛",
  'Debugging: being the detective in a crime movie where you are also the murderer. 🔍',
  'Semicolons are optional. Bad dreams are not. 😱',
  'Stack Overflow is down. Please summon a senior dev with candy. 🍬',
  'There are only 10 types of people: those who get binary jokes and those who do not. 🎃',
  '`undefined` is not a function, but your confidence is. 💪',
  'This round was brought to you by 14 browser tabs and 1 cold coffee. ☕',
  'git blame says it was you, 3 months ago. 🕯️',
  'A QA engineer walks into a bar and orders 1, 0, -1, 99999 and a lizard. 🦎',
  'CSS is awesome. (The box overflowed with joy.) 📦',
  'Pumpkins have <div> soup inside. We call it a design system. 🎃'
]

export const pickMessage = (seed = 0) => roundMessages[Math.abs(seed * 7 + 3) % roundMessages.length]

export const reactionEmojis = ['🎃', '👻', '🦇', '💜', '🔥', '😱', '👑', '🐛']

export const categoryMeta = {
  'spot-the-bug': { label: 'Spot the Bug', emoji: '🐛' },
  'cursed-output': { label: 'Guess the Cursed Output', emoji: '👻' },
  'bug-or-bluff': { label: 'Bug or Bluff?', emoji: '🎭' },
  'ui-monster': { label: 'Find the UI Monster', emoji: '🧟' }
}
