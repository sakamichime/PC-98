/**
 * DOS终端 - 模拟PC-98的命令行界面
 *
 * 功能说明：
 * 1. 命令行输入 - 用户可以在终端中输入DOS命令并执行
 * 2. 模拟DOS命令 - 支持dir, cls, help, ver, date, time等14种经典DOS命令
 * 3. 命令历史 - 支持上下方向键翻阅之前输入过的命令
 * 4. ASCII art欢迎画面 - 启动时显示PC-98风格的欢迎信息
 * 5. 霓虹绿色终端风格 - 模拟复古CRT显示器效果
 *
 * 支持的命令列表（共14种）：
 *   HELP, VER, DATE, TIME, CLS, DIR, ECHO, COLOR, TYPE, TREE, MEM, SYSTEM, ABOUT, EXIT
 */

import { WindowManager } from '../core/WindowManager';

export class TerminalApp {
  /** 窗口管理器引用 - 用于创建和关闭终端窗口 */
  private wm: WindowManager;

  /** 命令历史数组 - 存储用户之前输入过的所有命令 */
  private commandHistory: string[] = [];

  /** 命令历史索引 - 用于上下方向键翻阅命令历史，-1表示当前没有在翻阅 */
  private historyIndex = -1;

  /**
   * 构造函数 - 初始化终端应用
   * @param wm - 窗口管理器实例，负责窗口的创建、管理等操作
   */
  constructor(wm: WindowManager) {
    this.wm = wm;
  }

  /**
   * 打开终端窗口
   *
   * 调用窗口管理器创建一个新的终端窗口，
   * 窗口内容为DOS风格的命令行界面。
   * 窗口创建后会自动绑定事件和显示欢迎画面。
   */
  open(): void {
    this.wm.createWindow({
      id: 'terminal',            // 窗口唯一标识符
      title: 'MS-DOS提示符',      // 窗口标题栏文字
      icon: '💻',                // 窗口标题栏图标
      width: 550,                 // 窗口初始宽度（像素）
      height: 380,                // 窗口初始高度（像素）
      content: this.buildHTML(), // 终端HTML内容
      resizable: true,            // 允许用户拖拽调整窗口大小

      // 窗口创建完成后的回调函数
      // 参数 el 是窗口的内容DOM元素，用于绑定事件和操作
      onCreated: (el: HTMLElement) => {
        this.bindEvents(el);     // 绑定键盘和鼠标事件
        this.printWelcome(el);   // 打印欢迎画面
      },
    });
  }

  /**
   * 构建终端HTML结构
   *
   * 返回终端窗口内部的HTML字符串，包含：
   * - terminal-output: 命令输出区域，显示命令执行结果（可滚动）
   * - terminal-input-line: 输入行区域，包含提示符和文本输入框
   *
   * 注意：
   * - prompt使用正确的反斜杠 "C:\>" 而非转义后的 "C\\>"
   * - 输入框设置了 width: 100% 确保不被压缩
   * - 输入框虽然设置了 autofocus，但动态创建的元素 autofocus 不生效，
   *   因此需要在 bindEvents() 中手动调用 input.focus()
   *
   * @returns 终端HTML字符串
   */
  private buildHTML(): string {
    return `
      <div class="terminal-container" style="display:flex;flex-direction:column;height:100%;background:var(--pc-black);font-family:'Silkscreen',monospace;">
        <!-- 命令输出区域：flex:1让它占满剩余空间，overflow-y:auto允许垂直滚动 -->
        <div class="terminal-output" style="flex:1;overflow-y:auto;padding:8px;font-size:13px;line-height:1.6;color:var(--pc-neon-green);white-space:pre-wrap;"></div>
        <!-- 命令输入行：包含提示符文字和文本输入框 -->
        <div class="terminal-input-line" style="display:flex;align-items:center;padding:0 8px 8px;gap:4px;">
          <!-- 提示符：显示 "C:\>" ，使用正确的单个反斜杠 -->
          <span style="color:var(--pc-neon-green);white-space:nowrap;" class="prompt">C:\></span>
          <!-- 命令输入框：width:100%确保输入框不会被压缩，flex:1让它在容器内自动扩展 -->
          <input type="text" class="terminal-input" style="width:100%;flex:1;background:transparent;border:none;color:var(--pc-neon-green);font-family:var(--font-pixel);font-size:13px;outline:none;" autofocus>
        </div>
      </div>
    `;
  }

  /**
   * 打印ASCII art欢迎画面
   *
   * 在终端输出区域显示启动信息，包括：
   * - 粉色的PC-98兼容机信息框（NEC PC-9821）
   * - 蓝色的系统详细信息框（PC-98 Workstation Edition）
   * - 绿色的操作提示
   *
   * @param el - 窗口内容DOM元素，用于查找输出区域
   */
  private printWelcome(el: HTMLElement): void {
    // 获取终端输出区域DOM元素
    const output = el.querySelector('.terminal-output') as HTMLElement;

    // 设置欢迎画面的HTML内容
    output.innerHTML = `
<!-- 粉色：PC-98兼容机基本信息 -->
<span style="color:var(--pc-pink);">
 ╔══════════════════════════════════════════════╗
 ║   NEC PC-9821 Compatible                    ║
 ║   MS-DOS Version 7.00                        ║
 ║   (C)Copyright NEC Corporation 1998        ║
 ╚══════════════════════════════════════════════╝
</span>
<!-- 蓝色：PC-98 Workstation 详细系统信息 -->
<span style="color:var(--pc-neon-blue);">
  ┌──────────────────────────────────┐
  │  PC-98 Workstation Edition       │
  │  v2.02 Build 20220114            │
  │  Memory: 640KB Conventional      │
  │  Memory: 32768KB Extended       │
  │  Display: 640x480 256 colors    │
  └──────────────────────────────────┘
</span>

<!-- 绿色：操作提示 -->
<span style="color:var(--pc-neon-green);">输入 HELP 查看可用命令列表</span>

`;

    // 自动滚动到输出区域底部，确保最新内容可见
    output.scrollTop = output.scrollHeight;
  }

  /**
   * 绑定终端交互事件
   *
   * 绑定以下事件：
   * 1. 键盘事件 - 处理回车执行命令、上下方向键翻阅命令历史
   * 2. 点击事件 - 点击终端任意位置自动聚焦输入框
   * 3. 手动聚焦 - 动态创建的输入框 autofocus 属性不生效，
   *    因此在绑定事件后手动调用 input.focus() 确保输入框获得焦点
   *
   * @param el - 窗口内容DOM元素，用于查找输入框和输出区域
   */
  private bindEvents(el: HTMLElement): void {
    // 获取命令输入框DOM元素
    const input = el.querySelector('.terminal-input') as HTMLInputElement;
    // 获取命令输出区域DOM元素
    const output = el.querySelector('.terminal-output') as HTMLElement;

    // 绑定键盘按下事件
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // 按下回车键：执行命令
        const cmd = input.value.trim(); // 获取输入框内容并去除首尾空白
        if (cmd) {
          // 如果输入了非空命令，保存到命令历史
          this.commandHistory.push(cmd);
          // 将历史索引重置到最新位置（即命令历史数组的末尾之后）
          this.historyIndex = this.commandHistory.length;
        }
        this.executeCommand(cmd, output, el); // 执行命令
        input.value = '';                      // 清空输入框
        output.scrollTop = output.scrollHeight; // 滚动到底部
      } else if (e.key === 'ArrowUp') {
        // 按下上方向键：翻阅上一条历史命令
        e.preventDefault(); // 阻止默认行为（移动光标）
        if (this.historyIndex > 0) {
          // 如果索引大于0，说明还有更早的命令可以翻阅
          this.historyIndex--; // 索引减1，指向前一条命令
          input.value = this.commandHistory[this.historyIndex]; // 将输入框内容设为历史命令
        }
      } else if (e.key === 'ArrowDown') {
        // 按下下方向键：翻阅下一条历史命令
        e.preventDefault(); // 阻止默认行为（移动光标）
        if (this.historyIndex < this.commandHistory.length - 1) {
          // 如果索引不是最后一条，还有更近的命令可以翻阅
          this.historyIndex++; // 索引加1，指向后一条命令
          input.value = this.commandHistory[this.historyIndex]; // 将输入框内容设为历史命令
        } else {
          // 已经翻到最后一条之后，清空输入框
          this.historyIndex = this.commandHistory.length; // 重置索引
          input.value = ''; // 清空输入框
        }
      }
    });

    // 点击终端容器任意位置时自动聚焦输入框
    // 这样用户点击输出区域后可以直接输入命令，无需手动点击输入框
    el.querySelector('.terminal-container')?.addEventListener('click', () => {
      input.focus();
    });

    // 手动聚焦输入框
    // 因为输入框是通过innerHTML动态插入DOM的，HTML的autofocus属性对动态创建的元素不生效
    // 所以必须在JavaScript中手动调用focus()方法确保输入框获得焦点
    input.focus();
  }

  /**
   * 执行DOS命令
   *
   * 根据用户输入的命令字符串，匹配并执行对应的DOS命令。
   * 共支持14种命令：HELP, VER, DATE, TIME, CLS, DIR, ECHO, COLOR, TYPE, TREE, MEM, SYSTEM, ABOUT, EXIT
   *
   * 执行流程：
   * 1. 先将命令（含提示符）回显到输出区域，模拟真实终端的行为
   * 2. 将命令转为小写并按空格分割，提取命令名和参数
   * 3. 使用 switch 匹配命令名并执行对应逻辑
   * 4. 未识别的命令会显示错误提示
   *
   * @param cmd - 用户输入的原始命令字符串
   * @param output - 终端输出区域DOM元素，用于追加命令执行结果
   * @param el - 窗口内容DOM元素，用于查找提示符等子元素
   */
  private executeCommand(cmd: string, output: HTMLElement, el: HTMLElement): void {
    // 获取提示符元素的文本内容，用于命令回显
    const prompt = el.querySelector('.prompt') as HTMLElement;

    // 回显命令行：在输出区域显示 "C:\> 命令" 的粉色提示
    output.innerHTML += `<span style="color:var(--pc-pink);">${prompt.textContent} ${cmd}</span>\n`;

    // 将命令字符串转为小写并按空白字符分割成数组
    // 例如 "ECHO Hello World" -> ["echo", "hello", "world"]
    const parts = cmd.toLowerCase().split(/\s+/);
    // 第一个元素是命令名
    const command = parts[0];

    // 根据命令名匹配并执行对应的命令逻辑
    switch (command) {
      case '':
        // 空命令（用户直接按回车），不做任何处理
        break;

      case 'help':
        // HELP命令 - 显示所有可用命令的帮助信息
        output.innerHTML += `<span style="color:var(--pc-neon-yellow);">
可用命令列表:
  HELP    - 显示此帮助信息
  VER     - 显示系统版本
  DATE    - 显示当前日期
  TIME    - 显示当前时间
  CLS     - 清屏
  DIR     - 显示目录内容
  ECHO    - 显示消息 (ECHO [message])
  COLOR   - 设置文字颜色 (COLOR [文字色])
  TYPE    - 显示文件内容 (TYPE [filename])
  TREE    - 显示目录树结构
  MEM     - 显示内存信息
  SYSTEM  - 显示系统信息
  ABOUT   - 关于此模拟器
  EXIT    - 关闭终端窗口
</span>\n`;
        break;

      case 'ver':
        // VER命令 - 显示操作系统版本信息
        output.innerHTML += `<span style="color:var(--pc-neon-blue);">PC-98 Workstation [Version 2.02.20220114]</span>\n`;
        break;

      case 'date':
        // DATE命令 - 显示当前日期，使用日本日期格式（YYYY/MM/DD）
        output.innerHTML += `<span style="color:var(--pc-neon-blue);">当前日期: ${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>\n`;
        break;

      case 'time':
        // TIME命令 - 显示当前时间，使用日本时间格式
        output.innerHTML += `<span style="color:var(--pc-neon-blue);">当前时间: ${new Date().toLocaleTimeString('ja-JP')}</span>\n`;
        break;

      case 'cls':
        // CLS命令 - 清屏，将输出区域的内容清空
        output.innerHTML = '';
        break;

      case 'dir':
        // DIR命令 - 列出C盘根目录下的文件和文件夹
        // 模拟DOS的DIR命令输出格式，包含日期、时间、大小、名称等信息
        output.innerHTML += `<span style="color:var(--pc-white);">
 驱动器 C 中的卷没有标签。
 卷的序列号是 4A3B-1C2D
 C:\\ 的目录

2022/01/14  22:30    <DIR>          Windows
2022/01/14  22:30    <DIR>          Documents
2022/01/14  22:30    <DIR>          Tools
2022/01/14  22:30    <DIR>          我的文档
2022/01/14  22:30    <DIR>          互联网
1998/12/25  00:00            128  AUTOEXEC.BAT
1998/12/25  00:00            256  CONFIG.SYS
1998/12/25  00:00          40,960  IO.SYS
1998/12/25  00:00          93,248  COMMAND.COM
               4 个文件        134,592 字节
               5 个目录    52,428,800 字节可用
</span>\n`;
        break;

      case 'echo':
        // ECHO命令 - 将参数中的文字输出到终端
        // parts.slice(1).join(' ') 将参数数组重新拼接成字符串
        // 例如 ["echo", "hello", "world"] -> "hello world"
        output.innerHTML += `<span>${parts.slice(1).join(' ')}</span>\n`;
        break;

      case 'type':
        // TYPE命令 - 显示指定文件的内容（模拟）
        if (parts[1]) {
          // 如果提供了文件名参数，模拟显示文件内容
          output.innerHTML += `<span style="color:var(--pc-neon-green);">正在读取 ${parts[1]}...\n[文件内容模拟输出]</span>\n`;
        } else {
          // 如果没有提供文件名参数，提示用法
          output.innerHTML += `<span style="color:var(--pc-hot-pink);">缺少文件名参数。用法: TYPE [filename]</span>\n`;
        }
        break;

      case 'tree':
        // TREE命令 - 以树形结构显示C盘根目录的目录树
        // 使用Unicode树形字符（├──、│、└──）绘制目录结构
        output.innerHTML += `<span style="color:var(--pc-white);">
C:\\
├── Windows
│   ├── System
│   └── Desktop.ini
├── Documents
│   ├── Notes.txt
│   └── Readme.doc
├── Tools
│   ├── DiskCheck.exe
│   └── MemTest.exe
├── 我的文档
│   ├── 日记.txt
│   └── 待办事项.txt
├── 互联网
│   └── 收藏夹
├── AUTOEXEC.BAT
├── CONFIG.SYS
├── IO.SYS
└── COMMAND.COM
</span>\n`;
        break;

      case 'mem':
        // MEM命令 - 显示系统内存使用情况
        // 模拟DOS的MEM命令输出，显示常规内存和扩展内存(XMS)信息
        output.innerHTML += `<span style="color:var(--pc-neon-blue);">
              655360 字节总常规内存
              655360 字节可用
        33554432 字节总扩展内存(XMS)
        33554432 字节可用扩展内存(XMS)
</span>\n`;
        break;

      case 'system':
        // SYSTEM命令 - 显示详细的系统信息
        // 包含计算机名、处理器、内存、显示器、操作系统、网络等信息
        output.innerHTML += `<span style="color:var(--pc-neon-blue);">
系统信息:
  计算机名:  PC98-WORKSTATION
  处理器:    Intel 80486DX2 66MHz
  内存:      32MB (32,768KB)
  显示器:    NEC PC-9821 640x480 256色
  操作系统:  MS-DOS 7.00 / PC-98 Workstation v2.02
  网络:      已连接 (Local Area Network)
</span>\n`;
        break;

      case 'about':
        // ABOUT命令 - 显示关于此PC-98模拟器的信息
        // 使用ASCII art框体展示
        output.innerHTML += `<span style="color:var(--pc-pink);">
 ╔══════════════════════════════════════════════╗
 ║  * PC-98 Workstation Emulator *              ║
 ║  使用 TypeScript 编写                         ║
 ║  NEC PC-9821 Compatible Emulator              ║
 ╚══════════════════════════════════════════════╝
</span>\n`;
        break;

      case 'color':
        // COLOR命令 - 更改终端文字颜色
        // 颜色映射表：将颜色名称映射到对应的CSS变量值
        const colors: Record<string, string> = {
          green: 'var(--pc-neon-green)',  // 霓虹绿（默认终端色）
          pink: 'var(--pc-pink)',          // 粉色
          blue: 'var(--pc-neon-blue)',     // 霓虹蓝
          yellow: 'var(--pc-neon-yellow)', // 霓虹黄
          white: 'var(--pc-white)',        // 白色
          red: 'var(--pc-hot-pink)',       // 热粉色
        };
        if (parts[1] && colors[parts[1]]) {
          // 如果提供了有效的颜色名称，更改终端颜色
          output.style.color = colors[parts[1]]; // 更改输出区域文字颜色
          const input = el.querySelector('.terminal-input') as HTMLInputElement;
          input.style.color = colors[parts[1]];   // 更改输入框文字颜色
          const promptEl = el.querySelector('.prompt') as HTMLElement;
          promptEl.style.color = colors[parts[1]]; // 更改提示符文字颜色
          output.innerHTML += `<span>文字颜色已更改为 ${parts[1]}</span>\n`;
        } else {
          // 颜色名称无效或未提供参数，提示可用的颜色列表
          output.innerHTML += `<span style="color:var(--pc-hot-pink);">可用颜色: green, pink, blue, yellow, white, red</span>\n`;
        }
        break;

      case 'exit':
        // EXIT命令 - 关闭终端窗口
        this.wm.closeWindow('terminal');
        return; // 直接返回，不继续执行后续代码

      default:
        // 未识别的命令 - 显示"不是内部或外部命令"的错误提示（模拟DOS的经典错误信息）
        output.innerHTML += `<span style="color:var(--pc-hot-pink);">'${command}' 不是内部或外部命令，也不是可运行的程序。</span>\n`;
    }
  }
}
