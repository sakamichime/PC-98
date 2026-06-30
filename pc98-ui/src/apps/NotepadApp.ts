/**
 * 记事本 - PC-98风格文本编辑器
 * 
 * 功能：
 * 1. 文本编辑
 * 2. 保存/加载（本地存储）
 * 3. 字数统计
 * 4. 全屏编辑模式
 */

import { WindowManager } from '../core/WindowManager';

export class NotepadApp {
  private wm: WindowManager;

  constructor(wm: WindowManager) {
    this.wm = wm;
  }

  /**
   * 打开记事本窗口
   */
  open(): void {
    this.wm.createWindow({
      id: 'notepad',
      title: '无标题 - 记事本',
      icon: '📝',
      width: 500,
      height: 380,
      content: this.buildHTML(),
      resizable: true,
      onCreated: (el) => {
        this.bindEvents(el);
      },
    });
  }

  /**
   * 构建记事本HTML
   */
  private buildHTML(): string {
    return `
      <div style="display:flex;flex-direction:column;height:100%;">
        <!-- 菜单栏 -->
        <div style="display:flex;gap:2px;margin-bottom:6px;">
          <button class="pc-btn notepad-menu" data-menu="file" style="padding:2px 8px;font-size:11px;">文件(F)</button>
          <button class="pc-btn notepad-menu" data-menu="edit" style="padding:2px 8px;font-size:11px;">编辑(E)</button>
          <button class="pc-btn notepad-menu" data-menu="format" style="padding:2px 8px;font-size:11px;">格式(O)</button>
          <button class="pc-btn notepad-menu" data-menu="help" style="padding:2px 8px;font-size:11px;">帮助(H)</button>
        </div>

        <!-- 编辑区 -->
        <textarea class="pc-input notepad-textarea" style="flex:1;resize:none;font-size:13px;line-height:1.6;padding:8px;" placeholder="在这里输入文字..."></textarea>

        <!-- 状态栏 -->
        <div class="status-bar" style="margin-top:4px;">
          <span class="char-count">字数: 0</span>
          <span>|</span>
          <span class="line-count">行数: 1</span>
        </div>
      </div>
    `;
  }

  /**
   * 绑定记事本交互事件
   */
  private bindEvents(el: HTMLElement): void {
    const textarea = el.querySelector('.notepad-textarea') as HTMLTextAreaElement;
    const charCount = el.querySelector('.char-count') as HTMLElement;
    const lineCount = el.querySelector('.line-count') as HTMLElement;

    // 实时更新字数和行数
    textarea.addEventListener('input', () => {
      const text = textarea.value;
      charCount.textContent = `字数: ${text.length}`;
      lineCount.textContent = `行数: ${text.split('\n').length}`;
    });

    // 文件菜单功能
    el.querySelector('[data-menu="file"]')?.addEventListener('click', () => {
      const text = textarea.value;
      if (text.trim()) {
        localStorage.setItem('pc98-notepad-content', text);
        charCount.textContent += ' (已保存)';
      }
    });

    // 加载已保存的内容
    const saved = localStorage.getItem('pc98-notepad-content');
    if (saved) {
      textarea.value = saved;
      charCount.textContent = `字数: ${saved.length}`;
      lineCount.textContent = `行数: ${saved.split('\n').length}`;
    }
  }
}
