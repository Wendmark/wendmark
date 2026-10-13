import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // On 127.0.0.1 explicitly, so the same server answers to both
    // `localhost` and `127.0.0.1`. To a browser those are different origins,
    // which is what the Billing page needs: it embeds its panel from the
    // other one, as a real cross-origin iframe, with no second server.
    host: '127.0.0.1',
  },
})
