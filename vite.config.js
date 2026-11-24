import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Pure Mobile Application Build Config
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: './', // Relative asset paths ensure 100% compatibility in Capacitor Android WebView & Web
});
