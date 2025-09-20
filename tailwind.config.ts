import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#6EE7B7",
        secondary: "#93C5FD",
      },
      boxShadow: {
        smooth: "0 10px 25px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
