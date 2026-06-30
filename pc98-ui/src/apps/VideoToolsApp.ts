/**
 * VideoToolsApp.ts
 *
 * 视频批量工具 - PC-98风格的浏览器端FFmpeg视频处理应用
 *
 * 这个文件实现了一个基于FFmpeg.wasm的视频批量处理工具，包含7个完整功能：
 * 1. 格式转换 - 支持MP4(H.264)、WebM(VP8)、AVI、MOV、MKV、GIF六种输出格式
 * 2. 视频压缩 - 使用CRF值、预设速度、分辨率缩放来压缩视频
 * 3. 视频裁剪 - 按开始/结束时间裁剪视频片段
 * 4. 视频拼接 - 将多个视频按顺序拼接为一个
 * 5. 提取音频 - 从视频中提取音频，支持MP3/AAC/WAV/FLAC格式
 * 6. 视频截图 - 在指定时间点截取视频画面
 * 7. 视频转GIF - 将视频转换为GIF动图，支持帧率和尺寸设置
 *
 * 技术方案：
 * - 使用 FFmpeg.wasm（WebAssembly版FFmpeg）在浏览器端完成所有视频处理
 * - 通过 FFmpegLoader 单例管理FFmpeg核心的加载和文件系统操作
 * - 所有处理都在浏览器本地完成，不需要服务器
 * - FFmpeg核心约31MB，首次使用需要从CDN下载
 */

import { WindowManager } from '../core/WindowManager';
import { FFmpegLoader, FFmpegLoadingStatus } from '../core/FFmpegLoader';

/**
 * 视频文件信息接口 - 存储用户上传的视频文件的基本信息
 * @property file - 用户选择的视频文件对象（浏览器File API）
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
 * 格式转换选项接口 - 定义每种输出格式的FFmpeg命令参数
 * @property label - 下拉框中显示给用户的标签文字
 * @property ext - 输出文件的扩展名
 * @property mimeType - 输出文件的MIME类型，用于下载时设置
 * @property args - FFmpeg命令行参数数组（不含输入和输出文件参数）
 */
interface FormatOption {
  /** 显示在下拉框中的标签文字 */
  label: string;
  /** 输出文件扩展名 */
  ext: string;
  /** 输出文件的MIME类型 */
  mimeType: string;
  /** FFmpeg命令参数（不含 -i input 和 output 部分） */
  args: string[];
}

/**
 * 分辨率选项接口 - 定义视频压缩时的分辨率缩放选项
 * @property label - 显示给用户的标签文字
 * @property width - 目标宽度（像素），-1表示保持原始比例
 * @property height - 目标高度（像素），-1表示保持原始比例
 */
interface ResolutionOption {
  /** 显示标签 */
  label: string;
  /** 目标宽度（像素），-1表示原始 */
  width: number;
  /** 目标高度（像素），-1表示原始 */
  height: number;
}

/**
 * 音频提取格式选项接口 - 定义提取音频的输出格式
 * @property label - 下拉框中显示的标签文字
 * @property ext - 输出文件扩展名
 * @property mimeType - 输出文件的MIME类型
 * @property args - FFmpeg命令参数
 */
interface AudioFormatOption {
  /** 显示标签 */
  label: string;
  /** 输出文件扩展名 */
  ext: string;
  /** 输出文件的MIME类型 */
  mimeType: string;
  /** FFmpeg命令参数 */
  args: string[];
}

/**
 * 截图格式选项接口 - 定义截图的输出图片格式
 * @property label - 下拉框中显示的标签文字
 * @property ext - 输出文件扩展名
 * @property mimeType - 输出文件的MIME类型
 * @property args - FFmpeg命令参数中 -frames:v 后面的格式参数
 */
interface ScreenshotFormatOption {
  /** 显示标签 */
  label: string;
  /** 输出文件扩展名 */
  ext: string;
  /** 输出文件的MIME类型 */
  mimeType: string;
}

/**
 * VideoToolsApp 类 - 视频批量工具应用程序主类
 *
 * 这个类封装了视频批量处理的所有功能，包括：
 * - 管理7个功能标签页的切换和显示
 * - 处理文件上传和文件列表显示
 * - 通过FFmpeg.wasm执行视频转码、压缩、裁剪等操作
 * - 显示处理进度和结果状态
 * - 自动下载处理完成的文件
 *
 * @example
 * // 创建并打开视频工具窗口
 * const videoTools = new VideoToolsApp(windowManager);
 * videoTools.open();
 */
export class VideoToolsApp {
  /** WindowManager实例引用，用于创建窗口 */
  private wm: WindowManager;

  /** FFmpegLoader单例引用，用于加载FFmpeg和执行命令 */
  private ffmpegLoader: FFmpegLoader;

  /** 当前是否正在处理视频（防止重复点击开始按钮） */
  private isProcessing: boolean = false;

  /** 格式转换标签页的文件列表 */
  private convertFiles: VideoFileInfo[] = [];

  /** 视频压缩标签页的文件列表 */
  private compressFiles: VideoFileInfo[] = [];

  /** 视频裁剪标签页的文件（单个） */
  private trimFiles: VideoFileInfo[] = [];

  /** 视频拼接标签页的文件列表 */
  private concatFiles: VideoFileInfo[] = [];

  /** 提取音频标签页的文件列表 */
  private extractAudioFiles: VideoFileInfo[] = [];

  /** 视频截图标签页的文件列表 */
  private screenshotFiles: VideoFileInfo[] = [];

  /** 视频转GIF标签页的文件列表 */
  private toGifFiles: VideoFileInfo[] = [];

  /**
   * 标签页配置数组 - 定义7个功能标签页的基本信息
   * 每个标签页包含：显示名称、对应的文件列表引用、CSS类名后缀
   */
  private readonly tabs: Array<{
    /** 标签页显示名称 */
    name: string;
    /** 对应文件列表的引用键名 */
    fileKey: string;
    /** 面板CSS类名后缀，用于定位DOM元素 */
    panelClass: string;
  }> = [
    { name: '格式转换', fileKey: 'convert', panelClass: 'vt-panel-convert' },
    { name: '视频压缩', fileKey: 'compress', panelClass: 'vt-panel-compress' },
    { name: '视频裁剪', fileKey: 'trim', panelClass: 'vt-panel-trim' },
    { name: '视频拼接', fileKey: 'concat', panelClass: 'vt-panel-concat' },
    { name: '提取音频', fileKey: 'extractAudio', panelClass: 'vt-panel-extract-audio' },
    { name: '视频截图', fileKey: 'screenshot', panelClass: 'vt-panel-screenshot' },
    { name: '视频转GIF', fileKey: 'toGif', panelClass: 'vt-panel-to-gif' },
  ];

  /**
   * 格式转换选项数组 - 定义6种输出格式及其FFmpeg命令参数
   * 每个选项对应一种输出格式的完整FFmpeg编码参数
   */
  private readonly formatOptions: FormatOption[] = [
    {
      label: 'MP4 (H.264)',
      ext: 'mp4',
      mimeType: 'video/mp4',
      args: ['-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart'],
    },
    {
      label: 'WebM (VP8)',
      ext: 'webm',
      mimeType: 'video/webm',
      args: ['-c:v', 'libvpx', '-c:a', 'libvorbis'],
    },
    {
      label: 'AVI',
      ext: 'avi',
      mimeType: 'video/x-msvideo',
      args: ['-c:v', 'mpeg4', '-c:a', 'mp3'],
    },
    {
      label: 'MOV',
      ext: 'mov',
      mimeType: 'video/quicktime',
      args: ['-c:v', 'libx264', '-c:a', 'aac', '-f', 'mov'],
    },
    {
      label: 'MKV',
      ext: 'mkv',
      mimeType: 'video/x-matroska',
      args: ['-c:v', 'libx264', '-c:a', 'aac'],
    },
    {
      label: 'GIF',
      ext: 'gif',
      mimeType: 'image/gif',
      args: ['-vf', 'fps=10,scale=480:-1:flags=lanczos'],
    },
  ];

  /**
   * 分辨率选项数组 - 视频压缩时可选择的分辨率
   * 从原始到360p共5种选项
   */
  private readonly resolutionOptions: ResolutionOption[] = [
    { label: '原始', width: -1, height: -1 },
    { label: '1080p', width: 1920, height: 1080 },
    { label: '720p', width: 1280, height: 720 },
    { label: '480p', width: 854, height: 480 },
    { label: '360p', width: 640, height: 360 },
  ];

  /**
   * 音频提取格式选项数组 - 定义4种音频输出格式
   */
  private readonly audioFormatOptions: AudioFormatOption[] = [
    {
      label: 'MP3',
      ext: 'mp3',
      mimeType: 'audio/mpeg',
      args: ['-vn', '-acodec', 'libmp3lame', '-q:a', '2'],
    },
    {
      label: 'AAC',
      ext: 'aac',
      mimeType: 'audio/aac',
      args: ['-vn', '-acodec', 'aac'],
    },
    {
      label: 'WAV',
      ext: 'wav',
      mimeType: 'audio/wav',
      args: ['-vn', '-acodec', 'pcm_s16le'],
    },
    {
      label: 'FLAC',
      ext: 'flac',
      mimeType: 'audio/flac',
      args: ['-vn', '-acodec', 'flac'],
    },
  ];

  /**
   * 截图格式选项数组 - 定义2种截图输出格式
   */
  private readonly screenshotFormatOptions: ScreenshotFormatOption[] = [
    { label: 'PNG', ext: 'png', mimeType: 'image/png' },
    { label: 'JPEG', ext: 'jpg', mimeType: 'image/jpeg' },
  ];

  /**
   * 构造函数 - 初始化视频工具应用程序
   *
   * @param wm - WindowManager实例，用于创建和管理视频工具窗口
   */
  constructor(wm: WindowManager) {
    this.wm = wm;
    /* 获取FFmpegLoader单例，用于后续加载FFmpeg核心和执行视频处理命令 */
    this.ffmpegLoader = FFmpegLoader.getInstance();
  }

  /**
   * 打开视频批量工具窗口
   *
   * 这个方法会：
   * 1. 调用buildHTML()构建工具的完整HTML结构（7个标签页）
   * 2. 通过WindowManager创建一个新的工具窗口
   * 3. 在窗口创建完成后绑定所有交互事件
   */
  open(): void {
    /* 构建工具的完整HTML内容 */
    const html = this.buildHTML();

    /* 通过WindowManager创建视频工具窗口 */
    this.wm.createWindow({
      id: 'video-tools',       /* 窗口唯一标识符 */
      title: '视频批量工具',    /* 窗口标题栏显示的文字 */
      icon: '🎬',              /* 窗口图标 */
      width: 700,              /* 窗口初始宽度 */
      height: 550,             /* 窗口初始高度 */
      content: html,           /* 窗口内部的HTML内容 */
      resizable: true,         /* 允许用户拖动调整窗口大小 */
      /* 窗口创建完成后的回调函数 */
      onCreated: (el: HTMLElement) => {
        this.bindEvents(el);   /* 绑定所有交互事件 */
        this.updateFFmpegStatus(el); /* 初始化FFmpeg状态显示 */
      },
    });
  }

  /**
   * 构建视频批量工具的完整HTML结构
   *
   * 界面布局（从上到下）：
   * 1. FFmpeg加载状态指示器
   * 2. 标签栏 - 7个标签按钮切换不同功能
   * 3. 标签内容区 - 7个功能面板（同时只显示一个）
   * 4. 状态栏 - 显示当前操作状态信息
   *
   * @returns 工具界面的完整HTML字符串
   */
  private buildHTML(): string {
    return `
      <div style="display:flex;flex-direction:column;height:100%;gap:4px;">
        <!-- ===== FFmpeg加载状态指示器 ===== -->
        <!-- 顶部显示FFmpeg核心的加载状态，首次使用需要点击加载 -->
        <div class="vt-ffmpeg-status" style="font-size:10px;padding:3px 6px;border:1px dashed var(--pc-dark-gray);background:rgba(255,255,255,0.03);display:flex;align-items:center;gap:6px;">
          <span class="vt-ffmpeg-text" style="color:var(--pc-gray);">FFmpeg 未加载</span>
          <button class="pc-btn vt-ffmpeg-load-btn" style="font-size:10px;padding:2px 8px;">加载FFmpeg核心 (~31MB)</button>
        </div>

        <!-- ===== 标签栏 ===== -->
        <!-- 7个标签按钮，用于切换不同功能面板 -->
        <div style="display:flex;gap:2px;flex-wrap:wrap;">
          ${this.tabs.map((tab, index) => `
            <!-- ${tab.name}标签按钮 -->
            <button class="pc-btn tab-btn" data-tab="${index}" style="flex:1;min-width:0;font-size:10px;padding:3px 4px;">[${tab.name}]</button>
          `).join('')}
        </div>

        <!-- ===== 标签1: 格式转换面板 ===== -->
        <div class="vt-panel vt-panel-convert" style="flex:1;display:flex;flex-direction:column;gap:4px;overflow:hidden;">
          <!-- 文件上传区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <!-- 上传按钮 -->
            <button class="pc-btn vt-upload-btn" style="font-size:11px;padding:3px 10px;">选择视频文件</button>
            <!-- 隐藏的文件输入框，multiple允许选择多个视频文件 -->
            <input type="file" class="vt-file-input" multiple accept="video/*" style="display:none;">
            <!-- 输出格式下拉选择框 -->
            <select class="pc-select vt-format-select" style="font-size:11px;padding:2px 4px;">
              ${this.formatOptions.map((opt, i) => `<option value="${i}">${opt.label}</option>`).join('')}
            </select>
          </div>
          <!-- 文件列表区域 - 深色背景，可滚动 -->
          <div class="vt-file-list" style="flex:1;overflow-y:auto;background:var(--pc-black);border:2px inset var(--pc-dark-gray);padding:4px;font-size:11px;min-height:50px;">
            <div class="vt-empty-hint" style="color:var(--pc-gray);text-align:center;padding:20px;">尚未选择视频文件</div>
          </div>
          <!-- 操作按钮区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn glow-btn vt-start-btn" style="font-size:11px;padding:3px 12px;">开始转换</button>
            <button class="pc-btn vt-clear-btn" style="font-size:11px;padding:3px 12px;">清空列表</button>
            <span class="vt-file-count" style="font-size:11px;color:var(--pc-gray);">已选 0 个文件</span>
          </div>
          <!-- 进度显示区域 -->
          <div class="vt-progress" style="font-size:11px;color:var(--pc-neon-green);padding:2px 4px;min-height:16px;"></div>
        </div>

        <!-- ===== 标签2: 视频压缩面板 ===== -->
        <div class="vt-panel vt-panel-compress" style="flex:1;display:none;flex-direction:column;gap:4px;overflow:hidden;">
          <!-- 文件上传区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn vt-upload-btn" style="font-size:11px;padding:3px 10px;">选择视频文件</button>
            <input type="file" class="vt-file-input" multiple accept="video/*" style="display:none;">
          </div>
          <!-- 文件列表区域 -->
          <div class="vt-file-list" style="flex:1;overflow-y:auto;background:var(--pc-black);border:2px inset var(--pc-dark-gray);padding:4px;font-size:11px;min-height:50px;">
            <div class="vt-empty-hint" style="color:var(--pc-gray);text-align:center;padding:20px;">尚未选择视频文件</div>
          </div>
          <!-- 压缩参数设置区域 -->
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:11px;">
            <!-- CRF值滑块 - 数值越大压缩越狠，范围18-35，默认23 -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--pc-gray);">CRF:</span>
              <input type="range" class="vt-crf-slider" min="18" max="35" value="23" style="width:80px;">
              <span class="vt-crf-value" style="color:var(--pc-neon-green);min-width:20px;">23</span>
            </div>
            <!-- 预设速度下拉选择 - 编码速度预设 -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--pc-gray);">预设:</span>
              <select class="pc-select vt-preset-select" style="font-size:11px;padding:2px 4px;">
                <option value="ultrafast">ultrafast</option>
                <option value="superfast">superfast</option>
                <option value="veryfast">veryfast</option>
                <option value="faster">faster</option>
                <option value="fast" selected>fast</option>
                <option value="medium">medium</option>
              </select>
            </div>
            <!-- 分辨率缩放下拉选择 -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--pc-gray);">分辨率:</span>
              <select class="pc-select vt-res-select" style="font-size:11px;padding:2px 4px;">
                ${this.resolutionOptions.map((opt) => `<option value="${opt.width}:${opt.height}">${opt.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <!-- 操作按钮区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn glow-btn vt-start-btn" style="font-size:11px;padding:3px 12px;">开始压缩</button>
            <button class="pc-btn vt-clear-btn" style="font-size:11px;padding:3px 12px;">清空列表</button>
            <span class="vt-file-count" style="font-size:11px;color:var(--pc-gray);">已选 0 个文件</span>
          </div>
          <!-- 进度显示区域 -->
          <div class="vt-progress" style="font-size:11px;color:var(--pc-neon-green);padding:2px 4px;min-height:16px;"></div>
        </div>

        <!-- ===== 标签3: 视频裁剪面板 ===== -->
        <div class="vt-panel vt-panel-trim" style="flex:1;display:none;flex-direction:column;gap:4px;overflow:hidden;">
          <!-- 文件上传区域 - 单选 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn vt-upload-btn" style="font-size:11px;padding:3px 10px;">选择视频文件</button>
            <input type="file" class="vt-file-input" accept="video/*" style="display:none;">
          </div>
          <!-- 文件列表区域 -->
          <div class="vt-file-list" style="flex:1;overflow-y:auto;background:var(--pc-black);border:2px inset var(--pc-dark-gray);padding:4px;font-size:11px;min-height:50px;">
            <div class="vt-empty-hint" style="color:var(--pc-gray);text-align:center;padding:20px;">尚未选择视频文件</div>
          </div>
          <!-- 裁剪时间参数设置区域 -->
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:11px;">
            <!-- 开始时间输入 -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--pc-gray);">开始时间:</span>
              <input type="text" class="pc-input vt-trim-start" placeholder="00:00:00" value="00:00:00" style="width:80px;font-size:11px;padding:2px 4px;">
            </div>
            <!-- 结束时间输入 -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--pc-gray);">结束时间:</span>
              <input type="text" class="pc-input vt-trim-end" placeholder="00:01:00" value="00:01:00" style="width:80px;font-size:11px;padding:2px 4px;">
            </div>
          </div>
          <!-- 操作按钮区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn glow-btn vt-start-btn" style="font-size:11px;padding:3px 12px;">开始裁剪</button>
            <button class="pc-btn vt-clear-btn" style="font-size:11px;padding:3px 12px;">清空列表</button>
            <span class="vt-file-count" style="font-size:11px;color:var(--pc-gray);">已选 0 个文件</span>
          </div>
          <!-- 进度显示区域 -->
          <div class="vt-progress" style="font-size:11px;color:var(--pc-neon-green);padding:2px 4px;min-height:16px;"></div>
        </div>

        <!-- ===== 标签4: 视频拼接面板 ===== -->
        <div class="vt-panel vt-panel-concat" style="flex:1;display:none;flex-direction:column;gap:4px;overflow:hidden;">
          <!-- 文件上传区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn vt-upload-btn" style="font-size:11px;padding:3px 10px;">选择视频文件</button>
            <input type="file" class="vt-file-input" multiple accept="video/*" style="display:none;">
          </div>
          <!-- 文件列表区域 - 带排序功能 -->
          <div class="vt-file-list" style="flex:1;overflow-y:auto;background:var(--pc-black);border:2px inset var(--pc-dark-gray);padding:4px;font-size:11px;min-height:50px;">
            <div class="vt-empty-hint" style="color:var(--pc-gray);text-align:center;padding:20px;">尚未选择视频文件</div>
          </div>
          <!-- 操作按钮区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn glow-btn vt-start-btn" style="font-size:11px;padding:3px 12px;">开始拼接</button>
            <button class="pc-btn vt-clear-btn" style="font-size:11px;padding:3px 12px;">清空列表</button>
            <span class="vt-file-count" style="font-size:11px;color:var(--pc-gray);">已选 0 个文件</span>
          </div>
          <!-- 进度显示区域 -->
          <div class="vt-progress" style="font-size:11px;color:var(--pc-neon-green);padding:2px 4px;min-height:16px;"></div>
        </div>

        <!-- ===== 标签5: 提取音频面板 ===== -->
        <div class="vt-panel vt-panel-extract-audio" style="flex:1;display:none;flex-direction:column;gap:4px;overflow:hidden;">
          <!-- 文件上传区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn vt-upload-btn" style="font-size:11px;padding:3px 10px;">选择视频文件</button>
            <input type="file" class="vt-file-input" multiple accept="video/*" style="display:none;">
            <!-- 音频输出格式下拉选择 -->
            <select class="pc-select vt-audio-format-select" style="font-size:11px;padding:2px 4px;">
              ${this.audioFormatOptions.map((opt, i) => `<option value="${i}">${opt.label}</option>`).join('')}
            </select>
          </div>
          <!-- 文件列表区域 -->
          <div class="vt-file-list" style="flex:1;overflow-y:auto;background:var(--pc-black);border:2px inset var(--pc-dark-gray);padding:4px;font-size:11px;min-height:50px;">
            <div class="vt-empty-hint" style="color:var(--pc-gray);text-align:center;padding:20px;">尚未选择视频文件</div>
          </div>
          <!-- 操作按钮区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn glow-btn vt-start-btn" style="font-size:11px;padding:3px 12px;">开始提取</button>
            <button class="pc-btn vt-clear-btn" style="font-size:11px;padding:3px 12px;">清空列表</button>
            <span class="vt-file-count" style="font-size:11px;color:var(--pc-gray);">已选 0 个文件</span>
          </div>
          <!-- 进度显示区域 -->
          <div class="vt-progress" style="font-size:11px;color:var(--pc-neon-green);padding:2px 4px;min-height:16px;"></div>
        </div>

        <!-- ===== 标签6: 视频截图面板 ===== -->
        <div class="vt-panel vt-panel-screenshot" style="flex:1;display:none;flex-direction:column;gap:4px;overflow:hidden;">
          <!-- 文件上传区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn vt-upload-btn" style="font-size:11px;padding:3px 10px;">选择视频文件</button>
            <input type="file" class="vt-file-input" multiple accept="video/*" style="display:none;">
            <!-- 截图输出格式选择 -->
            <select class="pc-select vt-screenshot-format-select" style="font-size:11px;padding:2px 4px;">
              ${this.screenshotFormatOptions.map((opt, i) => `<option value="${i}">${opt.label}</option>`).join('')}
            </select>
          </div>
          <!-- 文件列表区域 -->
          <div class="vt-file-list" style="flex:1;overflow-y:auto;background:var(--pc-black);border:2px inset var(--pc-dark-gray);padding:4px;font-size:11px;min-height:50px;">
            <div class="vt-empty-hint" style="color:var(--pc-gray);text-align:center;padding:20px;">尚未选择视频文件</div>
          </div>
          <!-- 截图参数设置区域 -->
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:11px;">
            <!-- 截图时间输入 -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--pc-gray);">截图时间:</span>
              <input type="text" class="pc-input vt-screenshot-time" placeholder="00:00:01" value="00:00:01" style="width:80px;font-size:11px;padding:2px 4px;">
            </div>
            <!-- 每N秒截一张（可选） -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--pc-gray);">每N秒截一张:</span>
              <input type="number" class="pc-input vt-screenshot-interval" placeholder="留空=只截一张" min="1" style="width:60px;font-size:11px;padding:2px 4px;">
            </div>
          </div>
          <!-- 操作按钮区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn glow-btn vt-start-btn" style="font-size:11px;padding:3px 12px;">开始截图</button>
            <button class="pc-btn vt-clear-btn" style="font-size:11px;padding:3px 12px;">清空列表</button>
            <span class="vt-file-count" style="font-size:11px;color:var(--pc-gray);">已选 0 个文件</span>
          </div>
          <!-- 进度显示区域 -->
          <div class="vt-progress" style="font-size:11px;color:var(--pc-neon-green);padding:2px 4px;min-height:16px;"></div>
        </div>

        <!-- ===== 标签7: 视频转GIF面板 ===== -->
        <div class="vt-panel vt-panel-to-gif" style="flex:1;display:none;flex-direction:column;gap:4px;overflow:hidden;">
          <!-- 文件上传区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn vt-upload-btn" style="font-size:11px;padding:3px 10px;">选择视频文件</button>
            <input type="file" class="vt-file-input" multiple accept="video/*" style="display:none;">
          </div>
          <!-- 文件列表区域 -->
          <div class="vt-file-list" style="flex:1;overflow-y:auto;background:var(--pc-black);border:2px inset var(--pc-dark-gray);padding:4px;font-size:11px;min-height:50px;">
            <div class="vt-empty-hint" style="color:var(--pc-gray);text-align:center;padding:20px;">尚未选择视频文件</div>
          </div>
          <!-- GIF参数设置区域 -->
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:11px;">
            <!-- 帧率设置 -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--pc-gray);">帧率:</span>
              <input type="number" class="pc-input vt-gif-fps" value="10" min="1" max="30" style="width:50px;font-size:11px;padding:2px 4px;">
              <span style="color:var(--pc-gray);">fps</span>
            </div>
            <!-- 宽度设置 -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--pc-gray);">宽度:</span>
              <input type="number" class="pc-input vt-gif-width" value="480" min="100" max="1920" style="width:60px;font-size:11px;padding:2px 4px;">
              <span style="color:var(--pc-gray);">px</span>
            </div>
            <!-- 开始时间（可选） -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--pc-gray);">开始:</span>
              <input type="text" class="pc-input vt-gif-start" placeholder="00:00:00" style="width:70px;font-size:11px;padding:2px 4px;">
            </div>
            <!-- 结束时间（可选） -->
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--pc-gray);">结束:</span>
              <input type="text" class="pc-input vt-gif-end" placeholder="00:00:00" style="width:70px;font-size:11px;padding:2px 4px;">
            </div>
          </div>
          <!-- 操作按钮区域 -->
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="pc-btn glow-btn vt-start-btn" style="font-size:11px;padding:3px 12px;">开始转换</button>
            <button class="pc-btn vt-clear-btn" style="font-size:11px;padding:3px 12px;">清空列表</button>
            <span class="vt-file-count" style="font-size:11px;color:var(--pc-gray);">已选 0 个文件</span>
          </div>
          <!-- 进度显示区域 -->
          <div class="vt-progress" style="font-size:11px;color:var(--pc-neon-green);padding:2px 4px;min-height:16px;"></div>
        </div>

        <!-- ===== 状态栏 ===== -->
        <div class="status-bar">
          <span class="vt-status">就绪 - 请先加载FFmpeg核心</span>
        </div>
      </div>
    `;
  }

  /**
   * 绑定视频工具所有交互事件
   *
   * 这个方法负责绑定以下交互：
   * 1. FFmpeg加载按钮事件
   * 2. 标签栏切换事件（7个标签页）
   * 3. 各标签页的文件上传、开始处理、清空列表事件
   * 4. 压缩面板的CRF滑块实时数值更新
   * 5. 拼接面板的文件排序按钮事件
   *
   * @param el - 视频工具窗口的根HTML元素
   */
  private bindEvents(el: HTMLElement): void {
    /* ===== FFmpeg加载按钮事件 ===== */
    const ffmpegLoadBtn = el.querySelector('.vt-ffmpeg-load-btn');
    ffmpegLoadBtn?.addEventListener('click', () => {
      this.loadFFmpeg(el);
    });

    /* ===== 标签栏切换事件 ===== */
    const tabBtns = el.querySelectorAll('.tab-btn');
    /* 遍历所有标签按钮，为每个按钮绑定点击切换事件 */
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        /* 从按钮的data-tab属性获取标签索引（0-6） */
        const tabIndex = parseInt((btn as HTMLElement).dataset.tab || '0', 10);
        this.switchTab(el, tabIndex);
      });
    });

    /* ===== 为每个面板绑定文件上传、开始、清空事件 ===== */
    /* 遍历所有标签页配置，逐个绑定对应面板的事件 */
    this.tabs.forEach((tab, index) => {
      /* 获取当前标签页对应的面板元素 */
      const panel = el.querySelector(`.${tab.panelClass}`);
      if (!panel) return;

      /* --- 文件上传按钮和隐藏input的联动 --- */
      const uploadBtn = panel.querySelector('.vt-upload-btn');
      const fileInput = panel.querySelector('.vt-file-input') as HTMLInputElement;
      if (uploadBtn && fileInput) {
        /* 点击上传按钮时触发隐藏input的click，打开文件选择对话框 */
        uploadBtn.addEventListener('click', () => {
          fileInput.click();
        });
        /* 文件选择完成后，将文件添加到对应标签页的文件列表 */
        fileInput.addEventListener('change', () => {
          this.addFilesFromInput(fileInput, el, index);
        });
      }

      /* --- 开始处理按钮事件 --- */
      const startBtn = panel.querySelector('.vt-start-btn');
      startBtn?.addEventListener('click', () => {
        this.startProcessing(el, index);
      });

      /* --- 清空列表按钮事件 --- */
      const clearBtn = panel.querySelector('.vt-clear-btn');
      clearBtn?.addEventListener('click', () => {
        this.clearFiles(el, index);
      });
    });

    /* ===== 压缩面板 - CRF滑块实时数值更新 ===== */
    const compressPanel = el.querySelector('.vt-panel-compress');
    if (compressPanel) {
      const crfSlider = compressPanel.querySelector('.vt-crf-slider') as HTMLInputElement;
      const crfValue = compressPanel.querySelector('.vt-crf-value') as HTMLElement;
      /* 监听滑块输入事件，实时更新CRF数值显示 */
      crfSlider?.addEventListener('input', () => {
        if (crfValue) {
          crfValue.textContent = crfSlider.value;
        }
      });
    }

    /* ===== 拼接面板 - 文件排序（上下移动）事件 ===== */
    /* 排序按钮在渲染文件列表时动态绑定（见renderConcatFileList方法） */
  }

  /**
   * 加载FFmpeg核心
   *
   * 调用FFmpegLoader的load方法从CDN下载并初始化FFmpeg WebAssembly核心。
   * 加载过程中更新界面状态显示，加载完成后启用所有操作按钮。
   *
   * @param el - 工具窗口的根HTML元素
   */
  private async loadFFmpeg(el: HTMLElement): Promise<void> {
    const statusText = el.querySelector('.vt-ffmpeg-text') as HTMLElement;
    const loadBtn = el.querySelector('.vt-ffmpeg-load-btn') as HTMLElement;

    /* 如果已经在加载中或已就绪，不重复加载 */
    const currentStatus = this.ffmpegLoader.getStatus();
    if (currentStatus === FFmpegLoadingStatus.LOADING || currentStatus === FFmpegLoadingStatus.READY) {
      return;
    }

    /* 更新状态显示为加载中 */
    if (statusText) {
      statusText.textContent = '正在加载FFmpeg核心，请稍候...';
      (statusText as HTMLElement).style.color = 'var(--pc-neon-yellow)';
    }
    /* 隐藏加载按钮，防止重复点击 */
    if (loadBtn) {
      (loadBtn as HTMLElement).style.display = 'none';
    }

    try {
      /* 调用FFmpegLoader执行加载 */
      await this.ffmpegLoader.load();
      /* 加载成功，更新状态显示 */
      if (statusText) {
        statusText.textContent = 'FFmpeg就绪';
        (statusText as HTMLElement).style.color = 'var(--pc-neon-green)';
      }
      this.updateStatus(el, 'FFmpeg加载完成，可以开始处理视频');
    } catch (err) {
      /* 加载失败，显示错误信息 */
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (statusText) {
        statusText.textContent = `FFmpeg加载失败: ${errorMsg}`;
        (statusText as HTMLElement).style.color = 'var(--pc-hot-pink)';
      }
      /* 重新显示加载按钮，允许用户重试 */
      if (loadBtn) {
        (loadBtn as HTMLElement).style.display = '';
      }
      this.updateStatus(el, 'FFmpeg加载失败，请重试');
    }
  }

  /**
   * 更新FFmpeg状态指示器的显示
   *
   * 根据FFmpegLoader当前的状态更新界面上的文字和颜色。
   * 在窗口初始化时调用，用于同步已加载的FFmpeg状态。
   *
   * @param el - 工具窗口的根HTML元素
   */
  private updateFFmpegStatus(el: HTMLElement): void {
    const statusText = el.querySelector('.vt-ffmpeg-text') as HTMLElement;
    const loadBtn = el.querySelector('.vt-ffmpeg-load-btn') as HTMLElement;
    const status = this.ffmpegLoader.getStatus();

    if (!statusText) return;

    /* 根据FFmpeg的加载状态设置不同的显示文字和颜色 */
    switch (status) {
      case FFmpegLoadingStatus.READY:
        /* 已就绪 - 绿色显示，隐藏加载按钮 */
        statusText.textContent = 'FFmpeg就绪';
        (statusText as HTMLElement).style.color = 'var(--pc-neon-green)';
        if (loadBtn) (loadBtn as HTMLElement).style.display = 'none';
        break;
      case FFmpegLoadingStatus.LOADING:
        /* 加载中 - 黄色显示，隐藏加载按钮 */
        statusText.textContent = '正在加载FFmpeg核心...';
        (statusText as HTMLElement).style.color = 'var(--pc-neon-yellow)';
        if (loadBtn) (loadBtn as HTMLElement).style.display = 'none';
        break;
      case FFmpegLoadingStatus.ERROR:
        /* 加载失败 - 粉红色显示，显示加载按钮允许重试 */
        statusText.textContent = 'FFmpeg加载失败，点击重试';
        (statusText as HTMLElement).style.color = 'var(--pc-hot-pink)';
        if (loadBtn) (loadBtn as HTMLElement).style.display = '';
        break;
      default:
        /* 未加载 - 灰色显示，显示加载按钮 */
        statusText.textContent = 'FFmpeg 未加载';
        (statusText as HTMLElement).style.color = 'var(--pc-gray)';
        break;
    }
  }

  /**
   * 切换标签页 - 在7个功能面板之间切换显示
   *
   * 切换逻辑：
   * 1. 更新标签按钮的视觉状态（选中的标签高亮，未选中的恢复默认）
   * 2. 隐藏所有面板，只显示当前选中的面板
   * 3. 更新内部记录的当前标签索引
   * 4. 更新状态栏文字
   *
   * @param el - 工具窗口的根HTML元素
   * @param tabIndex - 要切换到的标签索引（0-6）
   */
  private switchTab(el: HTMLElement, tabIndex: number): void {
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

    /* 更新状态栏文字 */
    const tabName = this.tabs[tabIndex]?.name || '未知';
    this.updateStatus(el, `当前: ${tabName}`);
  }

  /**
   * 获取指定标签页对应的文件列表数组引用
   *
   * 根据标签页索引返回对应的文件数组，用于添加、渲染、清空文件操作。
   *
   * @param tabIndex - 标签页索引（0-6）
   * @returns 对应标签页的文件列表数组
   */
  private getFileList(tabIndex: number): VideoFileInfo[] {
    switch (tabIndex) {
      case 0: return this.convertFiles;       /* 格式转换 */
      case 1: return this.compressFiles;      /* 视频压缩 */
      case 2: return this.trimFiles;          /* 视频裁剪 */
      case 3: return this.concatFiles;        /* 视频拼接 */
      case 4: return this.extractAudioFiles;   /* 提取音频 */
      case 5: return this.screenshotFiles;     /* 视频截图 */
      case 6: return this.toGifFiles;         /* 视频转GIF */
      default: return [];                     /* 未知标签，返回空数组 */
    }
  }

  /**
   * 从文件输入框中读取用户选择的文件，添加到对应标签页的文件列表
   *
   * 处理逻辑：
   * 1. 从HTMLInputElement的files属性获取用户选择的FileList
   * 2. 将每个文件的信息存入VideoFileInfo对象
   * 3. 将VideoFileInfo对象追加到对应标签页的文件数组中
   * 4. 更新界面上的文件列表显示和文件计数
   * 5. 清空input的value以便下次选择相同文件时仍能触发change事件
   *
   * @param input - 文件输入框元素
   * @param el - 工具窗口的根HTML元素
   * @param tabIndex - 标签页索引
   */
  private addFilesFromInput(input: HTMLInputElement, el: HTMLElement, tabIndex: number): void {
    /* 如果用户没有选择任何文件（例如点了取消），则直接返回 */
    if (!input.files || input.files.length === 0) return;

    /* 获取对应标签页的文件列表数组 */
    const fileList = this.getFileList(tabIndex);

    /* 遍历用户选择的所有文件，逐个添加到文件列表 */
    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];

      /* 创建视频文件信息对象，保存文件的基本信息 */
      const info: VideoFileInfo = {
        file: file,                   /* 原始File对象，后续FFmpeg处理时需要用到 */
        name: file.name,              /* 文件名，如"我的视频.mp4" */
        size: file.size,              /* 文件大小（字节） */
        type: file.type || '未知',    /* MIME类型，部分文件可能为空 */
      };

      /* 将文件信息添加到列表数组中 */
      fileList.push(info);
    }

    /* 更新界面上的文件列表显示 */
    this.renderFileList(el, tabIndex);

    /* 清空input的value，这样用户下次选择相同文件时也能触发change事件 */
    input.value = '';
  }

  /**
   * 渲染文件列表到界面上
   *
   * 将文件数组中的每个文件信息格式化为一行显示，包含：
   * - 序号
   * - 文件名（粉色高亮）
   * - 文件大小（蓝色）
   *
   * 拼接面板额外显示上下移动按钮用于调整文件顺序。
   * 如果列表为空，则显示"尚未选择视频文件"的提示文字。
   *
   * @param el - 工具窗口的根HTML元素
   * @param tabIndex - 标签页索引
   */
  private renderFileList(el: HTMLElement, tabIndex: number): void {
    /* 获取对应面板的DOM元素 */
    const panelClass = this.tabs[tabIndex]?.panelClass || '';
    const panel = el.querySelector(`.${panelClass}`) as HTMLElement;
    if (!panel) return;

    /* 获取文件列表容器和文件计数显示元素 */
    const listEl = panel.querySelector('.vt-file-list') as HTMLElement;
    const countEl = panel.querySelector('.vt-file-count') as HTMLElement;
    const fileList = this.getFileList(tabIndex);

    if (!listEl) return;

    /* 如果文件列表为空，显示提示文字 */
    if (fileList.length === 0) {
      listEl.innerHTML = `<div class="vt-empty-hint" style="color:var(--pc-gray);text-align:center;padding:20px;">尚未选择视频文件</div>`;
      if (countEl) countEl.textContent = '已选 0 个文件';
      return;
    }

    /* 如果是拼接面板（索引3），渲染带排序按钮的文件列表 */
    if (tabIndex === 3) {
      this.renderConcatFileList(el, listEl, countEl, fileList);
      return;
    }

    /* 遍历文件数组，为每个文件生成一行HTML */
    const html = fileList
      .map((info, index) => {
        /* 格式化文件大小为可读的字符串 */
        const sizeStr = this.formatFileSize(info.size);
        return `
          <div style="padding:3px 4px;border-bottom:1px solid var(--pc-dark-gray);display:flex;gap:8px;align-items:center;">
            <!-- 序号 -->
            <span style="color:var(--pc-gray);min-width:24px;">${index + 1}.</span>
            <!-- 文件名，粉色高亮 -->
            <span style="color:var(--pc-pink);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${info.name}">${info.name}</span>
            <!-- 文件大小，蓝色 -->
            <span style="color:var(--pc-neon-blue);min-width:60px;text-align:right;">${sizeStr}</span>
          </div>
        `;
      })
      .join('');

    /* 将生成的HTML插入到文件列表容器中 */
    listEl.innerHTML = html;

    /* 更新文件计数显示 */
    if (countEl) countEl.textContent = `已选 ${fileList.length} 个文件`;
  }

  /**
   * 渲染拼接面板的文件列表（带上下移动排序按钮）
   *
   * 在拼接面板中，文件列表每行额外显示"上移"和"下移"按钮，
   * 用户可以通过点击按钮调整视频的拼接顺序。
   *
   * @param el - 工具窗口的根HTML元素
   * @param listEl - 文件列表容器DOM元素
   * @param countEl - 文件计数显示DOM元素
   * @param fileList - 文件列表数组
   */
  private renderConcatFileList(el: HTMLElement, listEl: HTMLElement, countEl: HTMLElement | null, fileList: VideoFileInfo[]): void {
    /* 遍历文件数组，为每个文件生成一行带排序按钮的HTML */
    const html = fileList
      .map((info, index) => {
        const sizeStr = this.formatFileSize(info.size);
        return `
          <div style="padding:3px 4px;border-bottom:1px solid var(--pc-dark-gray);display:flex;gap:4px;align-items:center;">
            <!-- 上移按钮 - 将文件在列表中向上移动一位 -->
            <button class="pc-btn vt-move-up" data-index="${index}" style="font-size:9px;padding:1px 4px;min-width:20px;" ${index === 0 ? 'disabled' : ''}>^</button>
            <!-- 下移按钮 - 将文件在列表中向下移动一位 -->
            <button class="pc-btn vt-move-down" data-index="${index}" style="font-size:9px;padding:1px 4px;min-width:20px;" ${index === fileList.length - 1 ? 'disabled' : ''}>v</button>
            <!-- 序号 -->
            <span style="color:var(--pc-gray);min-width:20px;">${index + 1}.</span>
            <!-- 文件名 -->
            <span style="color:var(--pc-pink);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${info.name}">${info.name}</span>
            <!-- 文件大小 -->
            <span style="color:var(--pc-neon-blue);min-width:60px;text-align:right;">${sizeStr}</span>
          </div>
        `;
      })
      .join('');

    listEl.innerHTML = html;
    if (countEl) countEl.textContent = `已选 ${fileList.length} 个文件`;

    /* 绑定上移按钮事件 */
    const upBtns = listEl.querySelectorAll('.vt-move-up');
    upBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        if (idx > 0) {
          /* 交换当前文件和上一个文件的位置 */
          const temp = this.concatFiles[idx];
          this.concatFiles[idx] = this.concatFiles[idx - 1];
          this.concatFiles[idx - 1] = temp;
          /* 重新渲染文件列表 */
          this.renderFileList(el, 3);
        }
      });
    });

    /* 绑定下移按钮事件 */
    const downBtns = listEl.querySelectorAll('.vt-move-down');
    downBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        if (idx < this.concatFiles.length - 1) {
          /* 交换当前文件和下一个文件的位置 */
          const temp = this.concatFiles[idx];
          this.concatFiles[idx] = this.concatFiles[idx + 1];
          this.concatFiles[idx + 1] = temp;
          /* 重新渲染文件列表 */
          this.renderFileList(el, 3);
        }
      });
    });
  }

  /**
   * 格式化文件大小为可读的字符串
   *
   * 根据文件字节数自动选择合适的单位：
   * - 大于1MB：显示为"XX.X MB"
   * - 大于1KB：显示为"XX.X KB"
   * - 小于1KB：显示字节数
   *
   * @param bytes - 文件大小（字节数）
   * @returns 格式化后的字符串，如"10.5 MB"
   */
  private formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      /* 大于1MB，转换为MB，保留1位小数 */
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      /* 大于1KB但小于1MB，转换为KB，保留1位小数 */
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      /* 小于1KB，直接显示字节数 */
      return `${bytes} B`;
    }
  }

  /**
   * 清空指定标签页的文件列表
   *
   * 清空文件数组并重新渲染空的文件列表到界面，同时清空进度显示。
   *
   * @param el - 工具窗口的根HTML元素
   * @param tabIndex - 标签页索引
   */
  private clearFiles(el: HTMLElement, tabIndex: number): void {
    /* 获取对应标签页的文件列表数组 */
    const fileList = this.getFileList(tabIndex);

    /* 清空文件数组中的所有元素 */
    fileList.length = 0;

    /* 重新渲染空的文件列表到界面 */
    this.renderFileList(el, tabIndex);

    /* 获取对应面板 */
    const panelClass = this.tabs[tabIndex]?.panelClass || '';
    const panel = el.querySelector(`.${panelClass}`) as HTMLElement;

    /* 清空进度显示区域 */
    const progressEl = panel?.querySelector('.vt-progress') as HTMLElement;
    if (progressEl) progressEl.textContent = '';

    /* 更新状态栏 */
    const tabName = this.tabs[tabIndex]?.name || '未知';
    this.updateStatus(el, `已清空 - ${tabName}`);
  }

  /**
   * 更新指定面板的进度显示文字
   *
   * @param el - 工具窗口的根HTML元素
   * @param tabIndex - 标签页索引
   * @param text - 要显示的进度文字
   */
  private updateProgressByTab(el: HTMLElement, tabIndex: number, text: string): void {
    /* 获取对应面板中的进度元素 */
    const panelClass = this.tabs[tabIndex]?.panelClass || '';
    const progressEl = el.querySelector(`.${panelClass} .vt-progress`) as HTMLElement;
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
    const statusEl = el.querySelector('.vt-status') as HTMLElement;
    if (statusEl) {
      statusEl.textContent = text;
    }
  }

  /**
   * 确保FFmpeg已加载，未加载则提示用户
   *
   * 在执行任何视频处理操作前调用，检查FFmpeg是否已就绪。
   * 如果未加载，更新进度区域显示提示信息。
   *
   * @param el - 工具窗口的根HTML元素
   * @param tabIndex - 当前标签页索引
   * @returns FFmpeg是否已就绪
   */
  private ensureFFmpegReady(el: HTMLElement, tabIndex: number): boolean {
    if (this.ffmpegLoader.getStatus() !== FFmpegLoadingStatus.READY) {
      this.updateProgressByTab(el, tabIndex, '请先加载FFmpeg核心（点击顶部"加载FFmpeg核心"按钮）');
      return false;
    }
    return true;
  }

  /**
   * 根据标签页索引启动对应的视频处理流程
   *
   * 这是所有"开始处理"按钮的统一入口。
   * 根据当前标签页索引，调用不同的处理方法：
   * 0-格式转换, 1-视频压缩, 2-视频裁剪, 3-视频拼接,
   * 4-提取音频, 5-视频截图, 6-视频转GIF
   *
   * @param el - 工具窗口的根HTML元素
   * @param tabIndex - 标签页索引
   */
  private async startProcessing(el: HTMLElement, tabIndex: number): Promise<void> {
    /* 检查是否正在处理中，防止重复点击 */
    if (this.isProcessing) {
      this.updateProgressByTab(el, tabIndex, '正在处理中，请等待...');
      return;
    }

    /* 检查FFmpeg是否已加载 */
    if (!this.ensureFFmpegReady(el, tabIndex)) return;

    /* 获取对应标签页的文件列表 */
    const fileList = this.getFileList(tabIndex);

    /* 检查是否有文件需要处理 */
    if (fileList.length === 0) {
      this.updateProgressByTab(el, tabIndex, '请先选择视频文件！');
      return;
    }

    /* 标记为正在处理 */
    this.isProcessing = true;

    try {
      /* 根据标签页索引调用对应的处理方法 */
      switch (tabIndex) {
        case 0:
          /* 标签0: 格式转换 */
          await this.processFormatConvert(el, fileList);
          break;
        case 1:
          /* 标签1: 视频压缩 */
          await this.processCompress(el, fileList);
          break;
        case 2:
          /* 标签2: 视频裁剪 */
          await this.processTrim(el, fileList);
          break;
        case 3:
          /* 标签3: 视频拼接 */
          await this.processConcat(el, fileList);
          break;
        case 4:
          /* 标签4: 提取音频 */
          await this.processExtractAudio(el, fileList);
          break;
        case 5:
          /* 标签5: 视频截图 */
          await this.processScreenshot(el, fileList);
          break;
        case 6:
          /* 标签6: 视频转GIF */
          await this.processToGif(el, fileList);
          break;
      }
    } catch (err) {
      /* 处理过程中发生未捕获的错误 */
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.updateProgressByTab(el, tabIndex, `处理出错: ${errorMsg}`);
    }

    /* 处理结束，取消处理中标记 */
    this.isProcessing = false;
  }

  /**
   * 生成输出文件名 - 将原始文件名的扩展名替换为目标格式扩展名
   *
   * 例如："我的视频.mp4" + ext="webm" => "我的视频.webm"
   * 如果文件名没有扩展名，则在末尾追加
   *
   * @param originalName - 原始文件名
   * @param ext - 目标扩展名（不含点号）
   * @returns 替换扩展名后的新文件名
   */
  private generateOutputName(originalName: string, ext: string): string {
    /* 使用正则表达式匹配最后一个点号及后面的扩展名，替换为目标扩展名 */
    return originalName.replace(/\.[^.]+$/, '') + '.' + ext;
  }

  /**
   * 处理标签0：格式转换 - 批量将视频文件转换为目标格式
   *
   * 支持的输出格式：MP4(H.264), WebM(VP8), AVI, MOV, MKV, GIF
   * 逐个处理文件，每个文件处理后自动触发下载。
   *
   * @param el - 工具窗口的根HTML元素
   * @param fileList - 待处理的文件列表
   */
  private async processFormatConvert(el: HTMLElement, fileList: VideoFileInfo[]): Promise<void> {
    const tabIndex = 0;

    /* 获取用户选择的输出格式 */
    const panel = el.querySelector('.vt-panel-convert') as HTMLElement;
    const formatSelect = panel?.querySelector('.vt-format-select') as HTMLSelectElement;
    const formatIndex = formatSelect ? parseInt(formatSelect.value, 10) : 0;
    const formatOption = this.formatOptions[formatIndex];

    this.updateStatus(el, `开始批量格式转换 (${formatOption.label})...`);

    /* 逐个处理文件 */
    for (let i = 0; i < fileList.length; i++) {
      const fileInfo = fileList[i];
      const inputName = 'input' + i + '.' + this.getExtFromName(fileInfo.name);
      const outputName = 'output' + i + '.' + formatOption.ext;

      /* 显示进度：[序号/总数] 正在处理: 文件名 */
      this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 正在转换: ${fileInfo.name}`);

      try {
        /* 将输入文件写入FFmpeg虚拟文件系统 */
        await this.ffmpegLoader.writeFile(inputName, fileInfo.file);

        /* 构建FFmpeg命令：-i 输入文件 + 格式编码参数 + 输出文件 */
        const args: string[] = ['-i', inputName, ...formatOption.args, outputName];
        await this.ffmpegLoader.exec(args);

        /* 生成下载用的文件名 */
        const downloadName = this.generateOutputName(fileInfo.name, formatOption.ext);

        /* 读取处理结果并触发下载 */
        await this.ffmpegLoader.readFile(outputName);
        this.ffmpegLoader.downloadFile(outputName, formatOption.mimeType, downloadName);

        /* 清理虚拟文件系统中的临时文件 */
        await this.ffmpegLoader.deleteFile(inputName);
        await this.ffmpegLoader.deleteFile(outputName);

        /* 单个文件处理成功 */
        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 完成: ${fileInfo.name}`);
      } catch (err) {
        /* 单个文件处理失败，显示错误但继续处理下一个 */
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 失败: ${fileInfo.name} - ${errorMsg}`);
      }
    }

    /* 全部处理完成 */
    this.updateProgressByTab(el, tabIndex, `全部完成！共处理 ${fileList.length} 个文件。`);
    this.updateStatus(el, '批量格式转换完成');
  }

  /**
   * 处理标签1：视频压缩 - 批量压缩视频文件
   *
   * 使用H.264编码器的CRF值控制质量，preset控制编码速度，
   * 可选缩放分辨率来进一步减小文件大小。
   *
   * FFmpeg命令模板：
   * -i input -c:v libx264 -crf {crf} -preset {preset} -vf scale={w}:{h} -c:a aac output.mp4
   *
   * @param el - 工具窗口的根HTML元素
   * @param fileList - 待处理的文件列表
   */
  private async processCompress(el: HTMLElement, fileList: VideoFileInfo[]): Promise<void> {
    const tabIndex = 1;

    /* 获取压缩面板中的参数控件 */
    const panel = el.querySelector('.vt-panel-compress') as HTMLElement;
    const crfSlider = panel?.querySelector('.vt-crf-slider') as HTMLInputElement;
    const presetSelect = panel?.querySelector('.vt-preset-select') as HTMLSelectElement;
    const resSelect = panel?.querySelector('.vt-res-select') as HTMLSelectElement;

    /* 读取用户设置的压缩参数 */
    const crf = crfSlider ? parseInt(crfSlider.value, 10) : 23;
    const preset = presetSelect ? presetSelect.value : 'fast';
    const resValue = resSelect ? resSelect.value : '-1:-1';

    /* 解析分辨率值 */
    const [resW, resH] = resValue.split(':').map(Number);
    const width = resW;
    const height = resH;

    this.updateStatus(el, `开始批量压缩 (CRF:${crf}, ${preset}, ${resSelect?.selectedOptions[0]?.text || '原始'})...`);

    /* 逐个处理文件 */
    for (let i = 0; i < fileList.length; i++) {
      const fileInfo = fileList[i];
      const inputName = 'input' + i + '.' + this.getExtFromName(fileInfo.name);
      const outputName = 'output' + i + '.mp4';

      this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 正在压缩: ${fileInfo.name}`);

      try {
        /* 写入输入文件 */
        await this.ffmpegLoader.writeFile(inputName, fileInfo.file);

        /* 构建FFmpeg命令参数 */
        const args: string[] = ['-i', inputName, '-c:v', 'libx264', '-crf', String(crf), '-preset', preset];

        /* 如果分辨率不是原始（-1:-1），添加缩放滤镜 */
        if (width > 0 && height > 0) {
          args.push('-vf', `scale=${width}:${height}`);
        }

        /* 添加音频编码参数和输出文件名 */
        args.push('-c:a', 'aac', outputName);

        /* 执行FFmpeg命令 */
        await this.ffmpegLoader.exec(args);

        /* 生成下载文件名（在原文件名后加_compressed） */
        const downloadName = this.generateOutputName(fileInfo.name, 'mp4').replace(/\.(mp4)$/i, '_compressed.$1');

        /* 下载结果 */
        await this.ffmpegLoader.readFile(outputName);
        this.ffmpegLoader.downloadFile(outputName, 'video/mp4', downloadName);

        /* 清理临时文件 */
        await this.ffmpegLoader.deleteFile(inputName);
        await this.ffmpegLoader.deleteFile(outputName);

        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 完成: ${fileInfo.name}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 失败: ${fileInfo.name} - ${errorMsg}`);
      }
    }

    this.updateProgressByTab(el, tabIndex, `全部完成！共处理 ${fileList.length} 个文件。`);
    this.updateStatus(el, '批量压缩完成');
  }

  /**
   * 处理标签2：视频裁剪 - 按时间裁剪视频片段
   *
   * 使用FFmpeg的-ss和-to参数按时间裁剪视频，
   * -c copy表示直接复制流（不重新编码，速度快）。
   *
   * FFmpeg命令：-i input -ss {start} -to {end} -c copy output.mp4
   *
   * @param el - 工具窗口的根HTML元素
   * @param fileList - 待处理的文件列表（单个文件）
   */
  private async processTrim(el: HTMLElement, fileList: VideoFileInfo[]): Promise<void> {
    const tabIndex = 2;

    /* 获取用户输入的开始和结束时间 */
    const panel = el.querySelector('.vt-panel-trim') as HTMLElement;
    const startTime = (panel?.querySelector('.vt-trim-start') as HTMLInputElement)?.value || '00:00:00';
    const endTime = (panel?.querySelector('.vt-trim-end') as HTMLInputElement)?.value || '00:01:00';

    /* 验证时间格式 */
    if (!this.isValidTimeFormat(startTime) || !this.isValidTimeFormat(endTime)) {
      this.updateProgressByTab(el, tabIndex, '时间格式错误！请使用 HH:MM:SS 格式');
      return;
    }

    this.updateStatus(el, `开始裁剪 (${startTime} - ${endTime})...`);

    /* 逐个处理文件（虽然裁剪通常只处理单个文件，但这里支持批量） */
    for (let i = 0; i < fileList.length; i++) {
      const fileInfo = fileList[i];
      const inputName = 'input' + i + '.' + this.getExtFromName(fileInfo.name);
      const outputName = 'output' + i + '.mp4';

      this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 正在裁剪: ${fileInfo.name}`);

      try {
        /* 写入输入文件 */
        await this.ffmpegLoader.writeFile(inputName, fileInfo.file);

        /* 构建裁剪命令：-i输入 -ss开始时间 -to结束时间 -c copy直接复制流 */
        const args: string[] = ['-i', inputName, '-ss', startTime, '-to', endTime, '-c', 'copy', outputName];
        await this.ffmpegLoader.exec(args);

        /* 生成下载文件名（在原文件名后加_trimmed） */
        const downloadName = this.generateOutputName(fileInfo.name, 'mp4').replace(/\.(mp4)$/i, '_trimmed.$1');

        /* 下载结果 */
        await this.ffmpegLoader.readFile(outputName);
        this.ffmpegLoader.downloadFile(outputName, 'video/mp4', downloadName);

        /* 清理临时文件 */
        await this.ffmpegLoader.deleteFile(inputName);
        await this.ffmpegLoader.deleteFile(outputName);

        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 完成: ${fileInfo.name}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 失败: ${fileInfo.name} - ${errorMsg}`);
      }
    }

    this.updateProgressByTab(el, tabIndex, `全部完成！共处理 ${fileList.length} 个文件。`);
    this.updateStatus(el, '视频裁剪完成');
  }

  /**
   * 处理标签3：视频拼接 - 将多个视频按顺序拼接为一个
   *
   * 使用FFmpeg的concat demuxer方式拼接视频：
   * 1. 创建一个文本文件列出所有输入视频
   * 2. 使用concat协议按顺序拼接
   *
   * @param el - 工具窗口的根HTML元素
   * @param fileList - 待拼接的文件列表（按当前排序顺序）
   */
  private async processConcat(el: HTMLElement, fileList: VideoFileInfo[]): Promise<void> {
    const tabIndex = 3;

    if (fileList.length < 2) {
      this.updateProgressByTab(el, tabIndex, '请至少选择2个视频文件进行拼接！');
      return;
    }

    this.updateStatus(el, `开始拼接 ${fileList.length} 个视频...`);
    this.updateProgressByTab(el, tabIndex, '正在写入文件到FFmpeg...');

    try {
      /* 将所有输入文件写入FFmpeg虚拟文件系统 */
      const inputNames: string[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const inputName = `concat_${i}.${this.getExtFromName(fileList[i].name)}`;
        await this.ffmpegLoader.writeFile(inputName, fileList[i].file);
        inputNames.push(inputName);
      }

      /* 创建concat列表文件内容 */
      /* concat demuxer要求每个文件条目格式为：file '文件名' */
      let concatListContent = '';
      for (const name of inputNames) {
        concatListContent += `file '${name}'\n`;
      }

      /* 将concat列表写入虚拟文件系统 */
      await this.ffmpegLoader.writeFile('concat_list.txt', concatListContent);

      this.updateProgressByTab(el, tabIndex, '正在拼接视频...');

      /* 使用concat demuxer执行拼接命令 */
      /* -f concat 指定使用concat demuxer */
      /* -safe 0 允许使用绝对路径 */
      /* -i concat_list.txt 读取文件列表 */
      /* -c copy 直接复制流，不重新编码 */
      const outputName = 'concat_output.mp4';
      const args: string[] = ['-f', 'concat', '-safe', '0', '-i', 'concat_list.txt', '-c', 'copy', outputName];
      await this.ffmpegLoader.exec(args);

      /* 下载拼接结果 */
      await this.ffmpegLoader.readFile(outputName);
      this.ffmpegLoader.downloadFile(outputName, 'video/mp4', 'concatenated_video.mp4');

      /* 清理所有临时文件 */
      await this.ffmpegLoader.deleteFile('concat_list.txt');
      await this.ffmpegLoader.deleteFile(outputName);
      for (const name of inputNames) {
        await this.ffmpegLoader.deleteFile(name);
      }

      this.updateProgressByTab(el, tabIndex, `拼接完成！已合并 ${fileList.length} 个视频。`);
      this.updateStatus(el, '视频拼接完成');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.updateProgressByTab(el, tabIndex, `拼接失败: ${errorMsg}`);
    }
  }

  /**
   * 处理标签4：提取音频 - 从视频中提取音频轨道
   *
   * 支持的音频格式：MP3（libmp3lame）、AAC、WAV（pcm_s16le）、FLAC
   * 使用-vn参数忽略视频轨道，只处理音频。
   *
   * @param el - 工具窗口的根HTML元素
   * @param fileList - 待处理的文件列表
   */
  private async processExtractAudio(el: HTMLElement, fileList: VideoFileInfo[]): Promise<void> {
    const tabIndex = 4;

    /* 获取用户选择的音频输出格式 */
    const panel = el.querySelector('.vt-panel-extract-audio') as HTMLElement;
    const formatSelect = panel?.querySelector('.vt-audio-format-select') as HTMLSelectElement;
    const formatIndex = formatSelect ? parseInt(formatSelect.value, 10) : 0;
    const audioFormat = this.audioFormatOptions[formatIndex];

    this.updateStatus(el, `开始批量提取音频 (${audioFormat.label})...`);

    /* 逐个处理文件 */
    for (let i = 0; i < fileList.length; i++) {
      const fileInfo = fileList[i];
      const inputName = 'input' + i + '.' + this.getExtFromName(fileInfo.name);
      const outputName = 'output' + i + '.' + audioFormat.ext;

      this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 正在提取: ${fileInfo.name}`);

      try {
        /* 写入输入文件 */
        await this.ffmpegLoader.writeFile(inputName, fileInfo.file);

        /* 构建FFmpeg命令：-i输入 + 音频编码参数 */
        const args: string[] = ['-i', inputName, ...audioFormat.args, outputName];
        await this.ffmpegLoader.exec(args);

        /* 生成下载文件名 */
        const downloadName = this.generateOutputName(fileInfo.name, audioFormat.ext);

        /* 下载结果 */
        await this.ffmpegLoader.readFile(outputName);
        this.ffmpegLoader.downloadFile(outputName, audioFormat.mimeType, downloadName);

        /* 清理临时文件 */
        await this.ffmpegLoader.deleteFile(inputName);
        await this.ffmpegLoader.deleteFile(outputName);

        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 完成: ${fileInfo.name}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 失败: ${fileInfo.name} - ${errorMsg}`);
      }
    }

    this.updateProgressByTab(el, tabIndex, `全部完成！共处理 ${fileList.length} 个文件。`);
    this.updateStatus(el, '音频提取完成');
  }

  /**
   * 处理标签5：视频截图 - 在指定时间点截取视频画面
   *
   * 支持两种模式：
   * 1. 单张截图 - 在指定时间截取一张画面
   * 2. 间隔截图 - 每N秒自动截取一张画面（使用FPS滤镜）
   *
   * 支持输出格式：PNG（无损）、JPEG（有损但文件小）
   *
   * @param el - 工具窗口的根HTML元素
   * @param fileList - 待处理的文件列表
   */
  private async processScreenshot(el: HTMLElement, fileList: VideoFileInfo[]): Promise<void> {
    const tabIndex = 5;

    /* 获取截图参数 */
    const panel = el.querySelector('.vt-panel-screenshot') as HTMLElement;
    const timeInput = panel?.querySelector('.vt-screenshot-time') as HTMLInputElement;
    const intervalInput = panel?.querySelector('.vt-screenshot-interval') as HTMLInputElement;
    const formatSelect = panel?.querySelector('.vt-screenshot-format-select') as HTMLSelectElement;

    const time = timeInput?.value || '00:00:01';
    const intervalStr = intervalInput?.value || '';
    const formatIndex = formatSelect ? parseInt(formatSelect.value, 10) : 0;
    const screenshotFormat = this.screenshotFormatOptions[formatIndex];

    /* 验证时间格式 */
    if (!this.isValidTimeFormat(time)) {
      this.updateProgressByTab(el, tabIndex, '时间格式错误！请使用 HH:MM:SS 格式');
      return;
    }

    const hasInterval = intervalStr !== '' && parseInt(intervalStr, 10) > 0;
    const interval = hasInterval ? parseInt(intervalStr, 10) : 0;

    this.updateStatus(el, `开始批量截图 (${screenshotFormat.label}${hasInterval ? `, 每${interval}秒一张` : ''})...`);

    /* 逐个处理文件 */
    for (let i = 0; i < fileList.length; i++) {
      const fileInfo = fileList[i];
      const inputName = 'input' + i + '.' + this.getExtFromName(fileInfo.name);
      const baseName = fileInfo.name.replace(/\.[^.]+$/, '');

      this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 正在截图: ${fileInfo.name}`);

      try {
        /* 写入输入文件 */
        await this.ffmpegLoader.writeFile(inputName, fileInfo.file);

        if (hasInterval) {
          /* 间隔截图模式 - 使用FPS滤镜每N秒截一张 */
          /* 计算FPS：1/间隔秒数，例如每5秒截一张则fps=1/5=0.2 */
          const fps = (1 / interval).toFixed(4);
          const outputPattern = `ss_output_${i}_%04d.${screenshotFormat.ext}`;

          const args: string[] = [
            '-i', inputName,
            '-vf', `fps=${fps}`,
            outputPattern,
          ];
          await this.ffmpegLoader.exec(args);

          /* 尝试下载所有截图（序号从1开始） */
          let shotIndex = 1;
          while (shotIndex <= 1000) {
            const outName = `ss_output_${i}_${String(shotIndex).padStart(4, '0')}.${screenshotFormat.ext}`;
            try {
              await this.ffmpegLoader.readFile(outName);
              const downloadName = `${baseName}_${String(shotIndex).padStart(4, '0')}.${screenshotFormat.ext}`;
              this.ffmpegLoader.downloadFile(outName, screenshotFormat.mimeType, downloadName);
              await this.ffmpegLoader.deleteFile(outName);
              shotIndex++;
            } catch (_readErr) {
              /* 读取失败说明没有更多截图文件了，退出循环 */
              break;
            }
          }
        } else {
          /* 单张截图模式 - 在指定时间截取一帧 */
          const outputName = `ss_output_${i}.${screenshotFormat.ext}`;

          const args: string[] = [
            '-i', inputName,
            '-ss', time,
            '-frames:v', '1',
            outputName,
          ];
          await this.ffmpegLoader.exec(args);

          /* 下载截图 */
          const downloadName = `${baseName}.${screenshotFormat.ext}`;
          await this.ffmpegLoader.readFile(outputName);
          this.ffmpegLoader.downloadFile(outputName, screenshotFormat.mimeType, downloadName);

          /* 清理临时文件 */
          await this.ffmpegLoader.deleteFile(outputName);
        }

        /* 清理输入文件 */
        await this.ffmpegLoader.deleteFile(inputName);

        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 完成: ${fileInfo.name}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 失败: ${fileInfo.name} - ${errorMsg}`);
      }
    }

    this.updateProgressByTab(el, tabIndex, `全部完成！共处理 ${fileList.length} 个文件。`);
    this.updateStatus(el, '视频截图完成');
  }

  /**
   * 处理标签6：视频转GIF - 将视频转换为GIF动图
   *
   * 支持设置帧率、宽度（高度自动等比缩放）、开始/结束时间。
   * 使用lanczos缩放算法确保GIF画质。
   *
   * FFmpeg命令：-i input -ss {start} -to {end} -vf "fps={fps},scale={w}:-1:flags=lanczos" output.gif
   *
   * @param el - 工具窗口的根HTML元素
   * @param fileList - 待处理的文件列表
   */
  private async processToGif(el: HTMLElement, fileList: VideoFileInfo[]): Promise<void> {
    const tabIndex = 6;

    /* 获取GIF转换参数 */
    const panel = el.querySelector('.vt-panel-to-gif') as HTMLElement;
    const fpsInput = panel?.querySelector('.vt-gif-fps') as HTMLInputElement;
    const widthInput = panel?.querySelector('.vt-gif-width') as HTMLInputElement;
    const startInput = panel?.querySelector('.vt-gif-start') as HTMLInputElement;
    const endInput = panel?.querySelector('.vt-gif-end') as HTMLInputElement;

    const fps = fpsInput ? parseInt(fpsInput.value, 10) || 10 : 10;
    const gifWidth = widthInput ? parseInt(widthInput.value, 10) || 480 : 480;
    const startTime = startInput?.value || '';
    const endTime = endInput?.value || '';

    this.updateStatus(el, `开始批量转GIF (${fps}fps, ${gifWidth}px宽)...`);

    /* 逐个处理文件 */
    for (let i = 0; i < fileList.length; i++) {
      const fileInfo = fileList[i];
      const inputName = 'input' + i + '.' + this.getExtFromName(fileInfo.name);
      const outputName = 'output' + i + '.gif';

      this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 正在转换: ${fileInfo.name}`);

      try {
        /* 写入输入文件 */
        await this.ffmpegLoader.writeFile(inputName, fileInfo.file);

        /* 构建FFmpeg命令参数 */
        const args: string[] = [];

        /* 如果设置了开始时间，添加-ss参数 */
        if (startTime && this.isValidTimeFormat(startTime)) {
          args.push('-ss', startTime);
        }

        /* 添加输入文件 */
        args.push('-i', inputName);

        /* 如果设置了结束时间，添加-to参数 */
        if (endTime && this.isValidTimeFormat(endTime)) {
          args.push('-to', endTime);
        }

        /* 添加视频滤镜：帧率 + 缩放（高度自动，使用lanczos算法） */
        args.push('-vf', `fps=${fps},scale=${gifWidth}:-1:flags=lanczos`);

        /* 添加输出文件名 */
        args.push(outputName);

        /* 执行FFmpeg命令 */
        await this.ffmpegLoader.exec(args);

        /* 生成下载文件名 */
        const downloadName = this.generateOutputName(fileInfo.name, 'gif');

        /* 下载结果 */
        await this.ffmpegLoader.readFile(outputName);
        this.ffmpegLoader.downloadFile(outputName, 'image/gif', downloadName);

        /* 清理临时文件 */
        await this.ffmpegLoader.deleteFile(inputName);
        await this.ffmpegLoader.deleteFile(outputName);

        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 完成: ${fileInfo.name}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.updateProgressByTab(el, tabIndex, `[${i + 1}/${fileList.length}] 失败: ${fileInfo.name} - ${errorMsg}`);
      }
    }

    this.updateProgressByTab(el, tabIndex, `全部完成！共处理 ${fileList.length} 个文件。`);
    this.updateStatus(el, '视频转GIF完成');
  }

  /**
   * 从文件名中提取扩展名（不含点号）
   *
   * 例如："我的视频.mp4" => "mp4"
   * 如果文件名没有扩展名，返回"mp4"作为默认值
   *
   * @param filename - 文件名字符串
   * @returns 文件扩展名（小写）
   */
  private getExtFromName(filename: string): string {
    /* 使用正则表达式匹配最后一个点号后面的内容 */
    const match = filename.match(/\.([^.]+)$/);
    if (match && match[1]) {
      return match[1].toLowerCase(); /* 返回小写的扩展名 */
    }
    return 'mp4'; /* 默认返回mp4 */
  }

  /**
   * 验证时间格式是否为有效的 HH:MM:SS 格式
   *
   * 检查规则：
   * - 必须符合 HH:MM:SS 格式（时:分:秒，用冒号分隔）
   * - 小时、分钟、秒都必须是数字
   * - 小时范围：0-99
   * - 分钟范围：0-59
   * - 秒数范围：0-59
   *
   * @param time - 待验证的时间字符串
   * @returns 时间格式是否有效
   */
  private isValidTimeFormat(time: string): boolean {
    /* 使用正则表达式匹配 HH:MM:SS 格式 */
    const regex = /^(\d{1,2}):(\d{2}):(\d{2})$/;
    const match = time.match(regex);

    if (!match) return false; /* 格式不匹配 */

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);

    /* 检查各字段是否在有效范围内 */
    return hours >= 0 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60;
  }
}
