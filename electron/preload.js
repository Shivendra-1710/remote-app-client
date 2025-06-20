const { contextBridge } = require('electron');
const { desktopCapturer } = require('@electron/remote');

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
// the desktopCapturer module without exposing the entire remote object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    getDesktopSources: async (options) => {
      try {
        const sources = await desktopCapturer.getSources(options);
        return sources;
      } catch (error) {
        console.error('Error getting desktop sources:', error);
        throw error;
      }
    }
  }
);

// Expose WebRTC polyfills
contextBridge.exposeInMainWorld('wrtc', webrtcPolyfill); 