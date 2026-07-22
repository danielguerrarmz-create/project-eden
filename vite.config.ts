import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Dedicated dev port. strictPort: fail loudly instead of drifting onto a
  // neighbour's port (5173 portfolio, 5188 LSSC, 8787 Axon also run locally).
  server: { port: 5333, strictPort: true, open: true },
  build: {
    // The three.js stack is inherently ~1 MB minified; it is split into its own
    // cached chunk below, so don't warn about it on every build.
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        // Split the heavy 3D stack (three + fiber + drei, and react which they
        // depend on) from app code: app-code edits no longer re-ship ~1 MB.
        //
        // RENAMED FROM `three` ON 2026-07-21, because it stopped being three. Every
        // three.js importer is now behind the dev-only engine gate (Root.tsx), so a
        // production build reaches none of them and rollup shakes the 3D stack out
        // entirely — measured 1,067 kB -> 146 kB, and what is left is react-dom, not
        // three. The chunk kept working and its NAME had become a lie, which is the
        // kind of artifact this repo gets burned by. The three ids stay listed so the
        // split is already correct the day the engine comes back.
        manualChunks: {
          vendor: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
