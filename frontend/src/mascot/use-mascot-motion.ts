import {
  useEffect,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from "react";

import {
  moveMascotDrag,
  type MascotDragStart,
  type MascotPosition
} from "./mascot-position";

interface MascotMotion {
  cardRef: RefObject<HTMLDivElement | null>;
  consumeDragClick: () => boolean;
  mascotRef: RefObject<HTMLButtonElement | null>;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

function setPixelProperty(element: HTMLElement | null, property: string, value: number): void {
  if (element === null) return;
  element.style.setProperty(property, `${value.toFixed(2)}px`);
}

function applyDragPosition(card: HTMLElement | null, position: MascotPosition): void {
  if (card === null) return;
  setPixelProperty(card, "--mascot-drag-x", position.x);
  setPixelProperty(card, "--mascot-drag-y", position.y);
}

export function useMascotMotion(
  initialPosition: MascotPosition,
  onPositionChange: (position: MascotPosition) => void
): MascotMotion {
  const cardRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLButtonElement>(null);
  const positionRef = useRef(initialPosition);
  const dragStartRef = useRef<MascotDragStart | null>(null);
  const ignoreNextClickRef = useRef(false);

  useLayoutEffect(() => {
    const position = { x: initialPosition.x, y: initialPosition.y };
    positionRef.current = position;
    applyDragPosition(cardRef.current, position);
  }, [initialPosition.x, initialPosition.y]);

  useEffect(() => {
    function scrollMascot(): void {
      setPixelProperty(cardRef.current, "--mascot-drift-y", Math.sin(window.scrollY / 180) * 8);
    }

    function followPointer(event: PointerEvent): void {
      if (dragStartRef.current !== null) return;
      const card = cardRef.current;
      const mascot = mascotRef.current;
      if (card === null || mascot === null) return;
      const rect = mascot.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width / 2)
        / Math.max(rect.width * 1.7, 1)));
      const dy = Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2)
        / Math.max(rect.height * 1.7, 1)));
      setPixelProperty(mascot, "--look-x", dx * 3);
      setPixelProperty(mascot, "--look-y", dy * 2);
      mascot.style.setProperty("--tilt", `${(dx * 4).toFixed(2)}deg`);
      setPixelProperty(card, "--mascot-drift-x", dx * 7);
      setPixelProperty(card, "--mascot-drift-y", dy * 5);
      card.classList.add("is-near");
    }

    function resetPointerFollow(): void {
      const card = cardRef.current;
      const mascot = mascotRef.current;
      if (card === null || mascot === null) return;
      mascot.style.setProperty("--look-x", "0px");
      mascot.style.setProperty("--look-y", "0px");
      mascot.style.setProperty("--tilt", "0deg");
      card.style.setProperty("--mascot-drift-x", "0px");
      scrollMascot();
      card.classList.remove("is-near");
    }

    window.addEventListener("pointermove", followPointer, { passive: true });
    window.addEventListener("pointerleave", resetPointerFollow);
    window.addEventListener("scroll", scrollMascot, { passive: true });
    scrollMascot();
    return () => {
      window.removeEventListener("pointermove", followPointer);
      window.removeEventListener("pointerleave", resetPointerFollow);
      window.removeEventListener("scroll", scrollMascot);
    };
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>): void {
    dragStartRef.current = {
      moved: false,
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      positionX: positionRef.current.x,
      positionY: positionRef.current.y
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer events do not always create active pointer capture.
    }
    cardRef.current?.classList.add("is-dragging");
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>): void {
    const start = dragStartRef.current;
    if (start?.pointerId !== event.pointerId) return;
    const moved = moveMascotDrag(start, { x: event.clientX, y: event.clientY });
    start.moved = moved.moved;
    positionRef.current = moved.position;
    applyDragPosition(cardRef.current, moved.position);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>): void {
    const start = dragStartRef.current;
    if (start?.pointerId !== event.pointerId) return;
    ignoreNextClickRef.current = start.moved;
    dragStartRef.current = null;
    cardRef.current?.classList.remove("is-dragging");
    onPositionChange(positionRef.current);
  }

  function consumeDragClick(): boolean {
    const shouldIgnore = ignoreNextClickRef.current;
    ignoreNextClickRef.current = false;
    return shouldIgnore;
  }

  return {
    cardRef,
    consumeDragClick,
    mascotRef,
    onPointerDown,
    onPointerMove,
    onPointerUp
  };
}
