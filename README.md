# PC-98 模拟器

NEC PC-9821 复古计算机模拟器，使用 TypeScript + Vite 构建，部署在 GitHub Pages。

## 功能

- 📁 文件管理器 - 树形目录浏览、文件属性查看
- 🌐 互联网浏览器 - 5个预设页面、导航历史、书签
- 📝 记事本 - 文本编辑、字数统计、本地存储
- 💻 MS-DOS终端 - 14种DOS命令、命令历史
- ⚙️ 系统设置 - CRT效果开关、背景色、分辨率
- 🖼️ 图片批量工具 - 缩放/压缩/Base64/格式转换（纯前端Canvas本地计算）
- 🎬 视频批量工具 - 转格式/压缩（纯前端MediaRecorder本地计算）
- 📋 批量改名 - 查找替换/前缀后缀/序号/大小写
- 🏪 软件导航站 - 30+ GitHub开源项目推荐

## 在线体验

👉 [点击这里访问](https://pc98.cc.cd/)

## 技术栈

- TypeScript
- Vite
- 纯前端实现，无需后端服务

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
3. 等待自动部署完成

## 许可证

MIT
