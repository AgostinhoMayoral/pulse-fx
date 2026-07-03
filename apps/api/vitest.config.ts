import path from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';

function resolveJsToTs(): Plugin {
  return {
    name: 'resolve-js-to-ts',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!source.endsWith('.js')) {
        return null;
      }

      const tsSource = source.endsWith('.js') ? source.slice(0, -3) + '.ts' : source;
      const resolved = await this.resolve(tsSource, importer, {
        ...options,
        skipSelf: true,
      });

      if (resolved) {
        return resolved;
      }

      if (importer) {
        const absoluteTs = path.resolve(path.dirname(importer), tsSource);
        const fallback = await this.resolve(absoluteTs, undefined, {
          ...options,
          skipSelf: true,
        });
        return fallback?.id ?? null;
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveJsToTs()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./src/test/setup.ts'],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
