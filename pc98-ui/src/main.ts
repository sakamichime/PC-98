/**
 * PC-98模拟器主程序
 * 
 * 这是整个模拟器的入口文件，负责：
 * 1. 初始化桌面环境
 * 2. 创建桌面图标（支持拖拽移动）
 * 3. 初始化所有应用程序
 * 4. 管理开始菜单
 * 5. 管理右键菜单
 * 6. 更新系统时钟
 */

import './styles/pc98.css';
import { WindowManager } from './core/WindowManager';
import { InternetApp } from './apps/InternetApp';
import { FileManagerApp } from './apps/FileManagerApp';
import { NotepadApp } from './apps/NotepadApp';
import { TerminalApp } from './apps/TerminalApp';
import { SettingsApp } from './apps/SettingsApp';
import { ImageToolsApp } from './apps/ImageToolsApp';
import { VideoToolsApp } from './apps/VideoToolsApp';
import { BatchRenameApp } from './apps/BatchRenameApp';
import { SoftwareNavApp } from './apps/SoftwareNavApp';

/** 桌面图标配置接口 */
interface DesktopIcon {
  /** 图标显示名称 */
  label: string;
  /** 图标图形（emoji） */
  icon: string;
  /** 对应的应用启动ID */
  appId: string;
  /** 在桌面上的X坐标位置 */
  x: number;
  /** 在桌面上的Y坐标位置 */
  y: number;
}

/** 桌面图标列表 - 两列排列，间距100px */
const desktopIcons: DesktopIcon[] = [
  // 第一行
  { label: '文件管理器', icon: '📁', appId: 'filemanager', x: 20, y: 20 },
  { label: '互联网', icon: '🌐', appId: 'internet', x: 120, y: 20 },
  // 第二行
  { label: '软件导航站', icon: '🏪', appId: 'software-nav', x: 20, y: 120 },
  { label: '记事本', icon: '📝', appId: 'notepad', x: 120, y: 120 },
  // 第三行
  { label: '图片批量工具', icon: '🖼️', appId: 'image-tools', x: 20, y: 220 },
  { label: '视频批量工具', icon: '🎬', appId: 'video-tools', x: 120, y: 220 },
  // 第四行
  { label: 'MS-DOS提示符', icon: '💻', appId: 'terminal', x: 20, y: 320 },
  { label: '批量改名', icon: '📋', appId: 'batch-rename', x: 120, y: 320 },
  // 第五行
  { label: '系统设置', icon: '⚙️', appId: 'settings', x: 20, y: 420 },
];

/**
 * 主程序初始化函数 - 在DOM加载完毕后执行
 */
function main(): void {
  // 获取桌面和任务栏容器DOM元素
  const desktop = document.getElementById('desktop')!;
  const taskbarItems = document.querySelector('.taskbar-items') as HTMLElement;

  // 创建窗口管理器实例（负责所有窗口的创建/拖拽/缩放/层级管理）
  const wm = new WindowManager(desktop, taskbarItems);

  // 创建各应用程序实例
  const internet = new InternetApp(wm);
  const fileManager = new FileManagerApp(wm);
  const notepad = new NotepadApp(wm);
  const terminal = new TerminalApp(wm);
  const settings = new SettingsApp(wm);
  const imageTools = new ImageToolsApp(wm);
  const videoTools = new VideoToolsApp(wm);
  const batchRename = new BatchRenameApp(wm);
  const softwareNav = new SoftwareNavApp(wm);

  /**
   * 应用启动函数映射表
   * 键为appId，值为对应应用的open方法调用
   */
  const appLaunchers: Record<string, () => void> = {
    internet: () => internet.open(),
    filemanager: () => fileManager.open(),
    notepad: () => notepad.open(),
    terminal: () => terminal.open(),
    settings: () => settings.open(),
    'image-tools': () => imageTools.open(),
    'video-tools': () => videoTools.open(),
    'batch-rename': () => batchRename.open(),
    'software-nav': () => softwareNav.open(),
  };

  // === 创建桌面图标（带拖拽功能） ===
  desktopIcons.forEach((iconConfig) => {
    const icon = document.createElement('div');
    icon.className = 'desktop-icon';
    icon.style.left = `${iconConfig.x}px`;
    icon.style.top = `${iconConfig.y}px`;
    icon.innerHTML = `
      <div class="icon-image">${iconConfig.icon}</div>
      <div class="icon-label">${iconConfig.label}</div>
    `;

    // --- 图标拖拽功能 ---
    let isDragging = false;    // 当前是否正在拖拽
    let hasMoved = false;       // 是否实际移动过（用于区分点击和拖拽）
    let dragStartX = 0;         // 拖拽开始时鼠标X坐标
    let dragStartY = 0;         // 拖拽开始时鼠标Y坐标
    let iconStartX = 0;         // 拖拽开始时图标的left值
    let iconStartY = 0;         // 拖拽开始时图标的top值

    // 鼠标按下：记录起始位置
    icon.addEventListener('mousedown', (e: MouseEvent) => {
      isDragging = true;
      hasMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      iconStartX = icon.offsetLeft;
      iconStartY = icon.offsetTop;
      icon.classList.add('dragging');
      e.preventDefault(); // 防止文本选中
    });

    // 鼠标移动：拖拽图标（仅在isDragging为true时）
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      // 移动超过5px才算实际拖拽（区分点击和拖拽）
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved = true;
      }
      // 计算新位置，限制在桌面范围内
      const newX = Math.max(0, Math.min(iconStartX + dx, desktop.clientWidth - 72));
      const newY = Math.max(0, Math.min(iconStartY + dy, desktop.clientHeight - 80));
      icon.style.left = `${newX}px`;
      icon.style.top = `${newY}px`;
    });

    // 鼠标抬起：结束拖拽
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        icon.classList.remove('dragging');
      }
    });

    // 单击选中图标（仅在未拖拽时触发）
    icon.addEventListener('click', (_e: MouseEvent) => {
      if (hasMoved) return; // 如果刚刚拖拽过就不算点击
      desktop.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected');
    });

    // 双击打开应用（仅在未拖拽时触发）
    icon.addEventListener('dblclick', () => {
      if (hasMoved) return; // 如果刚刚拖拽过就不算双击
      const launcher = appLaunchers[iconConfig.appId];
      if (launcher) launcher();
    });

    desktop.appendChild(icon);
  });

  // === 桌面拉框选择功能 ===
  {
    let isSelecting = false;     // 是否正在拉框
    let selStartX = 0;           // 拉框起始X（相对于桌面）
    let selStartY = 0;           // 拉框起始Y（相对于桌面）
    let selBox: HTMLElement | null = null;  // 拉框DOM元素

    // 鼠标按下（仅在桌面空白区域，不在图标上）
    desktop.addEventListener('mousedown', (e: MouseEvent) => {
      // 如果点击的是桌面图标或任务栏等，不启动拉框
      if ((e.target as HTMLElement).closest('.desktop-icon')) return;
      if ((e.target as HTMLElement).closest('.pc-window')) return;
      // 只响应左键
      if (e.button !== 0) return;

      isSelecting = true;
      const rect = desktop.getBoundingClientRect();
      selStartX = e.clientX - rect.left;
      selStartY = e.clientY - rect.top;

      // 取消所有已选中状态
      desktop.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));

      // 创建选择框元素
      selBox = document.createElement('div');
      selBox.className = 'selection-box';
      selBox.style.left = `${selStartX}px`;
      selBox.style.top = `${selStartY}px`;
      selBox.style.width = '0px';
      selBox.style.height = '0px';
      desktop.appendChild(selBox);
    });

    // 鼠标移动：更新选择框大小
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isSelecting || !selBox) return;
      const rect = desktop.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      // 计算选择框的左上角和宽高（支持任意方向拖拽）
      const left = Math.min(selStartX, currentX);
      const top = Math.min(selStartY, currentY);
      const width = Math.abs(currentX - selStartX);
      const height = Math.abs(currentY - selStartY);

      selBox.style.left = `${left}px`;
      selBox.style.top = `${top}px`;
      selBox.style.width = `${width}px`;
      selBox.style.height = `${height}px`;

      // 实时检测哪些图标被框选中
      desktop.querySelectorAll('.desktop-icon').forEach((iconEl) => {
        const icon = iconEl as HTMLElement;
        const iconRect = {
          left: icon.offsetLeft,
          top: icon.offsetTop,
          right: icon.offsetLeft + icon.offsetWidth,
          bottom: icon.offsetTop + icon.offsetHeight,
        };
        const boxRect = { left, top, right: left + width, bottom: top + height };

        // 判断图标和选择框是否有交集
        const overlaps = !(iconRect.right < boxRect.left || iconRect.left > boxRect.right ||
                          iconRect.bottom < boxRect.top || iconRect.top > boxRect.bottom);
        icon.classList.toggle('selected', overlaps);
      });
    });

    // 鼠标抬起：结束拉框
    document.addEventListener('mouseup', () => {
      if (isSelecting && selBox) {
        selBox.remove();
        selBox = null;
      }
      isSelecting = false;
    });
  }

  // === 开始菜单逻辑 ===
  const startBtn = document.querySelector('.start-btn')!;
  const startMenu = document.getElementById('start-menu')!;

  // 点击START按钮切换菜单显示/隐藏
  startBtn.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    startMenu.classList.toggle('visible');
  });

  // 点击桌面其他区域关闭开始菜单
  desktop.addEventListener('click', () => {
    startMenu.classList.remove('visible');
  });

  // 开始菜单项点击：启动对应应用
  startMenu.querySelectorAll('.start-menu-item').forEach((item) => {
    item.addEventListener('click', () => {
      const appId = (item as HTMLElement).dataset.app;
      if (appId && appLaunchers[appId]) {
        appLaunchers[appId]();
      }
      startMenu.classList.remove('visible');
    });
  });

  // === 右键菜单逻辑 ===
  desktop.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    
    // 如果右键点击的是桌面图标，不显示桌面右键菜单
    if ((e.target as HTMLElement).closest('.desktop-icon')) return;
    
    // 移除已有的右键菜单（防止重复创建）
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();

    // 创建右键菜单DOM元素
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.innerHTML = `
      <div class="context-menu-item" data-action="refresh">🔄 刷新桌面</div>
      <div class="context-menu-item" data-action="arrange">📐 排列图标</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="new-folder">📁 新建文件夹</div>
      <div class="context-menu-item" data-action="new-file">📄 新建文本文件</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="settings">⚙️ 系统设置</div>
      <div class="context-menu-item" data-action="about">ℹ️ 关于</div>
    `;

    // 右键菜单项点击事件处理
    menu.querySelectorAll('.context-menu-item').forEach((menuItem) => {
      menuItem.addEventListener('click', () => {
        const action = (menuItem as HTMLElement).dataset.action;
        
        // 打开系统设置
        if (action === 'settings') settings.open();
        
        // 打开关于对话框
        if (action === 'about') {
          wm.createWindow({
            id: 'about',
            title: '关于',
            icon: 'ℹ️',
            width: 380,
            height: 240,
            content: `
              <div style="text-align:center;padding:16px;">
                <div style="font-size:48px;margin-bottom:12px;filter:drop-shadow(0 0 10px rgba(255,105,180,0.5));">🖥️</div>
                <div style="color:var(--pc-pink);font-size:18px;font-weight:bold;" class="neon-text">PC-98 模拟器</div>
                <div style="color:var(--pc-gray);font-size:12px;margin:8px 0;">NEC PC-9821 Workstation</div>
                <div style="color:var(--pc-dark-gray);font-size:11px;margin:16px 0;">
                  复古计算机模拟器<br>
                  TypeScript + Vite 实现<br>
                  NEC PC-9821 Compatible<br><br>
                  Version 2.02 Build 20220114
                </div>
                <button class="pc-btn" onclick="this.closest('.pc-window').querySelector('.close').click()">确定</button>
              </div>
            `,
            resizable: false,
          });
        }
        
        // 刷新桌面效果
        if (action === 'refresh') {
          desktop.style.opacity = '0.5';
          setTimeout(() => { desktop.style.opacity = '1'; }, 300);
        }
        
        // 排列图标（重新按默认位置排列）
        if (action === 'arrange') {
          const icons = desktop.querySelectorAll('.desktop-icon');
          icons.forEach((el, i) => {
            const col = i % 2;  // 两列排列
            const row = Math.floor(i / 2);
            (el as HTMLElement).style.left = `${20 + col * 100}px`;
            (el as HTMLElement).style.top = `${20 + row * 100}px`;
          });
        }
        
        menu.remove();
      });
    });

    document.body.appendChild(menu);

    // 点击其他地方关闭右键菜单
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
  });

  // === 系统时钟更新 ===
  const clockEl = document.getElementById('system-clock')!;
  const dateEl = document.getElementById('system-date')!;
  
  /** 每秒更新时钟显示 */
  const updateClock = (): void => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    dateEl.textContent = now.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
  };
  
  updateClock();
  setInterval(updateClock, 1000);

  // === 桌面背景装饰效果 ===
  addDesktopDecoration(desktop);
}

/**
 * 添加桌面背景装饰 - 浮动的半透明小图标
 * 使用CSS动画实现缓慢飘浮效果
 */
function addDesktopDecoration(desktop: HTMLElement): void {
  // 装饰符号列表
  const decorations = ['✨', '⭐', '💫', '🔮', '⬟', '◈'];
  
  // 创建8个浮动装饰元素
  for (let i = 0; i < 8; i++) {
    const deco = document.createElement('div');
    deco.textContent = decorations[i % decorations.length];
    deco.style.cssText = `
      position: absolute;
      font-size: ${8 + Math.random() * 12}px;
      opacity: ${0.15 + Math.random() * 0.15};
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      pointer-events: none;
      animation: float ${5 + Math.random() * 10}s ease-in-out infinite;
      animation-delay: ${Math.random() * 5}s;
      z-index: 0;
    `;
    desktop.appendChild(deco);
  }

  // 注入浮动动画和CRT效果开关的CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.15; }
      50% { transform: translateY(-20px) rotate(180deg); opacity: 0.3; }
    }
    /* 禁用CRT效果时的样式覆盖 */
    .no-crt::before {
      display: none !important;
    }
    .no-crt::after {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

// DOM加载完成后执行主程序初始化
document.addEventListener('DOMContentLoaded', main);
