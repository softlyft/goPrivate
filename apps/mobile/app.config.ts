import type { ExpoConfig } from 'expo/config';
import {
  ANDROID_PACKAGE,
  APP_NAME,
  DEEP_LINK_SCHEME,
  DEFAULT_PROD_RELAY_URL,
  IOS_BUNDLE_ID,
  PUBLIC_WEB_ORIGINS,
} from '../../packages/config/src/index';
import appJson from './app.json';

const httpsHosts = PUBLIC_WEB_ORIGINS.map((origin) => new URL(origin).host);

const base = appJson.expo;

const config: ExpoConfig = {
  ...base,
  name: APP_NAME,
  scheme: DEEP_LINK_SCHEME,
  extra: {
    ...base.extra,
    relayUrl: DEFAULT_PROD_RELAY_URL,
  },
  ios: {
    ...base.ios,
    bundleIdentifier: IOS_BUNDLE_ID,
    associatedDomains: httpsHosts.map((host) => `applinks:${host}`),
  },
  android: {
    ...base.android,
    package: ANDROID_PACKAGE,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          ...httpsHosts.map((host) => ({
            scheme: 'https' as const,
            host,
            pathPrefix: '/chat',
          })),
          ...httpsHosts.map((host) => ({
            scheme: 'https' as const,
            host,
            pathPrefix: '/',
          })),
          {
            scheme: DEEP_LINK_SCHEME,
            host: '*',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
};

export default config;
