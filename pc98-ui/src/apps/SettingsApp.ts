/**
 * 系统设置 - PC-98模拟器的设置面板
 * 
 * 功能：
 * 1. 桌面壁纸/背景色设置
 * 2. 声音设置
 * 3. CRT效果开关
 * 4. 分辨率设置
 * 5. 系统信息
 */

import { WindowManager } from '../core/WindowManager';

export class SettingsApp {
  private wm: WindowManager;

  /** 设置项 */
  private settings = {
    crtEnabled: true,
    scanlineIntensity: 0.15,
    themeColor: '#2d0a36',
    pixelFont: true,
    soundEnabled: true,
    volume: 80,
    autoSave: true,
    screenResolution: '640x480',
  };

  constructor(wm: WindowManager) {
    this.wm = wm;
  }

  /**
   * 打开设置窗口
   */
  open(): void {
    this.wm.createWindow({
      id: 'settings',
      title: '系统设置',
      icon: '⚙',
      width: 480,
      height: 420,
      content: this.buildHTML(),
      resizable: false,
      onCreated: (el) => {
        this.bindEvents(el);
      },
    });
  }

  /**
   * 构建设置面板HTML
   */
  private buildHTML(): string {
    return `
      <div style="display:flex;height:100%;">
        <!-- 左侧导航 -->
        <div style="width:120px;border-right:2px solid var(--pc-pink);padding:8px;font-size:12px;flex-shrink:0;">
          <div class="settings-tab active" data-tab="display" style="padding:6px 8px;cursor:pointer;color:var(--pc-pink);background:rgba(255,105,180,0.2);border-left:2px solid var(--pc-pink);margin-bottom:4px;">🖥 显示</div>
          <div class="settings-tab" data-tab="sound" style="padding:6px 8px;cursor:pointer;color:var(--pc-gray);border-left:2px solid transparent;margin-bottom:4px;">🔊 声音</div>
          <div class="settings-tab" data-tab="effects" style="padding:6px 8px;cursor:pointer;color:var(--pc-gray);border-left:2px solid transparent;margin-bottom:4px;">✨ 特效</div>
          <div class="settings-tab" data-tab="system" style="padding:6px 8px;cursor:pointer;color:var(--pc-gray);border-left:2px solid transparent;">ℹ️ 系统</div>
        </div>

        <!-- 右侧设置内容 -->
        <div style="flex:1;overflow-y:auto;padding:12px;">
          <!-- 显示设置 -->
          <div class="settings-page active" data-page="display">
            <h3 style="color:var(--pc-pink);margin-bottom:12px;font-size:14px;">显示设置</h3>
            
            <div style="margin-bottom:12px;">
              <div style="font-size:12px;color:var(--pc-gray);margin-bottom:4px;">桌面背景色</div>
              <div style="display:flex;gap:8px;">
                ${['#2d0a36', '#0a1e2e', '#1e2e0a', '#2e0a1e', '#0a0a0a', '#1e1e2e'].map(c =>
                  `<div class="color-option" data-color="${c}" style="width:32px;height:32px;background:${c};border:2px solid ${c === this.settings.themeColor ? 'var(--pc-pink)' : 'var(--pc-dark-gray)'};cursor:pointer;"></div>`
                ).join('')}
              </div>
            </div>

            <div style="margin-bottom:12px;">
              <div style="font-size:12px;color:var(--pc-gray);margin-bottom:4px;">屏幕分辨率</div>
              <select class="pc-select" style="width:200px;">
                <option value="640x480" ${this.settings.screenResolution === '640x480' ? 'selected' : ''}>640 x 480 (标准)</option>
                <option value="800x600" ${this.settings.screenResolution === '800x600' ? 'selected' : ''}>800 x 600</option>
                <option value="1024x768" ${this.settings.screenResolution === '1024x768' ? 'selected' : ''}>1024 x 768</option>
                <option value="1280x720" ${this.settings.screenResolution === '1280x720' ? 'selected' : ''}>1280 x 720</option>
              </select>
            </div>

            <div style="margin-bottom:12px;">
              <div style="font-size:12px;color:var(--pc-gray);margin-bottom:4px;">像素字体</div>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" ${this.settings.pixelFont ? 'checked' : ''} class="pixel-font-toggle">
                <span>启用像素风格字体</span>
              </label>
            </div>
          </div>

          <!-- 声音设置 -->
          <div class="settings-page" data-page="sound" style="display:none;">
            <h3 style="color:var(--pc-pink);margin-bottom:12px;font-size:14px;">声音设置</h3>
            
            <div style="margin-bottom:12px;">
              <div style="font-size:12px;color:var(--pc-gray);margin-bottom:4px;">声音</div>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" ${this.settings.soundEnabled ? 'checked' : ''}>
                <span>启用系统声音</span>
              </label>
            </div>

            <div style="margin-bottom:12px;">
              <div style="font-size:12px;color:var(--pc-gray);margin-bottom:4px;">主音量: <span class="volume-value">${this.settings.volume}%</span></div>
              <input type="range" min="0" max="100" value="${this.settings.volume}" class="volume-slider" style="width:100%;accent-color:var(--pc-pink);">
            </div>
          </div>

          <!-- 特效设置 -->
          <div class="settings-page" data-page="effects" style="display:none;">
            <h3 style="color:var(--pc-pink);margin-bottom:12px;font-size:14px;">CRT特效</h3>
            
            <div style="margin-bottom:12px;">
              <div style="font-size:12px;color:var(--pc-gray);margin-bottom:4px;">CRT效果</div>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" ${this.settings.crtEnabled ? 'checked' : ''} class="crt-toggle">
                <span>启用CRT扫描线效果</span>
              </label>
            </div>

            <div style="margin-bottom:12px;">
              <div style="font-size:12px;color:var(--pc-gray);margin-bottom:4px;">扫描线强度: <span class="scanline-value">${Math.round(this.settings.scanlineIntensity * 100)}%</span></div>
              <input type="range" min="0" max="50" value="${Math.round(this.settings.scanlineIntensity * 100)}" class="scanline-slider" style="width:100%;accent-color:var(--pc-pink);">
            </div>
          </div>

          <!-- 系统信息 -->
          <div class="settings-page" data-page="system" style="display:none;">
            <h3 style="color:var(--pc-pink);margin-bottom:12px;font-size:14px;">系统信息</h3>
            <div style="font-size:12px;line-height:2;">
              <div><span style="color:var(--pc-gray);">计算机型号:</span> NEC PC-9821Ce</div>
              <div><span style="color:var(--pc-gray);">处理器:</span> Intel 80486DX2 66MHz</div>
              <div><span style="color:var(--pc-gray);">内存:</span> 32MB</div>
              <div><span style="color:var(--pc-gray);">硬盘:</span> 540MB</div>
              <div><span style="color:var(--pc-gray);">显卡:</span> NEC µPD7220 (640x480 256色)</div>
              <div><span style="color:var(--pc-gray);">声卡:</span> PC-9801-86 音源</div>
              <div><span style="color:var(--pc-gray);">操作系统:</span> MS-DOS 7.00 / PC-98 Workstation v2.02</div>
              <div><span style="color:var(--pc-gray);">用户名:</span> User</div>
              <div><span style="color:var(--pc-gray);">网络状态:</span> <span style="color:var(--pc-neon-green);">● 已连接</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 绑定设置面板交互事件
   */
  private bindEvents(el: HTMLElement): void {
    // 标签页切换
    el.querySelectorAll('.settings-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = (tab as HTMLElement).dataset.tab;
        
        // 更新标签样式
        el.querySelectorAll('.settings-tab').forEach(t => {
          t.style.color = 'var(--pc-gray)';
          t.style.background = 'transparent';
          t.style.borderLeftColor = 'transparent';
        });
        tab.style.color = 'var(--pc-pink)';
        tab.style.background = 'rgba(255,105,180,0.2)';
        tab.style.borderLeftColor = 'var(--pc-pink)';

        // 显示对应页面
        el.querySelectorAll('.settings-page').forEach(p => p.setAttribute('style', 'display:none;'));
        const page = el.querySelector(`.settings-page[data-page="${target}"]`);
        if (page) page.setAttribute('style', 'display:block;');
      });
    });

    // 背景色选择
    el.querySelectorAll('.color-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const color = (opt as HTMLElement).dataset.color || '';
        if (color) {
          this.settings.themeColor = color;
          (document.getElementById('desktop') as HTMLElement).style.background = color;
          // 更新选中边框
          el.querySelectorAll('.color-option').forEach(o => {
            o.style.borderColor = 'var(--pc-dark-gray)';
          });
          opt.style.borderColor = 'var(--pc-pink)';
        }
      });
    });

    // CRT效果开关
    el.querySelector('.crt-toggle')?.addEventListener('change', (e) => {
      this.settings.crtEnabled = (e.target as HTMLInputElement).checked;
      const desktop = document.getElementById('desktop');
      if (desktop) {
        (desktop as HTMLElement).classList.toggle('no-crt', !this.settings.crtEnabled);
      }
    });

    // 音量滑块
    el.querySelector('.volume-slider')?.addEventListener('input', (e) => {
      this.settings.volume = parseInt((e.target as HTMLInputElement).value);
      el.querySelector('.volume-value')!.textContent = `${this.settings.volume}%`;
    });

    // 扫描线强度
    el.querySelector('.scanline-slider')?.addEventListener('input', (e) => {
      this.settings.scanlineIntensity = parseInt((e.target as HTMLInputElement).value) / 100;
      el.querySelector('.scanline-value')!.textContent = `${Math.round(this.settings.scanlineIntensity * 100)}%`;
    });
  }
}
