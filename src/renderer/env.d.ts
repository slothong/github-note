import type { ElectronAPI } from '../preload/index';

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

declare module '*.css' {
  const content: string;
  export default content;
}
