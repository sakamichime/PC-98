/**
 * 互联网浏览器 - PC-98模拟系统中的Web浏览器
 *
 * 这个文件实现了一个模拟2000年代风格的互联网浏览器，主要用于展示PC-98复古计算相关的网页内容。
 * 浏览器包含以下功能：
 * 1. 地址栏 - 可以输入URL进行页面导航
 * 2. 导航按钮 - 前进、后退、刷新、主页四个常用导航功能
 * 3. 书签栏 - 快速访问常用网站的快捷方式
 * 4. 预设网页内容 - 包含首页、热门站点、搜索引擎、论坛、百科共5个页面
 * 5. 404页面 - 当访问不存在的页面时显示错误提示
 * 6. 加载模拟 - 模拟网页加载的延迟效果
 *
 * 所有网页内容都与PC-98复古计算相关，包括复古游戏、编程技术、硬件介绍等主题。
 */

import { WindowManager } from '../core/WindowManager';

/**
 * WebPage 接口 - 定义一个预设网页的数据结构
 * @property url - 网页的URL地址，使用 pc98:// 协议
 * @property title - 网页的标题，显示在浏览器标题栏中
 * @property content - 网页的HTML内容，直接渲染在浏览器内容区域
 */
export interface WebPage {
  /** 网页URL地址 */
  url: string;
  /** 网页标题 */
  title: string;
  /** 网页HTML内容 */
  content: string;
}

/**
 * InternetApp 类 - 互联网浏览器应用程序
 *
 * 这个类封装了浏览器的所有功能，包括：
 * - 管理浏览历史记录（前进/后退）
 * - 加载和渲染预设页面
 * - 处理用户交互（点击导航按钮、地址栏输入、书签点击等）
 *
 * @example
 * // 创建并打开浏览器
 * const browser = new InternetApp(windowManager);
 * browser.open();
 */
export class InternetApp {
  /** WindowManager实例引用，用于创建窗口和更新窗口标题 */
  private wm: WindowManager;

  /** 当前正在显示的页面，如果还没有加载任何页面则为null */
  private currentPage: WebPage | null = null;

  /** 浏览历史记录数组，存储用户访问过的所有URL */
  private history: string[] = [];

  /** 当前在历史记录中的索引位置，用于前进/后退导航 */
  private historyIndex = -1;

  /**
   * 预设网页集合 - 使用Map存储，键为页面标识符，值为WebPage对象
   *
   * 包含以下5个预设页面：
   * - home: 首页，展示PC-98互联网的入口和推荐网站
   * - trending: 热门站点，展示当前热门的PC-98相关网站
   * - search: 搜索页，模拟搜索引擎界面
   * - forum: 论坛，展示PC-98技术讨论帖子
   * - wiki: 百科，展示PC-98相关的知识词条
   */
  private readonly pages: Map<string, WebPage> = new Map([
    /* ========== 首页 - PC-98互联网入口 ========== */
    [
      'home',
      {
        url: 'pc98://home',
        title: 'PC-98互联网 - 首页',
        content: `
        <div style="text-align:center;padding:20px;">
          <!-- 首页大标题，使用粉色霓虹效果 -->
          <h2 style="color:var(--pc-pink);font-size:24px;margin-bottom:16px;" class="neon-text">🖥️ PC-98互联网</h2>
          <!-- 副标题说明文字 -->
          <div style="color:var(--pc-gray);margin-bottom:20px;">连接全日本的复古计算爱好者</div>
          <!-- 四个快速导航卡片：热门、搜索、论坛、百科 -->
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <!-- 热门站点卡片 - 点击跳转到热门页面 -->
            <div style="padding:12px;border:1px solid var(--pc-pink);background:rgba(255,105,180,0.1);width:180px;cursor:pointer;" class="bookmark" data-url="pc98://trending">
              <div style="font-size:24px;margin-bottom:4px;">🔥</div>
              <div style="color:var(--pc-pink);">热门站点</div>
            </div>
            <!-- 搜索卡片 - 点击跳转到搜索页面 -->
            <div style="padding:12px;border:1px solid var(--pc-purple);background:rgba(153,50,204,0.1);width:180px;cursor:pointer;" class="bookmark" data-url="pc98://search">
              <div style="font-size:24px;margin-bottom:4px;">🔍</div>
              <div style="color:var(--pc-purple);">搜索</div>
            </div>
            <!-- 论坛卡片 - 点击跳转到论坛页面 -->
            <div style="padding:12px;border:1px solid var(--pc-neon-blue);background:rgba(0,191,255,0.1);width:180px;cursor:pointer;" class="bookmark" data-url="pc98://forum">
              <div style="font-size:24px;margin-bottom:4px;">💬</div>
              <div style="color:var(--pc-neon-blue);">论坛</div>
            </div>
            <!-- 百科卡片 - 点击跳转到百科页面 -->
            <div style="padding:12px;border:1px solid var(--pc-neon-green);background:rgba(57,255,20,0.1);width:180px;cursor:pointer;" class="bookmark" data-url="pc98://wiki">
              <div style="font-size:24px;margin-bottom:4px;">📖</div>
              <div style="color:var(--pc-neon-green);">百科</div>
            </div>
          </div>
          <!-- 推荐网站区域 - 展示PC-98相关的热门网站链接 -->
          <div style="margin-top:24px;border-top:1px solid var(--pc-pink);padding-top:12px;">
            <div style="font-size:11px;color:var(--pc-gray);">推荐网站</div>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px;">
              <!-- PC-98博物馆 - 展示PC-98历史和硬件收藏 -->
              <div style="padding:8px;background:rgba(255,105,180,0.15);border:1px solid var(--pc-pink);font-size:12px;cursor:pointer;">🖥️ PC-98博物馆</div>
              <!-- 复古游戏数据库 - 收录经典PC-98游戏信息 -->
              <div style="padding:8px;background:rgba(153,50,204,0.15);border:1px solid var(--pc-purple);font-size:12px;cursor:pointer;">🎮 复古游戏数据库</div>
              <!-- X68000研究所 - 关于另一款经典日本家用电脑 -->
              <div style="padding:8px;background:rgba(0,191,255,0.15);border:1px solid var(--pc-neon-blue);font-size:12px;cursor:pointer;">🔬 X68000研究所</div>
            </div>
          </div>
        </div>
      `,
      },
    ],

    /* ========== 热门站点页 - 展示当前热门的PC-98相关网站 ========== */
    [
      'trending',
      {
        url: 'pc98://trending',
        title: '热门站点 - PC-98互联网',
        content: `
        <h3 style="color:var(--pc-pink);margin-bottom:12px;">🔥 热门站点</h3>
        <!-- 站点列表 - 使用flex列布局，每个站点一行 -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${
            /* 使用数组.map生成每个站点的HTML，包含站点名称、分类、描述和访问量 */
            [
              { name: 'PC-98博物馆', viewers: '12.5K', category: '硬件收藏', desc: '展示从PC-8801到PC-9821的完整硬件收藏' },
              { name: '复古游戏数据库', viewers: '8.3K', category: '游戏资料', desc: '收录超过5000款PC-98平台经典游戏' },
              { name: 'X68000研究所', viewers: '6.7K', category: '技术研究', desc: '深入解析X68000系列硬件架构' },
              { name: 'FM TOWNS资料馆', viewers: '4.2K', category: '历史档案', desc: '富士通FM TOWNS系列完整资料' },
              { name: 'BASIC编程教室', viewers: '3.1K', category: '编程教学', desc: '从零开始学习N88-BASIC编程' },
            ]
              .map(
                (s) => `
            <!-- 单个站点条目 - 横向排列：图标 | 信息 | 访问量 -->
            <div style="padding:8px;border:1px solid var(--pc-dark-gray);background:rgba(255,105,180,0.05);cursor:pointer;display:flex;gap:12px;align-items:center;">
              <!-- 站点图标区域 - 48x48像素的紫色方块 -->
              <div style="width:48px;height:48px;background:var(--pc-purple);display:flex;align-items:center;justify-content:center;font-size:24px;">🖥️</div>
              <!-- 站点信息区域 - 包含名称、分类和描述 -->
              <div style="flex:1;">
                <div style="color:var(--pc-pink);font-weight:bold;">${s.name}</div>
                <div style="color:var(--pc-gray);font-size:11px;">${s.category}</div>
                <div style="color:var(--pc-light-pink);font-size:12px;">${s.desc}</div>
              </div>
              <!-- 站点访问量显示 -->
              <div style="color:var(--pc-neon-blue);font-size:12px;">👁 ${s.viewers}</div>
            </div>
          `
              )
              .join('')
          }
        </div>
      `,
      },
    ],

    /* ========== 搜索页 - 模拟PC-98互联网搜索引擎 ========== */
    [
      'search',
      {
        url: 'pc98://search',
        title: 'PC-98搜索',
        content: `
        <div style="text-align:center;padding:20px;">
          <!-- 搜索引擎标题 -->
          <h2 style="color:var(--pc-pink);font-size:20px;margin-bottom:16px;">🔍 PC-98搜索</h2>
          <!-- 搜索输入框 - 使用pc-input样式，设置最大宽度 -->
          <input type="text" class="pc-input search-input" placeholder="搜索网站、游戏、技术资料..." style="max-width:400px;margin-bottom:16px;">
          <!-- 热门搜索关键词区域 -->
          <div style="font-size:11px;color:var(--pc-gray);margin-top:16px;">热门搜索</div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px;">
            ${
              /* 生成热门搜索标签，都是PC-98相关的关键词 */
              ['PC-98', '复古游戏', 'N88-BASIC', 'R-DEP', 'TH04 东方幻想乡', '编程教程'].map(
                (t) =>
                  /* 每个标签是一个可点击的span元素，带有粉色边框 */
                  `<span style="padding:4px 12px;border:1px solid var(--pc-pink);cursor:pointer;font-size:12px;">${t}</span>`
              ).join('')
            }
          </div>
        </div>
      `,
      },
    ],

    /* ========== 论坛页 - PC-98技术讨论社区 ========== */
    [
      'forum',
      {
        url: 'pc98://forum',
        title: 'PC-98论坛',
        content: `
        <h3 style="color:var(--pc-neon-blue);margin-bottom:12px;">💬 PC-98论坛</h3>
        <!-- 论坛分类筛选按钮栏 -->
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button class="pc-btn" style="font-size:11px;padding:2px 8px;">全部</button>
          <button class="pc-btn" style="font-size:11px;padding:2px 8px;">技术讨论</button>
          <button class="pc-btn" style="font-size:11px;padding:2px 8px;">游戏攻略</button>
          <button class="pc-btn" style="font-size:11px;padding:2px 8px;">硬件改装</button>
          <button class="pc-btn" style="font-size:11px;padding:2px 8px;">求助</button>
        </div>
        <!-- 帖子列表 - 使用flex列布局，每篇帖子一行 -->
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${
            /* 使用数组.map生成每篇帖子的HTML */
            [
              { title: '如何在PC-98上运行自制程序？', author: 'BASIC入门者', replies: 234, time: '3分钟前' },
              { title: '推荐几款必玩的PC-98经典RPG', author: '复古玩家', replies: 67, time: '15分钟前' },
              { title: 'PC-9821的内存升级方案分享', author: '硬件发烧友', replies: 189, time: '1小时前' },
              { title: 'N88-BASIC绘图命令速查表', author: '编程老师', replies: 45, time: '2小时前' },
              { title: '哪里可以买到PC-98的CRT显示器？', author: '收藏家', replies: 12, time: '3小时前' },
              { title: '东方系列在PC-98上的运行配置', author: 'STG爱好者', replies: 89, time: '5小时前' },
            ]
              .map(
                (p) => `
            <!-- 单篇帖子条目 - 显示标题、作者、回复数和时间 -->
            <div style="padding:6px 8px;border-bottom:1px solid var(--pc-dark-gray);cursor:pointer;">
              <!-- 帖子标题 -->
              <div style="color:var(--pc-white);font-size:13px;">📝 ${p.title}</div>
              <!-- 帖子元信息：作者、回复数、发布时间 -->
              <div style="color:var(--pc-gray);font-size:11px;margin-top:2px;">
                ${p.author} | 💬 ${p.replies} | ${p.time}
              </div>
            </div>
          `
              )
              .join('')
          }
        </div>
      `,
      },
    ],

    /* ========== 百科页 - PC-98相关知识百科 ========== */
    [
      'wiki',
      {
        url: 'pc98://wiki',
        title: 'PC-98百科',
        content: `
        <h3 style="color:var(--pc-neon-green);margin-bottom:12px;">📖 PC-98百科</h3>
        <!-- 百科正文内容区域 -->
        <div style="font-size:13px;line-height:1.8;">
          <!-- 词条标题卡片 - 粉色背景，左侧粉色边框 -->
          <div style="padding:12px;background:rgba(255,105,180,0.1);border-left:3px solid var(--pc-pink);margin-bottom:12px;">
            <!-- 词条主标题 -->
            <div style="color:var(--pc-pink);font-size:16px;font-weight:bold;">PC-9800シリーズ</div>
            <!-- 词条副标题/别名 -->
            <div style="color:var(--pc-gray);font-size:11px;">又名：PC-98 / パソコン98</div>
          </div>
          <!-- 词条正文第一段 - 概述介绍 -->
          <p>「PC-9800シリーズ」是日本电气株式会社（NEC）于1982年至2003年间生产的一系列16位/32位个人计算机。</p>
          <!-- 词条正文第二段 - 历史地位 -->
          <p>在日本的个人计算机市场上占据主导地位长达十余年，尤其是在家庭和办公场景中被广泛使用。</p>
          <br>
          <!-- 基本资料章节标题 -->
          <div style="color:var(--pc-light-pink);font-size:12px;font-weight:bold;">基本资料</div>
          <!-- 基本资料详细内容列表 -->
          <div style="color:var(--pc-gray);font-size:12px;margin-top:4px;">
            <div>📍 制造商：NEC（日本电气）</div>
            <div>📅 生产期间：1982年 - 2003年</div>
            <div>💻 首款型号：PC-9801（1982年10月发售）</div>
            <div>🧮 处理器：Intel 8086 → Pentium</div>
            <div>📊 显示分辨率：640×400（最高支持1120×750）</div>
            <div>🎨 色彩：最高支持1677万色（24bit）</div>
            <div>💾 操作系统：MS-DOS、Windows 95/98/Me</div>
          </div>
          <br>
          <!-- 相关词条链接章节 -->
          <div style="color:var(--pc-light-pink);font-size:12px;font-weight:bold;">相关词条</div>
          <!-- 相关词条链接列表，蓝色文字表示可点击 -->
          <div style="margin-top:4px;">
            <div style="color:var(--pc-neon-blue);cursor:pointer;font-size:12px;">→ N88-BASIC (编程语言)</div>
            <div style="color:var(--pc-neon-blue);cursor:pointer;font-size:12px;">→ PC-98游戏年表</div>
            <div style="color:var(--pc-neon-blue);cursor:pointer;font-size:12px;">→ PC-9821 (后期型号)</div>
          </div>
        </div>
      `,
      },
    ],
  ]);

  /**
   * 构造函数 - 初始化浏览器应用程序
   *
   * @param wm - WindowManager实例，用于创建和管理浏览器窗口
   */
  constructor(wm: WindowManager) {
    this.wm = wm;
  }

  /**
   * 打开浏览器窗口
   *
   * 这个方法会：
   * 1. 调用buildHTML()构建浏览器的完整HTML结构
   * 2. 通过WindowManager创建一个新的浏览器窗口
   * 3. 在窗口创建完成后绑定所有交互事件
   * 4. 自动导航到首页
   */
  open(): void {
    /* 构建浏览器的完整HTML内容 */
    const html = this.buildHTML();

    /* 通过WindowManager创建浏览器窗口 */
    this.wm.createWindow({
      id: 'internet',           /* 窗口唯一标识符 */
      title: '互联网',           /* 窗口标题栏显示的文字 */
      icon: '🌐',                /* 窗口图标（地球符号表示互联网） */
      width: 650,                /* 窗口初始宽度（像素） */
      height: 480,               /* 窗口初始高度（像素） */
      content: html,             /* 窗口内部的HTML内容 */
      resizable: true,           /* 允许用户调整窗口大小 */
      /* 窗口创建完成后的回调函数 */
      onCreated: (el: HTMLElement) => {
        this.bindEvents(el);     /* 绑定所有交互事件 */
        this.navigateTo('home', el); /* 默认加载首页 */
      },
    });
  }

  /**
   * 构建浏览器的完整HTML结构
   *
   * 浏览器界面分为四个区域（从上到下）：
   * 1. 工具栏 - 包含导航按钮（前进/后退/刷新/主页）、地址栏输入框和"前往"按钮
   * 2. 书签栏 - 快速访问常用网站的链接按钮
   * 3. 页面内容区 - 显示当前加载的网页内容，支持滚动
   * 4. 状态栏 - 显示当前页面状态信息
   *
   * @returns 浏览器界面的完整HTML字符串
   */
  private buildHTML(): string {
    return `
      <div style="display:flex;flex-direction:column;height:100%;gap:6px;">
        <!-- ===== 工具栏 ===== -->
        <!-- 包含导航按钮和地址栏的横向排列区域 -->
        <div style="display:flex;gap:4px;align-items:center;">
          <!-- 后退按钮 - 点击返回上一页 -->
          <button class="pc-btn nav-btn" data-action="back" style="padding:2px 8px;font-size:14px;">◀</button>
          <!-- 前进按钮 - 点击前往下一页 -->
          <button class="pc-btn nav-btn" data-action="forward" style="padding:2px 8px;font-size:14px;">▶</button>
          <!-- 刷新按钮 - 点击重新加载当前页面 -->
          <button class="pc-btn nav-btn" data-action="refresh" style="padding:2px 8px;font-size:14px;">⟳</button>
          <!-- 主页按钮 - 点击返回首页 -->
          <button class="pc-btn nav-btn" data-action="home" style="padding:2px 8px;font-size:14px;">🏠</button>
          <!--
            地址栏输入框 - 用户在此输入URL进行页面导航
            重要：必须添加内联样式 flex:1;min-width:150px; 来覆盖 .pc-input 的 width:100%
            否则输入框会撑满整个容器，导致布局错乱
          -->
          <input type="text" class="pc-input url-bar" value="pc98://home" style="flex:1;min-width:150px;font-size:12px;">
          <!-- 前往按钮 - 点击地址栏右侧的此按钮导航到输入的URL -->
          <button class="pc-btn go-btn" style="font-size:11px;">前往</button>
        </div>

        <!-- ===== 书签栏 ===== -->
        <!-- 快速访问常用网站的链接按钮，横向排列，允许换行 -->
        <div class="bookmarks-bar" style="display:flex;gap:6px;font-size:11px;flex-wrap:wrap;">
          <!-- 首页书签 - 粉色，点击跳转到首页 -->
          <span style="color:var(--pc-pink);cursor:pointer;" class="bookmark" data-url="pc98://home">🏠 首页</span>
          <!-- 热门站点书签 - 蓝色，点击跳转到热门页面 -->
          <span style="color:var(--pc-neon-blue);cursor:pointer;" class="bookmark" data-url="pc98://trending">🔥 热门</span>
          <!-- 论坛书签 - 绿色，点击跳转到论坛 -->
          <span style="color:var(--pc-neon-green);cursor:pointer;" class="bookmark" data-url="pc98://forum">💬 论坛</span>
          <!-- 百科书签 - 紫色，点击跳转到百科 -->
          <span style="color:var(--pc-purple);cursor:pointer;" class="bookmark" data-url="pc98://wiki">📖 百科</span>
          <!-- 搜索书签 - 黄色，点击跳转到搜索 -->
          <span style="color:var(--pc-neon-yellow);cursor:pointer;" class="bookmark" data-url="pc98://search">🔍 搜索</span>
        </div>

        <!-- ===== 页面内容区域 ===== -->
        <!-- 这是浏览器的主要内容显示区域，使用黑色背景和凹陷边框模拟窗口样式 -->
        <!-- flex:1 使其占据剩余空间，overflow-y:auto 允许内容超出时垂直滚动 -->
        <div class="browser-content" style="flex:1;overflow-y:auto;background:var(--pc-black);border:2px inset var(--pc-dark-gray);padding:8px;">
        </div>

        <!-- ===== 状态栏 ===== -->
        <!-- 显示当前页面加载状态或错误信息 -->
        <div class="status-bar">
          <span class="page-status">就绪</span>
        </div>
      </div>
    `;
  }

  /**
   * 绑定浏览器所有交互事件
   *
   * 这个方法负责绑定以下交互：
   * 1. 导航按钮点击事件（前进、后退、刷新、主页）
   * 2. 地址栏回车键事件和"前往"按钮点击事件
   * 3. 页面内书签链接和快捷方式的点击事件（使用事件委托）
   *
   * @param el - 浏览器窗口的根HTML元素，所有事件都绑定在这个元素或其子元素上
   */
  private bindEvents(el: HTMLElement): void {
    /* ----- 导航按钮事件绑定 ----- */
    /* 遍历所有带有nav-btn类的按钮，为每个按钮绑定点击事件 */
    el.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        /* 获取按钮上通过data-action属性标记的动作类型 */
        const action = (btn as HTMLElement).dataset.action;

        if (action === 'back' && this.historyIndex > 0) {
          /* 后退操作：仅当历史索引大于0时才能后退（即不是第一页） */
          this.historyIndex--;
          /* 从历史记录中取出要返回的URL */
          const url = this.history[this.historyIndex];
          /* 去掉协议前缀后加载页面 */
          this.loadPage(url.replace('pc98://', ''), el);
        } else if (action === 'forward' && this.historyIndex < this.history.length - 1) {
          /* 前进操作：仅当历史索引未到达末尾时才能前进 */
          this.historyIndex++;
          const url = this.history[this.historyIndex];
          this.loadPage(url.replace('pc98://', ''), el);
        } else if (action === 'refresh') {
          /* 刷新操作：重新加载当前正在显示的页面 */
          if (this.currentPage) {
            this.loadPage(this.currentPage.url.replace('pc98://', ''), el);
          }
        } else if (action === 'home') {
          /* 主页操作：导航到首页 */
          this.navigateTo('home', el);
        }
      });
    });

    /* ----- 地址栏事件绑定 ----- */
    /* 获取地址栏输入框元素的引用 */
    const urlBar = el.querySelector('.url-bar') as HTMLInputElement;
    /* 获取"前往"按钮元素的引用 */
    const goBtn = el.querySelector('.go-btn');

    /**
     * 从地址栏读取URL并导航到对应页面
     * 这个函数被"前往"按钮和地址栏回车键共同调用
     */
    const navigateFromBar = () => {
      /* 获取输入框中的文本，去掉首尾空白后去掉协议前缀 */
      const url = urlBar.value.trim().replace('pc98://', '');
      /* 导航到指定的页面 */
      this.navigateTo(url, el);
    };

    /* 点击"前往"按钮时触发导航 */
    goBtn?.addEventListener('click', navigateFromBar);

    /* 在地址栏按回车键时触发导航 */
    urlBar?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') navigateFromBar();
    });

    /* ----- 页面内链接点击事件（使用事件委托） ----- */
    /* 在整个浏览器元素上监听点击事件，通过closest()判断点击目标是否是书签链接 */
    el.addEventListener('click', (e: MouseEvent) => {
      /* 从点击目标向上查找带有bookmark类的最近祖先元素 */
      const target = (e.target as HTMLElement).closest('.bookmark');
      if (target) {
        /* 如果点击的是书签链接，获取其data-url属性中的URL */
        const url = (target as HTMLElement).dataset.url?.replace('pc98://', '');
        /* 如果URL存在，导航到该页面 */
        if (url) this.navigateTo(url, el);
      }
    });
  }

  /**
   * 导航到指定页面
   *
   * 这个方法实现了完整的浏览器导航逻辑：
   * 1. 如果当前不在历史记录的末尾（说明之前有过后退操作），则截断当前位置之后的历史
   * 2. 将新的URL添加到历史记录末尾
   * 3. 更新历史索引到最新位置
   * 4. 加载目标页面内容
   *
   * @param pageKey - 页面标识符，对应pages Map中的键（如'home'、'trending'等）
   * @param el - 浏览器窗口的根HTML元素
   */
  private navigateTo(pageKey: string, el: HTMLElement): void {
    /**
     * 截断前进历史记录
     * 当用户后退后又导航到新页面时，需要清除之前的"前进"历史
     * 例如：访问A->B->C，后退到B，再导航到D，则历史变为A->B->D
     */
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    /* 将新URL添加到历史记录末尾，并更新索引 */
    this.history.push(`pc98://${pageKey}`);
    this.historyIndex = this.history.length - 1;

    /* 加载目标页面的内容 */
    this.loadPage(pageKey, el);
  }

  /**
   * 加载页面内容到浏览器内容区域
   *
   * 这个方法根据页面标识符从预设页面集合中查找对应页面，
   * 如果找到则显示页面内容并模拟加载延迟，如果找不到则显示404错误页面。
   *
   * @param pageKey - 页面标识符，对应pages Map中的键
   * @param el - 浏览器窗口的根HTML元素，用于查找内部的子元素
   */
  private loadPage(pageKey: string, el: HTMLElement): void {
    /* 从预设页面集合中查找目标页面 */
    const page = this.pages.get(pageKey);

    /* 获取浏览器界面中的关键DOM元素引用 */
    const urlBar = el.querySelector('.url-bar') as HTMLInputElement;       /* 地址栏输入框 */
    const content = el.querySelector('.browser-content') as HTMLElement;     /* 页面内容区域 */
    const status = el.querySelector('.page-status') as HTMLElement;         /* 状态栏文字 */

    if (page && content) {
      /**
       * 找到对应页面时的处理逻辑
       */

      /* 更新当前页面引用和地址栏显示 */
      this.currentPage = page;
      urlBar.value = page.url;

      /* 在内容区域显示"正在加载"的提示文字 */
      content.innerHTML = `<div style="color:var(--pc-gray);font-size:11px;">正在加载 ${page.url}...</div>`;

      /**
       * 模拟网络加载延迟
       * 使用setTimeout制造300~800毫秒的随机延迟，模拟真实的网页加载过程
       * 延迟结束后将页面内容渲染到内容区域
       */
      setTimeout(() => {
        /* 将页面的HTML内容插入到内容区域 */
        content.innerHTML = page.content;

        /* 重新绑定页面内新增的书签链接点击事件 */
        /* 因为页面内容是动态插入的，之前绑定的事件不会自动生效 */
        content.querySelectorAll('.bookmark').forEach((b) => {
          b.addEventListener('click', () => {
            /* 从书签元素的data-url属性获取目标URL */
            const url = (b as HTMLElement).dataset.url?.replace('pc98://', '');
            if (url) this.navigateTo(url, el);
          });
        });
      }, 300 + Math.random() * 500);

      /* 更新状态栏文字为当前页面标题 */
      if (status) status.textContent = `已加载: ${page.title}`;

      /* 更新窗口标题栏为当前页面标题 */
      this.wm.setWindowTitle('internet', page.title);
    } else {
      /**
       * 未找到对应页面时的处理逻辑 - 显示404错误页面
       */
      if (content) {
        content.innerHTML = `
          <!-- 404错误页面 - 居中显示错误图标和提示信息 -->
          <div style="text-align:center;padding:40px;">
            <div style="font-size:36px;margin-bottom:12px;">⚠️</div>
            <!-- 错误标题 -->
            <div style="color:var(--pc-hot-pink);font-size:16px;">404 - 页面不存在</div>
            <!-- 错误详情，显示无法找到的具体URL -->
            <div style="color:var(--pc-gray);font-size:12px;margin-top:8px;">找不到 pc98://${pageKey}</div>
          </div>
        `;
      }
      /* 更新状态栏为错误信息 */
      if (status) status.textContent = '错误: 页面不存在';
    }
  }
}
