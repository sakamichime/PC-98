/**
 * 视频批量工具 - PC-98风格的浏览器原生视频处理应用
 *
 * 这个文件实现了一个基于浏览器原生API的视频批量处理工具，包含以下功能：
 * 1. 批量转格式 - 使用 video + canvas + MediaRecorder 方案将视频转码为WebM格式
 * 2. 批量压缩 - 使用同样的方案降低视频分辨率和比特率来压缩视频
 *
 * 技术方案说明：
 * - 使用 <video> 元素加载源视频文件
 * - 使用 <canvas> 元素按目标尺寸逐帧绘制视频画面
 * - 使用 canvas.captureStream() 获取画面流
 * - 使用 MediaRecorder API 录制流并输出为WebM格式
 * - 所有处理都在浏览器端完成，不需要服务器或额外npm包
 *
 * 浏览器限制：
 * - 仅支持输出WebM格式（浏览器MediaRecorder的原生支持格式）
 * - 处理速度取决于视频时长和浏览器性能
 * - 部分编码参数可能因浏览器不同而有差异
 */

import { WindowManager } from '../core/WindowManager';

/**
 * 视频文件信息接口 - 存储用户上传的视频文件的基本信息
 * @property file - 用户选择的视频文件对象（File API）
 * @property name - 文件名（不含路径）
 * @property size - 文件大小（字节数）
 * @property type - 文件MIME类型（如 video/mp4）
 */
interface VideoFileInfo {
  /** 视频文件对象 */
  file: File;
  /** 文件名 */
  name: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件MIME类型 */
  type: string;
}

/**
 * 分辨率预设接口 - 定义可用的分辨率选项
 * @property label - 显示给用户的标签文字
 * @property width - 水平像素数
 * @property height - 垂直像素数，-1表示保持原始比例
 */
interface ResolutionPreset {
  /** 显示标签 */
  label: string;
  /** 目标宽度（像素），-1表示使用原始宽度 */
  width: number;
  /** 目标高度（像素），-1表示使用原始高度 */
  height: number;
}

/**
 * 比特率预设接口 - 定义可用的比特率选项
 * @property label - 显示给用户的标签文字
 * @property value - 比特率数值（bps），用于MediaRecorder的bitsPerSecond参数
 */
interface BitratePreset {
  /** 显示标签 */
  label: string;
  /** 比特率数值（bps），传递给MediaRecorder */
  value: number;
}

/**
 * VideoToolsApp 类 - 视频批量工具应用程序
 *
 * 这个类封装了视频批量处理的所有功能，包括：
 * - 管理两个功能标签页（批量转格式、批量压缩）
 * - 处理文件上传和文件列表显示
 * - 使用浏览器原生API进行视频转码和压缩
 * - 显示处理进度和结果状态
 *
 * @example
 * // 创建并打开视频工具
 * const videoTools = new VideoToolsApp(windowManager);
 * videoTools.open();
 */
export class VideoToolsApp {
  /** WindowManager实例引用，用于创建窗口和操作窗口元素 */
  private wm: WindowManager;

  /** 转格式标签页中用户上传的视频文件列表 */
  private convertFiles: VideoFileInfo[] = [];

  /** 压缩标签页中用户上传的视频文件列表 */
  private compressFiles: VideoFileInfo[] = [];

  /** 当前是否正在处理视频（防止重复点击开始按钮） */
  private isProcessing: boolean = false;

  /** 当前标签页索引，0=批量转格式，1=批量压缩 */
  private currentTab: number = 0;

  /**
   * 分辨率预设数组 - 提供四种分辨率选项
   * 原始分辨率不缩放，720p/480p/360p会降低分辨率以减小文件大小
   */
  private readonly resolutionPresets: ResolutionPreset[] = [
    { label: '原始', width: -1, height: -1 },   /* 保持原始分辨率，不缩放 */
    { label: '720p', width: 1280, height: 720 },  /* 高清分辨率 */
    { label: '480p', width: 854, height: 480 },   /* 标清分辨率 */
    { label: '360p', width: 640, height: 360 },   /* 低分辨率，文件最小 */
  ];

  /**
   * 比特率预设数组 - 提供三种比特率选项
   * 高比特率画质好但文件大，低比特率文件小但画质有损失
   */
  private readonly bitratePresets: BitratePreset[] = [
    { label: '高（2.5Mbps）', value: 2500000 },  /* 高比特率，接近原画 */
    { label: '中（1Mbps）', value: 1000000 },     /* 中比特率，平衡质量和大小 */
    { label: '低（500Kbps）', value: 500000 },    /* 低比特率，大幅减小文件 */
  ];

  /**
   * 构造函数 - 初始化视频工具应用程序
   *
   * @param wm - WindowManager实例，用于创建和管理视频工具窗口
   */
  constructor(wm: WindowManager) {
    this.wm = wm;
  }

  /**
   * 打开视频批量工具窗口
   *
   * 这个方法会：
   * 1. 调用buildHTML()构建工具的完整HTML结构
   * 2. 通过WindowManager创建一个新的工具窗口
   * 3. 在窗口创建完成后绑定所有交互事件
   */
  open(): void {
    /* 构建工具的完整HTML内容 */
    const html = this.buildHTML();

    /* 通过WindowManager创建视频工具窗口 */
    this.wm.createWindow({
      id: 'video-tools',         /* 窗口唯一标识符 */
      title: '视频批量工具',       /* 窗口标题栏显示的文字 */
      icon: '🎬',                 /* 窗口图标（电影符号表示视频工具） */
      width: 650,                 /* 窗口初始宽度（像素） */
      height: 500,                /* 窗口初始高度（像素） */
      content: html,              /* 窗口内部的HTML内容 */
      resizable: true,           /* 允许用户调整窗口大小 */
      /* 窗口创建完成后的回调函数 */
      onCreated: (el: HTMLElement) => {
        this.bindEvents(el);      /* 绑定所有交互事件 */
      },
    });
  }

  /**
   * 构建视频批量工具的完整HTML结构
   *
   * 工具界面分为以下区域（从上到下）：
   * 1. 标签栏 - 两个标签按钮切换"批量转格式"和"批量压缩"功能
   * 2. 使用说明 - 灰色小字提示用户当前工具的限制和操作方式
   * 3. 标签内容区 - 根据当前选中的标签显示对应的功能面板
   * 4. 状态栏 - 显示当前操作状态信息
   *
   * @returns 工具界面的完整HTML字符串
   */
  private buildHTML(): string {
    return `
      <div style="display:flex;flex-direction:column;height:100%;gap:6px;">
        <!-- ===== 标签栏 ===== -->
        <!-- 两个标签按钮，用于切换"批量转格式"和"批量压缩"功能面板 -->
        <div style="display:flex;gap:4px;">
          <!-- 批量转格式标签按钮，默认选中状态 -->
          <button class="pc-btn tab-btn" data-tab="0" style="flex:1;font-size:11px;padding:4px 8px;">[批量转格式]</button>
          <!-- 批量压缩标签按钮 -->
          <button class="pc-btn tab-btn" data-tab="1" style="flex:1;font-size:11px;padding:4px 8px;">[批量压缩]</button>
        </div>

        <!-- ===== 使用说明提示区域 ===== -->
        <!-- 灰色小字，提醒用户此工具使用浏览器原生API，仅支持WebM输出 -->
        <div class="vt-notice" style="font-size:10px;color:var(--pc-gray);padding:2px 4px;border:1px dashed var(--pc-dark-gray);background:rgba(255,255,255,0.03);">
          ⚠ 受浏览器限制，仅支持转码为WebM格式。处理速度取决于视频时长和浏览器性能。请勿关闭此窗口。
        </div>

        <!-- ===== 批量转格式面板（标签0） ===== -->
        <!-- 包含：文件上传区、文件列表、目标格式选择、开始转换按钮、进度显示 -->
        <div class="vt-panel vt-panel-convert" style="flex:1;display:flex;flex-direction:column;gap:6px;overflow:hidden;">
          <!-- 文件上传区域 - 使用隐藏的input[type=file]和自定义按钮 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <!-- 上传按钮，点击后触发隐藏的文件选择器 -->
            <button class="pc-btn vt-upload-btn" style="font-size:11px;padding:3px 10px;">选择视频文件</button>
            <!-- 隐藏的文件输入框，accept限制只能选择视频文件，multiple允许选择多个 -->
            <input type="file" class="vt-convert-input" multiple accept="video/*" style="display:none;">
            <!-- 格式说明标签 - 告知用户只能输出WebM格式 -->
            <span style="font-size:11px;color:var(--pc-gray);">目标格式: video/webm（浏览器原生支持）</span>
          </div>

          <!-- 文件列表区域 - 显示已上传的视频文件信息，可滚动 -->
          <div class="vt-file-list vt-convert-list" style="flex:1;overflow-y:auto;background:var(--pc-black);border:2px inset var(--pc-dark-gray);padding:4px;font-size:11px;min-height:60px;">
            <!-- 初始提示文字，上传文件后会替换为文件列表 -->
            <div class="vt-empty-hint" style="color:var(--pc-gray);text-align:center;padding:20px;">尚未选择视频文件</div>
          </div>

          <!-- 操作按钮区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <!-- 开始转换按钮 - 点击后逐个处理视频文件 -->
            <button class="pc-btn vt-convert-start" style="font-size:11px;padding:3px 12px;">开始转换</button>
            <!-- 清空列表按钮 - 移除所有已上传的文件 -->
            <button class="pc-btn vt-convert-clear" style="font-size:11px;padding:3px 12px;">清空列表</button>
            <!-- 已选文件数量显示 -->
            <span class="vt-convert-count" style="font-size:11px;color:var(--pc-gray);">已选 0 个文件</span>
          </div>

          <!-- 进度显示区域 - 转换过程中显示当前处理状态 -->
          <div class="vt-progress" style="font-size:11px;color:var(--pc-neon-green);padding:2px 4px;min-height:16px;"></div>
        </div>

        <!-- ===== 批量压缩面板（标签1） ===== -->
        <!-- 包含：文件上传区、文件列表、压缩参数设置、开始压缩按钮、进度显示 -->
        <div class="vt-panel vt-panel-compress" style="flex:1;display:none;flex-direction:column;gap:6px;overflow:hidden;">
          <!-- 文件上传区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <!-- 上传按钮 -->
            <button class="pc-btn vt-upload-btn" style="font-size:11px;padding:3px 10px;">选择视频文件</button>
            <!-- 隐藏的文件输入框 -->
            <input type="file" class="vt-compress-input" multiple accept="video/*" style="display:none;">
          </div>

          <!-- 文件列表区域 -->
          <div class="vt-file-list vt-compress-list" style="flex:1;overflow-y:auto;background:var(--pc-black);border:2px inset var(--pc-dark-gray);padding:4px;font-size:11px;min-height:60px;">
            <div class="vt-empty-hint" style="color:var(--pc-gray);text-align:center;padding:20px;">尚未选择视频文件</div>
          </div>

          <!-- 压缩参数设置区域 -->
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
            <!-- 分辨率选择 - 下拉菜单 -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="font-size:11px;color:var(--pc-gray);">分辨率:</span>
              <select class="vt-res-select" style="background:var(--pc-black);border:2px inset var(--pc-dark-gray);color:var(--pc-neon-green);font-family:var(--font-pixel);font-size:11px;padding:2px 4px;">
                <!-- 动态生成的分辨率选项会在这里 -->
              </select>
            </div>
            <!-- 比特率选择 - 下拉菜单 -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="font-size:11px;color:var(--pc-gray);">比特率:</span>
              <select class="vt-bitrate-select" style="background:var(--pc-black);border:2px inset var(--pc-dark-gray);color:var(--pc-neon-green);font-family:var(--font-pixel);font-size:11px;padding:2px 4px;">
                <!-- 动态生成的比特率选项会在这里 -->
              </select>
            </div>
            <!-- 预估压缩比显示 -->
            <span class="vt-compress-ratio" style="font-size:11px;color:var(--pc-neon-yellow);"></span>
          </div>

          <!-- 操作按钮区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <!-- 开始压缩按钮 -->
            <button class="pc-btn vt-compress-start" style="font-size:11px;padding:3px 12px;">开始压缩</button>
            <!-- 清空列表按钮 -->
            <button class="pc-btn vt-compress-clear" style="font-size:11px;padding:3px 12px;">清空列表</button>
            <!-- 已选文件数量显示 -->
            <span class="vt-compress-count" style="font-size:11px;color:var(--pc-gray);">已选 0 个文件</span>
          </div>

          <!-- 进度显示区域 -->
          <div class="vt-progress" style="font-size:11px;color:var(--pc-neon-green);padding:2px 4px;min-height:16px;"></div>
        </div>

        <!-- ===== 状态栏 ===== -->
        <!-- 显示当前操作的整体状态信息 -->
        <div class="status-bar">
          <span class="vt-status">就绪 - 请选择视频文件开始处理</span>
        </div>
      </div>
    `;
  }

  /**
   * 绑定视频工具所有交互事件
   *
   * 这个方法负责绑定以下交互：
   * 1. 标签栏切换事件 - 在"批量转格式"和"批量压缩"之间切换
   * 2. 文件上传事件 - 处理用户选择的视频文件
   * 3. 开始转换/压缩事件 - 启动视频处理流程
   * 4. 清空列表事件 - 清除已上传的文件
   * 5. 压缩参数变更事件 - 分辨率和比特率选择变化时更新预估压缩比
   *
   * @param el - 视频工具窗口的根HTML元素，所有事件都绑定在这个元素或其子元素上
   */
  private bindEvents(el: HTMLElement): void {
    /* ===== 标签栏切换事件 ===== */
    /* 获取所有标签按钮元素 */
    const tabBtns = el.querySelectorAll('.tab-btn');

    /* 遍历标签按钮，为每个按钮绑定点击事件 */
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        /* 从按钮的data-tab属性获取标签索引（0或1） */
        const tabIndex = parseInt((btn as HTMLElement).dataset.tab || '0', 10);
        /* 执行标签切换逻辑 */
        this.switchTab(el, tabIndex);
      });
    });

    /* ===== 批量转格式 - 文件上传事件 ===== */
    /* 获取转格式面板中的上传按钮和隐藏的文件输入框 */
    const convertUploadBtns = el.querySelectorAll('.vt-panel-convert .vt-upload-btn');
    const convertInput = el.querySelector('.vt-convert-input') as HTMLInputElement;

    /* 点击上传按钮时触发文件选择器 */
    convertUploadBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        convertInput.click(); /* 触发隐藏input的click，打开文件选择对话框 */
      });
    });

    /* 文件选择完成后，读取并显示文件列表 */
    convertInput?.addEventListener('change', () => {
      /* 将选择的文件添加到转格式文件列表中 */
      this.addFilesFromInput(convertInput, this.convertFiles, el, 'convert');
    });

    /* ===== 批量压缩 - 文件上传事件 ===== */
    /* 获取压缩面板中的上传按钮和隐藏的文件输入框 */
    const compressUploadBtns = el.querySelectorAll('.vt-panel-compress .vt-upload-btn');
    const compressInput = el.querySelector('.vt-compress-input') as HTMLInputElement;

    /* 点击上传按钮时触发文件选择器 */
    compressUploadBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        compressInput.click();
      });
    });

    /* 文件选择完成后，读取并显示文件列表 */
    compressInput?.addEventListener('change', () => {
      /* 将选择的文件添加到压缩文件列表中 */
      this.addFilesFromInput(compressInput, this.compressFiles, el, 'compress');
    });

    /* ===== 批量转格式 - 开始转换事件 ===== */
    const convertStartBtn = el.querySelector('.vt-convert-start');
    convertStartBtn?.addEventListener('click', () => {
      /* 开始逐个转换视频文件 */
      this.startConvertAll(el);
    });

    /* ===== 批量转格式 - 清空列表事件 ===== */
    const convertClearBtn = el.querySelector('.vt-convert-clear');
    convertClearBtn?.addEventListener('click', () => {
      /* 清空转格式的文件列表和界面显示 */
      this.clearFiles(this.convertFiles, el, 'convert');
    });

    /* ===== 批量压缩 - 开始压缩事件 ===== */
    const compressStartBtn = el.querySelector('.vt-compress-start');
    compressStartBtn?.addEventListener('click', () => {
      /* 开始逐个压缩视频文件 */
      this.startCompressAll(el);
    });

    /* ===== 批量压缩 - 清空列表事件 ===== */
    const compressClearBtn = el.querySelector('.vt-compress-clear');
    compressClearBtn?.addEventListener('click', () => {
      /* 清空压缩的文件列表和界面显示 */
      this.clearFiles(this.compressFiles, el, 'compress');
    });

    /* ===== 压缩参数 - 分辨率和比特率下拉框初始化 ===== */
    /* 填充分辨率选择下拉框的选项 */
    this.populateSelect(el, '.vt-res-select', this.resolutionPresets.map((r) => r.label));
    /* 填充比特率选择下拉框的选项 */
    this.populateSelect(el, '.vt-bitrate-select', this.bitratePresets.map((b) => b.label));

    /* 分辨率和比特率变化时，更新预估压缩比 */
    const resSelect = el.querySelector('.vt-res-select') as HTMLSelectElement;
    const bitrateSelect = el.querySelector('.vt-bitrate-select') as HTMLSelectElement;

    /* 监听分辨率下拉框变化事件 */
    resSelect?.addEventListener('change', () => {
      this.updateCompressRatio(el, resSelect.selectedIndex, bitrateSelect.selectedIndex);
    });
    /* 监听比特率下拉框变化事件 */
    bitrateSelect?.addEventListener('change', () => {
      this.updateCompressRatio(el, resSelect.selectedIndex, bitrateSelect.selectedIndex);
    });
  }

  /**
   * 切换标签页 - 在"批量转格式"和"批量压缩"之间切换显示
   *
   * 切换逻辑：
   * 1. 更新标签按钮的视觉状态（选中的标签高亮，未选中的恢复默认）
   * 2. 隐藏所有面板，只显示当前选中的面板
   * 3. 更新内部记录的当前标签索引
   *
   * @param el - 工具窗口的根HTML元素
   * @param tabIndex - 要切换到的标签索引（0=批量转格式，1=批量压缩）
   */
  private switchTab(el: HTMLElement, tabIndex: number): void {
    /* 更新当前标签索引 */
    this.currentTab = tabIndex;

    /* 遍历所有标签按钮，更新选中状态的视觉样式 */
    el.querySelectorAll('.tab-btn').forEach((btn) => {
      const btnIndex = parseInt((btn as HTMLElement).dataset.tab || '0', 10);
      if (btnIndex === tabIndex) {
        /* 选中的标签 - 添加粉色边框和背景色表示当前激活 */
        (btn as HTMLElement).style.borderColor = 'var(--pc-pink)';
        (btn as HTMLElement).style.background = 'rgba(255,105,180,0.3)';
      } else {
        /* 未选中的标签 - 恢复默认的按钮样式 */
        (btn as HTMLElement).style.borderColor = '';
        (btn as HTMLElement).style.background = '';
      }
    });

    /* 遍历所有面板，根据标签索引显示/隐藏 */
    const panels = el.querySelectorAll('.vt-panel');
    panels.forEach((panel, index) => {
      if (index === tabIndex) {
        /* 当前选中的面板 - 显示为flex列布局 */
        (panel as HTMLElement).style.display = 'flex';
      } else {
        /* 未选中的面板 - 隐藏 */
        (panel as HTMLElement).style.display = 'none';
      }
    });

    /* 更新状态栏文字，显示当前所在的功能标签 */
    const status = el.querySelector('.vt-status');
    if (status) {
      const tabNames = ['批量转格式', '批量压缩'];
      status.textContent = `当前: ${tabNames[tabIndex]}`;
    }
  }

  /**
   * 从文件输入框中读取用户选择的文件，添加到对应的文件列表
   *
   * 处理逻辑：
   * 1. 从HTMLInputElement的files属性获取用户选择的FileList
   * 2. 将每个文件的信息（文件名、大小、类型）存入VideoFileInfo对象
   * 3. 将VideoFileInfo对象追加到对应的文件数组中
   * 4. 更新界面上的文件列表显示和文件计数
   * 5. 清空input的value以便下次选择相同文件时仍能触发change事件
   *
   * @param input - 文件输入框元素，其files属性包含用户选择的文件
   * @param fileList - 目标文件数组（convertFiles或compressFiles）
   * @param el - 工具窗口的根HTML元素
   * @param mode - 当前模式标识，'convert'表示转格式，'compress'表示压缩
   */
  private addFilesFromInput(input: HTMLInputElement, fileList: VideoFileInfo[], el: HTMLElement, mode: string): void {
    /* 如果用户没有选择任何文件（例如点了取消），则直接返回 */
    if (!input.files || input.files.length === 0) return;

    /* 遍历用户选择的所有文件，逐个添加到文件列表 */
    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];

      /* 创建视频文件信息对象，保存文件的基本信息 */
      const info: VideoFileInfo = {
        file: file,                   /* 原始File对象，后续处理时需要用到 */
        name: file.name,              /* 文件名，如"我的视频.mp4" */
        size: file.size,              /* 文件大小（字节），如 10485760 */
        type: file.type || '未知',    /* MIME类型，如"video/mp4"，部分文件可能为空 */
      };

      /* 将文件信息添加到列表数组中 */
      fileList.push(info);
    }

    /* 更新界面上的文件列表显示 */
    this.renderFileList(el, fileList, mode);

    /* 清空input的value，这样用户下次选择相同文件时也能触发change事件 */
    input.value = '';
  }

  /**
   * 渲染文件列表到界面上
   *
   * 将文件数组中的每个文件信息格式化为一行显示，包含：
   * - 序号
   * - 文件名
   * - 文件大小（格式化为KB或MB）
   * - 文件类型
   *
   * 如果列表为空，则显示"尚未选择视频文件"的提示文字。
   *
   * @param el - 工具窗口的根HTML元素
   * @param fileList - 要渲染的文件数组
   * @param mode - 模式标识，'convert'或'compress'，用于定位对应的DOM容器
   */
  private renderFileList(el: HTMLElement, fileList: VideoFileInfo[], mode: string): void {
    /* 根据模式获取对应的文件列表容器DOM元素 */
    const listClass = mode === 'convert' ? '.vt-convert-list' : '.vt-compress-list';
    const listEl = el.querySelector(listClass) as HTMLElement;
    /* 根据模式获取对应的文件计数显示元素 */
    const countClass = mode === 'convert' ? '.vt-convert-count' : '.vt-compress-count';
    const countEl = el.querySelector(countClass) as HTMLElement;

    if (!listEl) return;

    /* 如果文件列表为空，显示提示文字 */
    if (fileList.length === 0) {
      listEl.innerHTML = `<div class="vt-empty-hint" style="color:var(--pc-gray);text-align:center;padding:20px;">尚未选择视频文件</div>`;
      if (countEl) countEl.textContent = `已选 0 个文件`;
      return;
    }

    /* 遍历文件数组，为每个文件生成一行HTML */
    const html = fileList
      .map((info, index) => {
        /* 格式化文件大小为可读的字符串（KB或MB） */
        const sizeStr = this.formatFileSize(info.size);
        /* 生成单行文件信息HTML */
        return `
          <div style="padding:3px 4px;border-bottom:1px solid var(--pc-dark-gray);display:flex;gap:8px;">
            <!-- 序号 -->
            <span style="color:var(--pc-gray);min-width:24px;">${index + 1}.</span>
            <!-- 文件名，粉色高亮 -->
            <span style="color:var(--pc-pink);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${info.name}">${info.name}</span>
            <!-- 文件大小 -->
            <span style="color:var(--pc-neon-blue);min-width:60px;text-align:right;">${sizeStr}</span>
            <!-- 文件类型，灰色小字 -->
            <span style="color:var(--pc-gray);min-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${info.type}</span>
          </div>
        `;
      })
      .join(''); /* 将所有行的HTML拼接成一个字符串 */

    /* 将生成的HTML插入到文件列表容器中 */
    listEl.innerHTML = html;

    /* 更新文件计数显示 */
    if (countEl) countEl.textContent = `已选 ${fileList.length} 个文件`;
  }

  /**
   * 格式化文件大小为可读的字符串
   *
   * 根据文件字节数自动选择合适的单位：
   * - 大于1MB：显示为"XX.X MB"
   * - 大于1KB：显示为"XX.X KB"
   * - 小于1KB：显示为字节数
   *
   * @param bytes - 文件大小（字节数）
   * @returns 格式化后的字符串，如"10.5 MB"
   */
  private formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      /* 大于1MB，除以1024*1024转换为MB，保留1位小数 */
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      /* 大于1KB但小于1MB，除以1024转换为KB，保留1位小数 */
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      /* 小于1KB，直接显示字节数 */
      return `${bytes} B`;
    }
  }

  /**
   * 清空文件列表 - 清除所有已上传的文件和界面显示
   *
   * @param fileList - 要清空的文件数组
   * @param el - 工具窗口的根HTML元素
   * @param mode - 模式标识，'convert'或'compress'
   */
  private clearFiles(fileList: VideoFileInfo[], el: HTMLElement, mode: string): void {
    /* 清空文件数组 */
    fileList.length = 0;
    /* 重新渲染空的文件列表到界面 */
    this.renderFileList(el, fileList, mode);

    /* 清空进度显示区域 */
    const progressEl = el.querySelector('.vt-panel-' + mode + ' .vt-progress') as HTMLElement;
    if (progressEl) progressEl.textContent = '';

    /* 更新状态栏 */
    const status = el.querySelector('.vt-status');
    if (status) {
      const tabNames = ['批量转格式', '批量压缩'];
      status.textContent = `已清空 - ${tabNames[mode === 'convert' ? 0 : 1]}`;
    }
  }

  /**
   * 向下拉选择框中填充选项
   *
   * @param el - 工具窗口的根HTML元素
   * @param selector - 下拉框的CSS选择器
   * @param options - 选项标签文字数组
   */
  private populateSelect(el: HTMLElement, selector: string, options: string[]): void {
    /* 获取下拉框元素 */
    const select = el.querySelector(selector) as HTMLSelectElement;
    if (!select) return;

    /* 清空现有选项 */
    select.innerHTML = '';

    /* 为每个选项创建option元素并添加到下拉框中 */
    options.forEach((label, index) => {
      const option = document.createElement('option');
      option.value = String(index);  /* 选项的值为索引数字 */
      option.textContent = label;    /* 选项的显示文字 */
      select.appendChild(option);
    });
  }

  /**
   * 更新压缩预估比例显示
   *
   * 根据用户选择的分辨率和比特率，粗略估算压缩比。
   * 这是一个预估值，实际压缩比取决于视频内容。
   *
   * 估算逻辑：
   * - 分辨率缩放因子：面积比值（目标面积/原始面积）
   * - 比特率因子：相对于高比特率的比值
   * - 总预估压缩比 = 分辨率因子 × 比特率因子
   *
   * @param el - 工具窗口的根HTML元素
   * @param resIndex - 分辨率预设的索引
   * @param bitrateIndex - 比特率预设的索引
   */
  private updateCompressRatio(el: HTMLElement, resIndex: number, bitrateIndex: number): void {
    /* 获取预估压缩比显示元素 */
    const ratioEl = el.querySelector('.vt-compress-ratio') as HTMLElement;
    if (!ratioEl) return;

    /* 计算分辨率缩放因子 */
    /* 原始分辨率不变=1.0，720p≈0.6，480p≈0.3，360p≈0.15 */
    const resFactors = [1.0, 0.6, 0.3, 0.15];
    /* 计算比特率缩放因子 */
    /* 高比特率=1.0，中比特率=0.4，低比特率=0.2 */
    const bitrateFactors = [1.0, 0.4, 0.2];

    /* 综合预估压缩比 = 分辨率因子 × 比特率因子 */
    const estimatedRatio = resFactors[resIndex] * bitrateFactors[bitrateIndex];

    /* 将压缩比转换为百分比显示 */
    const percent = Math.round(estimatedRatio * 100);

    if (estimatedRatio >= 1.0) {
      /* 压缩比大于等于1，说明文件可能不会变小 */
      ratioEl.textContent = `预估: ≈${percent}%（接近原大小）`;
    } else {
      /* 压缩比小于1，显示预估的文件大小比例 */
      ratioEl.textContent = `预估: ≈${percent}%（文件大小约为原始的${percent}%）`;
    }
  }

  /**
   * 开始批量转换 - 逐个将视频文件转码为WebM格式
   *
   * 处理流程：
   * 1. 检查是否有文件需要处理，是否正在处理中
   * 2. 从第一个文件开始，逐个调用processVideo进行转码
   * 3. 每个文件处理完成后自动下载，然后处理下一个
   * 4. 全部完成后更新状态栏
   *
   * @param el - 工具窗口的根HTML元素
   */
  private async startConvertAll(el: HTMLElement): Promise<void> {
    /* 如果没有文件，显示提示并返回 */
    if (this.convertFiles.length === 0) {
      this.updateProgress(el, 'convert', '请先选择要转换的视频文件！');
      return;
    }

    /* 如果正在处理中，防止重复点击 */
    if (this.isProcessing) {
      this.updateProgress(el, 'convert', '正在处理中，请等待...');
      return;
    }

    /* 标记为正在处理 */
    this.isProcessing = true;

    /* 更新状态栏 */
    this.updateStatus(el, '开始批量转换...');

    /* 获取转格式面板中的进度显示元素 */
    const progressEl = el.querySelector('.vt-panel-convert .vt-progress') as HTMLElement;

    /* 逐个处理文件 */
    for (let i = 0; i < this.convertFiles.length; i++) {
      const fileInfo = this.convertFiles[i];

      /* 更新进度显示 - 显示当前处理的文件序号和名称 */
      this.updateProgress(el, 'convert', `[${i + 1}/${this.convertFiles.length}] 正在转换: ${fileInfo.name}`);

      try {
        /**
         * 调用核心处理方法转码视频
         * targetWidth=-1和targetHeight=-1表示保持原始分辨率
         * 不指定比特率，使用MediaRecorder的默认值
         */
        await this.processVideo(
          fileInfo,
          el,
          'convert',
          -1,      /* 不缩放，保持原始宽度 */
          -1,      /* 不缩放，保持原始高度 */
          undefined /* 使用MediaRecorder默认比特率 */
        );

        /* 单个文件转换成功，更新进度 */
        this.updateProgress(el, 'convert', `[${i + 1}/${this.convertFiles.length}] ✓ ${fileInfo.name} 转换完成，已开始下载`);
      } catch (err) {
        /* 单个文件转换失败，显示错误信息但继续处理下一个 */
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.updateProgress(el, 'convert', `[${i + 1}/${this.convertFiles.length}] ✗ ${fileInfo.name} 转换失败: ${errorMsg}`);
      }
    }

    /* 全部处理完成 */
    this.updateProgress(el, 'convert', `全部完成！共处理 ${this.convertFiles.length} 个文件。`);
    this.updateStatus(el, '批量转换完成');

    /* 处理结束，取消处理中标记 */
    this.isProcessing = false;
  }

  /**
   * 开始批量压缩 - 逐个压缩视频文件
   *
   * 处理流程：
   * 1. 检查是否有文件需要处理，是否正在处理中
   * 2. 从用户选择的分辨率和比特率预设中获取参数
   * 3. 从第一个文件开始，逐个调用processVideo进行压缩
   * 4. 每个文件处理完成后自动下载，然后处理下一个
   * 5. 全部完成后更新状态栏
   *
   * @param el - 工具窗口的根HTML元素
   */
  private async startCompressAll(el: HTMLElement): Promise<void> {
    /* 如果没有文件，显示提示并返回 */
    if (this.compressFiles.length === 0) {
      this.updateProgress(el, 'compress', '请先选择要压缩的视频文件！');
      return;
    }

    /* 如果正在处理中，防止重复点击 */
    if (this.isProcessing) {
      this.updateProgress(el, 'compress', '正在处理中，请等待...');
      return;
    }

    /* 标记为正在处理 */
    this.isProcessing = true;

    /* 获取用户选择的分辨率和比特率参数 */
    const resSelect = el.querySelector('.vt-res-select') as HTMLSelectElement;
    const bitrateSelect = el.querySelector('.vt-bitrate-select') as HTMLSelectElement;
    const resPreset = this.resolutionPresets[resSelect?.selectedIndex || 0];
    const bitratePreset = this.bitratePresets[bitrateSelect?.selectedIndex || 0];

    /* 更新状态栏，显示选择的压缩参数 */
    this.updateStatus(el, `开始批量压缩 (${resPreset.label}, ${bitratePreset.label})...`);

    /* 逐个处理文件 */
    for (let i = 0; i < this.compressFiles.length; i++) {
      const fileInfo = this.compressFiles[i];

      /* 更新进度显示 */
      this.updateProgress(el, 'compress', `[${i + 1}/${this.compressFiles.length}] 正在压缩: ${fileInfo.name}`);

      try {
        /**
         * 调用核心处理方法压缩视频
         * 传入用户选择的分辨率和比特率参数
         */
        await this.processVideo(
          fileInfo,
          el,
          'compress',
          resPreset.width,     /* 目标宽度，-1表示保持原始 */
          resPreset.height,    /* 目标高度，-1表示保持原始 */
          bitratePreset.value  /* 目标比特率 */
        );

        /* 单个文件压缩成功 */
        this.updateProgress(el, 'compress', `[${i + 1}/${this.compressFiles.length}] ✓ ${fileInfo.name} 压缩完成，已开始下载`);
      } catch (err) {
        /* 单个文件压缩失败 */
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.updateProgress(el, 'compress', `[${i + 1}/${this.compressFiles.length}] ✗ ${fileInfo.name} 压缩失败: ${errorMsg}`);
      }
    }

    /* 全部处理完成 */
    this.updateProgress(el, 'compress', `全部完成！共处理 ${this.compressFiles.length} 个文件。`);
    this.updateStatus(el, '批量压缩完成');

    /* 处理结束，取消处理中标记 */
    this.isProcessing = false;
  }

  /**
   * 核心视频处理方法 - 使用浏览器原生API转码/压缩单个视频文件
   *
   * 技术实现步骤：
   * 1. 创建一个隐藏的<video>元素，通过URL.createObjectURL加载源视频
   * 2. 等待视频元数据加载完成，获取视频的实际尺寸和时长
   * 3. 创建一个<canvas>元素，设置为视频的目标尺寸（或原始尺寸）
   * 4. 播放视频，使用requestAnimationFrame逐帧将视频画面绘制到canvas上
   * 5. 使用canvas.captureStream()获取MediaStream
   * 6. 使用MediaRecorder录制这个流，编码为WebM格式
   * 7. 视频播放结束后停止录制，收集所有数据块
   * 8. 将数据块合并为Blob，创建下载链接并触发自动下载
   * 9. 清理所有临时资源（释放ObjectURL、移除DOM元素）
   *
   * @param fileInfo - 要处理的视频文件信息
   * @param el - 工具窗口的根HTML元素（用于更新进度）
   * @param mode - 处理模式，'convert'或'compress'
   * @param targetWidth - 目标宽度（像素），-1表示保持原始宽度
   * @param targetHeight - 目标高度（像素），-1表示保持原始高度
   * @param bitrate - 目标比特率（bps），undefined表示使用默认值
   * @returns Promise，在处理完成后resolve
   * @throws 如果视频加载失败、浏览器不支持MediaRecorder等情况抛出错误
   */
  private processVideo(
    fileInfo: VideoFileInfo,
    el: HTMLElement,
    mode: string,
    targetWidth: number,
    targetHeight: number,
    bitrate: number | undefined
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      /**
       * 第1步：创建隐藏的<video>元素来加载源视频
       * 使用URL.createObjectURL将File对象转换为可播放的Blob URL
       * 这样就不需要将文件上传到服务器，完全在本地处理
       */
      const video = document.createElement('video');
      video.style.display = 'none'; /* 隐藏视频元素，不显示在页面上 */
      video.muted = true;           /* 静音播放，避免处理时发出声音 */
      video.playsInline = true;      /* 内联播放，不触发全屏 */

      /* 创建Blob URL用于加载视频文件 */
      const objectUrl = URL.createObjectURL(fileInfo.file);
      video.src = objectUrl;

      /* 用于收集MediaRecorder输出的数据块 */
      const recordedChunks: Blob[] = [];

      /**
       * 第2步：监听视频元数据加载完成事件
       * 元数据包含视频的宽度、高度、时长等信息
       * 只有在元数据加载完成后才能获取视频的实际尺寸
       */
      video.addEventListener('loadedmetadata', () => {
        /* 获取视频的原始宽度和高度 */
        const originalWidth = video.videoWidth;
        const originalHeight = video.videoHeight;
        /* 获取视频的总时长（秒） */
        const duration = video.duration;

        /**
         * 计算实际的目标宽度和高度
         * 如果指定了目标宽度/高度（大于0），则使用指定值
         * 否则使用视频的原始尺寸
         */
        const finalWidth = targetWidth > 0 ? targetWidth : originalWidth;
        /* 高度需要根据宽度等比例缩放，保持画面不变形 */
        const finalHeight = targetHeight > 0 ? targetHeight : originalHeight;

        /**
         * 如果用户只指定了宽度或高度中的一个，
         * 需要根据另一个维度等比例计算
         */
        let canvasWidth = finalWidth;
        let canvasHeight = finalHeight;

        if (targetWidth > 0 && targetHeight === -1) {
          /* 只指定了宽度，高度按比例缩放 */
          canvasHeight = Math.round((finalWidth / originalWidth) * originalHeight);
        } else if (targetWidth === -1 && targetHeight > 0) {
          /* 只指定了高度，宽度按比例缩放 */
          canvasWidth = Math.round((finalHeight / originalHeight) * originalWidth);
        }

        /**
         * 第3步：创建Canvas元素
         * Canvas的尺寸设置为计算后的目标尺寸
         * 视频的每一帧都会被绘制到这个Canvas上
         */
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;   /* 设置Canvas宽度 */
        canvas.height = canvasHeight; /* 设置Canvas高度 */
        const ctx = canvas.getContext('2d'); /* 获取2D绘图上下文 */
        if (!ctx) {
          /* 如果无法获取绘图上下文（极端情况），释放资源并报错 */
          URL.revokeObjectURL(objectUrl);
          reject(new Error('无法创建Canvas上下文'));
          return;
        }

        /**
         * 第4步：使用Canvas的captureStream方法创建MediaStream
         * 参数30表示每秒捕获30帧画面
         * 这个流包含了Canvas上绘制的所有画面内容
         */
        const stream = canvas.captureStream(30);

        /**
         * 第5步：创建MediaRecorder来录制流
         * MediaRecorder会将流中的数据编码为指定格式
         *
         * 检查浏览器是否支持MediaRecorder
         * 如果不支持，使用简单的逐帧截图方案作为后备
         */
        let mimeType = 'video/webm;codecs=vp8,opus'; /* 优先使用VP8视频+Opus音频编码 */

        /* 检查浏览器是否支持目标MIME类型 */
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          /* 如果不支持VP8+Opus，尝试仅使用VP8视频编码 */
          mimeType = 'video/webm;codecs=vp8';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            /* 如果VP8也不支持，使用最基本的webm格式 */
            mimeType = 'video/webm';
          }
        }

        /**
         * 创建MediaRecorder实例
         * 配置参数：
         * - mimeType: 输出的视频编码格式
         * - videoBitsPerSecond: 视频比特率（如果指定了的话）
         */
        const recorderOptions: MediaRecorderOptions = {
          mimeType: mimeType,
        };
        /* 如果用户指定了比特率，添加到配置中 */
        if (bitrate !== undefined) {
          recorderOptions.videoBitsPerSecond = bitrate;
        }

        /* 创建MediaRecorder实例，绑定到Canvas的流 */
        const recorder = new MediaRecorder(stream, recorderOptions);

        /**
         * 监听MediaRecorder的数据事件
         * 每当有新的数据块可用时，将其收集到recordedChunks数组中
         * 这些数据块最终会合并为完整的WebM文件
         */
        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data); /* 收集数据块 */
          }
        };

        /**
         * 监听MediaRecorder停止事件
         * 当录制停止时（视频播放完毕后），触发下载并清理资源
         */
        recorder.onstop = () => {
          /**
           * 第7步：合并所有数据块为单个Blob
           * MIME类型设置为video/webm，这是输出的文件格式
           */
          const blob = new Blob(recordedChunks, { type: 'video/webm' });

          /**
           * 第8步：创建下载链接并触发自动下载
           * 将原始文件名的扩展名替换为.webm
           * 例如："我的视频.mp4" → "我的视频.webm"
           */
          const outputName = fileInfo.name.replace(/\.[^.]+$/, '') + '.webm';
          const downloadUrl = URL.createObjectURL(blob); /* 创建Blob的临时URL */
          const a = document.createElement('a');          /* 创建隐藏的<a>元素 */
          a.href = downloadUrl;                           /* 设置下载链接 */
          a.download = outputName;                        /* 设置下载文件名 */
          a.style.display = 'none';
          document.body.appendChild(a);                   /* 添加到DOM（某些浏览器需要） */
          a.click();                                      /* 触发点击，开始下载 */
          document.body.removeChild(a);                   /* 移除临时元素 */

          /**
           * 第9步：清理所有临时资源
           * 释放Blob URL，避免内存泄漏
           */
          URL.revokeObjectURL(downloadUrl);
          URL.revokeObjectURL(objectUrl);

          /* 处理完成，通知调用者 */
          resolve();
        };

        /* 监听录制错误 */
        recorder.onerror = () => {
          /* 清理资源 */
          URL.revokeObjectURL(objectUrl);
          reject(new Error('MediaRecorder录制出错'));
        };

        /**
         * 第6步：开始录制并播放视频
         *
         * 先启动MediaRecorder开始录制
         * 然后播放视频
         * 视频播放时，每一帧都会通过requestAnimationFrame绘制到Canvas
         * Canvas的画面通过captureStream传递给MediaRecorder进行编码
         */
        recorder.start(100); /* 每100毫秒触发一次ondataavailable事件 */

        /**
         * 使用requestAnimationFrame实现逐帧绘制
         * 这是一种高效的动画循环方式，与浏览器刷新率同步
         * 每次视频播放到新的一帧时，将当前画面绘制到Canvas上
         */
        const drawFrame = () => {
          if (video.paused || video.ended) {
            /* 如果视频已暂停或播放完毕，停止绘制循环 */
            return;
          }
          /**
           * 将视频的当前帧绘制到Canvas上
           * drawImage的参数：
           * - video: 源图像（当前帧）
           * - 0, 0: 在Canvas上的起始坐标（左上角）
           * - canvasWidth, canvasHeight: 绘制的宽度和高度
           */
          ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

          /* 请求下一帧继续绘制 */
          requestAnimationFrame(drawFrame);
        };

        /* 监听视频播放事件 - 开始逐帧绘制 */
        video.addEventListener('play', drawFrame);

        /* 监听视频播放结束事件 - 停止录制 */
        video.addEventListener('ended', () => {
          /* 给最后一帧一点时间被捕获 */
          setTimeout(() => {
            if (recorder.state === 'recording') {
              recorder.stop(); /* 停止MediaRecorder录制 */
            }
          }, 200); /* 延迟200ms确保最后一帧被捕获 */
        });

        /* 开始播放视频 */
        video.play().catch((err: DOMException) => {
          /* 如果视频播放失败（例如格式不支持），停止录制并报错 */
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          URL.revokeObjectURL(objectUrl);
          reject(new Error(`视频播放失败: ${err.message}`));
        });
      });

      /* 监听视频加载错误 */
      video.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`无法加载视频: ${fileInfo.name}`));
      });

      /* 设置超时保护 - 如果视频加载时间过长（30秒），自动取消 */
      setTimeout(() => {
        if (video.readyState < 1) {
          /* 视频元数据还未加载，视为加载失败 */
          URL.revokeObjectURL(objectUrl);
          reject(new Error(`视频加载超时: ${fileInfo.name}`));
        }
      }, 30000); /* 30秒超时 */
    });
  }

  /**
   * 更新指定面板的进度显示文字
   *
   * @param el - 工具窗口的根HTML元素
   * @param mode - 面板模式，'convert'或'compress'
   * @param text - 要显示的进度文字
   */
  private updateProgress(el: HTMLElement, mode: string, text: string): void {
    /* 根据模式拼接CSS选择器，定位到对应面板中的进度元素 */
    const progressEl = el.querySelector(`.vt-panel-${mode} .vt-progress`) as HTMLElement;
    if (progressEl) {
      progressEl.textContent = text;
    }
  }

  /**
   * 更新底部状态栏文字
   *
   * @param el - 工具窗口的根HTML元素
   * @param text - 要显示的状态文字
   */
  private updateStatus(el: HTMLElement, text: string): void {
    /* 获取状态栏中的状态文字元素 */
    const statusEl = el.querySelector('.vt-status') as HTMLElement;
    if (statusEl) {
      statusEl.textContent = text;
    }
  }
}
