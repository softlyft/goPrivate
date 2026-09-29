import { useEffect, useState } from 'react';
import { loadDeviceSettings, subscribeDeviceSettings } from '../services/device-settings';
import type { DeviceSettings } from '../services/device-settings';

export function useDeviceSettings(): DeviceSettings {
  const [settings, setSettings] = useState<DeviceSettings>({
    scrambleMessages: true, // Default until loaded
  });

  useEffect(() => {
    // Load initial settings
    void loadDeviceSettings().then(setSettings);

    // Subscribe to changes
    const unsubscribe = subscribeDeviceSettings(setSettings);
    return unsubscribe;
  }, []);

  return settings;
}
