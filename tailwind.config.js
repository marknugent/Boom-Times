/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fredoka One"', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
      colors: {
        lab: {
          bg: '#0f1923',
          panel: '#162030',
          border: '#1e3050',
          green: '#4ade80',
          slime: '#86efac',
          chalk: '#dde8c8',
          yellow: '#fef08a',
          orange: '#fb923c',
        },
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.75)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'ingredient-drop': {
          '0%': { transform: 'translateY(-120px)', opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { transform: 'translateY(0px)', opacity: '0' },
        },
        'wrong-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-10px)' },
          '40%': { transform: 'translateX(10px)' },
          '60%': { transform: 'translateX(-7px)' },
          '80%': { transform: 'translateX(7px)' },
        },
        'fart-cloud': {
          '0%': { transform: 'scale(0.2)', opacity: '0.9' },
          '100%': { transform: 'scale(5)', opacity: '0' },
        },
        'fart-wave': {
          '0%, 100%': { filter: 'hue-rotate(0deg) brightness(1)' },
          '30%': { filter: 'hue-rotate(60deg) brightness(0.85)' },
          '60%': { filter: 'hue-rotate(120deg) brightness(0.9)' },
        },
        'slime-splat': {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '80%': { opacity: '0.9' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-60px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'beaker-fill': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        'pulse-border': {
          '0%, 100%': { borderColor: 'rgba(74, 222, 128, 0.4)' },
          '50%': { borderColor: 'rgba(74, 222, 128, 1)' },
        },
        'payoff-text': {
          '0%': { transform: 'scale(0.5) rotate(-5deg)', opacity: '0' },
          '60%': { transform: 'scale(1.1) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        'beaker-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px rgba(74,222,128,0.4))' },
          '50%':  { filter: 'drop-shadow(0 0 24px rgba(74,222,128,1)) drop-shadow(0 0 48px rgba(74,222,128,0.5))' },
        },
        'screen-flash': {
          '0%':   { opacity: '0' },
          '15%':  { opacity: '0.25' },
          '60%':  { opacity: '0.1' },
          '100%': { opacity: '0' },
        },
        'score-bump': {
          '0%':   { transform: 'scale(1.55)' },
          '60%':  { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)' },
        },
        'poof': {
          '0%':   { transform: 'scale(0.4) translateY(0)',    opacity: '1' },
          '55%':  { transform: 'scale(1.25) translateY(-8%)', opacity: '0.9' },
          '100%': { transform: 'scale(1.6) translateY(-18%)', opacity: '0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 150ms ease-out',
        'ingredient-drop': 'ingredient-drop 500ms ease-in forwards',
        'wrong-shake': 'wrong-shake 350ms ease-in-out',
        'fart-cloud': 'fart-cloud 1800ms ease-out forwards',
        'fart-wave': 'fart-wave 2s ease-in-out',
        'slime-splat': 'slime-splat 1200ms ease-out forwards',
        'confetti-fall': 'confetti-fall 2500ms ease-in forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulse-border': 'pulse-border 2s ease-in-out infinite',
        'payoff-text': 'payoff-text 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'beaker-glow': 'beaker-glow 1.2s ease-in-out infinite',
        'screen-flash': 'screen-flash 3s ease-out forwards',
        'score-bump': 'score-bump 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'poof': 'poof 380ms ease-out forwards',
      },
    },
  },
  plugins: [],
}
