import { contextBridge, ipcRenderer } from 'electron';

// ... existing code ...

contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing exposed methods ...
  
  // Remote Control Methods
  simulateMouseMove: (x: number, y: number) => {
    return ipcRenderer.invoke('remote-control:mouse-move', { x, y });
  },
  simulateMouseClick: (x: number, y: number, isDown: boolean) => {
    return ipcRenderer.invoke('remote-control:mouse-click', { x, y, isDown });
  },
  simulateKeyEvent: (key: string, isDown: boolean) => {
    return ipcRenderer.invoke('remote-control:key-event', { key, isDown });
  },
  getScreenSize: () => {
    return ipcRenderer.invoke('remote-control:screen-size');
  }
}); 