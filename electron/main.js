const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';
const { initialize, enable } = require('@electron/remote/main');

// Initialize remote module
initialize();

// Handle desktop capturer requests from renderer
ipcMain.handle('get-desktop-sources', async (event, options) => {
  try {
    console.log('🖥️ [Main] Getting desktop sources for remote access...');
    const sources = await desktopCapturer.getSources(options);
    console.log('✅ [Main] Found', sources.length, 'desktop sources');
    return sources;
  } catch (error) {
    console.error('❌ [Main] Error getting desktop sources:', error);
    throw error;
  }
});

// Mouse simulation handlers removed - using robotjs versions below

ipcMain.handle('remote-control:screen-size', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const result = {
      width: primaryDisplay.bounds.width,
      height: primaryDisplay.bounds.height,
      scaleFactor: primaryDisplay.scaleFactor
    };
    console.log('📏 [Main] Screen size:', result);
    return result;
  } catch (error) {
    console.error('❌ [Main] Error getting screen size:', error);
    return { width: 1920, height: 1080, scaleFactor: 1 };
  }
});

// Mouse control handlers
ipcMain.handle('remote-control:mouse-move', async (event, x, y) => {
  try {
    const robotjs = require('@hurdlegroup/robotjs');
    console.log(`🖱️ [Main] Moving mouse to: ${x}, ${y}`);
    robotjs.moveMouse(x, y);
    return { success: true };
  } catch (error) {
    console.error('❌ [Main] Error moving mouse:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remote-control:mouse-click', async (event, x, y, isDown, button = 'left') => {
  try {
    const robotjs = require('@hurdlegroup/robotjs');
    console.log(`🖱️ [Main] Mouse ${isDown ? 'down' : 'up'} at: ${x}, ${y}, button: ${button}`);
    
    // Move to position first
    robotjs.moveMouse(x, y);
    
    // Perform click action
    if (isDown) {
      robotjs.mouseToggle('down', button);
    } else {
      robotjs.mouseToggle('up', button);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ [Main] Error clicking mouse:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remote-control:key-event', async (event, key, isDown) => {
  try {
    const robotjs = require('@hurdlegroup/robotjs');
    console.log(`⌨️ [Main] Key ${isDown ? 'down' : 'up'}: ${key}`);
    
    if (isDown) {
      robotjs.keyToggle(key, 'down');
    } else {
      robotjs.keyToggle(key, 'up');
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ [Main] Error with key event:', error);
    return { success: false, error: error.message };
  }
});

// Enable WebRTC features
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true,
      webSecurity: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      webgl: true,
      experimentalFeatures: true
    },
  });

  // Enable remote module access for this window
  enable(mainWindow.webContents);

  // Enable screen capture permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'display-capture', 'mediaKeySystem'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Enable screen sharing
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    const allowedPermissions = ['media', 'display-capture', 'mediaKeySystem'];
    return allowedPermissions.includes(permission);
  });

  if (isDev) {
    const pollDevServer = () => {
      const testDevServer = () => {
        return new Promise((resolve, reject) => {
          const req = require('http').get('http://localhost:5173', (res) => {
            if (res.statusCode === 200) {
              resolve();
            } else {
              reject();
            }
          });
          req.on('error', reject);
        });
      };

      testDevServer()
        .then(() => {
          mainWindow.loadURL('http://localhost:5173');
          mainWindow.webContents.openDevTools();
        })
        .catch(() => {
          console.log('Dev server not ready yet, retrying in 100ms...');
          setTimeout(pollDevServer, 100);
        });
    };

    pollDevServer();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow.destroy();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 