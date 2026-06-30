/**
 * 软件导航站 - PC-98模拟系统中的GitHub开源项目推荐应用
 *
 * 这个文件实现了一个PC-98复古风格的软件导航站，主要功能包括：
 * 1. 顶部搜索栏 - 可以按名称和描述实时搜索过滤项目
 * 2. 分类标签栏 - 按分类（开发工具、前端框架、设计工具等）筛选项目
 * 3. 项目卡片列表 - 展示GitHub开源项目，包含图标、名称、描述、星数和标签
 * 4. 点击卡片 - 在浏览器新标签页打开对应的GitHub项目链接
 *
 * 所有项目数据硬编码在类中，涵盖8个分类共30+个开源项目。
 */

import { WindowManager } from '../core/WindowManager';

/**
 * SoftwareProject 接口 - 定义一个GitHub开源项目的数据结构
 * @property name - 项目名称（如 "VS Code"）
 * @property icon - 项目图标（使用emoji表示，如 "📝"）
 * @property description - 项目的一句话简介描述
 * @property stars - GitHub星数（格式化后的字符串，如 "160K"）
 * @property url - 项目的GitHub仓库链接
 * @property category - 项目所属分类（如 "开发工具"、"前端框架"）
 * @property tags - 项目的标签数组（如 ["编辑器", "IDE", "开源"]）
 */
interface SoftwareProject {
  /** 项目名称 */
  name: string;
  /** 项目图标（emoji） */
  icon: string;
  /** 项目简介描述 */
  description: string;
  /** GitHub星数（格式化字符串，如 "160K"） */
  stars: string;
  /** GitHub仓库链接 */
  url: string;
  /** 项目所属分类 */
  category: string;
  /** 项目标签列表 */
  tags: string[];
}

/**
 * SoftwareNavApp 类 - 软件导航站应用程序
 *
 * 这个类封装了软件导航站的所有功能，包括：
 * - 管理项目数据的分类和展示
 * - 处理搜索过滤和分类切换
 * - 渲染项目卡片列表
 * - 处理卡片点击打开GitHub链接
 *
 * @example
 * // 创建并打开软件导航站
 * const navApp = new SoftwareNavApp(windowManager);
 * navApp.open();
 */
export class SoftwareNavApp {
  /** WindowManager实例引用，用于创建窗口 */
  private wm: WindowManager;

  /** 当前选中的分类，默认为 "全部" */
  private currentCategory: string = '全部';

  /** 当前搜索关键词，默认为空字符串 */
  private searchQuery: string = '';

  /**
   * 所有分类的列表，用于生成分类标签栏
   * 第一个元素 "全部" 表示显示所有分类的项目
   */
  private readonly categories: string[] = [
    '全部',
    '开发工具',
    '前端框架',
    '设计工具',
    '效率工具',
    '系统工具',
    '终端工具',
    '娱乐',
  ];

  /**
   * 所有项目的硬编码数据数组
   * 包含8个分类共30个GitHub开源项目
   */
  private readonly projects: SoftwareProject[] = [
    /* ========== 开发工具分类 ========== */
    {
      name: 'VS Code',
      icon: '📝',
      description: '微软开源代码编辑器',
      stars: '160K',
      url: 'https://github.com/microsoft/vscode',
      category: '开发工具',
      tags: ['编辑器', 'IDE', '开源'],
    },
    {
      name: 'Git',
      icon: '🔀',
      description: '分布式版本控制系统',
      stars: '180K',
      url: 'https://github.com/git/git',
      category: '开发工具',
      tags: ['版本控制', 'CLI'],
    },
    {
      name: 'Node.js',
      icon: '🟢',
      description: 'JavaScript运行时',
      stars: '110K',
      url: 'https://github.com/nodejs/node',
      category: '开发工具',
      tags: ['运行时', 'JavaScript'],
    },
    {
      name: 'TypeScript',
      icon: '🔷',
      description: 'JavaScript类型系统',
      stars: '105K',
      url: 'https://github.com/microsoft/TypeScript',
      category: '开发工具',
      tags: ['语言', '类型安全'],
    },
    {
      name: 'Deno',
      icon: '🦕',
      description: '现代JavaScript运行时',
      stars: '100K',
      url: 'https://github.com/denoland/deno',
      category: '开发工具',
      tags: ['运行时', '安全'],
    },
    {
      name: 'Bun',
      icon: '🍞',
      description: '高性能JavaScript运行时',
      stars: '75K',
      url: 'https://github.com/oven-sh/bun',
      category: '开发工具',
      tags: ['运行时', '快速'],
    },

    /* ========== 前端框架分类 ========== */
    {
      name: 'React',
      icon: '⚛️',
      description: '声明式UI库',
      stars: '230K',
      url: 'https://github.com/facebook/react',
      category: '前端框架',
      tags: ['框架', 'UI'],
    },
    {
      name: 'Vue',
      icon: '💚',
      description: '渐进式JavaScript框架',
      stars: '210K',
      url: 'https://github.com/vuejs/core',
      category: '前端框架',
      tags: ['框架', '响应式'],
    },
    {
      name: 'Svelte',
      icon: '🔥',
      description: '编译时框架',
      stars: '85K',
      url: 'https://github.com/sveltejs/svelte',
      category: '前端框架',
      tags: ['框架', '轻量'],
    },
    {
      name: 'Next.js',
      icon: '▲',
      description: 'React全栈框架',
      stars: '130K',
      url: 'https://github.com/vercel/next.js',
      category: '前端框架',
      tags: ['框架', 'SSR'],
    },
    {
      name: 'Astro',
      icon: '🚀',
      description: '内容优先Web框架',
      stars: '50K',
      url: 'https://github.com/withastro/astro',
      category: '前端框架',
      tags: ['静态站点', '快速'],
    },
    {
      name: 'Tailwind CSS',
      icon: '🎨',
      description: '原子化CSS框架',
      stars: '85K',
      url: 'https://github.com/tailwindlabs/tailwindcss',
      category: '前端框架',
      tags: ['CSS', '工具类'],
    },

    /* ========== 设计工具分类 ========== */
    {
      name: 'GIMP',
      icon: '🖌️',
      description: '开源图像编辑器',
      stars: '12K',
      url: 'https://github.com/GNOME/gimp',
      category: '设计工具',
      tags: ['图像', '编辑'],
    },
    {
      name: 'Inkscape',
      icon: '✏️',
      description: '开源矢量图形编辑器',
      stars: '10K',
      url: 'https://github.com/inkscape/inkscape',
      category: '设计工具',
      tags: ['矢量', 'SVG'],
    },
    {
      name: 'Blender',
      icon: '🧊',
      description: '3D创作套件',
      stars: '13K',
      url: 'https://github.com/blender/blender',
      category: '设计工具',
      tags: ['3D', '建模'],
    },
    {
      name: 'Penpot',
      icon: '🎯',
      description: '开源设计平台',
      stars: '30K',
      url: 'https://github.com/penpot/penpot',
      category: '设计工具',
      tags: ['设计', '协作'],
    },

    /* ========== 效率工具分类 ========== */
    {
      name: 'Obsidian',
      icon: '💜',
      description: '知识管理工具',
      stars: '65K',
      url: 'https://github.com/obsidianmd/obsidian-md',
      category: '效率工具',
      tags: ['笔记', 'Markdown'],
    },
    {
      name: 'MarkText',
      icon: '📝',
      description: 'Markdown编辑器',
      stars: '48K',
      url: 'https://github.com/marktext/marktext',
      category: '效率工具',
      tags: ['编辑器', 'Markdown'],
    },
    {
      name: 'Hoppscotch',
      icon: '🐇',
      description: 'API测试工具',
      stars: '65K',
      url: 'https://github.com/hoppscotch/hoppscotch',
      category: '效率工具',
      tags: ['API', '开发'],
    },

    /* ========== 系统工具分类 ========== */
    {
      name: '7-Zip',
      icon: '📦',
      description: '文件压缩工具',
      stars: '12K',
      url: 'https://github.com/ip7z/7zip',
      category: '系统工具',
      tags: ['压缩', '开源'],
    },
    {
      name: 'WinSCP',
      icon: '📁',
      description: 'SFTP/SCP客户端',
      stars: '4K',
      url: 'https://github.com/winscp/winscp',
      category: '系统工具',
      tags: ['传输', 'SSH'],
    },
    {
      name: 'Everything',
      icon: '🔍',
      description: '文件搜索工具',
      stars: '10K',
      url: 'https://github.com/voidtools/Everything',
      category: '系统工具',
      tags: ['搜索', '快速'],
    },
    {
      name: 'PowerToys',
      icon: '⚡',
      description: 'Windows增强工具集',
      stars: '110K',
      url: 'https://github.com/microsoft/PowerToys',
      category: '系统工具',
      tags: ['Windows', '增强'],
    },

    /* ========== 终端工具分类 ========== */
    {
      name: 'Windows Terminal',
      icon: '💻',
      description: '现代终端应用',
      stars: '100K',
      url: 'https://github.com/microsoft/terminal',
      category: '终端工具',
      tags: ['终端', 'Windows'],
    },
    {
      name: 'Oh My Posh',
      icon: '✨',
      description: '终端提示符美化',
      stars: '18K',
      url: 'https://github.com/JanDeDobbeleer/oh-my-posh',
      category: '终端工具',
      tags: ['提示符', '美化'],
    },
    {
      name: 'Starship',
      icon: '🚀',
      description: '跨平台提示符',
      stars: '45K',
      url: 'https://github.com/starship/starship',
      category: '终端工具',
      tags: ['提示符', '快速'],
    },
    {
      name: 'Warp',
      icon: '🌀',
      description: '现代终端',
      stars: '20K',
      url: 'https://github.com/warpdotdev/Warp',
      category: '终端工具',
      tags: ['终端', 'AI'],
    },

    /* ========== 娱乐分类 ========== */
    {
      name: 'OBS Studio',
      icon: '📹',
      description: '直播录屏软件',
      stars: '60K',
      url: 'https://github.com/obsproject/obs-studio',
      category: '娱乐',
      tags: ['直播', '录屏'],
    },
    {
      name: 'VLC',
      icon: '🔶',
      description: '多媒体播放器',
      stars: '14K',
      url: 'https://github.com/videolan/vlc',
      category: '娱乐',
      tags: ['播放器', '开源'],
    },
    {
      name: 'mpv',
      icon: '🎬',
      description: '轻量媒体播放器',
      stars: '28K',
      url: 'https://github.com/mpv-player/mpv',
      category: '娱乐',
      tags: ['播放器', '轻量'],
    },
    {
      name: 'yt-dlp',
      icon: '⬇️',
      description: '视频下载工具',
      stars: '90K',
      url: 'https://github.com/yt-dlp/yt-dlp',
      category: '娱乐',
      tags: ['下载', '命令行'],
    },
  ];

  /**
   * 构造函数 - 初始化软件导航站应用程序
   *
   * @param wm - WindowManager实例，用于创建和管理导航站窗口
   */
  constructor(wm: WindowManager) {
    this.wm = wm;
  }

  /**
   * 打开软件导航站窗口
   *
   * 这个方法会：
   * 1. 调用buildHTML()构建导航站的完整HTML结构
   * 2. 通过WindowManager创建一个新的导航站窗口
   * 3. 在窗口创建完成后绑定所有交互事件（搜索、分类切换、卡片点击）
   */
  open(): void {
    /* 构建导航站的完整HTML内容 */
    const html = this.buildHTML();

    /* 通过WindowManager创建导航站窗口 */
    this.wm.createWindow({
      id: 'software-nav',            /* 窗口唯一标识符 */
      title: '软件导航站',            /* 窗口标题栏显示的文字 */
      icon: '🏪',                     /* 窗口图标（商店符号表示导航站） */
      width: 700,                     /* 窗口初始宽度（像素） */
      height: 520,                    /* 窗口初始高度（像素） */
      content: html,                  /* 窗口内部的HTML内容 */
      resizable: true,                /* 允许用户调整窗口大小 */
      /* 窗口创建完成后的回调函数 - 绑定交互事件并渲染初始项目列表 */
      onCreated: (el: HTMLElement) => {
        this.bindEvents(el);          /* 绑定所有交互事件 */
        this.renderProjects(el);      /* 渲染项目卡片列表 */
      },
    });
  }

  /**
   * 构建软件导航站的完整HTML结构
   *
   * 界面分为三个区域（从上到下）：
   * 1. 搜索栏 - 包含搜索输入框，支持按名称和描述搜索
   * 2. 分类标签栏 - 包含8个分类按钮，点击切换过滤
   * 3. 项目卡片列表区域 - 显示过滤后的项目卡片，支持滚动
   *
   * @returns 导航站界面的完整HTML字符串
   */
  private buildHTML(): string {
    return `
      <div style="display:flex;flex-direction:column;height:100%;gap:8px;">
        <!-- ===== 顶部搜索栏 ===== -->
        <!-- 包含搜索输入框，用户输入文字后实时过滤项目列表 -->
        <div style="display:flex;gap:8px;align-items:center;">
          <!-- 搜索图标文字提示 -->
          <span style="color:var(--pc-pink);font-size:14px;">🔍</span>
          <!--
            搜索输入框 - 使用pc-input样式
            用户输入时会实时按项目名称和描述进行过滤匹配
            flex:1 使其占据剩余空间
          -->
          <input type="text" class="pc-input search-input" placeholder="搜索项目名称或描述..." style="flex:1;font-size:12px;">
        </div>

        <!-- ===== 分类标签栏 ===== -->
        <!-- 包含所有分类按钮，横向排列，允许换行 -->
        <!-- 点击某个分类按钮后，只显示该分类下的项目 -->
        <div class="category-bar" style="display:flex;gap:4px;flex-wrap:wrap;">
          ${
            /* 遍历所有分类，生成对应的分类按钮 */
            this.categories
              .map(
                (cat, index) =>
                  /* 第一个按钮（"全部"）默认为激活状态，使用紫色背景 */
                  `<button class="pc-btn category-btn" data-category="${cat}" style="font-size:11px;padding:2px 8px;${index === 0 ? 'background:var(--pc-purple);' : ''}">${cat}</button>`
              )
              .join('')
          }
        </div>

        <!-- ===== 项目卡片列表区域 ===== -->
        <!-- 显示过滤后的项目卡片，支持垂直滚动 -->
        <!-- flex:1 使其占据窗口剩余空间 -->
        <div class="project-list" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
        </div>
      </div>
    `;
  }

  /**
   * 绑定导航站的所有交互事件
   *
   * 这个方法负责绑定以下交互：
   * 1. 搜索框输入事件 - 实时按名称和描述过滤项目
   * 2. 分类按钮点击事件 - 切换显示对应分类的项目
   * 3. 项目卡片点击事件 - 使用事件委托，在浏览器新标签页打开GitHub链接
   *
   * @param el - 导航站窗口的内容容器HTML元素
   */
  private bindEvents(el: HTMLElement): void {
    /* ----- 搜索框实时过滤事件绑定 ----- */
    const searchInput = el.querySelector('.search-input') as HTMLInputElement;
    searchInput.addEventListener('input', () => {
      /* 每次输入时更新搜索关键词，并重新渲染项目列表 */
      this.searchQuery = searchInput.value.trim().toLowerCase();
      this.renderProjects(el);
    });

    /* ----- 分类按钮点击事件绑定 ----- */
    el.querySelectorAll('.category-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        /* 获取点击按钮对应的分类名称 */
        const category = (btn as HTMLElement).dataset.category || '全部';

        /* 更新当前选中的分类 */
        this.currentCategory = category;

        /* 更新所有分类按钮的激活状态样式 */
        el.querySelectorAll('.category-btn').forEach((b) => {
          /* 先清除所有按钮的激活背景色 */
          (b as HTMLElement).style.background = '';
        });
        /* 为当前选中的按钮设置紫色激活背景 */
        (btn as HTMLElement).style.background = 'var(--pc-purple)';

        /* 重新渲染项目列表 */
        this.renderProjects(el);
      });
    });

    /* ----- 项目卡片点击事件（使用事件委托） ----- */
    /* 在项目列表容器上监听点击事件，通过closest()判断点击目标是否是项目卡片 */
    const projectList = el.querySelector('.project-list') as HTMLElement;
    projectList.addEventListener('click', (e) => {
      /* 从点击目标向上查找带有project-card类的最近祖先元素 */
      const card = (e.target as HTMLElement).closest('.project-card');
      if (card) {
        /* 获取卡片上通过data-url属性存储的GitHub链接 */
        const url = (card as HTMLElement).dataset.url;
        if (url) {
          /* 在浏览器新标签页中打开GitHub项目链接 */
          window.open(url, '_blank');
        }
      }
    });

    /* ----- 项目卡片鼠标悬停效果（使用事件委托） ----- */
    projectList?.addEventListener('mouseover', (e) => {
      /* 鼠标移入卡片时，高亮边框为粉色 */
      const card = (e.target as HTMLElement).closest('.project-card');
      if (card) {
        (card as HTMLElement).style.borderColor = 'var(--pc-pink)';
        (card as HTMLElement).style.background = 'rgba(255, 105, 180, 0.08)';
      }
    });

    projectList?.addEventListener('mouseout', (e) => {
      /* 鼠标移出卡片时，恢复默认深灰边框和透明背景 */
      const card = (e.target as HTMLElement).closest('.project-card');
      if (card) {
        (card as HTMLElement).style.borderColor = 'var(--pc-dark-gray)';
        (card as HTMLElement).style.background = 'transparent';
      }
    });
  }

  /**
   * 根据当前搜索关键词和选中分类，过滤项目并渲染到列表中
   *
   * 过滤逻辑：
   * 1. 如果当前分类不是"全部"，则只保留该分类的项目
   * 2. 如果搜索关键词不为空，则按名称和描述进行模糊匹配
   * 3. 将过滤后的项目生成HTML卡片并插入到列表容器中
   *
   * @param el - 导航站窗口的内容容器HTML元素
   */
  private renderProjects(el: HTMLElement): void {
    /* 获取项目列表容器的DOM引用 */
    const list = el.querySelector('.project-list') as HTMLElement;

    if (!list) return;

    /**
     * 第一步：按分类过滤项目
     * 如果当前分类是"全部"，则不过滤；否则只保留匹配分类的项目
     */
    let filtered = this.projects;
    if (this.currentCategory !== '全部') {
      filtered = filtered.filter((p) => p.category === this.currentCategory);
    }

    /**
     * 第二步：按搜索关键词过滤项目
     * 如果搜索关键词不为空，则检查项目名称或描述是否包含该关键词（不区分大小写）
     */
    if (this.searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(this.searchQuery) ||
          p.description.toLowerCase().includes(this.searchQuery)
      );
    }

    /**
     * 第三步：将过滤后的项目数组生成HTML卡片字符串
     * 每个卡片包含：图标、名称、描述、星数、标签
     * 卡片使用data-url属性存储GitHub链接，用于点击时打开
     */
    const cardsHtml = filtered
      .map(
        (p) => `
          <!-- 单个项目卡片 -->
          <!-- data-url 存储GitHub链接，点击时通过事件委托打开 -->
          <div class="project-card" data-url="${p.url}" style="
            padding:10px 12px;
            border:1px solid var(--pc-dark-gray);
            cursor:pointer;
            display:flex;
            gap:10px;
            align-items:center;
            transition:background 0.15s,border-color 0.15s;
          ">
            <!-- 项目图标 - 左侧显示大号emoji -->
            <div style="font-size:28px;width:36px;text-align:center;flex-shrink:0;">${p.icon}</div>
            <!-- 项目信息区域 - 包含名称、描述、星数和标签 -->
            <div style="flex:1;min-width:0;">
              <!-- 项目名称 - 粉色高亮显示 -->
              <div style="color:var(--pc-pink);font-weight:bold;font-size:13px;">${p.name}</div>
              <!-- 项目描述 - 灰色小字，单行显示 -->
              <div style="color:var(--pc-gray);font-size:11px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.description}</div>
              <!-- 项目标签行 - 包含星数和分类标签 -->
              <div style="display:flex;gap:4px;margin-top:4px;align-items:center;flex-wrap:wrap;">
                <!-- GitHub星数 - 使用霓虹黄色高亮显示 -->
                <span style="color:var(--pc-neon-yellow);font-size:11px;">⭐ ${p.stars}</span>
                ${
                  /* 生成项目标签，每个标签使用灰色背景的小号文字 */
                  p.tags
                    .map(
                      (tag) =>
                        `<span style="font-size:10px;padding:1px 6px;background:var(--pc-gray);color:var(--pc-black);border-radius:2px;">${tag}</span>`
                    )
                    .join('')
                }
              </div>
            </div>
          </div>
        `
      )
      .join('');

    /**
     * 第四步：将生成的卡片HTML插入到列表容器中
     * 如果过滤后没有匹配的项目，显示"未找到匹配项目"的提示
     */
    if (filtered.length === 0) {
      /* 没有匹配项目时显示提示信息 */
      list.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--pc-gray);font-size:12px;">
          <div style="font-size:32px;margin-bottom:8px;">🔍</div>
          <div>未找到匹配的项目</div>
        </div>
      `;
    } else {
      /* 有匹配项目时渲染卡片列表 */
      list.innerHTML = cardsHtml;
    }
  }
}
