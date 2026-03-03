import { useState, useEffect } from 'react';

// Desktop 窗口很窄时才算 mobile
const DESKTOP_MOBILE_BREAKPOINT = 840;
// 触摸平板（包括 iPad）在 768~1200 内也按 mobile/tablet 处理
const TOUCH_MOBILE_MAX_WIDTH = 1200;

const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    (navigator as any).maxTouchPoints > 0
  );
};

const isTabletLike = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIPadUA = /iPad/.test(ua);
  const isAndroidTablet = /Android(?!.*Mobile)|Tablet/.test(ua);
  const isIPadLike =
    navigator.platform === 'MacIntel' &&
    (navigator as any).maxTouchPoints > 1;
  return isIPadUA || isAndroidTablet || isIPadLike;
};

const computeIsMobile = () => {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  const touch = isTouchDevice();
  const tablet = isTabletLike();

  // 触摸 + 平板（包括 iPad）→ 768~1200 也算 mobile/tablet 布局
  if (touch && tablet) {
    return width >= 768 && width <= TOUCH_MOBILE_MAX_WIDTH;
  }

  // 其他触摸设备（大手机等）→ 宽度本身就不会太大
  if (touch) {
    return width <= TOUCH_MOBILE_MAX_WIDTH;
  }

  // 非触摸桌面设备 → 只有非常窄的窗口才当 mobile
  return width <= DESKTOP_MOBILE_BREAKPOINT;
};

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => computeIsMobile());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      setIsMobile(computeIsMobile());
    };

    handler();

    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
    };
  }, []);

  return isMobile;
};
