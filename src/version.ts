// Uygulama sürümü: derlemede package.json'dan yazılır (vite.config.ts → define)
declare const __APP_VERSION__: string;
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
