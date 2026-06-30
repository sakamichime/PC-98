/**
 * Vite构建配置文件
 * 
 * 主要配置项说明：
 * 1. base: 设置基础路径。使用自定义域名 pc98.cc.cd，根路径部署。
 * 2. optimizeDeps.exclude: 排除FFmpeg相关包的预构建，避免Vite处理WebAssembly时的兼容性问题。
 * 3. server.headers: 设置Cross-Origin安全头，为未来FFmpeg多线程版本（需要SharedArrayBuffer）做准备。
 *    当前使用单线程版本不影响，但提前配置好安全头可以方便后续升级。
 * 4. build.outDir: 构建输出目录，默认为 'dist'。
 * 5. build.emptyOutDir: 构建前清空输出目录，确保没有残留的旧文件。
 */

import { defineConfig } from 'vite';

// GitHub Pages部署路径配置
// 使用自定义域名 pc98.cc.cd，根路径部署
// 如果改回仓库名子路径部署，请设为 '/PC-98/'
const base = '/';

export default defineConfig({
  // 基础路径，影响所有资源引用（JS/CSS/图片等）
  base: base,

  // 排除FFmpeg相关包的预构建优化
  // FFmpeg.wasm使用Web Worker，Vite的依赖预构建可能导致兼容性问题
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },

  // 开发服务器配置
  server: {
    // 设置Cross-Origin安全头
    // Cross-Origin-Embedder-Policy: require-corp 确保跨域资源隔离
    // Cross-Origin-Opener-Policy: same-origin 允许SharedArrayBuffer使用
    // 当前单线程版本的FFmpeg不需要SharedArrayBuffer，但提前配置为多线程版本做准备
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },

  // 构建配置
  build: {
    // 构建输出目录
    outDir: 'dist',
    // 构建前清空输出目录，避免残留旧文件
    emptyOutDir: true,
  },
});
