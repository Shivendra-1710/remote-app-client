const { contextBridge, ipcRenderer } = require('electron');

// Polyfills for WebRTC in Electron
const webrtcPolyfill = {
  RTCPeerConnection: window.RTCPeerConnection,
  RTCSessionDescription: window.RTCSessionDescription,
  RTCIceCandidate: window.RTCIceCandidate,
  MediaStream: window.MediaStream,
  MediaStreamTrack: window.MediaStreamTrack,
  navigator: {
    mediaDevices: window.navigator.mediaDevices,
    getUserMedia: window.navigator.mediaDevices?.getUserMedia?.bind(window.navigator.mediaDevices),
  }
};

// Expose protected methods that allow the renderer process to use
// the desktopCapturer module through IPC communication
contextBridge.exposeInMainWorld(
  'electronAPI', {
    getDesktopSources: async (options) => {
      try {
        console.log('🎥 [Preload] Requesting desktop sources...');
        const sources = await ipcRenderer.invoke('get-desktop-sources', options);
        console.log('✅ [Preload] Received', sources.length, 'desktop sources');
        return sources;
      } catch (error) {
        console.error('❌ [Preload] Error getting desktop sources:', error);
        throw error;
      }
    },
    
    getScreenSize: async () => {
      try {
        console.log('📏 [Preload] Getting screen size...');
        const screenSize = await ipcRenderer.invoke('remote-control:screen-size');
        console.log('✅ [Preload] Screen size:', screenSize);
        return screenSize;
      } catch (error) {
        console.error('❌ [Preload] Error getting screen size:', error);
        // Fallback to browser API
        return {
          width: window.screen.width,
          height: window.screen.height,
          scaleFactor: window.devicePixelRatio || 1
        };
      }
    },

    // Mouse control APIs
    simulateMouseMove: async (x, y) => {
      try {
        console.log('🖱️ [Preload] Mouse move:', { x, y });
        return await ipcRenderer.invoke('remote-control:mouse-move', { x, y });
      } catch (error) {
        console.error('❌ [Preload] Error simulating mouse move:', error);
        throw error;
      }
    },

    simulateMouseClick: async (x, y, isDown) => {
      try {
        console.log('🖱️ [Preload] Mouse click:', { x, y, isDown });
        return await ipcRenderer.invoke('remote-control:mouse-click', { x, y, isDown });
      } catch (error) {
        console.error('❌ [Preload] Error simulating mouse click:', error);
        throw error;
      }
    },

    simulateKeyEvent: async (key, isDown) => {
      try {
        console.log('⌨️ [Preload] Key event:', { key, isDown });
        return await ipcRenderer.invoke('remote-control:key-event', { key, isDown });
      } catch (error) {
        console.error('❌ [Preload] Error simulating key event:', error);
        throw error;
      }
    }
  }
);

// Expose WebRTC polyfills
contextBridge.exposeInMainWorld('wrtc', webrtcPolyfill); 