import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const VIRTUAL_ID  = 'virtual:build-info';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

let buildCount = 0;
let buildTime  = new Date().toISOString();
let isDev      = true;

function getAppVersion() {
  try {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
    return pkg.version;
  } catch (_) {
    return '?.?.?';
  }
}

function buildInfoPlugin() {
  return {
    name: 'build-info',

    configResolved(config) {
      isDev = config.command === 'serve';
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id === RESOLVED_ID) {
        const version = getAppVersion();
        // Dev: incrementing counter. Prod: timestamp of the build.
        const buildId = isDev ? `#${buildCount}` : new Date(buildTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return [
          `export const APP_VERSION = ${JSON.stringify(version)};`,
          `export const BUILD_ID    = ${JSON.stringify(buildId)};`,
          `export const BUILD_TIME  = ${JSON.stringify(buildTime)};`,
        ].join('\n');
      }
    },

    // Fires on every file-save during dev — increment counter and push HMR update.
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
