import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const VIRTUAL_ID  = 'virtual:build-info';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

let buildCount = 0;
let buildTime  = new Date().toISOString();

function buildInfoPlugin() {
  return {
    name: 'build-info',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id === RESOLVED_ID) {
        return [
          `export const BUILD_NUM  = ${buildCount};`,
          `export const BUILD_TIME = ${JSON.stringify(buildTime)};`,
        ].join('\n');
      }
    },

    // Fires on every file-save during dev. Increment the counter, invalidate
    // the virtual module, and include it in the HMR update so DevScreen
    // re-renders with the new value — without affecting normal HMR for the
    // file that actually changed.
    handleHotUpdate({ server, modules }) {
      buildCount++;
      buildTime = new Date().toISOString();
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) {
        server.moduleGraph.invalidateModule(mod);
        return [...modules, mod];
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), buildInfoPlugin()],
})
