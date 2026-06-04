var fs = require('fs');
var ipcRenderer = require('electron').ipcRenderer;

// 直接暴露 API（contextIsolation: false 时可用）
window.electronAPI = {
    openFile: function(filePath) {
        return new Promise(function(resolve, reject) {
            try {
                var content = fs.readFileSync(filePath, 'utf-8');
                resolve(content);
            } catch (error) {
                reject(error);
            }
        });
    },
    saveFile: function(filePath, content) {
        return new Promise(function(resolve, reject) {
            try {
                fs.writeFileSync(filePath, content, 'utf-8');
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }
};

// 监听主进程消息
ipcRenderer.on('file-content', function(event, content, filePath) {
    if (window.onFileLoaded) {
        window.onFileLoaded(content, filePath);
    }
});

ipcRenderer.on('save-request', function(event, filePath) {
    window.dispatchEvent(new CustomEvent('electron-save-file', { detail: filePath }));
});

ipcRenderer.on('new-file', function(event) {
    if (window.onNewFile) {
        window.onNewFile();
    }
});