import { defineConfig, mergeConfig } from 'vite'
import viteConfig from './vite.config.js'

// 기존 vite.config.js(react 플러그인, alias 등)를 그대로 재사용하고
// 테스트 설정만 얹는다. vite.config.js 자체는 건드리지 않는다.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // describe/it/expect를 import 없이 사용
      globals: true,
      // DOM API(document, window)를 쓰는 React 컴포넌트 테스트용
      environment: 'jsdom',
      // @testing-library/jest-dom 매처(toBeInTheDocument 등) 등록
      setupFiles: ['./vitest.setup.js'],
      // 테스트 파일 위치: src 아래 *.test.js(x) / *.spec.js(x)
      include: ['src/**/*.{test,spec}.{js,jsx}'],
      exclude: ['node_modules', 'dist', 'android', 'build'],
      css: false,
    },
  })
)
