declare module 'iohook' {
  interface IOHook {
    start(enableLogger?: boolean): void;
    stop(): void;
    unload(): void;
    load(): void;
    
    // Mouse events
    mouseMove(event: { x: number; y: number }): void;
    mouseDown(event: { button: number; clicks: number }): void;
    mouseUp(event: { button: number; clicks: number }): void;
    
    // Keyboard events
    keydown(event: { keycode: number }): void;
    keyup(event: { keycode: number }): void;
    
    // Event listeners
    on(event: string, callback: (event: any) => void): void;
    once(event: string, callback: (event: any) => void): void;
    removeAllListeners(): void;
  }

  const iohook: IOHook;
  export = iohook;
} 