import { useRef } from 'react';

/**
 * PC 의 더블클릭과 모바일의 "두 번 터치" 를 같은 동작으로 묶어준다.
 * 모바일 브라우저는 dblclick 이 안 오거나 늦게 오는 경우가 있어 직접 간격을 잰다.
 *
 * 사용법: <div {...useDoubleTap(() => 열기())} />
 */
export function useDoubleTap<E extends { pointerType?: string }>(
  onDouble: (event: E) => void,
  delay = 320
) {
  const lastTapRef = useRef(0);

  return {
    onDoubleClick: (event: E) => {
      // 마우스는 브라우저가 주는 더블클릭을 그대로 사용
      onDouble(event);
    },
    onPointerUp: (event: E) => {
      if (event.pointerType === 'mouse') return;
      const now = Date.now();
      if (now - lastTapRef.current < delay) {
        lastTapRef.current = 0;
        onDouble(event);
      } else {
        lastTapRef.current = now;
      }
    }
  };
}
