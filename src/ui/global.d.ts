import { BrowserAPI } from '../preload/browser-preload';

declare global {
  interface Window {
    browserAPI: BrowserAPI;
  }
}

export {};

