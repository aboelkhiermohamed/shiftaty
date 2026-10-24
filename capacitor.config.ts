import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.bbce7db744bc427ead7ef82349d2a426',
  appName: 'Shiftaty',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      launchAutoHide: true,
      backgroundColor: "#0A0D11",
      androidSplashResourceName: "splash",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: true,
      style: "DARK",
      backgroundColor: "#0A0D11",
    },
    LocalNotifications: {
      smallIcon: "logo_large",
      iconColor: "#3b82f6",
      largeIcon: "logo_large",
      sound: "beep.wav",
    },
  },
};

export default config;
