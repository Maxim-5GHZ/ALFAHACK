import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#EF3124",
        "primary-dark": "#D42A1F",
        "text-primary": "#0B1F35",
        "bg-card": "#F3F4F6",
        "accent-green": "#10B981",
      },
    },
  },
  plugins: [],
};

export default config;
