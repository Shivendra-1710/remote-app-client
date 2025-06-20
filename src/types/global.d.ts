declare namespace Electron {
  interface DesktopCapturerSource {
    id: string;
    name: string;
    thumbnail: HTMLImageElement;
    display_id: string;
    appIcon: HTMLImageElement | null;
  }
}

interface Window {
  electronAPI: {
    // Screen capture methods
    getDesktopSources: (options: {
      types: string[];
      thumbnailSize: { width: number; height: number };
    }) => Promise<Electron.DesktopCapturerSource[]>;
    
    // Remote Control Methods
    simulateMouseMove: (x: number, y: number) => Promise<boolean>;
    simulateMouseClick: (x: number, y: number, isDown: boolean) => Promise<boolean>;
    simulateKeyEvent: (key: string, isDown: boolean) => Promise<boolean>;
    getScreenSize: () => Promise<{ width: number; height: number; scaleFactor: number }>;
  };
}

interface MediaTrackConstraints {
  cursor?: 'always' | 'motion' | 'never';
  displaySurface?: 'browser' | 'monitor' | 'window';
  logicalSurface?: boolean;
  width?: { ideal?: number };
  height?: { ideal?: number };
  frameRate?: { ideal?: number; max?: number };
  surfaceSwitching?: 'include';
  selfBrowserSurface?: 'include';
} 