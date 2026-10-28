/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        midnight: '#120A24',
        dusk: '#1E1035',
        'dusk-2': '#2A1850',
        grape: '#A855F7',
        pumpkin: '#FF8C32',
        slime: '#7CFF8A',
        bubblegum: '#FF4FC3',
        mist: '#F5EEFF',
        'mist-dim': '#BCAADB'
      },
      fontFamily: {
        display: ['Creepster', 'Fredoka', 'system-ui', 'sans-serif'],
        sans: ['Fredoka', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        'glow-purple': '0 0 24px rgba(168,85,247,.55)',
        'glow-orange': '0 0 24px rgba(255,140,50,.55)',
        'glow-green': '0 0 24px rgba(124,255,138,.55)',
        'glow-pink': '0 0 24px rgba(255,79,195,.55)'
      }
    }
  },
  plugins: []
}
