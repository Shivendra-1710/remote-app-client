import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as ioHook from 'iohook';
import activeWin from 'active-win';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // In development, load from the Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Initialize iohook
ioHook.start();

// Remote Control IPC Handlers
ipcMain.handle('remote-control:mouse-move', async (_, { x, y }) => {
  try {
    ioHook.mouseMove({ x: Math.floor(x), y: Math.floor(y) });
    return true;
  } catch (error) {
    console.error('Failed to move mouse:', error);
    return false;
  }
});

ipcMain.handle('remote-control:mouse-click', async (_, { x, y, isDown }) => {
  try {
    ioHook.mouseMove({ x: Math.floor(x), y: Math.floor(y) });
    if (isDown) {
      ioHook.mouseDown({ button: 1, clicks: 1 });
    } else {
      ioHook.mouseUp({ button: 1, clicks: 1 });
    }
    return true;
  } catch (error) {
    console.error('Failed to click mouse:', error);
    return false;
  }
});

ipcMain.handle('remote-control:key-event', async (_, { key, isDown }) => {
  try {
    const keyCode = getKeyCode(key);
    if (keyCode) {
      if (isDown) {
        ioHook.keydown({ keycode: keyCode });
      } else {
        ioHook.keyup({ keycode: keyCode });
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to simulate key event:', error);
    return false;
  }
});

ipcMain.handle('remote-control:screen-size', async () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  return {
    width: primaryDisplay.size.width,
    height: primaryDisplay.size.height,
    scaleFactor: primaryDisplay.scaleFactor
  };
});

// Key code mapping helper
const getKeyCode = (key: string): number | null => {
  const keyMap: { [key: string]: number } = {
    'a': 30, 'b': 48, 'c': 46, 'd': 32, 'e': 18, 'f': 33, 'g': 34, 'h': 35, 'i': 23,
    'j': 36, 'k': 37, 'l': 38, 'm': 50, 'n': 49, 'o': 24, 'p': 25, 'q': 16, 'r': 19,
    's': 31, 't': 20, 'u': 22, 'v': 47, 'w': 17, 'x': 45, 'y': 21, 'z': 44,
    '1': 2, '2': 3, '3': 4, '4': 5, '5': 6, '6': 7, '7': 8, '8': 9, '9': 10, '0': 11,
    'enter': 28, 'space': 57, 'tab': 15, 'backspace': 14, 'delete': 111,
    'escape': 1, 'capslock': 58, 'shift': 42, 'control': 29, 'alt': 56,
    'meta': 3675, 'arrowup': 57416, 'arrowdown': 57424, 'arrowleft': 57419, 'arrowright': 57421
  };
  
  return keyMap[key.toLowerCase()] || null;
};

// Clean up iohook on app quit
app.on('before-quit', () => {
  ioHook.unload();
  ioHook.stop();
}); 