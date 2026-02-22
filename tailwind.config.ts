import type { Config } from "tailwindcss";
const { heroui } = require("@heroui/react");

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}", // Ensure Hero UI styles are included
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  safelist: [
    {
      pattern: /bg-(blue|yellow|amber|red|green|purple)-(300|400|500|600)/,
    },
    {
      pattern: /bg-(blue|yellow|amber|red|green|purple)-(600)/,
      variants: ["hover"],
    },
    "disabled:bg-gray-400",
  ],
  // darkMode: "class",
  plugins: [heroui()], // Add Hero UI plugin
} satisfies Config;