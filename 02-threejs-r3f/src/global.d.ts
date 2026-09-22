declare global {
  interface Window {
    PerfHUD?: { set(key: string, value: unknown): void; stats(): unknown; reset(): void };
    __lab?: { boostAll(v: boolean): void; setGlow(v: boolean): void };
  }
}

declare module '*.css';
declare module '*.js';

export {};
