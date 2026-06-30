/**
 * 窗口管理器 - 管理PC-98风格窗口的创建、移动、缩放、层级
 * 
 * 这个类是整个模拟器UI的核心，负责：
 * 1. 创建和管理多个窗口
 * 2. 处理窗口拖拽移动
 * 3. 处理窗口缩放
 * 4. 管理窗口的层级（焦点切换）
 * 5. 窗口的最小化/最大化/关闭
 * 6. 任务栏项同步
 */

/** 窗口配置接口 */
export interface WindowConfig {
  /** 窗口唯一标识 */
  id: string;
  /** 窗口标题 */
  title: string;
  /** 窗口图标 */
  icon: string;
  /** 窗口初始宽度 */
  width: number;
  /** 窗口初始高度 */
  height: number;
  /** 窗口内容HTML */
  content: string;
  /** 窗口创建完成后的回调 */
  onCreated?: (el: HTMLElement) => void;
  /** 是否允许调整大小 */
  resizable?: boolean;
}

/** 窗口状态接口 */
export interface WindowState {
  /** 窗口配置 */
  config: WindowConfig;
  /** DOM元素 */
  element: HTMLElement;
  /** 是否最大化 */
  maximized: boolean;
  /** 是否最小化 */
  minimized: boolean;
  /** 是否活跃（有焦点） */
  active: boolean;
  /** 保存的位置（最大化前） */
  savedPos?: { x: number; y: number; w: number; h: number };
}

export class WindowManager {
  /** 所有窗口的集合，用id索引 */
  private windows: Map<string, WindowState> = new Map();
  /** 当前最高层级 */
  private topZ: number = 100;
  /** 桌面元素 */
  private desktop: HTMLElement;
  /** 任务栏项容器 */
  private taskbarItems: HTMLElement;
  /** 当前活跃窗口ID */
  private activeWindowId: string | null = null;

  constructor(desktop: HTMLElement, taskbarItems: HTMLElement) {
    this.desktop = desktop;
    this.taskbarItems = taskbarItems;
    this.setupGlobalClickHandler();
  }

  /**
   * 设置全局点击处理，点击桌面时取消所有窗口的活跃状态
   */
  private setupGlobalClickHandler(): void {
    this.desktop.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).id === 'desktop') {
        this.deactivateAll();
      }
    });
  }

  /**
   * 创建一个新窗口
   * @param config 窗口配置
   */
  createWindow(config: WindowConfig): HTMLElement {
    // 如果窗口已存在，直接聚焦
    if (this.windows.has(config.id)) {
      this.focusWindow(config.id);
      return this.windows.get(config.id)!.element;
    }

    // 创建窗口DOM元素
    const win = document.createElement('div');
    win.className = 'pc-window';
    win.id = `window-${config.id}`;
    win.style.width = `${config.width}px`;
    win.style.height = `${config.height}px`;
    // 计算居中位置（稍微随机偏移让多个窗口不完全重叠）
    const offsetX = Object.keys(this.windows).length * 30;
    const offsetY = Object.keys(this.windows).length * 30;
    win.style.left = `${Math.max(50, (window.innerWidth - config.width) / 2 + offsetX)}px`;
    win.style.top = `${Math.max(20, (window.innerHeight - config.height) / 2 - 50 + offsetY)}px`;

    // 标题栏
    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';
    titlebar.innerHTML = `
      <span class="title-text">${config.icon} ${config.title}</span>
      <div class="window-buttons">
        <div class="window-btn minimize" title="最小化">_</div>
        <div class="window-btn maximize" title="最大化">□</div>
        <div class="window-btn close" title="关闭">×</div>
      </div>
    `;

    // 窗口内容区
    const content = document.createElement('div');
    content.className = 'window-content';
    content.innerHTML = config.content;

    // 调整大小手柄
    const resize = document.createElement('div');
    resize.className = 'window-resize';

    win.appendChild(titlebar);
    win.appendChild(content);
    if (config.resizable !== false) {
      win.appendChild(resize);
    }

    // 添加到桌面
    this.desktop.appendChild(win);

    // 保存窗口状态
    const state: WindowState = {
      config,
      element: win,
      maximized: false,
      minimized: false,
      active: false,
    };
    this.windows.set(config.id, state);

    // 创建任务栏项
    this.createTaskbarItem(config);

    // 绑定事件
    this.bindWindowEvents(config.id, win, titlebar, resize);

    // 聚焦新窗口
    this.focusWindow(config.id);

    // 执行创建回调
    if (config.onCreated) {
      config.onCreated(content);
    }

    return win;
  }

  /**
   * 绑定窗口的各种事件（拖拽、缩放、按钮点击）
   */
  private bindWindowEvents(id: string, win: HTMLElement, titlebar: HTMLElement, resize: HTMLElement): void {
    // 点击窗口聚焦
    win.addEventListener('mousedown', () => this.focusWindow(id));

    // 拖拽标题栏移动窗口
    this.setupDrag(id, titlebar, win);

    // 拖拽调整大小
    this.setupResize(id, resize, win);

    // 最小化按钮
    titlebar.querySelector('.minimize')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimizeWindow(id);
    });

    // 最大化按钮
    titlebar.querySelector('.maximize')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMaximize(id);
    });

    // 关闭按钮
    titlebar.querySelector('.close')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeWindow(id);
    });
  }

  /**
   * 设置窗口拖拽功能
   */
  private setupDrag(id: string, titlebar: HTMLElement, win: HTMLElement): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    titlebar.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).classList.contains('window-btn')) return;
      isDragging = true;
      startX = e.clientX - win.offsetLeft;
      startY = e.clientY - win.offsetTop;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const state = this.windows.get(id);
      if (!state || state.maximized) return;
      win.style.left = `${e.clientX - startX}px`;
      win.style.top = `${e.clientY - startY}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /**
   * 设置窗口右下角拖拽缩放功能
   */
  private setupResize(id: string, resize: HTMLElement, win: HTMLElement): void {
    let isResizing = false;
    let startW = 0;
    let startH = 0;

    resize.addEventListener('mousedown', (e) => {
      isResizing = true;
      startW = e.clientX;
      startH = e.clientY;
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const state = this.windows.get(id);
      if (!state || state.maximized) return;
      const newW = Math.max(300, win.offsetWidth + (e.clientX - startW));
      const newH = Math.max(200, win.offsetHeight + (e.clientY - startH));
      win.style.width = `${newW}px`;
      win.style.height = `${newH}px`;
      startW = e.clientX;
      startH = e.clientY;
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });
  }

  /**
   * 聚焦窗口（提升到最上层并标记为活跃）
   */
  focusWindow(id: string): void {
    const state = this.windows.get(id);
    if (!state || state.minimized) return;

    // 取消其他窗口的活跃状态
    this.deactivateAll();

    // 设置新活跃窗口
    state.active = true;
    this.topZ++;
    state.element.style.zIndex = `${this.topZ}`;
    state.element.classList.add('active');
    this.activeWindowId = id;

    // 同步任务栏
    const taskItem = this.taskbarItems.querySelector(`[data-window-id="${id}"]`);
    if (taskItem) taskItem.classList.add('active');
  }

  /**
   * 取消所有窗口的活跃状态
   */
  private deactivateAll(): void {
    this.windows.forEach((state) => {
      state.active = false;
      state.element.classList.remove('active');
    });
    this.taskbarItems.querySelectorAll('.taskbar-item').forEach((el) => {
      el.classList.remove('active');
    });
    this.activeWindowId = null;
  }

  /**
   * 最小化窗口
   */
  minimizeWindow(id: string): void {
    const state = this.windows.get(id);
    if (!state) return;
    state.minimized = true;
    state.element.style.display = 'none';
    if (this.activeWindowId === id) {
      this.activeWindowId = null;
    }
  }

  /**
   * 切换最大化/还原
   */
  toggleMaximize(id: string): void {
    const state = this.windows.get(id);
    if (!state) return;

    if (state.maximized) {
      // 还原
      state.maximized = false;
      state.element.classList.remove('maximized');
      if (state.savedPos) {
        state.element.style.left = `${state.savedPos.x}px`;
        state.element.style.top = `${state.savedPos.y}px`;
        state.element.style.width = `${state.savedPos.w}px`;
        state.element.style.height = `${state.savedPos.h}px`;
      }
    } else {
      // 保存当前位置并最大化
      state.savedPos = {
        x: state.element.offsetLeft,
        y: state.element.offsetTop,
        w: state.element.offsetWidth,
        h: state.element.offsetHeight,
      };
      state.maximized = true;
      state.element.classList.add('maximized');
    }
  }

  /**
   * 关闭窗口
   */
  closeWindow(id: string): void {
    const state = this.windows.get(id);
    if (!state) return;
    state.element.remove();
    this.windows.delete(id);

    // 移除任务栏项
    const taskItem = this.taskbarItems.querySelector(`[data-window-id="${id}"]`);
    if (taskItem) taskItem.remove();

    if (this.activeWindowId === id) {
      this.activeWindowId = null;
    }
  }

  /**
   * 从任务栏恢复最小化的窗口，或切换焦点
   */
  restoreFromTaskbar(id: string): void {
    const state = this.windows.get(id);
    if (!state) return;

    if (state.minimized) {
      state.minimized = false;
      state.element.style.display = 'flex';
      this.focusWindow(id);
    } else if (this.activeWindowId === id) {
      // 再次点击活跃窗口则最小化
      this.minimizeWindow(id);
    } else {
      this.focusWindow(id);
    }
  }

  /**
   * 创建任务栏项
   */
  private createTaskbarItem(config: WindowConfig): void {
    const item = document.createElement('div');
    item.className = 'taskbar-item';
    item.dataset.windowId = config.id;
    item.textContent = `${config.icon} ${config.title}`;
    item.addEventListener('click', () => this.restoreFromTaskbar(config.id));
    this.taskbarItems.appendChild(item);
  }

  /**
   * 获取窗口的内容容器
   */
  getWindowContent(id: string): HTMLElement | null {
    const state = this.windows.get(id);
    if (!state) return null;
    return state.element.querySelector('.window-content');
  }

  /**
   * 检查窗口是否存在
   */
  hasWindow(id: string): boolean {
    return this.windows.has(id);
  }

  /**
   * 更新窗口标题
   */
  setWindowTitle(id: string, title: string): void {
    const state = this.windows.get(id);
    if (!state) return;
    state.config.title = title;
    const titleEl = state.element.querySelector('.title-text');
    if (titleEl) {
      titleEl.textContent = `${state.config.icon} ${title}`;
    }
  }
}
