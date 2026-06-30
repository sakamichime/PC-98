/**
 * 图片批量工具 - PC-98风格图片批量处理应用
 * 
 * 功能：
 * 1. 自定义分辨率 - 批量缩放图片到指定尺寸
 * 2. 图片压缩 - 调整图片质量以减小文件体积
 * 3. 复制Base64 - 将图片转换为Base64编码字符串
 * 4. 批量改格式 - 将图片转换为指定格式（PNG/JPEG/WebP）
 * 
 * 所有功能均为纯前端Canvas API实现，不依赖后端服务
 */

import { WindowManager } from '../core/WindowManager';

/** 图片文件信息接口 - 存储已上传图片的原始数据和元信息 */
interface ImageFileInfo {
  /** 图片文件的原始File对象 */
  file: File;
  /** 图片加载后的HTMLImageElement对象，用于Canvas绘制 */
  img: HTMLImageElement;
  /** 图片的原始宽度（像素） */
  originalWidth: number;
  /** 图片的原始高度（像素） */
  originalHeight: number;
}

export class ImageToolsApp {
  /** 窗口管理器的引用，用于创建和管理窗口 */
  private wm: WindowManager;

  /** 当前激活的标签页名称，默认为'resize'（自定义分辨率） */
  private activeTab: string = 'resize';

  constructor(wm: WindowManager) {
    this.wm = wm;
  }

  /**
   * 打开图片批量工具窗口
   * 调用窗口管理器创建一个包含4个功能标签页的窗口
   */
  open(): void {
    this.wm.createWindow({
      id: 'image-tools',
      title: '图片批量工具',
      icon: '🖼️',
      width: 700,
      height: 520,
      content: this.buildHTML(),
      resizable: true,
      onCreated: (el) => {
        this.bindEvents(el);
      },
    });
  }

  /**
   * 构建窗口内容的完整HTML
   * 包含标签栏和4个功能面板
   * @returns 完整的HTML字符串
   */
  private buildHTML(): string {
    return `
      <div class="img-tools-container" style="display:flex;flex-direction:column;height:100%;font-family:var(--font-ui);">

        <!-- ====== 标签栏 ====== -->
        <!-- 4个功能标签页的切换按钮，点击后显示对应面板 -->
        <div class="img-tools-tabs" style="display:flex;gap:2px;margin-bottom:6px;border-bottom:2px solid var(--pc-pink);padding-bottom:4px;">
          <button class="pc-btn img-tools-tab active" data-tab="resize" style="padding:4px 10px;font-size:11px;background:rgba(255,105,180,0.3);border-left:2px solid var(--pc-pink);">📐 自定义分辨率</button>
          <button class="pc-btn img-tools-tab" data-tab="compress" style="padding:4px 10px;font-size:11px;background:transparent;border-left:2px solid transparent;">📦 图片压缩</button>
          <button class="pc-btn img-tools-tab" data-tab="base64" style="padding:4px 10px;font-size:11px;background:transparent;border-left:2px solid transparent;">📋 复制Base64</button>
          <button class="pc-btn img-tools-tab" data-tab="convert" style="padding:4px 10px;font-size:11px;background:transparent;border-left:2px solid transparent;">🔄 批量改格式</button>
        </div>

        <!-- ====== 面板容器 ====== -->
        <div style="flex:1;overflow:hidden;position:relative;">

          <!-- ====== 标签1: 自定义分辨率 ====== -->
          <div class="img-tools-panel" data-panel="resize" style="height:100%;overflow-y:auto;">
            ${this.buildResizePanel()}
          </div>

          <!-- ====== 标签2: 图片压缩 ====== -->
          <div class="img-tools-panel" data-panel="compress" style="height:100%;overflow-y:auto;display:none;">
            ${this.buildCompressPanel()}
          </div>

          <!-- ====== 标签3: 复制Base64 ====== -->
          <div class="img-tools-panel" data-panel="base64" style="height:100%;overflow-y:auto;display:none;">
            ${this.buildBase64Panel()}
          </div>

          <!-- ====== 标签4: 批量改格式 ====== -->
          <div class="img-tools-panel" data-panel="convert" style="height:100%;overflow-y:auto;display:none;">
            ${this.buildConvertPanel()}
          </div>

        </div>
      </div>
    `;
  }

  /**
   * 构建自定义分辨率面板的HTML
   * 包含拖拽上传区域、缩略图预览列表、目标尺寸设置和操作按钮
   * @returns 自定义分辨率面板的HTML字符串
   */
  private buildResizePanel(): string {
    return `
      <!-- 拖拽上传区域 -->
      <div class="img-drop-zone resize-drop" style="border:2px dashed var(--pc-pink);padding:20px;text-align:center;margin-bottom:10px;cursor:pointer;color:var(--pc-gray);font-size:12px;">
        📁 将图片拖拽到这里，或点击选择文件（支持多选）<br>
        <input type="file" multiple accept="image/*" class="resize-file-input" style="display:none;">
      </div>

      <!-- 目标尺寸设置区域 -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;flex-wrap:wrap;">
        <span style="color:var(--pc-gray);">目标宽度:</span>
        <input type="number" class="pc-input resize-width" value="800" min="1" max="10000" style="width:70px;">
        <span style="color:var(--pc-gray);">px</span>
        <span style="color:var(--pc-gray);margin-left:8px;">高度:</span>
        <input type="number" class="pc-input resize-height" value="600" min="1" max="10000" style="width:70px;">
        <span style="color:var(--pc-gray);">px</span>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--pc-white);margin-left:8px;">
          <input type="checkbox" class="resize-keep-ratio" checked> 保持宽高比
        </label>
      </div>

      <!-- 操作按钮 -->
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button class="glow-btn resize-start" style="padding:4px 16px;font-size:12px;">开始处理</button>
        <button class="pc-btn resize-download-all" style="padding:4px 16px;font-size:12px;display:none;">下载全部</button>
      </div>

      <!-- 缩略图预览列表 - 显示已上传图片的原始尺寸和缩略图 -->
      <div class="resize-preview-list" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
    `;
  }

  /**
   * 构建图片压缩面板的HTML
   * 包含拖拽上传区域、格式选择、质量滑块、预览列表和压缩按钮
   * @returns 图片压缩面板的HTML字符串
   */
  private buildCompressPanel(): string {
    return `
      <!-- 拖拽上传区域 -->
      <div class="img-drop-zone compress-drop" style="border:2px dashed var(--pc-pink);padding:20px;text-align:center;margin-bottom:10px;cursor:pointer;color:var(--pc-gray);font-size:12px;">
        📁 将图片拖拽到这里，或点击选择文件（支持多选）<br>
        <input type="file" multiple accept="image/*" class="compress-file-input" style="display:none;">
      </div>

      <!-- 压缩设置区域 -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;flex-wrap:wrap;">
        <span style="color:var(--pc-gray);">输出格式:</span>
        <select class="pc-select compress-format" style="width:100px;">
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
          <option value="image/webp">WebP</option>
        </select>
        <span style="color:var(--pc-gray);margin-left:8px;">质量: <span class="compress-quality-value">75</span>%</span>
        <input type="range" class="compress-quality" min="1" max="100" value="75" style="width:120px;accent-color:var(--pc-pink);">
      </div>

      <!-- 操作按钮 -->
      <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">
        <button class="glow-btn compress-start" style="padding:4px 16px;font-size:12px;">开始压缩</button>
      </div>

      <!-- 进度条 -->
      <div class="pc-progress compress-progress" style="display:none;margin-bottom:10px;">
        <div class="bar compress-progress-bar" style="width:0%;"></div>
      </div>

      <!-- 压缩结果预览列表 - 显示原始大小和预估压缩后大小 -->
      <div class="compress-preview-list" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
    `;
  }

  /**
   * 构建复制Base64面板的HTML
   * 包含拖拽上传区域、Base64字符串显示、长度信息和复制按钮
   * @returns 复制Base64面板的HTML字符串
   */
  private buildBase64Panel(): string {
    return `
      <!-- 拖拽上传区域 - 仅支持单张图片 -->
      <div class="img-drop-zone base64-drop" style="border:2px dashed var(--pc-pink);padding:20px;text-align:center;margin-bottom:10px;cursor:pointer;color:var(--pc-gray);font-size:12px;">
        📁 将图片拖拽到这里，或点击选择文件（仅支持单张）<br>
        <input type="file" accept="image/*" class="base64-file-input" style="display:none;">
      </div>

      <!-- Base64信息显示区域 -->
      <div style="margin-bottom:8px;font-size:12px;">
        <span style="color:var(--pc-gray);">Base64长度:</span>
        <span class="base64-length" style="color:var(--pc-neon-green);">0 字符</span>
      </div>

      <!-- 是否包含Data URI前缀的选项 -->
      <label style="display:flex;align-items:center;gap:4px;margin-bottom:8px;font-size:12px;cursor:pointer;color:var(--pc-white);">
        <input type="checkbox" class="base64-with-prefix" checked> 带Data URI前缀（data:image/...;base64,）
      </label>

      <!-- 复制按钮和状态提示 -->
      <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">
        <button class="glow-btn base64-copy" style="padding:4px 16px;font-size:12px;">复制到剪贴板</button>
        <span class="base64-status" style="font-size:12px;"></span>
      </div>

      <!-- Base64字符串预览文本框 -->
      <textarea class="pc-input base64-output" readonly style="width:100%;height:200px;resize:none;font-size:10px;line-height:1.4;word-break:break-all;" placeholder="上传图片后，Base64字符串将显示在这里..."></textarea>
    `;
  }

  /**
   * 构建批量改格式面板的HTML
   * 包含拖拽上传区域、目标格式选择、质量设置和转换按钮
   * @returns 批量改格式面板的HTML字符串
   */
  private buildConvertPanel(): string {
    return `
      <!-- 拖拽上传区域 -->
      <div class="img-drop-zone convert-drop" style="border:2px dashed var(--pc-pink);padding:20px;text-align:center;margin-bottom:10px;cursor:pointer;color:var(--pc-gray);font-size:12px;">
        📁 将图片拖拽到这里，或点击选择文件（支持多选）<br>
        <input type="file" multiple accept="image/*" class="convert-file-input" style="display:none;">
      </div>

      <!-- 格式转换设置区域 -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;flex-wrap:wrap;">
        <span style="color:var(--pc-gray);">目标格式:</span>
        <select class="pc-select convert-format" style="width:100px;">
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/webp">WebP</option>
        </select>
        <span style="color:var(--pc-gray);margin-left:8px;">质量: <span class="convert-quality-value">90</span>%</span>
        <input type="range" class="convert-quality" min="1" max="100" value="90" style="width:120px;accent-color:var(--pc-pink);">
        <span style="color:var(--pc-dark-gray);font-size:10px;margin-left:4px;">（仅JPEG/WebP有效）</span>
      </div>

      <!-- 操作按钮 -->
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button class="glow-btn convert-start" style="padding:4px 16px;font-size:12px;">开始转换</button>
        <button class="pc-btn convert-download-all" style="padding:4px 16px;font-size:12px;display:none;">批量下载</button>
      </div>

      <!-- 文件列表预览 - 显示已上传图片的文件名和格式 -->
      <div class="convert-preview-list" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
    `;
  }

  /**
   * 绑定所有交互事件
   * 在窗口创建完成后调用，包括标签切换、拖拽上传、各面板按钮等
   * @param el 窗口内容区域的DOM根元素
   */
  private bindEvents(el: HTMLElement): void {
    /* ====== 标签页切换逻辑 ====== */
    this.bindTabSwitch(el);

    /* ====== 标签1: 自定义分辨率事件 ====== */
    this.bindResizePanel(el);

    /* ====== 标签2: 图片压缩事件 ====== */
    this.bindCompressPanel(el);

    /* ====== 标签3: 复制Base64事件 ====== */
    this.bindBase64Panel(el);

    /* ====== 标签4: 批量改格式事件 ====== */
    this.bindConvertPanel(el);
  }

  /**
   * 绑定标签页切换事件
   * 点击标签时：高亮当前标签（粉色背景+左边框），显示对应面板，隐藏其他面板
   * @param el 窗口内容区域的DOM根元素
   */
  private bindTabSwitch(el: HTMLElement): void {
    el.querySelectorAll('.img-tools-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = (tab as HTMLElement).dataset.tab;

        /* 清除所有标签的高亮样式 */
        el.querySelectorAll('.img-tools-tab').forEach(t => {
          t.style.background = 'transparent';
          t.style.borderLeftColor = 'transparent';
        });

        /* 给当前点击的标签添加高亮样式 */
        tab.style.background = 'rgba(255,105,180,0.3)';
        tab.style.borderLeftColor = 'var(--pc-pink)';

        /* 隐藏所有面板 */
        el.querySelectorAll('.img-tools-panel').forEach(p => {
          p.style.display = 'none';
        });

        /* 显示对应的面板 */
        const panel = el.querySelector(`.img-tools-panel[data-panel="${target}"]`);
        if (panel) {
          panel.style.display = 'block';
        }
      });
    });
  }

  // ================================================================
  //  标签1: 自定义分辨率 - 相关方法和事件绑定
  // ================================================================

  /** 缩放处理完成后的图片Blob数组，用于批量下载 */
  private resizeResults: Blob[] = [];

  /** 缩放处理完成后的文件名数组，与resizeResults一一对应 */
  private resizeFilenames: string[] = [];

  /** 自定义分辨率面板已上传的图片信息列表 */
  private resizeImages: ImageFileInfo[] = [];

  /**
   * 绑定自定义分辨率面板的所有事件
   * 包括拖拽上传、文件选择、开始处理和下载全部按钮
   * @param el 窗口内容区域的DOM根元素
   */
  private bindResizePanel(el: HTMLElement): void {
    const dropZone = el.querySelector('.resize-drop') as HTMLElement;
    const fileInput = el.querySelector('.resize-file-input') as HTMLInputElement;
    const startBtn = el.querySelector('.resize-start') as HTMLElement;
    const downloadAllBtn = el.querySelector('.resize-download-all') as HTMLElement;

    /* 点击拖拽区域时触发隐藏的file input的点击事件，打开文件选择对话框 */
    dropZone.addEventListener('click', () => {
      fileInput.click();
    });

    /* 拖拽进入区域时，改变边框颜色提示用户可以放置文件 */
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--pc-neon-green)';
    });

    /* 拖拽离开区域时，恢复原来的边框颜色 */
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--pc-pink)';
    });

    /* 文件被拖拽放置到区域时，读取所有图片文件 */
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--pc-pink)';
      const files = Array.from((e as DragEvent).dataTransfer?.files || []);
      this.handleResizeFiles(el, files);
    });

    /* 通过文件选择对话框选择文件后，读取所有图片文件 */
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      this.handleResizeFiles(el, files);
    });

    /* 点击"开始处理"按钮时，执行批量缩放 */
    startBtn.addEventListener('click', () => {
      this.doResize(el);
    });

    /* 点击"下载全部"按钮时，逐张下载所有已处理图片 */
    downloadAllBtn.addEventListener('click', () => {
      this.downloadResizeResults();
    });
  }

  /**
   * 处理自定义分辨率面板的上传文件
   * 读取每个图片文件的Data URL，创建Image对象，然后生成缩略图预览
   * @param el 窗口内容区域的DOM根元素
   * @param files 用户选择的File对象数组
   */
  private handleResizeFiles(el: HTMLElement, files: File[]): void {
    /* 过滤出图片类型的文件（排除非图片文件） */
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    this.resizeImages = [];

    /* 隐藏下载全部按钮，因为需要重新处理 */
    const downloadAllBtn = el.querySelector('.resize-download-all') as HTMLElement;
    downloadAllBtn.style.display = 'none';
    this.resizeResults = [];
    this.resizeFilenames = [];

    /* 使用Promise.all等待所有图片加载完成 */
    const loadPromises = imageFiles.map(file => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        /* 读取文件为Data URL（Base64编码） */
        reader.onload = () => {
          const img = new Image();
          /* Image对象加载完成后，保存图片信息和原始尺寸 */
          img.onload = () => {
            this.resizeImages.push({
              file,
              img,
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight,
            });
            resolve();
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });
    });

    /* 所有图片加载完成后，刷新预览列表 */
    Promise.all(loadPromises).then(() => {
      this.renderResizePreviews(el);
    });
  }

  /**
   * 渲染自定义分辨率面板的缩略图预览列表
   * 为每张图片创建一个缩略图卡片，显示缩略图、文件名和原始尺寸
   * @param el 窗口内容区域的DOM根元素
   */
  private renderResizePreviews(el: HTMLElement): void {
    const list = el.querySelector('.resize-preview-list') as HTMLElement;
    list.innerHTML = '';

    this.resizeImages.forEach((info, index) => {
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid var(--pc-dark-gray);padding:6px;background:var(--pc-black);width:120px;text-align:center;';

      /* 创建缩略图img元素，设置最大宽高为100px保持比例 */
      const thumb = document.createElement('img');
      thumb.src = info.img.src;
      thumb.style.cssText = 'max-width:100px;max-height:100px;display:block;margin:0 auto 4px;image-rendering:pixelated;';
      card.appendChild(thumb);

      /* 显示文件名（截取前12个字符避免溢出） */
      const nameSpan = document.createElement('div');
      nameSpan.style.cssText = 'font-size:10px;color:var(--pc-gray);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      nameSpan.textContent = info.file.name.substring(0, 12);
      card.appendChild(nameSpan);

      /* 显示原始尺寸（宽度x高度） */
      const sizeSpan = document.createElement('div');
      sizeSpan.style.cssText = 'font-size:10px;color:var(--pc-pink);';
      sizeSpan.textContent = `${info.originalWidth}x${info.originalHeight}`;
      card.appendChild(sizeSpan);

      list.appendChild(card);
    });
  }

  /**
   * 执行批量缩放处理
   * 读取目标宽高设置，使用Canvas API将每张图片缩放到指定尺寸
   * @param el 窗口内容区域的DOM根元素
   */
  private doResize(el: HTMLElement): void {
    if (this.resizeImages.length === 0) return;

    /* 获取用户输入的目标宽度和高度 */
    const widthInput = el.querySelector('.resize-width') as HTMLInputElement;
    const heightInput = el.querySelector('.resize-height') as HTMLInputElement;
    const keepRatio = el.querySelector('.resize-keep-ratio') as HTMLInputElement;
    let targetW = parseInt(widthInput.value) || 800;
    let targetH = parseInt(heightInput.value) || 600;
    const ratio = keepRatio.checked;

    /* 清空之前的结果 */
    this.resizeResults = [];
    this.resizeFilenames = [];

    /* 逐张处理每张图片 */
    this.resizeImages.forEach((info) => {
      /* 如果勾选了保持宽高比，根据目标宽度按比例计算高度 */
      let finalW = targetW;
      let finalH = targetH;
      if (ratio) {
        const scale = targetW / info.originalWidth;
        finalH = Math.round(info.originalHeight * scale);
      }

      /* 创建离屏Canvas，用于绘制缩放后的图片 */
      const canvas = document.createElement('canvas');
      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d')!;

      /* 使用drawImage将原始图片绘制到目标尺寸的Canvas上 */
      ctx.drawImage(info.img, 0, 0, finalW, finalH);

      /* 将Canvas内容导出为PNG格式的Blob对象 */
      canvas.toBlob((blob) => {
        if (blob) {
          this.resizeResults.push(blob);
          /* 生成输出文件名：原文件名去掉扩展名 + _resized + .png */
          const baseName = info.file.name.replace(/\.[^.]+$/, '');
          this.resizeFilenames.push(`${baseName}_resized.png`);
        }

        /* 所有图片处理完成后，显示下载全部按钮 */
        if (this.resizeResults.length === this.resizeImages.length) {
          const downloadAllBtn = el.querySelector('.resize-download-all') as HTMLElement;
          downloadAllBtn.style.display = 'inline-block';
        }
      }, 'image/png');
    });
  }

  /**
   * 下载所有自定义分辨率处理后的图片
   * 为每张图片创建一个临时<a>标签，设置download属性后触发点击下载
   */
  private downloadResizeResults(): void {
    this.resizeResults.forEach((blob, i) => {
      /* 使用URL.createObjectURL创建临时下载链接 */
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.resizeFilenames[i];
      /* 将链接添加到DOM中，触发点击，然后移除 */
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      /* 释放Blob URL占用的内存 */
      URL.revokeObjectURL(url);
    });
  }

  // ================================================================
  //  标签2: 图片压缩 - 相关方法和事件绑定
  // ================================================================

  /** 图片压缩面板已上传的图片信息列表 */
  private compressImages: ImageFileInfo[] = [];

  /**
   * 绑定图片压缩面板的所有事件
   * 包括拖拽上传、文件选择、质量滑块、开始压缩按钮
   * @param el 窗口内容区域的DOM根元素
   */
  private bindCompressPanel(el: HTMLElement): void {
    const dropZone = el.querySelector('.compress-drop') as HTMLElement;
    const fileInput = el.querySelector('.compress-file-input') as HTMLInputElement;
    const startBtn = el.querySelector('.compress-start') as HTMLElement;
    const qualitySlider = el.querySelector('.compress-quality') as HTMLInputElement;
    const qualityValue = el.querySelector('.compress-quality-value') as HTMLElement;

    /* 拖拽区域点击打开文件选择对话框 */
    dropZone.addEventListener('click', () => {
      fileInput.click();
    });

    /* 拖拽悬停高亮提示 */
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--pc-neon-green)';
    });

    /* 拖拽离开恢复样式 */
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--pc-pink)';
    });

    /* 拖拽放置文件后开始读取 */
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--pc-pink)';
      const files = Array.from((e as DragEvent).dataTransfer?.files || []);
      this.handleCompressFiles(el, files);
    });

    /* 文件选择后读取 */
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      this.handleCompressFiles(el, files);
    });

    /* 质量滑块拖动时实时更新显示的质量数值 */
    qualitySlider.addEventListener('input', () => {
      qualityValue.textContent = qualitySlider.value;
    });

    /* 点击开始压缩按钮 */
    startBtn.addEventListener('click', () => {
      this.doCompress(el);
    });
  }

  /**
   * 处理图片压缩面板的上传文件
   * 读取每张图片并生成预览，显示原始大小信息
   * @param el 窗口内容区域的DOM根元素
   * @param files 用户选择的File对象数组
   */
  private handleCompressFiles(el: HTMLElement, files: File[]): void {
    /* 过滤出图片文件 */
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    this.compressImages = [];

    const loadPromises = imageFiles.map(file => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            this.compressImages.push({
              file,
              img,
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight,
            });
            resolve();
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(loadPromises).then(() => {
      this.renderCompressPreviews(el);
    });
  }

  /**
   * 渲染图片压缩面板的预览列表
   * 每张图片显示缩略图、文件名和原始文件大小
   * @param el 窗口内容区域的DOM根元素
   */
  private renderCompressPreviews(el: HTMLElement): void {
    const list = el.querySelector('.compress-preview-list') as HTMLElement;
    list.innerHTML = '';

    this.compressImages.forEach((info) => {
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid var(--pc-dark-gray);padding:6px;background:var(--pc-black);width:120px;text-align:center;';

      /* 缩略图 */
      const thumb = document.createElement('img');
      thumb.src = info.img.src;
      thumb.style.cssText = 'max-width:100px;max-height:100px;display:block;margin:0 auto 4px;image-rendering:pixelated;';
      card.appendChild(thumb);

      /* 文件名 */
      const nameSpan = document.createElement('div');
      nameSpan.style.cssText = 'font-size:10px;color:var(--pc-gray);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      nameSpan.textContent = info.file.name.substring(0, 12);
      card.appendChild(nameSpan);

      /* 原始文件大小（转换为KB显示） */
      const sizeSpan = document.createElement('div');
      sizeSpan.style.cssText = 'font-size:10px;color:var(--pc-pink);';
      sizeSpan.textContent = this.formatFileSize(info.file.size);
      card.appendChild(sizeSpan);

      list.appendChild(card);
    });
  }

  /**
   * 执行批量压缩处理
   * 根据用户选择的格式和质量参数，使用Canvas重新编码每张图片
   * @param el 窗口内容区域的DOM根元素
   */
  private doCompress(el: HTMLElement): void {
    if (this.compressImages.length === 0) return;

    /* 获取用户设置的压缩参数 */
    const format = (el.querySelector('.compress-format') as HTMLSelectElement).value;
    const quality = parseInt((el.querySelector('.compress-quality') as HTMLInputElement).value) / 100;

    /* 显示进度条 */
    const progressBar = el.querySelector('.compress-progress') as HTMLElement;
    const bar = el.querySelector('.compress-progress-bar') as HTMLElement;
    progressBar.style.display = 'block';
    bar.style.width = '0%';

    /* 清空预览列表，用于显示压缩结果 */
    const list = el.querySelector('.compress-preview-list') as HTMLElement;
    list.innerHTML = '';

    let completed = 0;

    this.compressImages.forEach((info, index) => {
      /* 创建与原图同尺寸的Canvas（不改变分辨率，只改变编码质量） */
      const canvas = document.createElement('canvas');
      canvas.width = info.originalWidth;
      canvas.height = info.originalHeight;
      const ctx = canvas.getContext('2d')!;

      /* 将原图绘制到Canvas上 */
      ctx.drawImage(info.img, 0, 0);

      /* 使用toBlob按照指定格式和质量导出压缩后的图片 */
      canvas.toBlob((blob) => {
        completed++;

        /* 更新进度条（当前完成数 / 总数 * 100%） */
        const progress = Math.round((completed / this.compressImages.length) * 100);
        bar.style.width = `${progress}%`;

        if (blob) {
          /* 创建压缩结果卡片，显示缩略图和压缩前后大小对比 */
          const card = document.createElement('div');
          card.style.cssText = 'border:1px solid var(--pc-dark-gray);padding:6px;background:var(--pc-black);width:140px;text-align:center;';

          const thumb = document.createElement('img');
          thumb.src = info.img.src;
          thumb.style.cssText = 'max-width:100px;max-height:80px;display:block;margin:0 auto 4px;image-rendering:pixelated;';
          card.appendChild(thumb);

          /* 显示文件名 */
          const nameSpan = document.createElement('div');
          nameSpan.style.cssText = 'font-size:10px;color:var(--pc-gray);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          nameSpan.textContent = info.file.name.substring(0, 14);
          card.appendChild(nameSpan);

          /* 显示原始大小 → 压缩后大小 */
          const sizeSpan = document.createElement('div');
          sizeSpan.style.cssText = 'font-size:10px;color:var(--pc-pink);';
          sizeSpan.textContent = `${this.formatFileSize(info.file.size)} → ${this.formatFileSize(blob.size)}`;
          card.appendChild(sizeSpan);

          list.appendChild(card);

          /* 创建下载按钮 */
          const dlBtn = document.createElement('button');
          dlBtn.className = 'pc-btn';
          dlBtn.style.cssText = 'font-size:10px;padding:2px 8px;margin-top:4px;';
          dlBtn.textContent = '下载';
          dlBtn.addEventListener('click', () => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            /* 根据格式生成对应的文件扩展名 */
            const ext = format === 'image/jpeg' ? '.jpg' : format === 'image/webp' ? '.webp' : '.png';
            a.href = url;
            a.download = info.file.name.replace(/\.[^.]+$/, '') + '_compressed' + ext;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          });
          card.appendChild(dlBtn);
        }

        /* 全部压缩完成后延迟隐藏进度条 */
        if (completed === this.compressImages.length) {
          setTimeout(() => {
            progressBar.style.display = 'none';
          }, 1500);
        }
      }, format, quality);
    });
  }

  // ================================================================
  //  标签3: 复制Base64 - 相关方法和事件绑定
  // ================================================================

  /**
   * 绑定复制Base64面板的所有事件
   * 包括拖拽上传、文件选择、复制按钮和前缀选项切换
   * @param el 窗口内容区域的DOM根元素
   */
  private bindBase64Panel(el: HTMLElement): void {
    const dropZone = el.querySelector('.base64-drop') as HTMLElement;
    const fileInput = el.querySelector('.base64-file-input') as HTMLInputElement;
    const copyBtn = el.querySelector('.base64-copy') as HTMLElement;
    const withPrefix = el.querySelector('.base64-with-prefix') as HTMLInputElement;

    /* 存储完整的Base64字符串（带前缀） */
    let fullBase64 = '';

    /* 存储纯Base64字符串（不带前缀） */
    let rawBase64 = '';

    /* 点击拖拽区域打开文件选择 */
    dropZone.addEventListener('click', () => {
      fileInput.click();
    });

    /* 拖拽悬停高亮 */
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--pc-neon-green)';
    });

    /* 拖拽离开恢复 */
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--pc-pink)';
    });

    /* 拖拽放置文件后读取并生成Base64 */
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--pc-pink)';
      const files = Array.from((e as DragEvent).dataTransfer?.files || []);
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        this.handleBase64File(el, files[0]);
      }
    });

    /* 文件选择后读取并生成Base64 */
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      if (files.length > 0) {
        this.handleBase64File(el, files[0]);
      }
    });

    /* 点击复制按钮时，将Base64字符串复制到剪贴板 */
    copyBtn.addEventListener('click', async () => {
      const output = el.querySelector('.base64-output') as HTMLTextAreaElement;
      const status = el.querySelector('.base64-status') as HTMLElement;
      const text = output.value;

      if (!text) {
        status.textContent = '没有可复制的内容';
        status.style.color = 'var(--pc-neon-yellow)';
        return;
      }

      try {
        /* 使用navigator.clipboard.writeText API将文本写入剪贴板 */
        await navigator.clipboard.writeText(text);
        status.textContent = '✓ 复制成功！';
        status.style.color = 'var(--pc-neon-green)';
      } catch {
        /* 如果剪贴板API不可用，提供失败提示 */
        status.textContent = '✗ 复制失败，请手动选择复制';
        status.style.color = 'var(--pc-hot-pink)';
      }
    });

    /* 切换是否包含Data URI前缀时，更新文本框内容 */
    withPrefix.addEventListener('change', () => {
      /* 由于需要读取生成的Base64数据，这里通过自定义事件或直接操作output实现 */
      const output = el.querySelector('.base64-output') as HTMLTextAreaElement;
      /* 从data属性中获取原始的full和raw Base64字符串 */
      const dataFull = output.dataset.fullBase64 || '';
      const dataRaw = output.dataset.rawBase64 || '';
      output.value = withPrefix.checked ? dataFull : dataRaw;
    });
  }

  /**
   * 处理复制Base64面板的单张图片上传
   * 使用FileReader读取图片为Data URL，分离出纯Base64部分和Data URI前缀部分
   * @param el 窗口内容区域的DOM根元素
   * @param file 用户选择的图片File对象
   */
  private handleBase64File(el: HTMLElement, file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      /* 完整的Data URL字符串，格式为：data:image/png;base64,iVBOR... */
      const dataUrl = reader.result as string;
      /* 查找Base64数据的起始位置（逗号后面的部分就是纯Base64） */
      const commaIndex = dataUrl.indexOf(',');
      const fullBase64 = dataUrl;
      const rawBase64 = commaIndex >= 0 ? dataUrl.substring(commaIndex + 1) : dataUrl;

      /* 将Base64数据存储到textarea的dataset属性中，供前缀切换使用 */
      const output = el.querySelector('.base64-output') as HTMLTextAreaElement;
      output.dataset.fullBase64 = fullBase64;
      output.dataset.rawBase64 = rawBase64;

      /* 根据用户是否勾选了"带Data URI前缀"，决定显示哪种格式 */
      const withPrefix = el.querySelector('.base64-with-prefix') as HTMLInputElement;
      output.value = withPrefix.checked ? fullBase64 : rawBase64;

      /* 更新Base64长度显示 */
      const lengthSpan = el.querySelector('.base64-length') as HTMLElement;
      lengthSpan.textContent = `${rawBase64.length.toLocaleString()} 字符`;

      /* 清除之前的状态提示 */
      const status = el.querySelector('.base64-status') as HTMLElement;
      status.textContent = '✓ 已生成Base64';
      status.style.color = 'var(--pc-neon-green)';
    };
    /* 使用readAsDataURL读取文件为Data URL（自动包含Data URI前缀和Base64编码） */
    reader.readAsDataURL(file);
  }

  // ================================================================
  //  标签4: 批量改格式 - 相关方法和事件绑定
  // ================================================================

  /** 批量改格式面板已上传的图片信息列表 */
  private convertImages: ImageFileInfo[] = [];

  /** 格式转换完成后生成的Blob结果数组 */
  private convertResults: Blob[] = [];

  /** 格式转换完成后的文件名数组，与convertResults一一对应 */
  private convertFilenames: string[] = [];

  /**
   * 绑定批量改格式面板的所有事件
   * 包括拖拽上传、文件选择、质量滑块、开始转换和批量下载按钮
   * @param el 窗口内容区域的DOM根元素
   */
  private bindConvertPanel(el: HTMLElement): void {
    const dropZone = el.querySelector('.convert-drop') as HTMLElement;
    const fileInput = el.querySelector('.convert-file-input') as HTMLInputElement;
    const startBtn = el.querySelector('.convert-start') as HTMLElement;
    const downloadAllBtn = el.querySelector('.convert-download-all') as HTMLElement;
    const qualitySlider = el.querySelector('.convert-quality') as HTMLInputElement;
    const qualityValue = el.querySelector('.convert-quality-value') as HTMLElement;

    /* 点击拖拽区域打开文件选择 */
    dropZone.addEventListener('click', () => {
      fileInput.click();
    });

    /* 拖拽悬停高亮 */
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--pc-neon-green)';
    });

    /* 拖拽离开恢复 */
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--pc-pink)';
    });

    /* 拖拽放置文件后读取 */
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--pc-pink)';
      const files = Array.from((e as DragEvent).dataTransfer?.files || []);
      this.handleConvertFiles(el, files);
    });

    /* 文件选择后读取 */
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      this.handleConvertFiles(el, files);
    });

    /* 质量滑块实时更新数值 */
    qualitySlider.addEventListener('input', () => {
      qualityValue.textContent = qualitySlider.value;
    });

    /* 点击开始转换按钮 */
    startBtn.addEventListener('click', () => {
      this.doConvert(el);
    });

    /* 点击批量下载按钮 */
    downloadAllBtn.addEventListener('click', () => {
      this.downloadConvertResults();
    });
  }

  /**
   * 处理批量改格式面板的上传文件
   * 读取每张图片并生成文件列表预览
   * @param el 窗口内容区域的DOM根元素
   * @param files 用户选择的File对象数组
   */
  private handleConvertFiles(el: HTMLElement, files: File[]): void {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    this.convertImages = [];

    /* 隐藏批量下载按钮 */
    const downloadAllBtn = el.querySelector('.convert-download-all') as HTMLElement;
    downloadAllBtn.style.display = 'none';
    this.convertResults = [];
    this.convertFilenames = [];

    const loadPromises = imageFiles.map(file => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            this.convertImages.push({
              file,
              img,
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight,
            });
            resolve();
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(loadPromises).then(() => {
      this.renderConvertPreviews(el);
    });
  }

  /**
   * 渲染批量改格式面板的文件列表预览
   * 显示每张图片的缩略图、文件名和当前格式
   * @param el 窗口内容区域的DOM根元素
   */
  private renderConvertPreviews(el: HTMLElement): void {
    const list = el.querySelector('.convert-preview-list') as HTMLElement;
    list.innerHTML = '';

    this.convertImages.forEach((info) => {
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid var(--pc-dark-gray);padding:6px;background:var(--pc-black);width:120px;text-align:center;';

      /* 缩略图 */
      const thumb = document.createElement('img');
      thumb.src = info.img.src;
      thumb.style.cssText = 'max-width:100px;max-height:100px;display:block;margin:0 auto 4px;image-rendering:pixelated;';
      card.appendChild(thumb);

      /* 文件名 */
      const nameSpan = document.createElement('div');
      nameSpan.style.cssText = 'font-size:10px;color:var(--pc-gray);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      nameSpan.textContent = info.file.name.substring(0, 12);
      card.appendChild(nameSpan);

      /* 当前图片格式（MIME类型） */
      const formatSpan = document.createElement('div');
      formatSpan.style.cssText = 'font-size:10px;color:var(--pc-pink);';
      formatSpan.textContent = info.file.type.split('/')[1]?.toUpperCase() || '未知';
      card.appendChild(formatSpan);

      list.appendChild(card);
    });
  }

  /**
   * 执行批量格式转换
   * 使用Canvas将每张图片按照目标格式和质量重新编码
   * @param el 窗口内容区域的DOM根元素
   */
  private doConvert(el: HTMLElement): void {
    if (this.convertImages.length === 0) return;

    /* 获取用户设置的目标格式和质量参数 */
    const format = (el.querySelector('.convert-format') as HTMLSelectElement).value;
    const quality = parseInt((el.querySelector('.convert-quality') as HTMLInputElement).value) / 100;

    /* 根据目标格式确定文件扩展名 */
    const ext = format === 'image/jpeg' ? '.jpg' : format === 'image/webp' ? '.webp' : '.png';

    this.convertResults = [];
    this.convertFilenames = [];

    this.convertImages.forEach((info) => {
      /* 创建与原图同尺寸的Canvas */
      const canvas = document.createElement('canvas');
      canvas.width = info.originalWidth;
      canvas.height = info.originalHeight;
      const ctx = canvas.getContext('2d')!;

      /* 将原图绘制到Canvas上（PNG格式不需要质量参数，传undefined） */
      ctx.drawImage(info.img, 0, 0);

      /* 使用toBlob按照目标格式导出，质量参数仅对JPEG和WebP有效 */
      const blobQuality = (format === 'image/png') ? undefined : quality;
      canvas.toBlob((blob) => {
        if (blob) {
          this.convertResults.push(blob);
          /* 生成转换后的文件名：原文件名去掉扩展名 + 新扩展名 */
          const baseName = info.file.name.replace(/\.[^.]+$/, '');
          this.convertFilenames.push(`${baseName}${ext}`);
        }

        /* 所有图片转换完成后，显示批量下载按钮 */
        if (this.convertResults.length === this.convertImages.length) {
          const downloadAllBtn = el.querySelector('.convert-download-all') as HTMLElement;
          downloadAllBtn.style.display = 'inline-block';
        }
      }, format, blobQuality);
    });
  }

  /**
   * 下载所有格式转换后的图片
   * 使用临时<a>标签逐张触发下载
   */
  private downloadConvertResults(): void {
    this.convertResults.forEach((blob, i) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.convertFilenames[i];
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // ================================================================
  //  通用工具方法
  // ================================================================

  /**
   * 格式化文件大小为可读字符串
   * 根据文件大小自动选择合适的单位（B/KB/MB）
   * @param bytes 文件大小的字节数
   * @returns 格式化后的字符串，如 "1.5 MB" 或 "320 KB"
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      /* 小于1KB时直接显示字节数 */
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      /* 小于1MB时转换为KB显示，保留1位小数 */
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      /* 大于等于1MB时转换为MB显示，保留2位小数 */
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
}
