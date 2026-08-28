import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const googleIdentityHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Referrer-Policy': 'no-referrer-when-downgrade',
}

export default defineConfig({
  envDir: '..',
  server: {
    headers: googleIdentityHeaders,
  },
  preview: {
    headers: googleIdentityHeaders,
  },
  plugins: [
    tailwindcss(),
  ],
})
