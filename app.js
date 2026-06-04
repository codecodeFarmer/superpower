// Markdown 编辑器核心功能
(function() {
    'use strict';

    var markdownInput = document.getElementById('markdown-input');
    var markdownPreview = document.getElementById('markdown-preview');
    var wordCount = document.querySelector('.word-count');
    var statusText = document.getElementById('status-text');
    var cursorPosition = document.getElementById('cursor-position');

    // 配置 marked 解析器
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

    // 实时预览
    markdownInput.addEventListener('input', function() {
        var html = marked.parse(this.value);
        markdownPreview.innerHTML = html;
        updateWordCount();
        statusText.textContent = '已编辑';
        highlightCodeBlocks();
    });

    // 光标位置
    markdownInput.addEventListener('keyup', updateCursorPosition);
    markdownInput.addEventListener('click', updateCursorPosition);

    function updateWordCount() {
        var text = markdownInput.value;
        var count = text.replace(/\s/g, '').length;
        wordCount.textContent = count + ' 字';
    }

    function updateCursorPosition() {
        var cursor = markdownInput.selectionStart;
        var text = markdownInput.value;
        var before = text.substring(0, cursor);
        var lines = before.split('\n');
        var line = lines.length;
        var col = lines[lines.length - 1].length + 1;
        cursorPosition.textContent = '行：' + line + ', 列：' + col;
    }

    // 插入文本
    window.insertText = function(text) {
        var start = markdownInput.selectionStart;
        var end = markdownInput.selectionEnd;
        var val = markdownInput.value;

        if (text === '**' || text === '_') {
            var sel = val.substring(start, end);
            if (sel) {
                markdownInput.value = val.substring(0, start) + text + sel + text + val.substring(end);
                markdownInput.setSelectionRange(start + 1, start + sel.length + 1);
            } else {
                markdownInput.value = val.substring(0, start) + text + val.substring(end);
                markdownInput.setSelectionRange(start + 1, start + 1);
            }
        } else if (text === '`') {
            var sel2 = val.substring(start, end);
            if (sel2) {
                markdownInput.value = val.substring(0, start) + text + sel2 + text + val.substring(end);
                markdownInput.setSelectionRange(start + 1, start + sel2.length + 1);
            } else {
                markdownInput.value = val.substring(0, start) + text + text + val.substring(end);
                markdownInput.setSelectionRange(start + 1, start + 1);
            }
        } else if (text === '[]()') {
            markdownInput.value = val.substring(0, start) + text + val.substring(end);
            markdownInput.setSelectionRange(start + 1, start + 1);
        } else if (text === '![]()') {
            markdownInput.value = val.substring(0, start) + text + val.substring(end);
            markdownInput.setSelectionRange(start + 2, start + 2);
        } else {
            markdownInput.value = val.substring(0, start) + text + val.substring(end);
            markdownInput.setSelectionRange(start + text.length, start + text.length);
        }

        markdownInput.focus();
        markdownInput.dispatchEvent(new Event('input'));
    };

    // 清空
    window.clearEditor = function() {
        if (markdownInput.value.trim() === '') return;
        if (confirm('确定要清空所有内容吗？此操作不可撤销！')) {
            markdownInput.value = '';
            markdownInput.dispatchEvent(new Event('input'));
            statusText.textContent = '已清空';
        }
    };

    // 保存
    window.saveFile = function(filePath) {
        var content = markdownInput.value;

        if (window.electronAPI && filePath) {
            window.electronAPI.saveFile(filePath, content).then(function() {
                var parts = filePath.replace(/\\/g, '/').split('/');
                statusText.textContent = '已保存：' + parts[parts.length - 1];
            }).catch(function(err) {
                console.error('保存失败:', err);
                statusText.textContent = '保存失败';
            });
        } else if (!window.electronAPI) {
            var now = new Date();
            var name = 'markdown_' +
                now.getFullYear() +
                pad(now.getMonth() + 1) +
                pad(now.getDate()) + '_' +
                pad(now.getHours()) +
                pad(now.getMinutes()) +
                pad(now.getSeconds()) + '.md';
            var blob = new Blob([content], { type: 'text/markdown' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            statusText.textContent = '已保存文件';
        }

        setTimeout(function() {
            if (statusText.textContent !== '保存失败') {
                statusText.textContent = '就绪';
            }
        }, 2000);
    };

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    // 加载
    window.loadFile = function(filePath) {
        if (window.electronAPI && filePath) {
            window.electronAPI.openFile(filePath).then(function(content) {
                markdownInput.value = content;
                markdownInput.dispatchEvent(new Event('input'));
                statusText.textContent = '已加载：' + filePath;
            }).catch(function(err) {
                console.error('加载失败:', err);
                statusText.textContent = '加载失败';
            });
        } else {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = '.md,.markdown,.txt';
            input.onchange = function(e) {
                var file = e.target.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function(e) {
                    markdownInput.value = e.target.result;
                    markdownInput.dispatchEvent(new Event('input'));
                    statusText.textContent = '已加载：' + file.name;
                };
                reader.readAsText(file);
            };
            input.click();
        }
    };

    function highlightCodeBlocks() {
        var blocks = markdownPreview.querySelectorAll('pre code');
        for (var i = 0; i < blocks.length; i++) {
            hljs.highlightElement(blocks[i]);
        }
    }

    // 快捷键
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            window.saveFile();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            window.loadFile();
        }
        if (e.target === markdownInput && e.key === 'Tab') {
            e.preventDefault();
            window.insertText('    ');
        }
    });

    // 初始化
    function init() {
        var sample =
            '# 欢迎使用 Markdown 编辑器\n\n' +
            '这是一个功能强大的 **Markdown 编辑器**，支持实时预览。\n\n' +
            '## 主要功能\n\n' +
            '- ✨ **实时预览** - 编辑时即时看到效果\n' +
            '- 📝 **语法高亮** - 代码块自动高亮\n' +
            '- 💾 **保存文件** - 导出为 .md 文件\n' +
            '- 📂 **打开文件** - 加载本地 Markdown 文件\n\n' +
            '## 示例代码\n\n' +
            '```javascript\n' +
            'function hello() {\n' +
            '    console.log("Hello, World!");\n' +
            '}\n' +
            '```\n\n' +
            '## 引用示例\n\n' +
            '> 这是一个引用块\n' +
            '> 可以包含多行内容\n\n' +
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
            if (confirm('确定要清空所有内容吗？此操作不可撤销！')) {
                markdownInput.value = '';
                markdownInput.dispatchEvent(new Event('input'));
                statusText.textContent = '已新建';
            }
        };

        window.addEventListener('electron-save-file', function(e) {
            window.saveFile(e.detail);
        });
    }

})();