import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeviceSettings {
  scrambleMessages: boolean;
}

const KEY = 'goprivate.settings';
const DEFAULTS: DeviceSettings = {
  scrambleMessages: true,
};

type Listener = (settings: DeviceSettings) => void;

const listeners = new Set<Listener>();

function parseSettings(raw: string | null): DeviceSettings {
  if (!raw) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(raw) as Partial<DeviceSettings>;
    return {
      scrambleMessages:
        typeof parsed.scrambleMessages === 'boolean'
          ? parsed.scrambleMessages
          : DEFAULTS.scrambleMessages,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function loadDeviceSettings(): Promise<DeviceSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return parseSettings(raw);
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveDeviceSettings(patch: Partial<DeviceSettings>): Promise<DeviceSettings> {
  try {
    const current = await loadDeviceSettings();
    const next = { ...current, ...patch };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    // Notify all listeners
    for (const listener of listeners) {
      listener(next);
    }
    return next;
  } catch (err) {
    console.error('Failed to save device settings:', err);
    throw err;
  }
}

export function subscribeDeviceSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
