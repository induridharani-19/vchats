/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#0B0E14',
          card: '#111827',
          border: '#1F2937',
          hover: '#1F2937',
        },
        brandTeal: {
          light: 'var(--color-brand-teal-light, #33C4AE)',
          DEFAULT: 'var(--color-brand-teal, #00B69B)',
          dark: 'var(--color-brand-teal-dark, #008B76)',
        },
        brandViolet: {
          light: 'var(--color-brand-violet-light, #A78BFA)',
          DEFAULT: 'var(--color-brand-violet, #8B5CF6)',
          dark: 'var(--color-brand-violet-dark, #6D28D9)',
        },
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
        'glass-gradient-dark': 'linear-gradient(135deg, rgba(17, 24, 39, 0.65) 0%, rgba(17, 24, 39, 0.45) 100%)',
        'teal-gradient': 'linear-gradient(135deg, #00B69B 0%, #8B5CF6 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-hover': '0 8px 32px 0 rgba(0, 0, 0, 0.55)',
      },
    },
  },
  plugins: [],
}
