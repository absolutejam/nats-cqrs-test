import type { Config } from "tailwindcss";

import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: colors.fuchsia,
        foreground: "var(--foreground)",
        background: "var(--background)",
        border: "var(--border)",
        "forminput-bg": "var(--forminput-bg)",
        "forminput-border": "var(--forminput-border)",
      },
    },
  },
  plugins: [
    require("@tailwind-plugin/expose-colors")({
      extract: ["gray"],
    }),
  ],
};
export default config;
