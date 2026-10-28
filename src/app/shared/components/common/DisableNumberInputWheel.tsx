"use client";

import { useEffect } from "react";

function wheelPixels(event: WheelEvent): { x: number; y: number } {
  let x = event.deltaX;
  let y = event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    x *= 16;
    y *= 16;
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    x *= window.innerWidth;
    y *= window.innerHeight;
  }
  return { x, y };
}

/** Desplaza el contenedor con scroll más cercano y, si se acaba, la página. */
function scrollWheel(from: HTMLElement, deltaX: number, deltaY: number) {
  let x = deltaX;
  let y = deltaY;
  const viewport = (document.scrollingElement ||
    document.documentElement) as HTMLElement;
  let node: HTMLElement | null = from.parentElement;

  while (node && (x !== 0 || y !== 0)) {
    if (node === document.body || node === document.documentElement) {
      node = viewport;
    }
    const style = getComputedStyle(node);
    if (
      y !== 0 &&
      /(auto|scroll|overlay)/.test(style.overflowY) &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      const max = node.scrollHeight - node.clientHeight;
      const next = Math.min(max, Math.max(0, node.scrollTop + y));
      const applied = next - node.scrollTop;
      if (applied !== 0) {
        node.scrollTop = next;
        y -= applied;
      }
    }
    if (
      x !== 0 &&
      /(auto|scroll|overlay)/.test(style.overflowX) &&
      node.scrollWidth > node.clientWidth + 1
    ) {
      const max = node.scrollWidth - node.clientWidth;
      const next = Math.min(max, Math.max(0, node.scrollLeft + x));
      const applied = next - node.scrollLeft;
      if (applied !== 0) {
        node.scrollLeft = next;
        x -= applied;
      }
    }
    if (node === viewport) break;
    node = node.parentElement;
  }
}

function isNumberInput(el: EventTarget | null): el is HTMLInputElement {
  return el instanceof HTMLInputElement && el.type === "number";
}

/**
 * El navegador sube o baja el valor de un input number al usar la rueda
 * con el campo enfocado. Aquí se anula eso y el mismo gesto desplaza la página.
 */
export default function DisableNumberInputWheel() {
  useEffect(() => {
    const bound = new WeakSet<HTMLInputElement>();

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      const input = event.currentTarget;
      if (!isNumberInput(input)) return;
      event.preventDefault();
      const { x, y } = wheelPixels(event);
      scrollWheel(input, x, y);
    };

    const bind = (el: EventTarget | null) => {
      if (!isNumberInput(el) || bound.has(el)) return;
      el.addEventListener("wheel", onWheel, { passive: false });
      bound.add(el);
    };

    const unbind = (el: EventTarget | null) => {
      if (!isNumberInput(el) || !bound.has(el)) return;
      el.removeEventListener("wheel", onWheel);
      bound.delete(el);
    };

    const onFocusIn = (event: FocusEvent) => bind(event.target);
    const onFocusOut = (event: FocusEvent) => unbind(event.target);

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    bind(document.activeElement);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      unbind(document.activeElement);
    };
  }, []);

  return null;
}
