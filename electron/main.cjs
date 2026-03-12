const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const fs = require('fs');

let mainWindow;
let server;
const PORT = 3000; // Fixed port for local server

function getStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadState() {
  try {
    const statePath = getStatePath();
    if (fs.existsSync(statePath)) {
      const stateData = fs.readFileSync(statePath, 'utf-8');
      return JSON.parse(stateData);
    }
  } catch (error) {
    console.error('Failed to load window state:', error);
  }
  return { width: 800, height: 600, x: undefined, y: undefined };
}

function saveState(bounds) {
  try {
    const statePath = getStatePath();
    fs.writeFileSync(statePath, JSON.stringify(bounds));
  } catch (error) {
    console.error('Failed to save window state:', error);
  }
}

function startServer() {
  const app = express();
  app.use(express.static(path.join(__dirname, '../dist-build')));
  
  // Handle SPA routing: redirect all 404s to index.html
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist-build/index.html'));
  });

  server = app.listen(PORT, () => {
    console.log(`Local server running on http://localhost:${PORT}`);
  });
}

function createWindow() {
  // Start local server if in production
  if (!process.env.ELECTRON_START_URL) {
    startServer();
  }

  const state = loadState();
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    frame: false, // Frameless window
    transparent: true, // Transparent background
    alwaysOnTop: false, // Optional: keep on top? Maybe let user decide. Default false for desktop widget feel.
    skipTaskbar: true, // Hide from taskbar (User Request)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Load the index.html of the app.
  const startUrl = process.env.ELECTRON_START_URL || `http://localhost:${PORT}`;
  mainWindow.loadURL(startUrl);

  // Save state on close
  mainWindow.on('close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      saveState(mainWindow.getBounds());
    }
  });
  
  // Also save on resize/move for safety, debounced slightly by event nature
  mainWindow.on('resized', () => {
    if(mainWindow) saveState(mainWindow.getBounds());
  });
  mainWindow.on('moved', () => {
    if(mainWindow) saveState(mainWindow.getBounds());
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
    if (server) {
      server.close();
    }
  });
}

// Auto-launch on login
app.setLoginItemSettings({
  openAtLogin: true, // Enable auto-start on login
  path: app.getPath('exe'),
  args: app.isPackaged ? [] : [app.getAppPath()]
});

// IPC Handlers for UI Control
ipcMain.on('close-app', () => {
    if (mainWindow) saveState(mainWindow.getBounds()); // Save before quit
    app.quit();
});

ipcMain.on('minimize-app', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('set-opacity', (event, opacity) => {
    if (mainWindow) mainWindow.setOpacity(opacity);
});

ipcMain.on('set-size', (event, { width, height }) => {
    if (mainWindow) mainWindow.setSize(width, height);
});

ipcMain.on('set-bounds', (event, bounds) => {
    if (mainWindow) mainWindow.setBounds(bounds);
});

ipcMain.on('get-bounds', (event) => {
    if (mainWindow) {
        event.reply('get-bounds-reply', mainWindow.getBounds());
    }
});

ipcMain.on('get-size', (event) => {
    if (mainWindow) {
        const [width, height] = mainWindow.getSize();
        event.reply('get-size-reply', { width, height });
    }
});


const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 이미 인스턴스가 실행 중이면, 중복 실행된 앱을 곧바로 종료합니다.
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 이미 실행 중인 인스턴스가 있을 때 또 다시 앱을 켜려고 하면, 활성화된 창을 최상단으로 띄웁니다.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
