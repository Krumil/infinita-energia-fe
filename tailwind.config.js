import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                display: ['"Roboto Slab"', "Georgia", "serif"],
                mono: ['"IBM Plex Mono"', "Consolas", "monospace"],
                body: ['"Roboto"', "system-ui", "sans-serif"],
            },
            colors: {
                // Infinita Energia brand palette
                "energia-accent": {
                    DEFAULT: "hsl(var(--energia-accent) / <alpha-value>)",
                    text: "hsl(var(--energia-accent-text) / <alpha-value>)",
                },
                // Keep shadcn compatibility
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                    text: "hsl(var(--primary-text))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            animation: {
                // Dashboard cards; useReveal holds the play state paused until the card scrolls into view.
                "card-land": "cardLand 480ms cubic-bezier(0.16, 1, 0.3, 1) both",
                "kpi-roll": "kpiRoll 560ms cubic-bezier(0.16, 1, 0.3, 1) 90ms both",
                "kpi-meta": "fadeIn 320ms ease-out 240ms both",
                "fade-quick": "fadeIn 200ms ease-out both",
                // Late, so a fast response never flashes the spinner.
                "fade-in-late": "fadeIn 300ms ease-out 250ms both",
                "fade-in": "fadeIn 0.4s ease-out forwards",
                "slide-in": "slideIn 0.5s ease-out forwards",
                "number-roll": "numberRoll 0.8s ease-out forwards",
                "pulse-soft": "pulseSoft 2s ease-in-out infinite",
            },
            keyframes: {
                cardLand: {
                    "0%": { opacity: "0", transform: "translateY(12px) scale(0.985)" },
                    "100%": { opacity: "1", transform: "none" },
                },
                // The figure starts below its clipped slot, like a counter wheel turning to the new value.
                kpiRoll: {
                    "0%": { transform: "translateY(100%)" },
                    "100%": { transform: "none" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideIn: {
                    "0%": { opacity: "0", transform: "translateX(-10px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                numberRoll: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                pulseSoft: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.7" },
                },
            },
        },
    },
    plugins: [animate],
};
