/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Mobile-first breakpoints (Tailwind default)
    screens: {
      'sm': '640px',   // Mobile landscape / Small tablets
      'md': '768px',   // Tablets
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
      '2xl': '1536px', // Extra large desktop
    },
    extend: {
      colors: {
        lime: {
          brand: '#B9FF66',
          hover: '#A3E655',
        },
        dark: {
          bg: '#1a1a1a',
          card: '#2a2a2a',
          border: '#3a3a3a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      animation: {
        'enter': 'enter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pop': 'pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      keyframes: {
        enter: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' }
        }
      }
    },
  },
  plugins: [],
}
