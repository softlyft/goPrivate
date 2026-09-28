'use client';

import { useEffect, useState } from 'react';
import { loadDeviceSettings, subscribeDeviceSettings } from '@/services/device-settings';
import type { DeviceSettings } from '@/services/device-settings';

export function useDeviceSettings(): DeviceSettings {
  const [settings, setSettings] = useState<DeviceSettings>(() => loadDeviceSettings());

  useEffect(() => subscribeDeviceSettings(setSettings), []);

  return settings;
}
