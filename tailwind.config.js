import {heroui} from "@heroui/theme"

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  safelist: [
    {
      pattern: /^(bg|text)-(primary|secondary|success)(-\d+)?$/, // Matches bg-primary, text-secondary, bg-success-600 etc.
      variants: ['dark'], // Include dark variants like dark:bg-primary-600
    },
    {
      pattern: /^bg-(primary|secondary|success)\/(10|20)$/, // Matches bg-primary/10, bg-secondary/20 etc.
    },
  ],
  darkMode: "class",
  plugins: [heroui()],
}
