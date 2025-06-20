const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';
const { initialize, enable } = require('@electron/remote/main');

// Initialize remote module
initialize();

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