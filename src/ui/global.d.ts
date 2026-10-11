import { BrowserAPI } from '../preload/browser-preload';

declare global {
  interface Window {
    browserAPI: BrowserAPI;
  }
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

export {};

