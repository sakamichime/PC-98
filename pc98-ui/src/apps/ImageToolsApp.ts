/**
 * 图片批量工具 - PC-98风格图片批量处理应用
 * 
 * 功能：
 * 1. 自定义分辨率 - 批量缩放图片到指定尺寸
 * 2. 图片压缩 - 调整图片质量以减小文件体积
 * 3. 复制Base64 - 将图片转换为Base64编码字符串
 * 4. 批量改格式 - 将图片转换为指定格式（PNG/JPEG/WebP）
 * 5. GIF制作 - 将多张图片合成为GIF动画（FFmpeg驱动）
 * 6. GIF分解 - 将GIF动画分解为逐帧图片（FFmpeg驱动）
 * 7. 添加水印 - 批量为图片添加文字水印（FFmpeg驱动，Canvas回退）
 * 
 * 前4个功能使用纯前端Canvas API实现，不依赖后端服务
 * 后3个功能使用FFmpeg.wasm实现，需要加载WebAssembly核心
 */

import { WindowManager } from '../core/WindowManager';
import { FFmpegLoader, FFmpegLoadingStatus } from '../core/FFmpegLoader';

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
          <button class="pc-btn img-tools-tab" data-tab="gifmaker" style="padding:4px 10px;font-size:11px;background:transparent;border-left:2px solid transparent;">🎞️ GIF制作</button>
          <button class="pc-btn img-tools-tab" data-tab="gifsplitter" style="padding:4px 10px;font-size:11px;background:transparent;border-left:2px solid transparent;">✂️ GIF分解</button>
          <button class="pc-btn img-tools-tab" data-tab="watermark" style="padding:4px 10px;font-size:11px;background:transparent;border-left:2px solid transparent;">💧 添加水印</button>
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

          <!-- ====== 标签5: GIF制作 ====== -->
          <div class="img-tools-panel" data-panel="gifmaker" style="height:100%;overflow-y:auto;display:none;">
            ${this.buildGifMakerPanel()}
          </div>

          <!-- ====== 标签6: GIF分解 ====== -->
          <div class="img-tools-panel" data-panel="gifsplitter" style="height:100%;overflow-y:auto;display:none;">
            ${this.buildGifSplitterPanel()}
          </div>

          <!-- ====== 标签7: 添加水印 ====== -->
          <div class="img-tools-panel" data-panel="watermark" style="height:100%;overflow-y:auto;display:none;">
            ${this.buildWatermarkPanel()}
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

    /* ====== 标签5: GIF制作事件 ====== */
    this.bindGifMakerPanel(el);

    /* ====== 标签6: GIF分解事件 ====== */
    this.bindGifSplitterPanel(el);

    /* ====== 标签7: 添加水印事件 ====== */
    this.bindWatermarkPanel(el);
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
        el.querySelectorAll('.img-tools-tab').forEach((t) => {
          (t as HTMLElement).style.background = 'transparent';
          (t as HTMLElement).style.borderLeftColor = 'transparent';
        });

        /* 给当前点击的标签添加高亮样式 */
        (tab as HTMLElement).style.background = 'rgba(255,105,180,0.3)';
        (tab as HTMLElement).style.borderLeftColor = 'var(--pc-pink)';

        /* 隐藏所有面板 */
        el.querySelectorAll('.img-tools-panel').forEach((p) => {
          (p as HTMLElement).style.display = 'none';
        });

        /* 显示对应的面板 */
        const panel = el.querySelector(`.img-tools-panel[data-panel="${target}"]`) as HTMLElement;
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

    this.resizeImages.forEach((info) => {
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

    this.compressImages.forEach((info) => {
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
  //  标签5: GIF制作 - 相关方法和事件绑定
  // ================================================================

  /** FFmpeg加载管理器的单例引用，用于执行GIF制作、分解和水印操作 */
  private ffmpegLoader: FFmpegLoader = FFmpegLoader.getInstance();

  /** GIF制作面板已上传的图片文件列表 */
  private gifMakerFiles: File[] = [];

  /** GIF制作面板的处理状态，防止重复点击开始按钮 */
  private gifMakerProcessing: boolean = false;

  /**
   * 构建GIF制作面板的HTML
   * 包含FFmpeg加载状态指示器、拖拽上传区域、帧延迟设置、输出宽度设置、
   * 循环次数设置、开始制作按钮和缩略图预览列表
   * @returns GIF制作面板的HTML字符串
   */
  private buildGifMakerPanel(): string {
    return `
      <!-- FFmpeg加载状态指示器 - 显示当前FFmpeg核心是否已加载就绪 -->
      <div class="gifmaker-ffmpeg-status" style="font-size:11px;color:var(--pc-neon-yellow);margin-bottom:6px;padding:4px 8px;border:1px solid var(--pc-dark-gray);background:rgba(0,0,0,0.5);">
        FFmpeg 状态：未加载
      </div>

      <!-- 拖拽上传区域 - 支持多张图片（PNG/JPEG/WebP） -->
      <div class="img-drop-zone gifmaker-drop" style="border:2px dashed var(--pc-pink);padding:20px;text-align:center;margin-bottom:10px;cursor:pointer;color:var(--pc-gray);font-size:12px;">
        📁 将多张图片拖拽到这里，或点击选择文件（PNG/JPEG/WebP）<br>
        <input type="file" multiple accept="image/png,image/jpeg,image/webp" class="gifmaker-file-input" style="display:none;">
      </div>

      <!-- GIF参数设置区域 -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;flex-wrap:wrap;">
        <span style="color:var(--pc-gray);">帧延迟:</span>
        <input type="number" class="pc-input gifmaker-delay" value="100" min="10" max="5000" style="width:70px;">
        <span style="color:var(--pc-gray);">ms</span>
        <span style="color:var(--pc-dark-gray);font-size:10px;">(10fps)</span>
        <span style="color:var(--pc-gray);margin-left:8px;">输出宽度:</span>
        <input type="number" class="pc-input gifmaker-width" value="480" min="16" max="3840" style="width:70px;">
        <span style="color:var(--pc-gray);">px</span>
        <span style="color:var(--pc-gray);margin-left:8px;">循环:</span>
        <input type="number" class="pc-input gifmaker-loop" value="0" min="0" max="999" style="width:60px;">
        <span style="color:var(--pc-dark-gray);font-size:10px;">(0=无限)</span>
      </div>

      <!-- 操作按钮 -->
      <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">
        <button class="glow-btn gifmaker-start" style="padding:4px 16px;font-size:12px;">开始制作</button>
        <span class="gifmaker-status" style="font-size:12px;"></span>
      </div>

      <!-- 已上传图片的缩略图预览列表 -->
      <div class="gifmaker-preview-list" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
    `;
  }

  /**
   * 绑定GIF制作面板的所有事件
   * 包括FFmpeg状态监听、拖拽上传、文件选择、开始制作按钮
   * @param el 窗口内容区域的DOM根元素
   */
  private bindGifMakerPanel(el: HTMLElement): void {
    const dropZone = el.querySelector('.gifmaker-drop') as HTMLElement;
    const fileInput = el.querySelector('.gifmaker-file-input') as HTMLInputElement;
    const startBtn = el.querySelector('.gifmaker-start') as HTMLElement;
    const ffmpegStatus = el.querySelector('.gifmaker-ffmpeg-status') as HTMLElement;

    /* 监听FFmpeg加载状态变化，实时更新面板顶部的状态指示器 */
    this.ffmpegLoader.onStatusChange((status: FFmpegLoadingStatus) => {
      if (status === FFmpegLoadingStatus.READY) {
        ffmpegStatus.textContent = 'FFmpeg 状态：已就绪';
        ffmpegStatus.style.color = 'var(--pc-neon-green)';
      } else if (status === FFmpegLoadingStatus.LOADING) {
        ffmpegStatus.textContent = 'FFmpeg 状态：加载中...';
        ffmpegStatus.style.color = 'var(--pc-neon-yellow)';
      } else if (status === FFmpegLoadingStatus.ERROR) {
        ffmpegStatus.textContent = 'FFmpeg 状态：加载失败';
        ffmpegStatus.style.color = 'var(--pc-hot-pink)';
      }
    });

    /* 点击拖拽区域打开文件选择对话框 */
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

    /* 拖拽放置文件后，收集图片文件并生成预览 */
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--pc-pink)';
      const files = Array.from((e as DragEvent).dataTransfer?.files || []);
      this.handleGifMakerFiles(el, files);
    });

    /* 文件选择后收集图片文件并生成预览 */
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      this.handleGifMakerFiles(el, files);
    });

    /* 点击开始制作按钮，执行GIF制作流程 */
    startBtn.addEventListener('click', async () => {
      await this.doGifMaker(el);
    });
  }

  /**
   * 处理GIF制作面板的上传文件
   * 过滤出PNG/JPEG/WebP图片文件，生成缩略图预览列表
   * @param el 窗口内容区域的DOM根元素
   * @param files 用户选择的File对象数组
   */
  private handleGifMakerFiles(el: HTMLElement, files: File[]): void {
    /* 只接受PNG、JPEG、WebP格式的图片 */
    this.gifMakerFiles = files.filter(f =>
      f.type === 'image/png' || f.type === 'image/jpeg' || f.type === 'image/webp'
    );

    /* 清空状态文字 */
    const statusEl = el.querySelector('.gifmaker-status') as HTMLElement;
    statusEl.textContent = '';

    this.renderGifMakerPreviews(el);
  }

  /**
   * 渲染GIF制作面板的缩略图预览列表
   * 为每张已上传图片创建缩略图卡片，显示序号、文件名和缩略图
   * @param el 窗口内容区域的DOM根元素
   */
  private renderGifMakerPreviews(el: HTMLElement): void {
    const list = el.querySelector('.gifmaker-preview-list') as HTMLElement;
    list.innerHTML = '';

    this.gifMakerFiles.forEach((file, index) => {
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid var(--pc-dark-gray);padding:6px;background:var(--pc-black);width:90px;text-align:center;position:relative;';

      /* 帧序号标签 - 显示这是第几帧 */
      const indexSpan = document.createElement('div');
      indexSpan.style.cssText = 'font-size:10px;color:var(--pc-neon-green);margin-bottom:2px;';
      indexSpan.textContent = `#${String(index + 1).padStart(3, '0')}`;
      card.appendChild(indexSpan);

      /* 创建缩略图 */
      const thumb = document.createElement('img');
      thumb.style.cssText = 'max-width:70px;max-height:70px;display:block;margin:0 auto 4px;image-rendering:pixelated;';
      /* 使用URL.createObjectURL生成图片预览URL */
      thumb.src = URL.createObjectURL(file);
      card.appendChild(thumb);

      /* 文件名（截取前10个字符） */
      const nameSpan = document.createElement('div');
      nameSpan.style.cssText = 'font-size:9px;color:var(--pc-gray);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      nameSpan.textContent = file.name.substring(0, 10);
      card.appendChild(nameSpan);

      list.appendChild(card);
    });
  }

  /**
   * 执行GIF制作流程
   * 1. 加载FFmpeg核心
   * 2. 将所有图片按序号写入虚拟文件系统（frame_001.png等）
   * 3. 执行FFmpeg命令合成GIF
   * 4. 读取输出文件并触发下载
   * @param el 窗口内容区域的DOM根元素
   */
  private async doGifMaker(el: HTMLElement): Promise<void> {
    /* 如果正在处理中或没有上传图片，直接返回 */
    if (this.gifMakerProcessing) return;
    if (this.gifMakerFiles.length === 0) return;

    this.gifMakerProcessing = true;

    const startBtn = el.querySelector('.gifmaker-start') as HTMLButtonElement;
    const statusEl = el.querySelector('.gifmaker-status') as HTMLElement;
    startBtn.disabled = true;
    statusEl.textContent = '正在加载FFmpeg...';
    statusEl.style.color = 'var(--pc-neon-yellow)';

    try {
      /* 第一步：加载FFmpeg核心（如果尚未加载） */
      await this.ffmpegLoader.load();
      statusEl.textContent = '正在写入帧文件...';

      /* 第二步：将所有图片文件按序号写入FFmpeg虚拟文件系统 */
      for (let i = 0; i < this.gifMakerFiles.length; i++) {
        /* 文件名格式为frame_001.png、frame_002.png...，序号补零到3位 */
        const frameName = `frame_${String(i + 1).padStart(3, '0')}.png`;
        await this.ffmpegLoader.writeFile(frameName, this.gifMakerFiles[i]);
      }

      /* 第三步：读取用户设置的GIF参数 */
      const delay = parseInt((el.querySelector('.gifmaker-delay') as HTMLInputElement).value) || 100;
      const outputWidth = parseInt((el.querySelector('.gifmaker-width') as HTMLInputElement).value) || 480;
      const loopCount = parseInt((el.querySelector('.gifmaker-loop') as HTMLInputElement).value) || 0;

      /* 计算帧率：帧延迟（毫秒）转换为每秒帧数 */
      const framerate = (1000 / delay).toFixed(2);

      statusEl.textContent = '正在生成GIF...';

      /* 第四步：执行FFmpeg命令合成GIF */
      /*
       * -framerate: 设置输入帧率（由帧延迟计算得出）
       * -i frame_%03d.png: 读取序号格式的帧图片序列
       * -vf "scale={w}:-1:flags=lanczos": 缩放到指定宽度，高度自动等比计算，使用lanczos高质量缩放
       * -loop {loop}: 设置循环次数（0=无限循环）
       * output.gif: 输出GIF文件名
       */
      await this.ffmpegLoader.exec([
        '-framerate', framerate,
        '-i', 'frame_%03d.png',
        '-vf', `scale=${outputWidth}:-1:flags=lanczos`,
        '-loop', String(loopCount),
        'output.gif',
      ]);

      statusEl.textContent = '正在读取输出文件...';

      /* 第五步：从虚拟文件系统读取生成的GIF文件 */
      const gifData = await this.ffmpegLoader.readFile('output.gif');
      const gifBlob = new Blob([gifData.slice()], { type: 'image/gif' });

      /* 第六步：触发GIF文件下载 */
      const url = URL.createObjectURL(gifBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'output.gif';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      statusEl.textContent = `GIF制作完成！共${this.gifMakerFiles.length}帧，大小：${this.formatFileSize(gifBlob.size)}`;
      statusEl.style.color = 'var(--pc-neon-green)';

      /* 第七步：清理虚拟文件系统中的临时帧文件和输出文件 */
      for (let i = 0; i < this.gifMakerFiles.length; i++) {
        const frameName = `frame_${String(i + 1).padStart(3, '0')}.png`;
        await this.ffmpegLoader.deleteFile(frameName);
      }
      await this.ffmpegLoader.deleteFile('output.gif');

    } catch (error) {
      statusEl.textContent = `GIF制作失败: ${error}`;
      statusEl.style.color = 'var(--pc-hot-pink)';
    } finally {
      this.gifMakerProcessing = false;
      startBtn.disabled = false;
    }
  }

  // ================================================================
  //  标签6: GIF分解 - 相关方法和事件绑定
  // ================================================================

  /** GIF分解面板上传的GIF文件 */
  private gifSplitterFile: File | null = null;

  /** GIF分解面板的处理状态，防止重复点击 */
  private gifSplitterProcessing: boolean = false;

  /** GIF分解后提取的帧数据数组，每个元素包含文件名和Blob */
  private gifSplitterFrames: Array<{ name: string; blob: Blob }> = [];

  /**
   * 构建GIF分解面板的HTML
   * 包含FFmpeg状态指示器、拖拽上传区域、输出格式选择、开始分解按钮、
   * 分解结果显示区域和批量下载按钮
   * @returns GIF分解面板的HTML字符串
   */
  private buildGifSplitterPanel(): string {
    return `
      <!-- FFmpeg加载状态指示器 -->
      <div class="gifsplitter-ffmpeg-status" style="font-size:11px;color:var(--pc-neon-yellow);margin-bottom:6px;padding:4px 8px;border:1px solid var(--pc-dark-gray);background:rgba(0,0,0,0.5);">
        FFmpeg 状态：未加载
      </div>

      <!-- 拖拽上传区域 - 仅支持单个GIF文件 -->
      <div class="img-drop-zone gifsplitter-drop" style="border:2px dashed var(--pc-pink);padding:20px;text-align:center;margin-bottom:10px;cursor:pointer;color:var(--pc-gray);font-size:12px;">
        📁 将GIF文件拖拽到这里，或点击选择文件（仅支持GIF）<br>
        <input type="file" accept="image/gif" class="gifsplitter-file-input" style="display:none;">
      </div>

      <!-- 分解设置区域 -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;flex-wrap:wrap;">
        <span style="color:var(--pc-gray);">输出格式:</span>
        <select class="pc-select gifsplitter-format" style="width:100px;">
          <option value="png">PNG</option>
          <option value="jpg">JPEG</option>
        </select>
      </div>

      <!-- 操作按钮 -->
      <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">
        <button class="glow-btn gifsplitter-start" style="padding:4px 16px;font-size:12px;">开始分解</button>
        <button class="pc-btn gifsplitter-download-all" style="padding:4px 16px;font-size:12px;display:none;">批量下载全部帧</button>
        <span class="gifsplitter-status" style="font-size:12px;"></span>
      </div>

      <!-- 分解结果显示区域 - 显示提取的帧数和总大小 -->
      <div class="gifsplitter-results" style="display:none;border:1px solid var(--pc-dark-gray);padding:8px;margin-bottom:10px;">
        <div class="gifsplitter-info" style="font-size:12px;color:var(--pc-neon-green);margin-bottom:8px;"></div>
        <div class="gifsplitter-frames-list" style="display:flex;flex-wrap:wrap;gap:6px;max-height:200px;overflow-y:auto;"></div>
      </div>
    `;
  }

  /**
   * 绑定GIF分解面板的所有事件
   * 包括FFmpeg状态监听、拖拽上传、文件选择、开始分解和批量下载按钮
   * @param el 窗口内容区域的DOM根元素
   */
  private bindGifSplitterPanel(el: HTMLElement): void {
    const dropZone = el.querySelector('.gifsplitter-drop') as HTMLElement;
    const fileInput = el.querySelector('.gifsplitter-file-input') as HTMLInputElement;
    const startBtn = el.querySelector('.gifsplitter-start') as HTMLElement;
    const downloadAllBtn = el.querySelector('.gifsplitter-download-all') as HTMLElement;
    const ffmpegStatus = el.querySelector('.gifsplitter-ffmpeg-status') as HTMLElement;

    /* 监听FFmpeg加载状态变化，更新面板状态指示器 */
    this.ffmpegLoader.onStatusChange((status: FFmpegLoadingStatus) => {
      if (status === FFmpegLoadingStatus.READY) {
        ffmpegStatus.textContent = 'FFmpeg 状态：已就绪';
        ffmpegStatus.style.color = 'var(--pc-neon-green)';
      } else if (status === FFmpegLoadingStatus.LOADING) {
        ffmpegStatus.textContent = 'FFmpeg 状态：加载中...';
        ffmpegStatus.style.color = 'var(--pc-neon-yellow)';
      } else if (status === FFmpegLoadingStatus.ERROR) {
        ffmpegStatus.textContent = 'FFmpeg 状态：加载失败';
        ffmpegStatus.style.color = 'var(--pc-hot-pink)';
      }
    });

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

    /* 拖拽放置GIF文件 */
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--pc-pink)';
      const files = Array.from((e as DragEvent).dataTransfer?.files || []);
      if (files.length > 0 && files[0].type === 'image/gif') {
        this.gifSplitterFile = files[0];
        const statusEl = el.querySelector('.gifsplitter-status') as HTMLElement;
        statusEl.textContent = `已选择: ${files[0].name} (${this.formatFileSize(files[0].size)})`;
        statusEl.style.color = 'var(--pc-neon-green)';
      }
    });

    /* 文件选择后确认GIF文件 */
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      if (files.length > 0 && files[0].type === 'image/gif') {
        this.gifSplitterFile = files[0];
        const statusEl = el.querySelector('.gifsplitter-status') as HTMLElement;
        statusEl.textContent = `已选择: ${files[0].name} (${this.formatFileSize(files[0].size)})`;
        statusEl.style.color = 'var(--pc-neon-green)';
      }
    });

    /* 点击开始分解按钮 */
    startBtn.addEventListener('click', async () => {
      await this.doGifSplitter(el);
    });

    /* 点击批量下载全部帧按钮 */
    downloadAllBtn.addEventListener('click', () => {
      this.downloadGifSplitterResults();
    });
  }

  /**
   * 执行GIF分解流程
   * 1. 加载FFmpeg核心
   * 2. 将GIF文件写入虚拟文件系统
   * 3. 执行FFmpeg命令逐帧分解
   * 4. 循环读取所有分解后的帧文件
   * 5. 显示分解结果并支持逐帧下载和批量下载
   * @param el 窗口内容区域的DOM根元素
   */
  private async doGifSplitter(el: HTMLElement): Promise<void> {
    /* 如果正在处理或没有选择GIF文件，直接返回 */
    if (this.gifSplitterProcessing) return;
    if (!this.gifSplitterFile) return;

    this.gifSplitterProcessing = true;
    this.gifSplitterFrames = [];

    const startBtn = el.querySelector('.gifsplitter-start') as HTMLButtonElement;
    const statusEl = el.querySelector('.gifsplitter-status') as HTMLElement;
    const downloadAllBtn = el.querySelector('.gifsplitter-download-all') as HTMLButtonElement;
    startBtn.disabled = true;
    downloadAllBtn.style.display = 'none';
    statusEl.textContent = '正在加载FFmpeg...';
    statusEl.style.color = 'var(--pc-neon-yellow)';

    try {
      /* 第一步：加载FFmpeg核心 */
      await this.ffmpegLoader.load();
      statusEl.textContent = '正在写入GIF文件...';

      /* 第二步：将GIF文件写入虚拟文件系统 */
      await this.ffmpegLoader.writeFile('input.gif', this.gifSplitterFile);

      /* 第三步：获取用户选择的输出格式 */
      const format = (el.querySelector('.gifsplitter-format') as HTMLSelectElement).value;
      /* 根据格式确定MIME类型 */
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';

      statusEl.textContent = '正在分解帧...';

      /* 第四步：执行FFmpeg命令分解GIF
       * -i input.gif: 读取输入的GIF文件
       * -vsync vfr: 使用可变帧率模式，保留原始帧的时间戳信息
       * output_%03d.{ext}: 输出文件序号命名，如output_001.png、output_002.png...
       */
      await this.ffmpegLoader.exec([
        '-i', 'input.gif',
        '-vsync', 'vfr',
        `output_%03d.${format}`,
      ]);

      statusEl.textContent = '正在读取帧文件...';

      /* 第五步：循环读取所有分解后的帧文件
       * FFmpeg输出文件从output_001开始，依次递增
       * 逐个尝试读取，直到读取失败（说明没有更多帧了）
       */
      let frameIndex = 1;
      let totalSize = 0;
      while (true) {
        const frameName = `output_${String(frameIndex).padStart(3, '0')}.${format}`;
        try {
          /* 尝试从虚拟文件系统读取帧文件 */
          const frameData = await this.ffmpegLoader.readFile(frameName);
          const frameBlob = new Blob([frameData.slice()], { type: mimeType });
          this.gifSplitterFrames.push({ name: frameName, blob: frameBlob });
          totalSize += frameBlob.size;
          frameIndex++;
        } catch {
          /* 读取失败说明已经没有更多帧了，退出循环 */
          break;
        }
      }

      /* 第六步：显示分解结果信息 */
      const resultsDiv = el.querySelector('.gifsplitter-results') as HTMLElement;
      const infoDiv = el.querySelector('.gifsplitter-info') as HTMLElement;
      const framesList = el.querySelector('.gifsplitter-frames-list') as HTMLElement;

      resultsDiv.style.display = 'block';
      infoDiv.textContent = `分解完成！共提取 ${this.gifSplitterFrames.length} 帧，总大小：${this.formatFileSize(totalSize)}`;
      framesList.innerHTML = '';

      /* 为每帧生成缩略图卡片，包含下载按钮 */
      this.gifSplitterFrames.forEach((frame, index) => {
        const card = document.createElement('div');
        card.style.cssText = 'border:1px solid var(--pc-dark-gray);padding:4px;background:var(--pc-black);width:80px;text-align:center;';

        /* 帧序号 */
        const idxSpan = document.createElement('div');
        idxSpan.style.cssText = 'font-size:9px;color:var(--pc-neon-green);margin-bottom:2px;';
        idxSpan.textContent = `#${String(index + 1).padStart(3, '0')}`;
        card.appendChild(idxSpan);

        /* 缩略图 */
        const thumb = document.createElement('img');
        thumb.src = URL.createObjectURL(frame.blob);
        thumb.style.cssText = 'max-width:60px;max-height:60px;display:block;margin:0 auto 2px;image-rendering:pixelated;';
        card.appendChild(thumb);

        /* 单帧下载按钮 */
        const dlBtn = document.createElement('button');
        dlBtn.className = 'pc-btn';
        dlBtn.style.cssText = 'font-size:9px;padding:2px 6px;margin-top:2px;';
        dlBtn.textContent = '下载';
        dlBtn.addEventListener('click', () => {
          const url = URL.createObjectURL(frame.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `frame_${String(index + 1).padStart(3, '0')}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
        card.appendChild(dlBtn);

        framesList.appendChild(card);
      });

      /* 显示批量下载按钮 */
      downloadAllBtn.style.display = 'inline-block';
      statusEl.textContent = `分解完成！共${this.gifSplitterFrames.length}帧`;
      statusEl.style.color = 'var(--pc-neon-green)';

      /* 第七步：清理虚拟文件系统中的临时文件 */
      await this.ffmpegLoader.deleteFile('input.gif');
      for (const frame of this.gifSplitterFrames) {
        try {
          await this.ffmpegLoader.deleteFile(frame.name);
        } catch {
          /* 忽略删除失败（文件可能已不存在） */
        }
      }

    } catch (error) {
      statusEl.textContent = `GIF分解失败: ${error}`;
      statusEl.style.color = 'var(--pc-hot-pink)';
    } finally {
      this.gifSplitterProcessing = false;
      startBtn.disabled = false;
    }
  }

  /**
   * 批量下载GIF分解后的所有帧文件
   * 逐帧创建临时<a>标签触发下载
   */
  private downloadGifSplitterResults(): void {
    this.gifSplitterFrames.forEach((frame, index) => {
      const url = URL.createObjectURL(frame.blob);
      const a = document.createElement('a');
      a.href = url;
      /* 从帧文件名中提取扩展名（如.png或.jpg） */
      const ext = frame.name.split('.').pop() || 'png';
      a.download = `frame_${String(index + 1).padStart(3, '0')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // ================================================================
  //  标签7: 添加水印 - 相关方法和事件绑定
  // ================================================================

  /** 添加水印面板已上传的图片文件列表 */
  private watermarkFiles: File[] = [];

  /** 添加水印面板的处理状态，防止重复点击 */
  private watermarkProcessing: boolean = false;

  /**
   * 构建添加水印面板的HTML
   * 包含FFmpeg状态指示器、拖拽上传区域、水印文字输入、字体大小、
   * 颜色选择、位置选择、透明度设置和批量处理按钮
   * @returns 添加水印面板的HTML字符串
   */
  private buildWatermarkPanel(): string {
    return `
      <!-- FFmpeg加载状态指示器 -->
      <div class="watermark-ffmpeg-status" style="font-size:11px;color:var(--pc-neon-yellow);margin-bottom:6px;padding:4px 8px;border:1px solid var(--pc-dark-gray);background:rgba(0,0,0,0.5);">
        FFmpeg 状态：未加载
      </div>

      <!-- 拖拽上传区域 - 支持多张图片 -->
      <div class="img-drop-zone watermark-drop" style="border:2px dashed var(--pc-pink);padding:20px;text-align:center;margin-bottom:10px;cursor:pointer;color:var(--pc-gray);font-size:12px;">
        📁 将图片拖拽到这里，或点击选择文件（支持多选）<br>
        <input type="file" multiple accept="image/*" class="watermark-file-input" style="display:none;">
      </div>

      <!-- 水印参数设置区域 -->
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;font-size:12px;">

        <!-- 第一行：水印文字输入和字体大小 -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="color:var(--pc-gray);">水印文字:</span>
          <input type="text" class="pc-input watermark-text" value="PC-98" style="width:120px;">
          <span style="color:var(--pc-gray);">字体大小:</span>
          <input type="number" class="pc-input watermark-fontsize" value="24" min="8" max="200" style="width:60px;">
          <span style="color:var(--pc-gray);">px</span>
        </div>

        <!-- 第二行：颜色选择、位置选择、透明度 -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="color:var(--pc-gray);">颜色:</span>
          <input type="color" class="watermark-color" value="#FFFFFF" style="width:40px;height:24px;border:1px solid var(--pc-dark-gray);cursor:pointer;">
          <span style="color:var(--pc-gray);margin-left:4px;">位置:</span>
          <select class="pc-select watermark-position" style="width:80px;">
            <option value="top-left">左上</option>
            <option value="top-right">右上</option>
            <option value="bottom-left">左下</option>
            <option value="bottom-right">右下</option>
            <option value="center">居中</option>
          </select>
          <span style="color:var(--pc-gray);margin-left:4px;">透明度:</span>
          <input type="range" class="watermark-alpha" min="0" max="100" value="50" style="width:100px;accent-color:var(--pc-pink);">
          <span class="watermark-alpha-value" style="color:var(--pc-white);">0.5</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">
        <button class="glow-btn watermark-start" style="padding:4px 16px;font-size:12px;">批量处理</button>
        <span class="watermark-status" style="font-size:12px;"></span>
      </div>

      <!-- 处理结果预览列表 -->
      <div class="watermark-preview-list" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
    `;
  }

  /**
   * 绑定添加水印面板的所有事件
   * 包括FFmpeg状态监听、拖拽上传、文件选择、透明度滑块、批量处理按钮
   * @param el 窗口内容区域的DOM根元素
   */
  private bindWatermarkPanel(el: HTMLElement): void {
    const dropZone = el.querySelector('.watermark-drop') as HTMLElement;
    const fileInput = el.querySelector('.watermark-file-input') as HTMLInputElement;
    const startBtn = el.querySelector('.watermark-start') as HTMLElement;
    const alphaSlider = el.querySelector('.watermark-alpha') as HTMLInputElement;
    const alphaValue = el.querySelector('.watermark-alpha-value') as HTMLElement;
    const ffmpegStatus = el.querySelector('.watermark-ffmpeg-status') as HTMLElement;

    /* 监听FFmpeg加载状态变化，更新面板状态指示器 */
    this.ffmpegLoader.onStatusChange((status: FFmpegLoadingStatus) => {
      if (status === FFmpegLoadingStatus.READY) {
        ffmpegStatus.textContent = 'FFmpeg 状态：已就绪';
        ffmpegStatus.style.color = 'var(--pc-neon-green)';
      } else if (status === FFmpegLoadingStatus.LOADING) {
        ffmpegStatus.textContent = 'FFmpeg 状态：加载中...';
        ffmpegStatus.style.color = 'var(--pc-neon-yellow)';
      } else if (status === FFmpegLoadingStatus.ERROR) {
        ffmpegStatus.textContent = 'FFmpeg 状态：加载失败';
        ffmpegStatus.style.color = 'var(--pc-hot-pink)';
      }
    });

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

    /* 拖拽放置文件后收集图片 */
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--pc-pink)';
      const files = Array.from((e as DragEvent).dataTransfer?.files || []);
      this.handleWatermarkFiles(el, files);
    });

    /* 文件选择后收集图片 */
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      this.handleWatermarkFiles(el, files);
    });

    /* 透明度滑块拖动时实时更新显示值（将0-100映射为0-1） */
    alphaSlider.addEventListener('input', () => {
      const val = parseInt(alphaSlider.value) / 100;
      alphaValue.textContent = val.toFixed(2);
    });

    /* 点击批量处理按钮 */
    startBtn.addEventListener('click', async () => {
      await this.doWatermark(el);
    });
  }

  /**
   * 处理添加水印面板的上传文件
   * 过滤出图片文件，更新状态文字
   * @param el 窗口内容区域的DOM根元素
   * @param files 用户选择的File对象数组
   */
  private handleWatermarkFiles(el: HTMLElement, files: File[]): void {
    /* 过滤出图片类型的文件 */
    this.watermarkFiles = files.filter(f => f.type.startsWith('image/'));

    const statusEl = el.querySelector('.watermark-status') as HTMLElement;
    statusEl.textContent = `已选择 ${this.watermarkFiles.length} 张图片`;
    statusEl.style.color = 'var(--pc-neon-green)';
  }

  /**
   * 使用Canvas API在图片上添加文字水印
   * 作为FFmpeg drawtext滤镜不可用时的回退方案
   * 在离屏Canvas上绘制图片和文字，然后导出为PNG
   * @param file 原始图片文件
   * @param text 水印文字内容
   * @param fontSize 字体大小（像素）
   * @param color 字体颜色（十六进制，如"#FFFFFF"）
   * @param alpha 透明度（0到1之间）
   * @param position 水印位置（左上/右上/左下/右下/居中）
   * @returns 添加水印后的图片Blob
   */
  private async addWatermarkWithCanvas(
    file: File,
    text: string,
    fontSize: number,
    color: string,
    alpha: number,
    position: string
  ): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          /* 创建与原图同尺寸的离屏Canvas */
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;

          /* 将原图绘制到Canvas上 */
          ctx.drawImage(img, 0, 0);

          /* 设置文字样式：字体大小、字体族、颜色和透明度 */
          ctx.font = `${fontSize}px sans-serif`;
          /* 将透明度应用到全局alpha通道 */
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          /* 添加文字阴影效果，提高水印在各种背景上的可读性 */
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;

          /* 根据位置参数计算水印的x,y坐标 */
          const padding = fontSize; /* 边距等于字体大小 */
          const textWidth = ctx.measureText(text).width;
          let x = 0;
          let y = fontSize; /* 默认y坐标为文字基线位置 */

          if (position === 'top-left') {
            /* 左上角：坐标为(边距, 字体大小) */
            x = padding;
            y = fontSize + padding / 2;
          } else if (position === 'top-right') {
            /* 右上角：x坐标为画布宽度减去文字宽度减去边距 */
            x = canvas.width - textWidth - padding;
            y = fontSize + padding / 2;
          } else if (position === 'bottom-left') {
            /* 左下角：y坐标为画布高度减去边距 */
            x = padding;
            y = canvas.height - padding / 2;
          } else if (position === 'bottom-right') {
            /* 右下角 */
            x = canvas.width - textWidth - padding;
            y = canvas.height - padding / 2;
          } else {
            /* 居中：使用textAlign和textBaseline居中 */
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            x = canvas.width / 2;
            y = canvas.height / 2;
          }

          /* 在Canvas上绘制水印文字 */
          ctx.fillText(text, x, y);

          /* 将Canvas导出为PNG格式的Blob */
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas导出Blob失败'));
            }
          }, 'image/png');
        };
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 执行批量添加水印流程
   * 首先尝试使用FFmpeg的drawtext滤镜添加水印，
   * 如果FFmpeg不可用或drawtext滤镜失败，则回退到Canvas API实现
   * @param el 窗口内容区域的DOM根元素
   */
  private async doWatermark(el: HTMLElement): Promise<void> {
    /* 如果正在处理或没有上传图片，直接返回 */
    if (this.watermarkProcessing) return;
    if (this.watermarkFiles.length === 0) return;

    this.watermarkProcessing = true;

    const startBtn = el.querySelector('.watermark-start') as HTMLButtonElement;
    const statusEl = el.querySelector('.watermark-status') as HTMLElement;
    const previewList = el.querySelector('.watermark-preview-list') as HTMLElement;
    startBtn.disabled = true;
    previewList.innerHTML = '';

    try {
      /* 读取用户设置的水印参数 */
      const text = (el.querySelector('.watermark-text') as HTMLInputElement).value || 'PC-98';
      const fontSize = parseInt((el.querySelector('.watermark-fontsize') as HTMLInputElement).value) || 24;
      const color = (el.querySelector('.watermark-color') as HTMLInputElement).value || '#FFFFFF';
      const position = (el.querySelector('.watermark-position') as HTMLSelectElement).value;
      const alphaValue = parseInt((el.querySelector('.watermark-alpha') as HTMLInputElement).value) / 100;

      /*
       * FFmpeg drawtext滤镜的坐标表达式
       * - top-left: x=padding, y=padding
       * - top-right: x=w-text_w-padding, y=padding
       * - bottom-left: x=padding, y=h-th-padding
       * - bottom-right: x=w-text_w-padding, y=h-th-padding
       * - center: x=(w-text_w)/2, y=(h-th)/2
       */
      const coordinateMap: Record<string, string> = {
        'top-left': `${fontSize},${fontSize}`,
        'top-right': `w-text_w-${fontSize},${fontSize}`,
        'bottom-left': `${fontSize},h-text_h-${fontSize}`,
        'bottom-right': `w-text_w-${fontSize},h-text_h-${fontSize}`,
        'center': '(w-text_w)/2,(h-text_h)/2',
      };
      const coordinates = coordinateMap[position] || coordinateMap['bottom-right'];

      statusEl.textContent = `正在处理 0/${this.watermarkFiles.length}...`;
      statusEl.style.color = 'var(--pc-neon-yellow)';

      let completed = 0;
      let useCanvasFallback = false;

      /* 遍历每张图片，逐张添加水印 */
      for (let i = 0; i < this.watermarkFiles.length; i++) {
        const file = this.watermarkFiles[i];

        if (useCanvasFallback) {
          /* 如果FFmpeg不可用，使用Canvas回退方案 */
          const resultBlob = await this.addWatermarkWithCanvas(file, text, fontSize, color, alphaValue, position);
          this.renderWatermarkResult(el, file.name, resultBlob);
        } else {
          try {
            /* 尝试使用FFmpeg drawtext滤镜添加水印 */
            await this.ffmpegLoader.load();

            /* 写入输入文件 */
            await this.ffmpegLoader.writeFile(`watermark_input_${i}.png`, file);

            /* 执行FFmpeg命令
             * -i: 输入文件
             * -vf drawtext: 视频滤镜，在图片上绘制文字
             *   text: 水印文字内容
             *   fontsize: 字体大小
             *   fontcolor: 字体颜色（附加@透明度）
             *   x,y: 水印位置坐标
             */
            await this.ffmpegLoader.exec([
              '-i', `watermark_input_${i}.png`,
              '-vf', `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${color}@${alphaValue.toFixed(2)}:x=${coordinates}:y=${coordinates}`,
              `watermark_output_${i}.png`,
            ]);

            /* 读取输出文件 */
            const outputData = await this.ffmpegLoader.readFile(`watermark_output_${i}.png`);
            const resultBlob = new Blob([outputData.slice()], { type: 'image/png' });

            /* 渲染结果到预览列表 */
            this.renderWatermarkResult(el, file.name, resultBlob);

            /* 清理虚拟文件系统中的临时文件 */
            try {
              await this.ffmpegLoader.deleteFile(`watermark_input_${i}.png`);
              await this.ffmpegLoader.deleteFile(`watermark_output_${i}.png`);
            } catch {
              /* 忽略清理失败 */
            }

          } catch {
            /* FFmpeg drawtext失败（可能缺少字体文件），切换到Canvas回退 */
            useCanvasFallback = true;
            const resultBlob = await this.addWatermarkWithCanvas(file, text, fontSize, color, alphaValue, position);
            this.renderWatermarkResult(el, file.name, resultBlob);
          }
        }

        /* 更新处理进度 */
        completed++;
        statusEl.textContent = `正在处理 ${completed}/${this.watermarkFiles.length}...`;
      }

      if (useCanvasFallback) {
        statusEl.textContent = `处理完成（已回退到Canvas模式）！共${this.watermarkFiles.length}张`;
      } else {
        statusEl.textContent = `处理完成！共${this.watermarkFiles.length}张`;
      }
      statusEl.style.color = 'var(--pc-neon-green)';

    } catch (error) {
      statusEl.textContent = `水印处理失败: ${error}`;
      statusEl.style.color = 'var(--pc-hot-pink)';
    } finally {
      this.watermarkProcessing = false;
      startBtn.disabled = false;
    }
  }

  /**
   * 渲染添加水印后的单张结果卡片
   * 创建包含缩略图、文件名和下载按钮的结果预览卡片
   * @param el 窗口内容区域的DOM根元素
   * @param originalName 原始文件名（用于生成输出文件名）
   * @param resultBlob 添加水印后的图片Blob
   */
  private renderWatermarkResult(el: HTMLElement, originalName: string, resultBlob: Blob): void {
    const previewList = el.querySelector('.watermark-preview-list') as HTMLElement;

    const card = document.createElement('div');
    card.style.cssText = 'border:1px solid var(--pc-dark-gray);padding:6px;background:var(--pc-black);width:120px;text-align:center;';

    /* 结果缩略图 */
    const thumb = document.createElement('img');
    thumb.src = URL.createObjectURL(resultBlob);
    thumb.style.cssText = 'max-width:100px;max-height:100px;display:block;margin:0 auto 4px;image-rendering:pixelated;';
    card.appendChild(thumb);

    /* 文件名（原文件名去掉扩展名 + _watermarked + .png） */
    const nameSpan = document.createElement('div');
    nameSpan.style.cssText = 'font-size:10px;color:var(--pc-gray);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    const baseName = originalName.replace(/\.[^.]+$/, '');
    nameSpan.textContent = `${baseName.substring(0, 10)}_wm.png`;
    card.appendChild(nameSpan);

    /* 文件大小 */
    const sizeSpan = document.createElement('div');
    sizeSpan.style.cssText = 'font-size:10px;color:var(--pc-pink);';
    sizeSpan.textContent = this.formatFileSize(resultBlob.size);
    card.appendChild(sizeSpan);

    /* 下载按钮 */
    const dlBtn = document.createElement('button');
    dlBtn.className = 'pc-btn';
    dlBtn.style.cssText = 'font-size:10px;padding:2px 8px;margin-top:4px;';
    dlBtn.textContent = '下载';
    dlBtn.addEventListener('click', () => {
      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_watermarked.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    card.appendChild(dlBtn);

    previewList.appendChild(card);
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
