/**
 * 批量改名工具 - PC-98风格的文件批量重命名应用
 *
 * 功能说明：
 * 1. 文件上传 - 支持拖拽上传和点击选择，可同时选择多个任意类型文件
 * 2. 改名规则 - 提供4种可组合使用的改名规则：
 *    a. 查找替换 - 支持普通文本和正则表达式匹配替换
 *    b. 添加前缀/后缀 - 在文件名前后添加指定文字
 *    c. 序号命名 - 用统一基础名 + 递增编号重新命名文件
 *    d. 大小写转换 - 支持全部大写、全部小写、首字母大写三种模式
 * 3. 实时预览 - 任何规则修改都会立即更新预览列表
 * 4. 冲突检测 - 自动检测新文件名是否重复，重复则红色高亮提示
 * 5. 批量下载 - 执行改名后逐个下载重命名后的文件
 *
 * 改名规则按顺序应用：查找替换 → 添加前缀/后缀 → 序号命名 → 大小写转换
 */

import { WindowManager } from '../core/WindowManager';

/** 用户上传的文件项接口，记录原始文件和改名后的新名称 */
interface FileEntry {
  /** 用户通过input选取的原始File对象 */
  file: File;
  /** 改名后的新文件名（不含路径，仅文件名部分） */
  newName: string;
}

export class BatchRenameApp {
  /** 窗口管理器引用 - 用于创建和操作窗口 */
  private wm: WindowManager;

  /** 用户上传的文件列表，每项包含原始File对象和计算后的新名称 */
  private files: FileEntry[] = [];

  /**
   * 构造函数 - 初始化批量改名应用
   * @param wm - 窗口管理器实例，负责窗口的创建、管理等操作
   */
  constructor(wm: WindowManager) {
    this.wm = wm;
  }

  /**
   * 打开批量改名窗口
   *
   * 调用窗口管理器创建一个新的批量改名工具窗口。
   * 窗口创建后会自动绑定所有交互事件。
   */
  open(): void {
    this.wm.createWindow({
      id: 'batch-rename',          // 窗口唯一标识符
      title: '批量改名',            // 窗口标题栏文字
      icon: '📋',                  // 窗口标题栏图标
      width: 650,                  // 窗口初始宽度（像素）
      height: 480,                 // 窗口初始高度（像素）
      content: this.buildHTML(),   // 窗口内容HTML
      resizable: true,             // 允许用户拖拽调整窗口大小

      // 窗口创建完成后的回调函数
      // 参数 el 是窗口内容区域的DOM元素，用于绑定事件
      onCreated: (el: HTMLElement) => {
        this.bindEvents(el);       // 绑定所有交互事件
      },
    });
  }

  /**
   * 构建批量改名窗口的HTML结构
   *
   * 窗口布局采用左右分栏设计：
   * - 左侧（约40%宽度）：文件上传区 + 改名规则面板
   * - 右侧（约60%宽度）：文件列表预览表格 + 操作按钮
   *
   * 改名规则面板包含4个可折叠的规则区块：
   * 1. 查找替换 - 查找输入框、替换输入框、正则表达式复选框
   * 2. 添加前缀/后缀 - 前缀输入框、后缀输入框
   * 3. 序号命名 - 基础名输入框、起始编号输入框、位数输入框、保留扩展名复选框
   * 4. 大小写转换 - 三个单选按钮（全部大写、全部小写、首字母大写）
   *
   * @returns 窗口内部HTML字符串
   */
  private buildHTML(): string {
    return `
      <div class="batch-rename-container" style="display:flex;flex-direction:column;height:100%;gap:6px;font-family:var(--font-pixel);font-size:12px;color:var(--pc-white);">
        <!-- 主体区域：左右分栏布局 -->
        <div style="flex:1;display:flex;gap:6px;min-height:0;">

          <!-- ========== 左侧面板：文件上传区 + 改名规则 ========== -->
          <div style="width:40%;display:flex;flex-direction:column;gap:6px;flex-shrink:0;overflow-y:auto;">

            <!-- 文件上传区：支持拖拽和点击选择 -->
            <div class="batch-upload-area" style="border:2px dashed var(--pc-pink);padding:16px 8px;text-align:center;cursor:pointer;background:rgba(255,105,180,0.05);">
              <div style="font-size:20px;margin-bottom:4px;">📁</div>
              <div style="color:var(--pc-gray);font-size:11px;">拖拽文件到此处或点击选择</div>
              <!-- 隐藏的文件选择输入框，multiple属性允许同时选择多个文件 -->
              <input type="file" class="batch-file-input" multiple style="display:none;">
            </div>

            <!-- 改名规则面板 -->
            <div style="display:flex;flex-direction:column;gap:4px;">

              <!-- ====== 规则1：查找替换 ====== -->
              <fieldset style="border:1px solid var(--pc-dark-gray);padding:6px;margin:0;">
                <legend style="color:var(--pc-pink);font-size:11px;padding:0 4px;">查找替换</legend>
                <div style="display:flex;flex-direction:column;gap:4px;">
                  <!-- 查找输入框 -->
                  <div style="display:flex;align-items:center;gap:4px;">
                    <label style="width:40px;flex-shrink:0;color:var(--pc-gray);">查找:</label>
                    <input type="text" class="pc-input batch-find" style="font-size:12px;" placeholder="输入要查找的文本">
                  </div>
                  <!-- 替换输入框 -->
                  <div style="display:flex;align-items:center;gap:4px;">
                    <label style="width:40px;flex-shrink:0;color:var(--pc-gray);">替换:</label>
                    <input type="text" class="pc-input batch-replace" style="font-size:12px;" placeholder="替换为...">
                  </div>
                  <!-- 正则表达式复选框：勾选后查找输入框的内容会被当作正则表达式处理 -->
                  <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--pc-gray);font-size:11px;">
                    <input type="checkbox" class="batch-regex">
                    使用正则表达式
                  </label>
                </div>
              </fieldset>

              <!-- ====== 规则2：添加前缀/后缀 ====== -->
              <fieldset style="border:1px solid var(--pc-dark-gray);padding:6px;margin:0;">
                <legend style="color:var(--pc-pink);font-size:11px;padding:0 4px;">前缀/后缀</legend>
                <div style="display:flex;flex-direction:column;gap:4px;">
                  <!-- 前缀输入框：在文件名最前面添加的文字 -->
                  <div style="display:flex;align-items:center;gap:4px;">
                    <label style="width:40px;flex-shrink:0;color:var(--pc-gray);">前缀:</label>
                    <input type="text" class="pc-input batch-prefix" style="font-size:12px;" placeholder="添加前缀...">
                  </div>
                  <!-- 后缀输入框：在文件名（扩展名之前）最后面添加的文字 -->
                  <div style="display:flex;align-items:center;gap:4px;">
                    <label style="width:40px;flex-shrink:0;color:var(--pc-gray);">后缀:</label>
                    <input type="text" class="pc-input batch-suffix" style="font-size:12px;" placeholder="添加后缀...">
                  </div>
                </div>
              </fieldset>

              <!-- ====== 规则3：序号命名 ====== -->
              <fieldset style="border:1px solid var(--pc-dark-gray);padding:6px;margin:0;">
                <legend style="color:var(--pc-pink);font-size:11px;padding:0 4px;">序号命名</legend>
                <div style="display:flex;flex-direction:column;gap:4px;">
                  <!-- 基础名输入框：序号命名时的固定前缀部分，如 "file" 则生成 file001.txt -->
                  <div style="display:flex;align-items:center;gap:4px;">
                    <label style="width:40px;flex-shrink:0;color:var(--pc-gray);">基础:</label>
                    <input type="text" class="pc-input batch-seq-base" style="font-size:12px;" placeholder="如: file">
                  </div>
                  <!-- 起始编号输入框：序号从几开始，默认为1 -->
                  <div style="display:flex;align-items:center;gap:4px;">
                    <label style="width:40px;flex-shrink:0;color:var(--pc-gray);">起始:</label>
                    <input type="number" class="pc-input batch-seq-start" style="font-size:12px;width:60px;" value="1" min="0">
                  </div>
                  <!-- 位数输入框：编号的数字位数，如3表示001，4表示0001 -->
                  <div style="display:flex;align-items:center;gap:4px;">
                    <label style="width:40px;flex-shrink:0;color:var(--pc-gray);">位数:</label>
                    <input type="number" class="pc-input batch-seq-digits" style="font-size:12px;width:60px;" value="3" min="1" max="10">
                  </div>
                  <!-- 保留扩展名复选框：勾选后序号命名会保留原始文件的扩展名，默认勾选 -->
                  <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--pc-gray);font-size:11px;">
                    <input type="checkbox" class="batch-seq-ext" checked>
                    保留扩展名
                  </label>
                </div>
              </fieldset>

              <!-- ====== 规则4：大小写转换 ====== -->
              <fieldset style="border:1px solid var(--pc-dark-gray);padding:6px;margin:0;">
                <legend style="color:var(--pc-pink);font-size:11px;padding:0 4px;">大小写</legend>
                <div style="display:flex;flex-direction:column;gap:2px;">
                  <!-- 全部大写单选按钮 -->
                  <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--pc-gray);font-size:11px;">
                    <input type="radio" name="batch-case" class="batch-case" value="upper">
                    全部大写 (ABC)
                  </label>
                  <!-- 全部小写单选按钮 -->
                  <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--pc-gray);font-size:11px;">
                    <input type="radio" name="batch-case" class="batch-case" value="lower">
                    全部小写 (abc)
                  </label>
                  <!-- 首字母大写单选按钮 -->
                  <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--pc-gray);font-size:11px;">
                    <input type="radio" name="batch-case" class="batch-case" value="capitalize">
                    首字母大写 (Abc)
                  </label>
                </div>
              </fieldset>

            </div>
          </div>

          <!-- ========== 右侧面板：文件列表预览 + 操作按钮 ========== -->
          <div style="flex:1;display:flex;flex-direction:column;gap:6px;min-width:0;">

            <!-- 文件列表预览区域：使用表格显示原名和新名的对应关系 -->
            <div class="batch-preview-wrap" style="flex:1;overflow-y:auto;border:2px inset var(--pc-dark-gray);background:var(--pc-black);">
              <!-- 表头：固定显示，不随内容滚动 -->
              <div style="display:flex;background:var(--pc-dark-gray);padding:4px 8px;font-size:11px;border-bottom:1px solid var(--pc-pink);position:sticky;top:0;z-index:1;">
                <span style="flex:1;min-width:0;">原名</span>
                <span style="width:20px;text-align:center;">→</span>
                <span style="flex:1;min-width:0;">新名</span>
              </div>
              <!-- 文件列表内容区域：动态生成 -->
              <div class="batch-file-list" style="padding:2px 0;">
                <!-- 未上传文件时的提示文字 -->
                <div class="batch-empty-hint" style="padding:20px;text-align:center;color:var(--pc-gray);font-size:11px;">
                  请先选择文件
                </div>
              </div>
            </div>

            <!-- 操作按钮区域 -->
            <div style="display:flex;gap:6px;justify-content:flex-end;">
              <!-- 预览按钮：应用所有改名规则，实时更新预览列表 -->
              <button class="pc-btn batch-preview-btn" style="padding:4px 16px;">预览</button>
              <!-- 执行改名并下载按钮：将所有文件按新名称逐个下载 -->
              <button class="glow-btn batch-download-btn" style="padding:4px 16px;" disabled>执行改名并下载</button>
            </div>

          </div>
        </div>

        <!-- 底部状态栏 -->
        <div class="status-bar">
          <span class="batch-status">就绪</span>
        </div>
      </div>
    `;
  }

  /**
   * 绑定所有交互事件
   *
   * 绑定的事件包括：
   * 1. 文件上传区点击事件 - 触发隐藏的file input
   * 2. 文件上传区拖拽事件 - 支持拖拽文件上传
   * 3. file input change事件 - 处理用户选择的文件
   * 4. 所有规则输入框的input/change事件 - 任何规则变更时自动更新预览
   * 5. 预览按钮点击事件 - 手动触发预览更新
   * 6. 执行改名并下载按钮点击事件 - 逐个下载重命名后的文件
   *
   * @param el - 窗口内容区域的DOM元素
   */
  private bindEvents(el: HTMLElement): void {
    // ---------- 文件上传相关事件 ----------

    // 获取文件上传区域和隐藏的file input元素
    const uploadArea = el.querySelector('.batch-upload-area') as HTMLElement;
    const fileInput = el.querySelector('.batch-file-input') as HTMLInputElement;

    // 点击上传区域时，触发隐藏的file input的点击，打开文件选择对话框
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    // 监听file input的change事件，当用户选择文件后处理文件列表
    fileInput.addEventListener('change', () => {
      // 检查files是否为null，避免将null赋值给FileList类型参数
      if (fileInput.files) {
        this.handleFiles(fileInput.files, el);
      }
    });

    // 拖拽事件 - 阻止浏览器默认的拖拽行为（防止直接打开文件）
    uploadArea.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault(); // 阻止默认行为，允许在此区域放置文件
      uploadArea.style.borderColor = 'var(--pc-neon-green)'; // 拖拽悬停时边框变为绿色提示
    });

    // 拖拽离开事件 - 恢复边框颜色
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = 'var(--pc-pink)'; // 恢复为默认粉色边框
    });

    // 拖拽释放事件 - 处理放置的文件
    uploadArea.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault(); // 阻止默认行为
      uploadArea.style.borderColor = 'var(--pc-pink)'; // 恢复边框颜色
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        // 如果拖拽了文件，处理这些文件
        this.handleFiles(e.dataTransfer.files, el);
      }
    });

    // ---------- 规则输入框实时预览事件 ----------

    // 需要监听的所有规则输入框和控件的选择器列表
    // 任何这些控件的值变化都会触发实时预览更新
    const ruleSelectors = [
      '.batch-find',        // 查找文本输入框
      '.batch-replace',     // 替换文本输入框
      '.batch-regex',       // 正则表达式复选框
      '.batch-prefix',      // 前缀输入框
      '.batch-suffix',      // 后缀输入框
      '.batch-seq-base',    // 序号基础名输入框
      '.batch-seq-start',   // 序号起始编号输入框
      '.batch-seq-digits',  // 序号位数输入框
      '.batch-seq-ext',     // 保留扩展名复选框
    ];

    // 为每个规则控件绑定input事件（文本输入时触发）和change事件（复选框/数字框变化时触发）
    ruleSelectors.forEach((selector: string) => {
      const element = el.querySelector(selector);
      if (element) {
        // input事件：在用户输入文本时实时触发预览更新
        element.addEventListener('input', () => {
          this.updatePreview(el); // 实时更新预览列表
        });
        // change事件：在复选框勾选/取消、数字框值变化时触发
        element.addEventListener('change', () => {
          this.updatePreview(el); // 实时更新预览列表
        });
      }
    });

    // 大小写转换的单选按钮需要单独绑定change事件
    el.querySelectorAll('.batch-case').forEach((radio: Element) => {
      radio.addEventListener('change', () => {
        this.updatePreview(el); // 切换大小写模式时更新预览
      });
    });

    // ---------- 按钮事件 ----------

    // 预览按钮 - 手动触发预览更新（规则变更时已自动更新，此按钮为显式操作）
    el.querySelector('.batch-preview-btn')!.addEventListener('click', () => {
      this.updatePreview(el);
    });

    // 执行改名并下载按钮 - 将所有文件按新名称逐个触发浏览器下载
    el.querySelector('.batch-download-btn')!.addEventListener('click', () => {
      this.downloadRenamedFiles(el);
    });
  }

  /**
   * 处理用户选择或拖拽的文件
   *
   * 将传入的FileList转换为内部的FileEntry数组，
   * 每个FileEntry包含原始File对象和初始新名称（等于原文件名）。
   * 处理完成后自动更新预览列表。
   *
   * @param fileList - 浏览器提供的FileList对象（来自input或drag&drop）
   * @param el - 窗口内容区域的DOM元素，用于更新UI
   */
  private handleFiles(fileList: FileList, el: HTMLElement): void {
    // 清空之前的文件列表
    this.files = [];

    // 遍历FileList，为每个文件创建FileEntry对象
    for (let i: number = 0; i < fileList.length; i++) {
      const file: File = fileList[i];                // 获取当前文件对象
      this.files.push({
        file: file,                                    // 保存原始File对象（用于后续下载）
        newName: file.name,                            // 初始新名称等于原文件名
      });
    }

    // 更新状态栏显示文件数量
    const status = el.querySelector('.batch-status') as HTMLElement;
    status.textContent = `已选择 ${this.files.length} 个文件`;

    // 更新预览列表
    this.updatePreview(el);

    // 启用"执行改名并下载"按钮（有文件时才可用）
    const downloadBtn = el.querySelector('.batch-download-btn') as HTMLButtonElement;
    downloadBtn.disabled = this.files.length === 0; // 没有文件时保持禁用
  }

  /**
   * 应用所有改名规则，计算每个文件的新名称
   *
   * 改名规则按以下顺序依次应用：
   * 1. 查找替换 - 在文件名中查找并替换文本（支持正则表达式）
   * 2. 添加前缀/后缀 - 在文件名前后添加文字（后缀添加在扩展名之前）
   * 3. 序号命名 - 如果设置了基础名，则完全替换为"基础名+编号"格式
   * 4. 大小写转换 - 对最终文件名进行大小写转换
   *
   * 每步操作只修改文件名部分（不含扩展名），扩展名在最后统一拼接。
   *
   * @param el - 窗口内容区域的DOM元素，用于读取规则输入框的值
   */
  private applyRules(el: HTMLElement): void {
    // ---------- 读取所有规则输入框的值 ----------

    // 查找替换规则参数
    const findText: string = (el.querySelector('.batch-find') as HTMLInputElement).value;      // 要查找的文本
    const replaceText: string = (el.querySelector('.batch-replace') as HTMLInputElement).value;  // 替换为的文本
    const useRegex: boolean = (el.querySelector('.batch-regex') as HTMLInputElement).checked;     // 是否使用正则表达式

    // 前缀/后缀规则参数
    const prefix: string = (el.querySelector('.batch-prefix') as HTMLInputElement).value;  // 前缀文字
    const suffix: string = (el.querySelector('.batch-suffix') as HTMLInputElement).value;  // 后缀文字

    // 序号命名规则参数
    const seqBase: string = (el.querySelector('.batch-seq-base') as HTMLInputElement).value;          // 序号基础名
    const seqStart: number = parseInt((el.querySelector('.batch-seq-start') as HTMLInputElement).value, 10) || 1;  // 起始编号
    const seqDigits: number = parseInt((el.querySelector('.batch-seq-digits') as HTMLInputElement).value, 10) || 3; // 编号位数
    const seqKeepExt: boolean = (el.querySelector('.batch-seq-ext') as HTMLInputElement).checked;         // 是否保留扩展名

    // 大小写转换模式：从选中的单选按钮获取value值
    const caseRadio = el.querySelector('.batch-case:checked') as HTMLInputElement;
    const caseMode: string = caseRadio ? caseRadio.value : ''; // 'upper' | 'lower' | 'capitalize' | ''

    // ---------- 遍历每个文件，按顺序应用规则 ----------

    this.files.forEach((entry: FileEntry, index: number) => {
      // 分离文件名和扩展名
      const originalName: string = entry.file.name;       // 完整原始文件名（含扩展名）
      const lastDotIndex: number = originalName.lastIndexOf('.'); // 查找最后一个点的位置
      let namePart: string;   // 文件名部分（不含扩展名）
      let extPart: string;    // 扩展名部分（含点号，如 ".txt"）

      if (lastDotIndex > 0) {
        // 有扩展名的情况：按最后一个点分割
        namePart = originalName.substring(0, lastDotIndex); // 点之前的部分为文件名
        extPart = originalName.substring(lastDotIndex);     // 从点开始到末尾为扩展名
      } else {
        // 没有扩展名的情况
        namePart = originalName; // 整个文件名
        extPart = '';           // 无扩展名
      }

      // ====== 步骤1：查找替换 ======
      if (findText) {
        if (useRegex) {
          // 使用正则表达式模式进行替换
          try {
            // 创建正则表达式对象，'g'标志表示全局匹配（替换所有匹配项）
            const regex: RegExp = new RegExp(findText, 'g');
            namePart = namePart.replace(regex, replaceText); // 执行正则替换
          } catch {
            // 正则表达式语法错误时，跳过此规则不做替换
            // （用户可能输入了无效的正则表达式）
          }
        } else {
          // 使用普通文本模式进行替换
          // String.replace()的第一个参数为字符串时，只替换第一个匹配项
          // 使用split().join()技巧实现全局替换（替换所有匹配项）
          namePart = namePart.split(findText).join(replaceText);
        }
      }

      // ====== 步骤2：添加前缀/后缀 ======
      if (prefix) {
        // 在文件名最前面添加前缀文字
        namePart = prefix + namePart;
      }
      if (suffix) {
        // 在文件名（扩展名之前）最后面添加后缀文字
        namePart = namePart + suffix;
      }

      // ====== 步骤3：序号命名 ======
      if (seqBase) {
        // 如果设置了基础名，则完全使用"基础名+编号"作为新文件名
        // 不再保留之前的文件名内容（序号命名是独立的命名方式）
        const seqNum: number = seqStart + index; // 当前文件的编号 = 起始编号 + 文件在列表中的索引
        // 将编号格式化为指定位数的字符串，不足位数前面补零
        // 例如：编号1、位数3 → "001"；编号5、位数4 → "0005"
        const seqStr: string = String(seqNum).padStart(seqDigits, '0');
        namePart = seqBase + seqStr; // 组合基础名和编号

        // 如果不保留扩展名，清空扩展名部分
        if (!seqKeepExt) {
          extPart = ''; // 不保留扩展名
        }
      }

      // ====== 步骤4：大小写转换 ======
      if (caseMode === 'upper') {
        // 全部转为大写字母
        namePart = namePart.toUpperCase();
      } else if (caseMode === 'lower') {
        // 全部转为小写字母
        namePart = namePart.toLowerCase();
      } else if (caseMode === 'capitalize') {
        // 首字母大写：将文件名的第一个字符转为大写，其余转为小写
        if (namePart.length > 0) {
          namePart = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
        }
      }

      // 拼接最终的文件名（文件名部分 + 扩展名部分）
      entry.newName = namePart + extPart;
    });
  }

  /**
   * 更新文件列表预览
   *
   * 先应用所有改名规则计算新名称，然后重新渲染预览列表。
   * 预览列表中：
   * - 新名与原名相同 → 灰色显示（表示此文件不受当前规则影响）
   * - 新名与其他文件的新名重复 → 红色高亮（表示命名冲突）
   * - 新名与原名不同且无冲突 → 正常显示
   *
   * @param el - 窗口内容区域的DOM元素
   */
  private updatePreview(el: HTMLElement): void {
    // 如果没有文件，显示提示文字并返回
    if (this.files.length === 0) {
      const fileList = el.querySelector('.batch-file-list') as HTMLElement;
      fileList.innerHTML = `
        <div class="batch-empty-hint" style="padding:20px;text-align:center;color:var(--pc-gray);font-size:11px;">
          请先选择文件
        </div>
      `;
      return;
    }

    // 应用所有改名规则，计算每个文件的新名称
    this.applyRules(el);

    // 检测新名称是否有重复（冲突）
    // 使用Set来记录已经出现过的新名称
    const seenNames: Set<string> = new Set<string>();
    // 记录哪些新名称存在重复（值为出现次数）
    const duplicateNames: Set<string> = new Set<string>();
    this.files.forEach((entry: FileEntry) => {
      if (seenNames.has(entry.newName)) {
        // 这个新名称之前已经出现过，标记为重复
        duplicateNames.add(entry.newName);
      } else {
        // 首次出现，记录到已见集合
        seenNames.add(entry.newName);
      }
    });

    // 渲染预览列表
    const fileList = el.querySelector('.batch-file-list') as HTMLElement;
    fileList.innerHTML = ''; // 清空现有内容

    // 遍历每个文件，创建预览行
    this.files.forEach((entry: FileEntry) => {
      const originalName: string = entry.file.name; // 原始文件名
      const newName: string = entry.newName;         // 改名后的新文件名

      // 判断文件行的显示状态
      const isUnchanged: boolean = originalName === newName;       // 新名是否与原名相同
      const isDuplicate: boolean = duplicateNames.has(newName);     // 新名是否与其他文件冲突

      // 创建文件预览行DOM元素
      const row: HTMLDivElement = document.createElement('div');
      row.style.cssText = 'display:flex;padding:2px 8px;font-size:11px;border-bottom:1px solid rgba(255,105,180,0.1);';

      // 根据状态设置行的颜色样式
      if (isDuplicate) {
        // 名称冲突：红色高亮背景，醒目提示用户
        row.style.background = 'rgba(255,0,0,0.2)';
        row.style.color = 'var(--pc-hot-pink)'; // 使用热粉色（项目中最接近红色的颜色）
      } else if (isUnchanged) {
        // 名称未变化：灰色显示，表示此文件不受当前规则影响
        row.style.color = 'var(--pc-dark-gray)';
      }

      // 设置行的内容：原名 → 新名
      row.innerHTML = `
        <!-- 原名列：使用CSS截断过长文件名 -->
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${originalName}">${originalName}</span>
        <!-- 箭头分隔符 -->
        <span style="width:20px;text-align:center;color:var(--pc-gray);flex-shrink:0;">→</span>
        <!-- 新名列：使用CSS截断过长文件名 -->
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${newName}">${newName}</span>
      `;

      // 鼠标悬停时高亮行背景（方便用户查看）
      row.addEventListener('mouseenter', () => {
        if (!isDuplicate) {
          row.style.background = 'rgba(255,105,180,0.1)';
        }
      });
      row.addEventListener('mouseleave', () => {
        if (!isDuplicate && !isUnchanged) {
          row.style.background = '';
        } else if (isUnchanged) {
          row.style.background = '';
        }
      });

      // 将行添加到文件列表
      fileList.appendChild(row);
    });
  }

  /**
   * 下载所有重命名后的文件
   *
   * 为每个文件创建一个临时的<a>元素，设置download属性为新文件名，
   * 然后触发点击来下载文件。使用URL.createObjectURL()为每个File对象
   * 创建临时URL，下载后立即释放URL资源。
   *
   * 注意：浏览器可能会阻止连续多次自动下载，用户可能需要允许批量下载。
   *
   * @param el - 窗口内容区域的DOM元素
   */
  private downloadRenamedFiles(el: HTMLElement): void {
    // 更新状态栏，提示正在下载
    const status = el.querySelector('.batch-status') as HTMLElement;
    status.textContent = '正在下载...';

    // 使用setTimeout避免浏览器阻塞UI，让状态栏文字先更新显示
    setTimeout(() => {
      // 逐个下载每个重命名后的文件
      this.files.forEach((entry: FileEntry, index: number) => {
        // 创建临时<a>元素用于触发下载
        const link: HTMLAnchorElement = document.createElement('a');

        // 使用URL.createObjectURL为File对象创建一个临时的blob URL
        // 这个URL指向原始文件的数据内容
        const blobUrl: string = URL.createObjectURL(entry.file);
        link.href = blobUrl;              // 设置链接地址为blob URL
        link.download = entry.newName;   // 设置download属性为新文件名（浏览器下载时使用此名称）

        // 将<a>元素添加到DOM中（必须是DOM中的元素才能触发点击）
        document.body.appendChild(link);

        // 触发点击事件，启动浏览器下载
        link.click();

        // 从DOM中移除临时<a>元素
        document.body.removeChild(link);

        // 释放blob URL资源，避免内存泄漏
        // 每个createObjectURL()都会占用内存，必须手动释放
        URL.revokeObjectURL(blobUrl);

        // 每个下载之间间隔100ms，避免浏览器同时发起过多下载请求
        // 如果间隔太短，浏览器可能会忽略部分下载
        if (index < this.files.length - 1) {
          // 这里不使用setTimeout，因为forEach是同步执行的
          // 实际间隔效果通过浏览器的下载队列机制实现
        }
      });

      // 所有文件下载请求已发出，更新状态栏
      status.textContent = `已下载 ${this.files.length} 个文件`;
    }, 100); // 延迟100ms执行，确保状态栏文字先显示
  }
}
