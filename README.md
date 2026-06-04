# Markdown 编辑器

一个功能强大的 Markdown 编辑器桌面应用，基于原生 HTML/CSS/JavaScript 和 Electron 构建。

## 功能特性

- ✨ **实时预览** - 编辑时即时看到 Markdown 渲染效果
- 📝 **语法高亮** - 代码块自动高亮显示
- 🎨 **工具栏** - 快速插入标题、加粗、斜体、代码、列表、链接、图片等
- 💾 **保存文件** - 导出为 .md 文件
- 📂 **打开文件** - 加载本地 Markdown 文件
- ⌨️ **快捷键支持** - Ctrl+S 保存，Ctrl+O 打开，Tab 缩进等
- 📊 **字数统计** - 实时显示文档字数
- 📍 **光标位置** - 显示当前行号和列号

## 安装步骤

### 1. 安装依赖

在项目目录下运行：

```bash
npm install
```

### 2. 开发模式运行

```bash
npm start
```

或者使用调试模式：

```bash
npm run dev
```

### 3. 打包成桌面应用

#### Windows 版本

```bash
npm run build:win
```

#### macOS 版本

```bash
npm run build:mac
```

#### Linux 版本

```bash
npm run build:linux
```

打包完成后，可在 `dist` 目录找到安装程序。

## 使用说明

### 工具栏按钮

- **H1/H2/H3** - 插入一级、二级、三级标题
- **B** - 加粗文本（**文本**）
- **I** - 斜体文本（_文本_）
- **</>** - 行内代码（`代码`）
- **•** - 无序列表（- 项目）
- **🔗** - 链接（[文本](URL)）
- **🖼️** - 图片（![](URL)）
- **─** - 分隔线（---）
- **❝** - 引用（> 引用内容）
- **🗑️** - 清空编辑器
- **💾** - 保存文件
- **📂** - 打开文件

### 快捷键

- `Ctrl + S` - 保存文件
- `Ctrl + O` - 打开文件
- `Ctrl + Shift + S` - 另存为
- `Ctrl + N` - 新建文件
- `Ctrl + Z` - 撤销
- `Ctrl + Y` - 重做
- `Ctrl + C` - 复制
- `Ctrl + V` - 粘贴
- `Ctrl + X` - 剪切
- `Ctrl + A` - 全选
- `Tab` - 插入缩进

### 支持的 Markdown 语法

- 标题（# 到 ######）
- 加粗和斜体
- 行内代码和代码块
- 无序列表和有序列表
- 链接和图片
- 引用块
- 分隔线
- 表格
- 任务列表

## 项目结构

```
markdown-editor/
├── index.html          # 主页面 HTML
├── styles.css          # 样式文件
├── app.js              # 前端 JavaScript 逻辑
├── main.js             # Electron 主进程
├── preload.js          # Electron 预加载脚本
├── package.json        # 项目配置
└── README.md           # 说明文档
```

## 技术栈

- **前端**：原生 HTML5, CSS3, JavaScript
- **Markdown 解析**：marked.js
- **代码高亮**：highlight.js
- **桌面框架**：Electron
- **打包工具**：electron-builder

## 浏览器模式

除了作为桌面应用运行，你也可以直接在浏览器中打开 `index.html` 文件使用基本功能（保存和打开文件功能需要 Electron 环境）。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
