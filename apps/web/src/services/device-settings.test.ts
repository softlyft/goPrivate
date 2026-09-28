import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadDeviceSettings, saveDeviceSettings } from './device-settings.js';

class MemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe('device settings', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('defaults scramble messages to on', () => {
    expect(loadDeviceSettings()).toEqual({ scrambleMessages: true });
  });

  it('persists scramble toggle on this device', () => {
    saveDeviceSettings({ scrambleMessages: false });
    expect(loadDeviceSettings().scrambleMessages).toBe(false);
  });
});
