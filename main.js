const { app, BrowserWindow, dialog, Menu } = require('electron');
const path = require('path');

let mainWindow;

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

app.whenReady().then(createWindow);

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
