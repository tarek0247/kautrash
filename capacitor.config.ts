import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tarekkk.kautrash',
  appName: 'Kautrash',
  webDir: '.vercel/output/static',
  server: {
    url: 'https://kautrash.vercel.app',
    cleartext: true
  }
};

export default config;