import { useCallback, useRef, useState } from 'react';
import { aura } from '../../lib/bridge.js';

const DRAG_THRESHOLD_PX = 4;

/**
 * Manual window drag hook:
 * - Distinguishes between clicks and drags (4px threshold)
 * - Supports 'window' mode (expanded panel) and 'pill' mode (collapsed notch)
 */
export function useWindowDrag({ getOptions, onEnd, onClick } = {}) {
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  const onMouseDown = useCallback(
    (e) => {
      if (e.button !== 0 || e.target.closest('button, textarea, input, a')) return;
      e.preventDefault();

      const startX = e.screenX;
      const startY = e.screenY;
      let started = false;

      const handleMove = (ev) => {
        if (!started) {
          const dist = Math.hypot(ev.screenX - startX, ev.screenY - startY);
          if (dist < DRAG_THRESHOLD_PX) return;
          started = true;
          draggingRef.current = true;
          setDragging(true);
          const opts = getOptions?.() ?? { mode: 'window' };
          aura.widget.dragStart(opts);
        }
      };

      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        if (started) {
          aura.widget.dragEnd();
          draggingRef.current = false;
          setDragging(false);
          onEnd?.();
        } else {
          onClick?.();
        }
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [getOptions, onEnd, onClick],
  );

  return { dragging, draggingRef, onMouseDown };
}
