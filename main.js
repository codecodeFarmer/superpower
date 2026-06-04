const { app, BrowserWindow, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let fileToLoad = null; // 启动时传入的文件路径

// 请求单实例锁，防止重复打开
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // 当第二个实例启动时（例如双击另一个 .md 文件），将文件路径传给已有窗口
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            // 从命令行参数中提取文件路径
            const filePath = extractFilePath(commandLine);
            if (filePath) {
                loadFileToSend(filePath);
            }
        }
    });
}

// 从命令行参数中提取文件路径
function extractFilePath(commandLine) {
    // commandLine[0] 是程序路径，后面的参数可能是文件路径
    for (let i = 1; i < commandLine.length; i++) {
        const arg = commandLine[i];
        // 跳过 Electron 内部参数（以 -- 或 -d 开头）
        if (arg.startsWith('--') || arg.startsWith('-d')) {
            continue;
        }
        // 检查是否是 .md / .markdown / .txt 文件
        if (arg && /\.(md|markdown|txt)$/i.test(arg) && fs.existsSync(arg)) {
            return arg;
        }
    }
    return null;
}

// 读取文件内容并发送到渲染进程
function loadFileToSend(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        mainWindow.webContents.send('file-content', content, filePath);
        // 更新窗口标题
        const fileName = path.basename(filePath);
        mainWindow.setTitle(fileName + ' - Markdown 编辑器');
    } catch (err) {
        console.error('加载文件错误:', err);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        title: 'Markdown 编辑器',
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // 加载应用
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // 创建菜单
    createMenu();

    // 窗口准备好后，如果有待加载的文件，立即加载
    mainWindow.webContents.on('did-finish-load', () => {
        if (fileToLoad) {
            loadFileToSend(fileToLoad);
            fileToLoad = null;
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createMenu() {
    const template = [
        {
            label: '文件',
            submenu: [
                {
                    label: '新建',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        if (confirmClear()) {
                            mainWindow.webContents.send('new-file');
                        }
                    }
                },
                {
                    label: '打开',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        openFileDialog();
                    }
                },
                {
                    label: '保存',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        saveFileDialog();
                    }
                },
                {
                    label: '另存为',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => {
                        saveFileDialog();
                    }
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { role: 'undo', label: '撤销' },
                { role: 'redo', label: '重做' },
                { type: 'separator' },
                { role: 'cut', label: '剪切' },
                { role: 'copy', label: '复制' },
                { role: 'paste', label: '粘贴' },
                { role: 'pasteAndMatchStyle', label: '粘贴并匹配样式' },
                { role: 'delete', label: '删除' },
                { type: 'separator' },
                { role: 'selectAll', label: '全选' }
            ]
        },
        {
            label: '视图',
            submenu: [
                { role: 'reload', label: '重新加载' },
                { role: 'toggleDevTools', label: '开发者工具' },
                { type: 'separator' },
                { role: 'zoomIn', label: '放大' },
                { role: 'zoomOut', label: '缩小' },
                {
                    role: 'resetZoom',
                    label: '重置缩放'
                }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于',
                            message: 'Markdown 编辑器',
                            detail: '版本 1.0.0\n\n一个功能强大的 Markdown 编辑器，支持实时预览和语法高亮。',
                            buttons: ['确定']
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function openFileDialog() {
    dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Markdown Files', extensions: ['md', 'markdown', 'txt'] }
        ]
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const content = require('fs').readFileSync(filePath, 'utf-8');
            mainWindow.webContents.send('file-content', content, filePath);
        }
    }).catch(err => {
        console.error('打开文件错误:', err);
    });
}

function saveFileDialog() {
    dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'Markdown Files', extensions: ['md'] }
        ],
        defaultPath: 'untitled.md'
    }).then(result => {
        if (!result.canceled && result.filePath) {
            mainWindow.webContents.send('save-request', result.filePath);
        }
    }).catch(err => {
        console.error('保存文件错误:', err);
    });
}

function confirmClear() {
    return dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['取消', '确定'],
        title: '确认',
        message: '确定要清空所有内容吗？',
        detail: '此操作不可撤销！'
    }) === 1;
}

app.whenReady().then(() => {
    // 解析启动时的命令行参数，提取文件路径
    const filePath = extractFilePath(process.argv);
    if (filePath) {
        fileToLoad = filePath;
    }
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
