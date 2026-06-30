# PC-98 模拟器

NEC PC-9821 复古计算机模拟器，使用 TypeScript + Vite 构建，部署在 GitHub Pages。
内置 FFmpeg.wasm，所有视频/图片处理均在浏览器本地完成，无需服务器。

## 功能

### 基础应用
- 📁 文件管理器 - 树形目录浏览、文件属性查看
- 🌐 互联网浏览器 - 5个预设页面、导航历史、书签
- 📝 记事本 - 文本编辑、字数统计、本地存储
- 💻 MS-DOS终端 - 14种DOS命令、命令历史
- ⚙️ 系统设置 - CRT效果开关、背景色、分辨率
- 🏪 软件导航站 - 30+ GitHub开源项目推荐

### 图片批量工具（7个功能）
- 📐 自定义分辨率 - 批量缩放图片到指定尺寸
- 📦 图片压缩 - 调整质量以减小文件体积
- 📋 复制Base64 - 将图片转换为Base64编码字符串
- 🔄 批量改格式 - PNG/JPEG/WebP格式互转
- 🎞️ GIF制作 - 图片序列合成GIF动图（FFmpeg）
- ✂️ GIF分解 - GIF动图分解为图片序列（FFmpeg）
- 💧 添加水印 - 批量添加文字水印（FFmpeg/Canvas）

### 视频批量工具（7个功能，FFmpeg驱动）
- 🔄 格式转换 - MP4/WebM/AVI/MOV/MKV/GIF互转
- 📦 视频压缩 - H.264编码，CRF质量控制
- ✂️ 视频裁剪 - 时间段截取
- 🔗 视频拼接 - 多个视频合并
- 🎵 提取音频 - MP3/AAC/WAV/FLAC
- 📷 视频截图 - 按时间点或间隔截图
- 🎞️ 视频转GIF - 视频转动态GIF

### 批量工具
- 📋 批量改名 - 查找替换/前缀后缀/序号/大小写

## 在线体验

👉 [点击这里访问](https://pc98.cc.cd/)

## 技术栈

- TypeScript
- Vite
- FFmpeg.wasm (WebAssembly)
- 纯前端实现，所有计算在浏览器本地完成

## 本地开发

```bash
cd pc98-ui
npm install
npm run dev
```

## 构建

```bash
cd pc98-ui
npm run build
```

构建产物在 `pc98-ui/dist/` 目录下。

## 部署

推送到 `main` 分支后，GitHub Actions 会自动构建并部署到 GitHub Pages。

首次使用需要：
1. 进入仓库 Settings → Pages
2. Source 选择 "GitHub Actions"
3. Custom domain 填入 `pc98.cc.cd`
4. DNS 添加 CNAME 记录：`@` → `sakamichime.github.io`
5. 等待自动部署完成

## 许可证

MIT
