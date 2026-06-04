// Markdown 编辑器核心功能
(function() {
    'use strict';

    var markdownInput = document.getElementById('markdown-input');
    var markdownPreview = document.getElementById('markdown-preview');
    var wordCount = document.getElementById('word-count');
    var statusText = document.getElementById('status-text');
    var cursorPosition = document.getElementById('cursor-position');
    var navTree = document.getElementById('nav-tree');
    var navPane = document.getElementById('nav-pane');
    var navToggleIcon = document.getElementById('nav-toggle-icon');
    var editorPane = document.getElementById('editor-pane');
    var editorToggleIcon = document.getElementById('editor-toggle-icon');
    var previewPane = document.getElementById('preview-pane');
    var previewToggleIcon = document.getElementById('preview-toggle-icon');
    var navRestoreBtn = document.getElementById('nav-restore-btn');

    var navCollapsed = false;
    var editorCollapsed = false;
    var previewCollapsed = false;
    var navItems = [];

    // 防止滚动联动循环
    var syncingScroll = false;

    // 配置 marked
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });

    // ===== 面板折叠 =====

    window.toggleNav = function() {
        navCollapsed = !navCollapsed;
        if (navCollapsed) {
            navPane.classList.add('collapsed');
            navToggleIcon.textContent = '▶';
            navRestoreBtn.style.display = 'flex';
        } else {
            navPane.classList.remove('collapsed');
            navToggleIcon.textContent = '◀';
            navRestoreBtn.style.display = 'none';
        }
    };

    window.toggleEditor = function() {
        editorCollapsed = !editorCollapsed;
        if (editorCollapsed) {
            editorPane.classList.add('collapsed');
            editorToggleIcon.textContent = '▶';
        } else {
            editorPane.classList.remove('collapsed');
            editorToggleIcon.textContent = '◀';
        }
    };

    window.togglePreview = function() {
        previewCollapsed = !previewCollapsed;
        if (previewCollapsed) {
            previewPane.classList.add('collapsed');
            previewToggleIcon.textContent = '◀';
        } else {
            previewPane.classList.remove('collapsed');
            previewToggleIcon.textContent = '▶';
        }
    };

    // ===== 导航树 =====

    function extractHeadings(text) {
        var lines = text.split('\n');
        var headings = [];
        var inCodeBlock = false;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.trim().match(/^```/)) { inCodeBlock = !inCodeBlock; continue; }
            if (inCodeBlock) continue;
            var match = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/);
            if (match) {
                headings.push({ level: match[1].length, text: match[2].replace(/[*_`~]/g, ''), line: i });
            }
        }
        return headings;
    }

    function buildTree(headings) {
        var virtualRoot = { level: 0, children: [], index: -1 };
        var stack = [virtualRoot];
        for (var i = 0; i < headings.length; i++) {
            var node = { level: headings[i].level, text: headings[i].text, line: headings[i].line, index: i, children: [], expanded: true };
            while (stack.length > 1 && stack[stack.length - 1].level >= node.level) stack.pop();
            stack[stack.length - 1].children.push(node);
            stack.push(node);
        }
        return virtualRoot.children;
    }

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getIcon(level, hasChildren) {
        if (hasChildren) { if (level === 1) return '📂'; if (level === 2) return '📁'; return '📄'; }
        return '📄';
    }

    function renderTree(nodes) {
        var html = '';
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var hasChildren = node.children && node.children.length > 0;
            var expanded = node.expanded !== false;
            html += '<div class="nav-tree-item" data-level="' + node.level + '" data-index="' + node.index + '" data-has-children="' + (hasChildren ? '1' : '0') + '">';
            if (hasChildren) {
                html += '<div class="nav-tree-row" onclick="toggleTreeNode(' + node.index + ', event)">';
            } else {
                html += '<div class="nav-tree-row" onclick="navClick(' + node.index + ', event)">';
            }
            if (hasChildren) {
                html += '<span class="nav-tree-toggle' + (expanded ? ' expanded' : '') + '">▶</span>';
            } else {
                html += '<span class="nav-tree-toggle leaf">▶</span>';
            }
            html += '<span class="nav-tree-icon">' + getIcon(node.level, hasChildren) + '</span>';
            html += '<span class="nav-tree-label" title="' + escapeHtml(node.text) + '">' + escapeHtml(node.text) + '</span>';
            html += '</div>';
            if (hasChildren) {
                html += '<div class="nav-tree-children' + (expanded ? '' : ' collapsed') + '">';
                html += renderTree(node.children);
                html += '</div>';
            }
            html += '</div>';
        }
        return html;
    }

    var treeState = {};

    function renderNavTree(headings) {
        navItems = headings;
        if (headings.length === 0) {
            navTree.innerHTML = '<div class="nav-empty">编辑文档后<br>标题将自动显示在此处</div>';
            return;
        }
        var tree = buildTree(headings);
        function restoreState(nodes) {
            for (var i = 0; i < nodes.length; i++) {
                if (treeState[nodes[i].index] !== undefined) nodes[i].expanded = treeState[nodes[i].index];
                if (nodes[i].children) restoreState(nodes[i].children);
            }
        }
        restoreState(tree);
        navTree.innerHTML = renderTree(tree);
    }

    window.toggleTreeNode = function(index, event) {
        event.stopPropagation();
        var items = navTree.querySelectorAll('.nav-tree-item');
        for (var i = 0; i < items.length; i++) {
            if (parseInt(items[i].getAttribute('data-index')) === index) {
                var toggle = items[i].querySelector(':scope > .nav-tree-row .nav-tree-toggle');
                var children = items[i].querySelector(':scope > .nav-tree-children');
                if (toggle && children) {
                    if (children.style.display === 'none') {
                        children.style.display = '';
                        children.classList.remove('collapsed');
                        toggle.classList.add('expanded');
                        treeState[index] = true;
                    } else {
                        children.style.display = 'none';
                        children.classList.add('collapsed');
                        toggle.classList.remove('expanded');
                        treeState[index] = false;
                    }
                }
                break;
            }
        }
    };

    // 点击导航项 → 同时跳转编辑器和预览
    window.navClick = function(index, event) {
        if (event) event.stopPropagation();
        var item = navItems[index];
        if (!item) return;

        // 高亮导航
        highlightNavItem(index);

        // 跳转编辑器
        scrollToEditorLine(item.line);

        // 跳转预览
        scrollToPreviewHeading(index);
    };

    function highlightNavItem(index) {
        var treeItems = navTree.querySelectorAll('.nav-tree-item');
        for (var j = 0; j < treeItems.length; j++) {
            var row = treeItems[j].querySelector(':scope > .nav-tree-row');
            if (parseInt(treeItems[j].getAttribute('data-index')) === index) {
                row.classList.add('active');
                // 确保导航树中该项可见
                var navItem = row.closest('.nav-tree-item');
                if (navItem) navItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                row.classList.remove('active');
            }
        }
    }

    function scrollToEditorLine(lineNum) {
        var lines = markdownInput.value.split('\n');
        var pos = 0;
        for (var k = 0; k < lineNum && k < lines.length; k++) {
            pos += lines[k].length + 1;
        }
        markdownInput.setSelectionRange(pos, pos);
        markdownInput.focus();
        // 计算滚动位置
        var lineHeight = parseFloat(window.getComputedStyle(markdownInput).lineHeight) || 22.4;
        markdownInput.scrollTop = Math.max(0, lineNum * lineHeight - markdownInput.clientHeight / 3);
    }

    function scrollToPreviewHeading(index) {
        // 找到预览区对应的 heading 元素
        var headings = markdownPreview.querySelectorAll('h1, h2, h3, h4, h5, h6');
        // navItems[index] 对应第 index+1 个标题（因为 navItems 是从 markdown 提取的）
        if (index < headings.length) {
            var target = headings[index];
            target.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
    }

    // ===== 滚动联动 =====

    // 编辑器滚动 → 同步预览 + 更新导航高亮
    markdownInput.addEventListener('scroll', function() {
        if (syncingScroll) return;
        syncingScroll = true;

        // 计算编辑器滚动比例
        var scrollRatio = markdownInput.scrollTop / Math.max(1, markdownInput.scrollHeight - markdownInput.clientHeight);

        // 同步预览滚动
        var previewMaxScroll = markdownPreview.scrollHeight - markdownPreview.clientHeight;
        if (previewMaxScroll > 0) {
            markdownPreview.scrollTop = scrollRatio * previewMaxScroll;
        }

        // 更新导航高亮
        updateActiveNavFromEditor();

        clearTimeout(markdownInput._scrollTimer);
        markdownInput._scrollTimer = setTimeout(function() { syncingScroll = false; }, 100);
    });

    // 预览滚动 → 同步编辑器 + 更新导航高亮
    markdownPreview.addEventListener('scroll', function() {
        if (syncingScroll) return;
        syncingScroll = true;

        var scrollRatio = markdownPreview.scrollTop / Math.max(1, markdownPreview.scrollHeight - markdownPreview.clientHeight);
        var editorMaxScroll = markdownInput.scrollHeight - markdownInput.clientHeight;
        if (editorMaxScroll > 0) {
            markdownInput.scrollTop = scrollRatio * editorMaxScroll;
        }

        updateActiveNavFromPreview();

        clearTimeout(markdownPreview._scrollTimer);
        markdownPreview._scrollTimer = setTimeout(function() { syncingScroll = false; }, 100);
    });

    function updateActiveNavFromEditor() {
        var lineHeight = parseFloat(window.getComputedStyle(markdownInput).lineHeight) || 22.4;
        var firstVisibleLine = Math.floor(markdownInput.scrollTop / lineHeight);
        var activeIndex = -1;
        for (var i = navItems.length - 1; i >= 0; i--) {
            if (navItems[i].line <= firstVisibleLine) { activeIndex = i; break; }
        }
        highlightNavItem(activeIndex);
    }

    function updateActiveNavFromPreview() {
        // 根据预览区可见的标题来高亮导航
        var headings = markdownPreview.querySelectorAll('h1, h2, h3, h4, h5, h6');
        var previewRect = markdownPreview.getBoundingClientRect();
        var activeIndex = -1;
        for (var i = 0; i < headings.length; i++) {
            var rect = headings[i].getBoundingClientRect();
            if (rect.top >= previewRect.top - 10) {
                activeIndex = i;
                break;
            }
        }
        if (activeIndex === -1 && headings.length > 0) activeIndex = headings.length - 1;
        highlightNavItem(activeIndex);
    }

    // ===== 编辑器核心 =====

    markdownInput.addEventListener('input', function() {
        var html = marked.parse(this.value);
        markdownPreview.innerHTML = html;
        updateWordCount();
        statusText.textContent = '已编辑';
        highlightCodeBlocks();
        renderNavTree(extractHeadings(this.value));
        updateActiveNavFromEditor();
    });

    markdownInput.addEventListener('keyup', function() {
        updateCursorPosition();
        updateActiveNavFromEditor();
    });

    markdownInput.addEventListener('click', function() {
        updateCursorPosition();
        updateActiveNavFromEditor();
    });

    function updateWordCount() {
        var count = markdownInput.value.replace(/\s/g, '').length;
        wordCount.textContent = count + ' 字';
    }

    function updateCursorPosition() {
        var cursor = markdownInput.selectionStart;
        var before = markdownInput.value.substring(0, cursor);
        var lines = before.split('\n');
        cursorPosition.textContent = '行 ' + lines.length + ', 列 ' + (lines[lines.length - 1].length + 1);
    }

    // 插入文本
    window.insertText = function(text) {
        var start = markdownInput.selectionStart;
        var end = markdownInput.selectionEnd;
        var val = markdownInput.value;
        if (text === '**' || text === '_') {
            var sel = val.substring(start, end);
            if (sel) { markdownInput.value = val.substring(0, start) + text + sel + text + val.substring(end); markdownInput.setSelectionRange(start + 1, start + sel.length + 1); }
            else { markdownInput.value = val.substring(0, start) + text + val.substring(end); markdownInput.setSelectionRange(start + 1, start + 1); }
        } else if (text === '`') {
            var sel2 = val.substring(start, end);
            if (sel2) { markdownInput.value = val.substring(0, start) + text + sel2 + text + val.substring(end); markdownInput.setSelectionRange(start + 1, start + sel2.length + 1); }
            else { markdownInput.value = val.substring(0, start) + text + text + val.substring(end); markdownInput.setSelectionRange(start + 1, start + 1); }
        } else if (text === '[]()') {
            markdownInput.value = val.substring(0, start) + text + val.substring(end); markdownInput.setSelectionRange(start + 1, start + 1);
        } else if (text === '![]()') {
            markdownInput.value = val.substring(0, start) + text + val.substring(end); markdownInput.setSelectionRange(start + 2, start + 2);
        } else {
            markdownInput.value = val.substring(0, start) + text + val.substring(end); markdownInput.setSelectionRange(start + text.length, start + text.length);
        }
        markdownInput.focus();
        markdownInput.dispatchEvent(new Event('input'));
    };

    window.clearEditor = function() {
        if (markdownInput.value.trim() === '') return;
        if (confirm('确定要清空所有内容吗？')) {
            markdownInput.value = '';
            markdownInput.dispatchEvent(new Event('input'));
            statusText.textContent = '已清空';
        }
    };

    window.saveFile = function(filePath) {
        var content = markdownInput.value;
        if (window.electronAPI && filePath) {
            window.electronAPI.saveFile(filePath, content).then(function() {
                var parts = filePath.replace(/\\/g, '/').split('/');
                statusText.textContent = '已保存：' + parts[parts.length - 1];
            }).catch(function() { statusText.textContent = '保存失败'; });
        } else if (!window.electronAPI) {
            var now = new Date();
            var name = 'markdown_' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + '.md';
            var blob = new Blob([content], { type: 'text/markdown' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a'); a.href = url; a.download = name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            statusText.textContent = '已保存文件';
        }
        setTimeout(function() { if (statusText.textContent !== '保存失败') statusText.textContent = '就绪'; }, 2000);
    };

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    window.loadFile = function(filePath) {
        if (window.electronAPI && filePath) {
            window.electronAPI.openFile(filePath).then(function(content) {
                markdownInput.value = content;
                markdownInput.dispatchEvent(new Event('input'));
                statusText.textContent = '已加载：' + filePath;
            }).catch(function() { statusText.textContent = '加载失败'; });
        } else {
            var input = document.createElement('input'); input.type = 'file'; input.accept = '.md,.markdown,.txt';
            input.onchange = function(e) {
                var file = e.target.files[0]; if (!file) return;
                var reader = new FileReader();
                reader.onload = function(e) { markdownInput.value = e.target.result; markdownInput.dispatchEvent(new Event('input')); statusText.textContent = '已加载：' + file.name; };
                reader.readAsText(file);
            };
            input.click();
        }
    };

    function highlightCodeBlocks() {
        var blocks = markdownPreview.querySelectorAll('pre code');
        for (var i = 0; i < blocks.length; i++) hljs.highlightElement(blocks[i]);
    }

    // 快捷键
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); window.saveFile(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); window.loadFile(); }
        if (e.target === markdownInput && e.key === 'Tab') { e.preventDefault(); window.insertText('    '); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); window.toggleNav(); }
    });

    // 初始化
    function init() {
        var sample =
            '# 欢迎使用 Markdown 编辑器\n\n' +
            '这是一个功能强大的 **Markdown 编辑器**，支持实时预览和导航树。\n\n' +
            '## 主要功能\n\n' +
            '- ✨ **实时预览** - 编辑时即时看到效果\n' +
            '- 📝 **语法高亮** - 代码块自动高亮\n' +
            '- 💾 **保存文件** - 导出为 .md 文件\n' +
            '- 📂 **打开文件** - 加载本地 Markdown 文件\n' +
            '- 📑 **导航树** - 自动提取标题，支持折叠展开\n\n' +
            '## 示例代码\n\n' +
            '```javascript\n' +
            'function hello() {\n' +
            '    console.log("Hello, World!");\n' +
            '}\n' +
            '```\n\n' +
            '## 引用示例\n\n' +
            '> 这是一个引用块\n' +
            '> 可以包含多行内容\n\n' +
            '### 嵌套引用\n\n' +
            '> 层级一\n' +
            '> > 层级二\n\n' +
            '### 引用最佳实践\n\n' +
            '- 引用不宜过长\n' +
            '- 建议配合标题使用\n\n' +
            '## 列表示例\n\n' +
            '1. 有序列表第一项\n' +
            '2. 有序列表第二项\n' +
            '3. 有序列表第三项\n\n' +
            '- 无序列表第一项\n' +
            '- 无序列表第二项\n' +
            '- 无序列表第三项\n\n' +
            '## 链接和图片\n\n' +
            '[访问 GitHub](https://github.com)\n\n' +
            '---\n\n' +
            '## 快捷键\n\n' +
            '- `Ctrl + S` 保存文件\n' +
            '- `Ctrl + O` 打开文件\n' +
            '- `Ctrl + B` 切换导航面板\n' +
            '- `Tab` 插入缩进\n\n' +
            '开始你的创作吧！🚀';

        markdownInput.value = sample;
        markdownInput.dispatchEvent(new Event('input'));
        markdownInput.focus();
    }

    window.addEventListener('load', init);

    // Electron IPC
    if (window.electronAPI) {
        window.onFileLoaded = function(content, filePath) {
            markdownInput.value = content;
            markdownInput.dispatchEvent(new Event('input'));
            statusText.textContent = '已加载：' + filePath;
        };
        window.onNewFile = function() {
            if (markdownInput.value.trim() === '') return;
            if (confirm('确定要清空所有内容吗？')) {
                markdownInput.value = '';
                markdownInput.dispatchEvent(new Event('input'));
                statusText.textContent = '已新建';
            }
        };
        window.addEventListener('electron-save-file', function(e) { window.saveFile(e.detail); });
    }

})();