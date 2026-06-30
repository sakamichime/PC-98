/**
 * Vite构建配置文件
 * 
 * 主要配置项说明：
 * 1. base: 设置基础路径。GitHub Pages部署在仓库名子路径下时，
 *    需要将base设为仓库名（如 '/pc98-ui/'），这样所有资源引用路径才正确。
 *    如果部署在自定义域名或GitHub Pages根路径（username.github.io），则设为 '/'。
 * 2. build.outDir: 构建输出目录，默认为 'dist'，与 .gitignore 中的忽略规则一致。
 * 3. build.emptyOutDir: 构建前清空输出目录，确保没有残留的旧文件。
 */

import { defineConfig } from 'vite';

// GitHub Pages部署路径配置
// 使用自定义域名 pc98.cc.cd，根路径部署
// 如果改回仓库名子路径部署，请设为 '/PC-98/'
const base = '/';

export default defineConfig({
  // 基础路径，影响所有资源引用（JS/CSS/图片等）
  base: base,

  // 构建配置
  build: {
    // 构建输出目录
    outDir: 'dist',
    // 构建前清空输出目录，避免残留旧文件
    emptyOutDir: true,
  },
});
