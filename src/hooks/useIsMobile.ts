import { useEffect, useState } from 'react';
import { SiteSettings } from '../types';

/** 이 너비 미만이면 모바일 레이아웃으로 본다 */
export const MOBILE_BREAKPOINT = 768;

/**
 * 실제 창 너비와 사용자가 고른 화면 모드를 합쳐 모바일 여부를 판단한다.
 * - auto: 창 너비 기준
 * - desktop / mobile: 창 크기와 무관하게 고정
 */
export function useIsMobile(viewMode: SiteSettings['viewMode']): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  if (viewMode === 'mobile') return true;
  if (viewMode === 'desktop') return false;
  return isNarrow;
}

/** 세로/가로 방향 (실제 기기 기준) */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() =>
    typeof window !== 'undefined' && window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape'
  );

  useEffect(() => {
    const update = () =>
      setOrientation(window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape');
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return orientation;
}
