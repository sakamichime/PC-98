/**
 * FFmpegLoader.ts
 *
 * FFmpeg.wasm 加载管理器
 * 封装 FFmpeg WebAssembly 实例的加载、状态管理和文件系统操作逻辑。
 * 采用单例模式，确保整个应用中只有一个 FFmpeg 实例运行，
 * 避免重复加载和资源浪费。
 *
 * 使用 @ffmpeg/ffmpeg 提供的 FFmpeg 类来创建和管理 WebAssembly 实例，
 * 使用 @ffmpeg/util 提供的工具函数来处理文件读写和 URL 转换。
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

/**
 * FFmpegLoadingStatus 常量对象
 *
 * 表示 FFmpeg 实例的当前加载状态，共有四种状态：
 * - IDLE:    未加载，FFmpeg 实例尚未开始初始化
 * - LOADING: 加载中，正在从 CDN 下载并初始化 FFmpeg 核心文件
 * - READY:   已就绪，FFmpeg 实例加载完成，可以正常使用
 * - ERROR:   加载失败，在加载过程中发生了错误
 *
 * 使用 const 对象替代 enum，因为 tsconfig.json 开启了 erasableSyntaxOnly，
 * enum 语法在该模式下不被允许（enum 会生成运行时代码，而 const 对象是纯类型层面的）。
 */
export const FFmpegLoadingStatus = {
  /** 未加载状态 - FFmpeg 实例尚未开始初始化 */
  IDLE: 'IDLE',
  /** 加载中状态 - 正在从 CDN 下载并初始化 FFmpeg 核心文件 */
  LOADING: 'LOADING',
  /** 已就绪状态 - FFmpeg 实例加载完成，可以正常使用 */
  READY: 'READY',
  /** 加载失败状态 - 在加载过程中发生了错误 */
  ERROR: 'ERROR',
} as const;

/** FFmpegLoadingStatus 类型 - 从常量对象中提取所有可能的状态值类型 */
export type FFmpegLoadingStatus = (typeof FFmpegLoadingStatus)[keyof typeof FFmpegLoadingStatus];

/**
 * 状态变化回调函数类型
 *
 * 当 FFmpeg 的加载状态发生变化时，会调用此类型的回调函数，
 * 传入新的状态值，方便外部组件进行响应式更新（例如更新 UI 中的加载进度指示器）。
 */
export type StatusChangeCallback = (status: FFmpegLoadingStatus) => void;

/**
 * 日志回调函数类型
 *
 * 当 FFmpeg 输出日志信息时，会调用此类型的回调函数，
 * 传入日志消息字符串，方便外部将日志显示给用户或记录到控制台。
 */
export type LogCallback = (message: string) => void;

/**
 * FFmpegLoader 类
 *
 * FFmpeg.wasm 加载管理器，采用单例模式设计。
 * 负责管理 FFmpeg WebAssembly 实例的整个生命周期，包括：
 * - 从 CDN 加载 FFmpeg 核心文件（.js 和 .wasm）
 * - 管理加载状态（IDLE -> LOADING -> READY/ERROR）
 * - 提供文件系统操作接口（写入、读取、删除虚拟文件）
 * - 执行 FFmpeg 命令行指令
 * - 下载处理后的文件到本地
 *
 * 使用方法：
 *   const loader = FFmpegLoader.getInstance();
 *   await loader.load();
 *   await loader.exec(['-i', 'input.mp4', 'output.gif']);
 */
export class FFmpegLoader {
  /** FFmpeg 实例 - WebAssembly 版本的 FFmpeg，用于在浏览器中执行音视频处理 */
  private ffmpeg: FFmpeg;

  /** 当前加载状态 - 跟踪 FFmpeg 实例处于哪个加载阶段 */
  private status: FFmpegLoadingStatus;

  /** 日志回调函数 - 当 FFmpeg 输出日志时被调用，用于将日志信息传递给外部 */
  private logCallback: LogCallback | null;

  /** 状态变化回调函数 - 当 FFmpeg 加载状态改变时被调用，用于通知外部更新 UI */
  private statusChangeCallback: StatusChangeCallback | null;

  /** 单例实例 - 保存全局唯一的 FFmpegLoader 实例引用 */
  private static instance: FFmpegLoader | null;

  /**
   * 私有构造函数
   *
   * 创建 FFmpeg 实例并初始化为 IDLE（未加载）状态。
   * 设为私有是为了强制通过 getInstance() 获取实例，保证单例模式。
   * 初始化时将日志回调和状态变化回调都设为 null，
   * 需要通过 onLog() 和 onStatusChange() 方法注册。
   */
  private constructor() {
    // 创建一个新的 FFmpeg WebAssembly 实例
    this.ffmpeg = new FFmpeg();
    // 初始状态设为"未加载"
    this.status = FFmpegLoadingStatus.IDLE;
    // 日志回调初始为空，等待外部注册
    this.logCallback = null;
    // 状态变化回调初始为空，等待外部注册
    this.statusChangeCallback = null;
  }

  /**
   * getInstance - 获取 FFmpegLoader 的单例实例
   *
   * 静态方法，返回全局唯一的 FFmpegLoader 实例。
   * 如果实例尚未创建，则自动创建一个新实例。
   * 这样做的好处是确保整个应用中只有一个 FFmpeg 实例在运行，
   * 避免重复加载 .wasm 文件（该文件通常较大，约 30MB）。
   *
   * @returns FFmpegLoader 单例实例
   */
  public static getInstance(): FFmpegLoader {
    // 如果还没有创建过实例，则创建一个新实例
    if (!FFmpegLoader.instance) {
      FFmpegLoader.instance = new FFmpegLoader();
    }
    // 返回已存在的单例实例
    return FFmpegLoader.instance;
  }

  /**
   * getStatus - 获取当前 FFmpeg 加载状态
   *
   * 返回 FFmpegLoader 当前所处的加载阶段，
   * 外部可以根据此状态判断是否可以执行 FFmpeg 命令。
   * 例如：只有状态为 READY 时才能安全地调用 exec() 方法。
   *
   * @returns FFmpegLoadingStatus 当前加载状态的枚举值
   */
  public getStatus(): FFmpegLoadingStatus {
    return this.status;
  }

  /**
   * onStatusChange - 注册状态变化回调函数
   *
   * 当 FFmpeg 的加载状态发生变化时（例如从 LOADING 变为 READY），
   * 会调用此回调函数，传入新的状态值。
   * 这使得外部组件可以监听状态变化并做出响应，
   * 例如：在加载中显示进度条，加载完成后启用操作按钮。
   *
   * @param callback - 状态变化回调函数，接收新的 FFmpegLoadingStatus 参数
   */
  public onStatusChange(callback: StatusChangeCallback): void {
    this.statusChangeCallback = callback;
  }

  /**
   * onLog - 注册日志回调函数
   *
   * 当 FFmpeg 输出日志信息时（例如执行命令时的进度信息或错误信息），
   * 会调用此回调函数，传入日志消息字符串。
   * 这使得外部可以将 FFmpeg 的输出日志显示给用户，
   * 例如在控制台面板中实时显示转换进度。
   *
   * @param callback - 日志回调函数，接收日志消息字符串参数
   */
  public onLog(callback: LogCallback): void {
    this.logCallback = callback;
  }

  /**
   * load - 加载 FFmpeg WebAssembly 核心
   *
   * 从 CDN 下载 FFmpeg 的核心文件（ffmpeg-core.js 和 ffmpeg-core.wasm），
   * 并初始化 FFmpeg 实例。使用 toBlobURL 将远程文件转换为 Blob URL，
   * 以绕过浏览器的 CORS（跨域资源共享）限制。
   *
   * 如果 FFmpeg 已经处于加载中或已就绪状态，则直接返回，不会重复加载。
   * 如果加载过程中发生错误，会将状态设为 ERROR 并向上抛出异常。
   *
   * 加载流程：
   * 1. 检查当前状态，如果已在加载或已就绪则跳过
   * 2. 将状态设为 LOADING
   * 3. 使用 toBlobURL 将 CDN 上的核心文件转换为 Blob URL（绕过 CORS）
   * 4. 注册 progress 事件回调，用于报告加载进度
   * 5. 注册 log 事件回调，用于输出 FFmpeg 日志
   * 6. 调用 ffmpeg.load() 开始加载核心文件
   * 7. 加载成功后将状态设为 READY
   *
   * @returns Promise<void> 加载完成后 resolve，出错时 reject
   * @throws 当加载失败时抛出异常
   */
  public async load(): Promise<void> {
    // 如果已经在加载中或已经加载完成，不需要重复加载，直接返回
    if (
      this.status === FFmpegLoadingStatus.LOADING ||
      this.status === FFmpegLoadingStatus.READY
    ) {
      return;
    }

    try {
      // 将状态设为"加载中"，并通知外部状态已变化
      this.updateStatus(FFmpegLoadingStatus.LOADING);

      // FFmpeg 核心文件的 CDN 基础路径
      // 使用 jsdelivr CDN 的 0.12.10 版本 ESM（ES Module）构建
      const coreBaseURL =
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';

      // 使用 toBlobURL 将远程的 JS 文件下载并转换为 Blob URL
      // toBlobURL 的作用是先 fetch 远程文件，然后创建一个本地的 Blob URL
      // 这样可以绕过浏览器的 CORS 限制，因为 Blob URL 属于同源
      const coreURL = await toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript');

      // 同样地，将 WASM 二进制文件转换为 Blob URL
      // ffmpeg-core.wasm 是 FFmpeg 的 WebAssembly 二进制文件，包含了所有的编解码器
      const wasmURL = await toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm');

      // 注册 FFmpeg 的 progress（进度）事件回调
      // 当 FFmpeg 执行命令（如视频转码）时，会定期触发此事件
      // progress.ratio 表示当前处理进度（0 到 1 之间的浮点数）
      this.ffmpeg.on('progress', ({ progress: prog }) => {
        // 将进度信息格式化为百分比字符串，通过日志回调输出
        // Math.max(0, prog) 确保进度不会显示为负数
        const percent = Math.max(0, prog * 100).toFixed(0);
        this.notifyLog(`处理进度: ${percent}%`);
      });

      // 注册 FFmpeg 的 log（日志）事件回调
      // 当 FFmpeg 输出信息日志时触发，例如文件信息、编码参数等
      this.ffmpeg.on('log', ({ message }) => {
        // 将 FFmpeg 输出的日志消息通过回调传递给外部
        this.notifyLog(message);
      });

      // 调用 ffmpeg.load() 开始实际加载核心文件
      // 传入转换后的 Blob URL，避免 CORS 问题
      // 这个操作会下载并编译 WASM 文件，可能需要几秒钟
      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      });

      // 加载成功，将状态设为"已就绪"
      this.updateStatus(FFmpegLoadingStatus.READY);
    } catch (error) {
      // 加载过程中发生错误，将状态设为"加载失败"
      this.updateStatus(FFmpegLoadingStatus.ERROR);

      // 通过日志回调通知外部发生了错误
      this.notifyLog(`FFmpeg 加载失败: ${error}`);

      // 将错误向上抛出，让调用者可以处理异常
      throw error;
    }
  }

  /**
   * getFFmpeg - 获取 FFmpeg 实例
   *
   * 返回内部的 FFmpeg WebAssembly 实例引用。
   * 如果 FFmpeg 尚未加载（状态为 IDLE），则会自动调用 load() 方法进行加载。
   * 如果加载失败（状态为 ERROR），则抛出异常，提示用户 FFmpeg 不可用。
   *
   * 注意：调用此方法时会触发异步加载，如果 FFmpeg 尚未初始化，
   * 需要使用 await 等待加载完成。
   *
   * @returns FFmpeg 已加载的 FFmpeg WebAssembly 实例
   * @throws 当 FFmpeg 加载失败或状态为 ERROR 时抛出异常
   */
  public async getFFmpeg(): Promise<FFmpeg> {
    // 如果 FFmpeg 尚未加载（状态为未加载），先执行加载
    if (this.status === FFmpegLoadingStatus.IDLE) {
      await this.load();
    }

    // 如果当前状态为加载失败，说明之前加载出了问题，FFmpeg 不可用
    if (this.status === FFmpegLoadingStatus.ERROR) {
      throw new Error('FFmpeg 加载失败，无法获取实例。请检查网络连接后重试。');
    }

    // 返回 FFmpeg 实例
    return this.ffmpeg;
  }

  /**
   * writeFile - 写入文件到 FFmpeg 虚拟文件系统
   *
   * 将文件数据写入 FFmpeg 的虚拟文件系统（MEMFS）中。
   * FFmpeg.wasm 使用浏览器内存中的虚拟文件系统来读写文件，
   * 所以需要先将输入文件写入虚拟文件系统，FFmpeg 才能处理它。
   *
   * 支持三种数据类型：
   * - File: 浏览器 File 对象（例如来自 <input type="file"> 的文件）
   * - Uint8Array: 二进制数据数组（例如从网络下载的文件数据）
   * - string: 字符串数据（例如文本内容）
   *
   * 如果传入的是 File 对象，内部会使用 fetchFile 将其转换为 Uint8Array。
   *
   * @param name - 文件名（在虚拟文件系统中的路径，如 'input.mp4'）
   * @param data - 要写入的文件数据，可以是 File、Uint8Array 或字符串
   * @returns Promise<void> 写入完成后 resolve
   */
  public async writeFile(
    name: string,
    data: File | Uint8Array | string
  ): Promise<void> {
    // 获取 FFmpeg 实例（如果未加载会自动加载）
    const ffmpeg = await this.getFFmpeg();

    // 根据数据类型决定如何写入：
    // - 如果是 File 对象，使用 fetchFile 工具函数将其读取为 Uint8Array
    // - 如果是 Uint8Array 或字符串，直接写入
    if (data instanceof File) {
      // fetchFile 会将 File 对象读取为二进制 Uint8Array 数据
      await ffmpeg.writeFile(name, await fetchFile(data));
    } else {
      // Uint8Array 或字符串可以直接写入虚拟文件系统
      await ffmpeg.writeFile(name, data);
    }
  }

  /**
   * readFile - 从 FFmpeg 虚拟文件系统读取文件
   *
   * 从 FFmpeg 的虚拟文件系统（MEMFS）中读取指定文件的数据。
   * 通常在 FFmpeg 处理完成后，使用此方法读取输出文件的内容，
   * 然后可以进行预览、下载等操作。
   *
   * @param name - 要读取的文件名（在虚拟文件系统中的路径，如 'output.gif'）
   * @returns Promise<Uint8Array> 文件的二进制数据（Uint8Array 格式）
   */
  public async readFile(name: string): Promise<Uint8Array> {
    // 获取 FFmpeg 实例（如果未加载会自动加载）
    const ffmpeg = await this.getFFmpeg();

    // 从虚拟文件系统中读取文件数据
    // 返回值是 Uint8Array 类型，包含文件的完整二进制内容
    return ffmpeg.readFile(name) as Promise<Uint8Array>;
  }

  /**
   * deleteFile - 删除 FFmpeg 虚拟文件系统中的文件
   *
   * 从 FFmpeg 的虚拟文件系统（MEMFS）中删除指定文件。
   * 在处理完成后，建议删除不再需要的文件以释放内存，
   * 因为虚拟文件系统使用的是浏览器内存，文件过大会影响性能。
   *
   * @param name - 要删除的文件名（在虚拟文件系统中的路径）
   * @returns Promise<void> 删除完成后 resolve
   */
  public async deleteFile(name: string): Promise<void> {
    // 获取 FFmpeg 实例（如果未加载会自动加载）
    const ffmpeg = await this.getFFmpeg();

    // 从虚拟文件系统中删除指定文件
    await ffmpeg.deleteFile(name);
  }

  /**
   * exec - 执行 FFmpeg 命令
   *
   * 向 FFmpeg 实例发送命令行参数，执行音视频处理操作。
   * 参数格式与命令行 FFmpeg 相同，例如：
   *   exec(['-i', 'input.mp4', '-vf', 'fps=10', 'output.gif'])
   * 相当于在命令行执行：
   *   ffmpeg -i input.mp4 -vf fps=10 output.gif
   *
   * 执行前，请确保所有输入文件已通过 writeFile() 写入虚拟文件系统。
   * 执行后，可以通过 readFile() 读取输出文件。
   *
   * @param args - FFmpeg 命令行参数数组（不包含 'ffmpeg' 本身）
   * @returns Promise<number> FFmpeg 命令的退出码（0 表示成功）
   * @throws 当命令执行失败时抛出异常
   */
  public async exec(args: string[]): Promise<number> {
    // 获取 FFmpeg 实例（如果未加载会自动加载）
    const ffmpeg = await this.getFFmpeg();

    // 执行 FFmpeg 命令，返回退出码
    // 退出码为 0 表示命令执行成功，非 0 表示有错误
    return ffmpeg.exec(args);
  }

  /**
   * downloadFile - 从虚拟文件系统下载文件到本地
   *
   * 将 FFmpeg 虚拟文件系统中的文件下载到用户的本地磁盘。
   * 实现方式是创建一个临时的 <a> 标签，设置其 href 为文件的 Blob URL，
   * 然后模拟点击来触发浏览器的下载行为。
   *
   * @param name - 虚拟文件系统中的文件名（如 'output.gif'）
   * @param mimeType - 文件的 MIME 类型（如 'image/gif'、'video/mp4' 等），
   *                  用于告诉浏览器文件的类型，确保正确处理下载
   * @param outputName - 下载到本地后的文件名（如 'converted.gif'）
   */
  public downloadFile(
    name: string,
    mimeType: string,
    outputName: string
  ): void {
    // 从虚拟文件系统中读取文件数据
    // 使用 readFile 获取二进制数据
    this.readFile(name).then((data) => {
      // 将二进制数据（Uint8Array）包装后创建为 Blob 对象
      // 使用 data.slice() 创建一个新的 Uint8Array，确保 ArrayBuffer 类型兼容
      // data.buffer 可能是 ArrayBufferLike（包含 SharedArrayBuffer），而 BlobPart 需要 ArrayBuffer
      const blob = new Blob([data.slice()], { type: mimeType });

      // 使用 URL.createObjectURL 为 Blob 创建一个临时的 URL
      // 这个 URL 只在当前页面会话中有效，可以用于下载
      const url = URL.createObjectURL(blob);

      // 创建一个隐藏的 <a> 标签用于触发下载
      const a = document.createElement('a');
      a.href = url;
      // 设置 download 属性指定下载后的文件名
      a.download = outputName;

      // 将 <a> 标签添加到页面 DOM 中（必须添加到 DOM 才能触发点击）
      document.body.appendChild(a);

      // 模拟用户点击 <a> 标签，触发浏览器的文件下载
      a.click();

      // 下载触发后，从 DOM 中移除 <a> 标签，保持页面清洁
      document.body.removeChild(a);

      // 释放 Blob URL 占用的内存
      // createObjectURL 创建的 URL 不会自动释放，需要手动调用 revokeObjectURL
      URL.revokeObjectURL(url);
    });
  }

  /**
   * updateStatus - 内部方法：更新加载状态并通知回调
   *
   * 设置新的加载状态，如果已注册了状态变化回调函数，则调用它。
   * 这是一个内部辅助方法，不对外暴露。
   *
   * @param newStatus - 新的加载状态
   */
  private updateStatus(newStatus: FFmpegLoadingStatus): void {
    // 更新内部状态
    this.status = newStatus;

    // 如果外部注册了状态变化回调，则调用它通知新状态
    if (this.statusChangeCallback) {
      this.statusChangeCallback(newStatus);
    }
  }

  /**
   * notifyLog - 内部方法：发送日志消息到回调
   *
   * 如果已注册了日志回调函数，则将日志消息传递给它。
   * 这是一个内部辅助方法，不对外暴露。
   *
   * @param message - 日志消息字符串
   */
  private notifyLog(message: string): void {
    // 如果外部注册了日志回调，则调用它传递日志消息
    if (this.logCallback) {
      this.logCallback(message);
    }
  }
}
