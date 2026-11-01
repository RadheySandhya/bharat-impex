import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

// Apple's momentum projection (Designing Fluid Interfaces): where a flick would come to rest
const project = (velocityPxPerS, decel = 0.998) => (velocityPxPerS / 1000) * decel / (1 - decel);
// Soft resistance past a boundary instead of a hard stop
const rubberband = (overshoot, dim, c = 0.55) => (overshoot * dim * c) / (dim + c * Math.abs(overshoot));

/**
 * Dialog on desktop, bottom sheet on phones.
 * The phone sheet tracks the finger 1:1 from where it was grabbed, rubber-bands upward,
 * and on release projects momentum: dismiss if it would travel past ~35% of its height.
 */
export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', footer }) {
  const sheetRef = useRef(null);
  const drag = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    setDragY(0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const isPhone = () => window.innerWidth < 640;

  const onPointerDown = (e) => {
    if (!isPhone() || e.button > 0) return;
    if (e.target.closest('button, input, select, textarea, a')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY - dragY, samples: [{ y: e.clientY, t: performance.now() }] };
    setSettling(false);
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const raw = e.clientY - drag.current.startY;
    const h = sheetRef.current?.offsetHeight || 600;
    setDragY(raw >= 0 ? raw : rubberband(raw, h));
    const s = drag.current.samples;
    s.push({ y: e.clientY, t: performance.now() });
    if (s.length > 5) s.shift();
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    const s = drag.current.samples;
    const first = s[0];
    const last = s[s.length - 1];
    const dt = Math.max(1, last.t - first.t);
    const velocity = ((last.y - first.y) / dt) * 1000; // px/s
    drag.current = null;
    const h = sheetRef.current?.offsetHeight || 600;
    const projected = dragY + project(velocity);
    setSettling(true);
    if (projected > h * 0.35) {
      setDragY(h + 40);
      setTimeout(() => { setSettling(false); setDragY(0); onClose(); }, 260);
    } else {
      setDragY(0);
    }
  };

  const sheetStyle = dragY !== 0 || settling
    ? {
        translate: `0 ${dragY}px`,
        transition: settling ? 'translate 320ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
      }
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="presentation">
      {/* Dim to focus */}
      <div
        className="fixed inset-0 bg-black/30 bi-scrim"
        style={dragY > 0 ? { opacity: Math.max(0.2, 1 - dragY / 600) } : undefined}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`bi-dialog relative w-full ${maxWidth} bg-white sm:rounded-[22px] rounded-t-[22px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] sm:max-h-[88vh]`}
        style={sheetStyle}
      >
        {/* Header doubles as the drag handle on phones */}
        <div
          className="relative shrink-0 touch-none sm:touch-auto select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="sm:hidden pt-2 flex justify-center" aria-hidden="true">
            <div className="w-9 h-[5px] rounded-full bg-black/15" />
          </div>
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-2.5 sm:pt-4 pb-3 hairline-b">
            <h3 className="text-[17px] font-semibold tracking-[-0.022em] text-slate-900 leading-snug min-w-0">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="w-[30px] h-[30px] shrink-0 rounded-full bg-black/[0.06] hover:bg-black/[0.1] text-slate-500 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1 text-slate-700 overscroll-contain">
          {children}
        </div>

        {/* Footer: actions on the trailing edge, primary last */}
        {footer && (
          <div
            className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 hairline-t bg-[#FBFBFD]"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
