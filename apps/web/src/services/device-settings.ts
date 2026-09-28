export interface DeviceSettings {
  scrambleMessages: boolean;
}

const KEY = 'goprivate.settings';
const DEFAULTS: DeviceSettings = {
  scrambleMessages: true,
};

type Listener = (settings: DeviceSettings) => void;

const listeners = new Set<Listener>();

function storage(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

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

export function loadDeviceSettings(): DeviceSettings {
  return parseSettings(storage()?.getItem(KEY) ?? null);
}

export function saveDeviceSettings(patch: Partial<DeviceSettings>): DeviceSettings {
  const next = { ...loadDeviceSettings(), ...patch };
  storage()?.setItem(KEY, JSON.stringify(next));
  for (const listener of listeners) listener(next);
  return next;
}

export function subscribeDeviceSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
