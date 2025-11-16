import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import dts from 'vite-plugin-dts'

// @ts-ignore
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  if (isLib) {
    // 库模式配置
    return {
      plugins: [
        react(),
        dts({
          root: fileURLToPath(new URL('./src/router', import.meta.url)),
          tsconfigPath: fileURLToPath(new URL('./tsconfig.lib.json', import.meta.url))
        }),
      ],
      build: {
        minify: true,
        sourcemap: false,
        emptyOutDir: true,
        outDir: fileURLToPath(new URL('./dist-lib', import.meta.url)),

        rollupOptions: {
          external: ['react', 'react-dom'],
          input: {
            index: fileURLToPath(new URL('./src/router/index.ts', import.meta.url))
          },
          output: [
            {
              format: 'es',
              entryFileNames: '[name].mjs',
            },
            {
              format: 'cjs',
              entryFileNames: '[name].cjs',
            },
          ],
        },
      },
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
      },
    }
  }

  // 开发/应用模式配置
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
