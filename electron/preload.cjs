const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    closeApp: () => ipcRenderer.send('close-app'),
    minimizeApp: () => ipcRenderer.send('minimize-app'),
    setOpacity: (opacity) => ipcRenderer.send('set-opacity', opacity),
    setSize: (size) => ipcRenderer.send('set-size', size),
    setBounds: (bounds) => ipcRenderer.send('set-bounds', bounds),
    getSize: () => ipcRenderer.send('get-size'),
    getBounds: () => ipcRenderer.send('get-bounds'),
    onGetSizeReply: (callback) => ipcRenderer.on('get-size-reply', (event, size) => callback(size)),
    onGetBoundsReply: (callback) => ipcRenderer.on('get-bounds-reply', (event, bounds) => callback(bounds)),

    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
    onUpdateProgress: (callback) => ipcRenderer.on('download-progress', (event, progressObj) => callback(progressObj)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
    onUpdateError: (callback) => ipcRenderer.on('update-error', (event, error) => callback(error)),
    quitAndInstall: () => ipcRenderer.send('quit-and-install')
});

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text
    }
  
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency])
    }
})
