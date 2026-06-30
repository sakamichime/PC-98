/**
 * 文件管理器 - 模拟PC-98风格的文件管理器
 * 
 * 功能：
 * 1. 树形目录浏览
 * 2. 文件/文件夹的创建和删除
 * 3. 文件属性查看
 * 4. 驱动器选择
 * 5. 模拟的文件系统
 */

import { WindowManager } from '../core/WindowManager';

/** 虚拟文件/文件夹接口 */
export interface VFile {
  /** 名称 */
  name: string;
  /** 类型 */
  type: 'folder' | 'file' | 'image' | 'text' | 'audio' | 'video';
  /** 大小（字节） */
  size: number;
  /** 修改日期 */
  modified: string;
  /** 子文件（如果是文件夹） */
  children?: VFile[];
  /** 内容（如果是文本文件） */
  content?: string;
}

export class FileManagerApp {
  private wm: WindowManager;
  /** 模拟的文件系统 */
  private fileSystem: VFile;
  private currentPath: string[] = ['C:'];

  constructor(wm: WindowManager) {
    this.wm = wm;
    this.fileSystem = this.createFileSystem();
  }

  /**
   * 创建模拟的文件系统
   */
  private createFileSystem(): VFile {
    return {
      name: 'C:',
      type: 'folder',
      size: 0,
      modified: '2022-01-15',
      children: [
        {
          name: 'Windows',
          type: 'folder',
          size: 0,
          modified: '2000-05-10',
          children: [
            { name: 'System', type: 'folder', size: 0, modified: '2000-05-10', children: [] },
            { name: 'Desktop.ini', type: 'file', size: 128, modified: '2000-05-10' },
          ],
        },
        {
          name: 'Tools',
          type: 'folder',
          size: 0,
          modified: '2022-01-14',
          children: [
            { name: '项目文件', type: 'folder', size: 0, modified: '2022-01-14', children: [
              { name: '2022-01-14_开发笔记.txt', type: 'text', size: 2048, modified: '2022-01-14', content: '今日开发进度：\n- 完成了窗口管理器的拖拽功能\n- 修复了终端输入框聚焦问题\n- 新增了图片批量处理工具' },
              { name: '2022-01-13_开发笔记.txt', type: 'text', size: 1536, modified: '2022-01-13', content: '今日开发进度：\n- 搭建了PC-98模拟器基本框架\n- 实现了CRT扫描线效果\n- 添加了桌面图标系统' },
            ]},
            { name: '桌面背景.bmp', type: 'image', size: 15360, modified: '2022-01-10' },
            { name: '系统音效.wav', type: 'audio', size: 5242880, modified: '2022-01-12' },
            { name: '系统配置.ini', type: 'file', size: 256, modified: '2022-01-08', content: '[Settings]\nComputerName=PC98-WORKSTATION\nResolution=640x480\nFPS=30\nBitrate=2000' },
          ],
        },
        {
          name: '我的文档',
          type: 'folder',
          size: 0,
          modified: '2022-01-14',
          children: [
            { name: '备忘录.txt', type: 'text', size: 4096, modified: '2022-01-14', content: '待办事项备忘：\n- 学习N88-BASIC编程\n- 整理PC-98硬件收藏\n- 备份重要数据到软盘\n- 更新系统驱动程序' },
            { name: '通讯录.txt', type: 'text', size: 1024, modified: '2022-01-13', content: '联系人列表：\n1. 田中太郎 - PC-98硬件爱好者\n2. 鈴木花子 - BASIC编程同好\n3. 佐藤一郎 - 复古游戏收藏家\n4. 山田次郎 - 系统管理员\n5. 高橋三郎 - 网络工程师' },
            { name: '待办事项.txt', type: 'text', size: 512, modified: '2022-01-14', content: '□ 整理硬盘文件\n□ 备份系统配置\n□ 更新杀毒软件\n□ 清理临时文件\n✓ 修复显示器驱动' },
          ],
        },
        {
          name: '互联网',
          type: 'folder',
          size: 0,
          modified: '2022-01-14',
          children: [
            {
              name: '收藏夹',
              type: 'folder',
              size: 0,
              modified: '2022-01-14',
              children: [
                { name: 'PC-98博物馆.url', type: 'file', size: 64, modified: '2022-01-14' },
                { name: '复古游戏数据库.url', type: 'file', size: 64, modified: '2022-01-10' },
              ],
            },
          ],
        },
        { name: 'AUTOEXEC.BAT', type: 'file', size: 128, modified: '1998-12-25' },
        { name: 'CONFIG.SYS', type: 'file', size: 256, modified: '1998-12-25' },
        { name: 'IO.SYS', type: 'file', size: 40960, modified: '1998-12-25' },
        { name: 'COMMAND.COM', type: 'file', size: 93248, modified: '1998-12-25' },
      ],
    };
  }

  /**
   * 打开文件管理器窗口
   */
  open(): void {
    this.wm.createWindow({
      id: 'filemanager',
      title: '文件管理器',
      icon: '📁',
      width: 600,
      height: 400,
      content: this.buildHTML(),
      resizable: true,
      onCreated: (el) => {
        this.renderDirectory(el);
        this.bindEvents(el);
      },
    });
  }

  /**
   * 构建文件管理器HTML
   */
  private buildHTML(): string {
    return `
      <div style="display:flex;flex-direction:column;height:100%;gap:6px;">
        <!-- 路径栏 -->
        <div style="display:flex;gap:4px;align-items:center;">
          <button class="pc-btn" style="padding:2px 6px;">⬆</button>
          <input type="text" class="pc-input path-bar" value="C:\\" style="flex:1;font-size:12px;" readonly>
        </div>

        <div style="flex:1;display:flex;gap:4px;min-height:0;">
          <!-- 左侧目录树 -->
          <div class="dir-tree" style="width:160px;overflow-y:auto;border:2px inset var(--pc-dark-gray);background:var(--pc-black);padding:4px;font-size:12px;flex-shrink:0;">
          </div>

          <!-- 右侧文件列表 -->
          <div style="flex:1;display:flex;flex-direction:column;">
            <div class="file-list-header" style="display:flex;background:var(--pc-dark-gray);padding:4px 8px;font-size:11px;border-bottom:1px solid var(--pc-pink);">
              <span style="flex:1;">名称</span>
              <span style="width:100px;">大小</span>
              <span style="width:100px;">修改日期</span>
            </div>
            <div class="file-list" style="flex:1;overflow-y:auto;border:2px inset var(--pc-dark-gray);background:var(--pc-black);padding:2px;">
            </div>
          </div>
        </div>

        <!-- 状态栏 -->
        <div class="status-bar">
          <span class="file-count">0 个对象</span>
        </div>
      </div>
    `;
  }

  /**
   * 绑定文件管理器交互事件
   */
  private bindEvents(el: HTMLElement): void {
    // 双击打开文件/文件夹
    el.querySelector('.file-list')!.addEventListener('dblclick', (e) => {
      const item = (e.target as HTMLElement).closest('.file-item');
      if (!item) return;
      const name = (item as HTMLElement).dataset.name || '';
      const type = (item as HTMLElement).dataset.type || '';
      
      if (type === 'folder') {
        this.currentPath.push(name);
        this.renderDirectory(el);
      } else if (type === 'text') {
        this.openTextFile(name, el);
      } else {
        // 显示文件属性
        this.showFileProperties(name, el);
      }
    });

    // 上级目录按钮
    el.querySelector('.pc-btn')!.addEventListener('click', () => {
      if (this.currentPath.length > 1) {
        this.currentPath.pop();
        this.renderDirectory(el);
      }
    });

    // 目录树点击
    el.querySelector('.dir-tree')!.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.tree-item');
      if (!item) return;
      const path = (item as HTMLElement).dataset.path || '';
      this.currentPath = path.split('\\').filter(Boolean);
      this.renderDirectory(el);
    });
  }

  /**
   * 渲染当前目录内容
   */
  private renderDirectory(el: HTMLElement): void {
    const folder = this.getFolderByPath(this.currentPath);
    if (!folder || !folder.children) return;

    // 更新路径栏
    const pathBar = el.querySelector('.path-bar') as HTMLInputElement;
    pathBar.value = this.currentPath.join('\\') + '\\';

    // 渲染文件列表
    const fileList = el.querySelector('.file-list') as HTMLElement;
    fileList.innerHTML = '';

    // 先渲染文件夹，再渲染文件
    const sorted = [...folder.children].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });

    sorted.forEach((file) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.dataset.name = file.name;
      item.dataset.type = file.type;
      item.style.cssText = 'display:flex;padding:2px 8px;cursor:pointer;font-size:12px;border-bottom:1px solid rgba(255,105,180,0.1);';
      
      const icon = this.getFileIcon(file.type);
      item.innerHTML = `
        <span style="flex:1;">${icon} ${file.name}</span>
        <span style="width:100px;color:var(--pc-gray);">${file.type === 'folder' ? '<DIR>' : this.formatSize(file.size)}</span>
        <span style="width:100px;color:var(--pc-gray);">${file.modified}</span>
      `;
      
      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(255,105,180,0.15)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = '';
      });
      
      fileList.appendChild(item);
    });

    // 更新文件计数
    const count = el.querySelector('.file-count');
    if (count) count.textContent = `${folder.children.length} 个对象`;

    // 渲染目录树
    this.renderTree(el);
  }

  /**
   * 渲染左侧目录树
   */
  private renderTree(el: HTMLElement): void {
    const tree = el.querySelector('.dir-tree') as HTMLElement;
    tree.innerHTML = '';

    const renderItem = (file: VFile, path: string, depth: number = 0): void => {
      if (file.type !== 'folder') return;
      
      const item = document.createElement('div');
      item.className = 'tree-item';
      item.dataset.path = path;
      item.style.cssText = `padding:2px 4px;padding-left:${8 + depth * 12}px;cursor:pointer;`;

      const isCurrent = path === this.currentPath.join('\\');
      item.style.color = isCurrent ? 'var(--pc-pink)' : 'var(--pc-white)';
      item.style.background = isCurrent ? 'rgba(255,105,180,0.2)' : '';
      
      item.textContent = `📁 ${file.name}`;
      tree.appendChild(item);

      if (file.children) {
        file.children.forEach((child) => {
          renderItem(child, `${path}\\${child.name}`, depth + 1);
        });
      }
    };

    renderItem(this.fileSystem, 'C:');
  }

  /**
   * 打开文本文件
   */
  private openTextFile(filename: string, parentEl: HTMLElement): void {
    const folder = this.getFolderByPath(this.currentPath);
    const file = folder?.children?.find(f => f.name === filename);
    if (!file || !file.content) return;

    this.wm.createWindow({
      id: `file-${Date.now()}`,
      title: `${filename} - 记事本`,
      icon: '📄',
      width: 450,
      height: 350,
      content: `
        <textarea class="pc-input" style="height:100%;width:100%;resize:none;font-size:13px;line-height:1.6;">${file.content}</textarea>
      `,
      resizable: true,
    });
  }

  /**
   * 显示文件属性
   */
  private showFileProperties(filename: string, parentEl: HTMLElement): void {
    const folder = this.getFolderByPath(this.currentPath);
    const file = folder?.children?.find(f => f.name === filename);
    if (!file) return;

    const icon = this.getFileIcon(file.type);
    this.wm.createWindow({
      id: `props-${Date.now()}`,
      title: `${filename} 属性`,
      icon: '📋',
      width: 280,
      height: 200,
      content: `
        <div style="padding:8px;">
          <div style="text-align:center;font-size:36px;margin-bottom:8px;">${icon}</div>
          <div style="font-size:13px;margin-bottom:4px;"><b>名称:</b> ${file.name}</div>
          <div style="font-size:13px;margin-bottom:4px;"><b>类型:</b> ${file.type}</div>
          <div style="font-size:13px;margin-bottom:4px;"><b>大小:</b> ${this.formatSize(file.size)}</div>
          <div style="font-size:13px;margin-bottom:4px;"><b>修改日期:</b> ${file.modified}</div>
          <div style="text-align:center;margin-top:12px;">
            <button class="pc-btn" onclick="this.closest('.pc-window').querySelector('.close').click()">确定</button>
          </div>
        </div>
      `,
      resizable: false,
    });
  }

  /**
   * 根据路径获取文件夹
   */
  private getFolderByPath(path: string[]): VFile | null {
    let current = this.fileSystem;
    for (let i = 1; i < path.length; i++) {
      const child = current.children?.find(f => f.name === path[i]);
      if (!child) return null;
      current = child;
    }
    return current;
  }

  /**
   * 获取文件图标
   */
  private getFileIcon(type: string): string {
    const icons: Record<string, string> = {
      folder: '📁',
      file: '📄',
      text: '📝',
      image: '🖼',
      audio: '🎵',
      video: '🎬',
    };
    return icons[type] || '📄';
  }

  /**
   * 格式化文件大小
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}
