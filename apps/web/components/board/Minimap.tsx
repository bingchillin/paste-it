'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useCollections, useWorkpasteStore } from '@/store/useWorkpasteStore';
import { useShallow } from 'zustand/react/shallow';
import { CANVAS_W, CANVAS_H, COLLECTION_W } from '@/lib/board';

interface Viewport { x: number; y: number; w: number; h: number }

function getBoard() {
  return document.getElementById('board-canvas') as HTMLDivElement | null;
}

export function Minimap() {
  const collections = useCollections();
  const cards = useWorkpasteStore(useShallow((s) => s.cards));
  const zoom = useWorkpasteStore((s) => s.zoom);
  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, w: 100, h: 100 });
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cardCountFor = useCallback(
    (colId: string) => cards.filter((c) => c.collectionIds.includes(colId)).length,
    [cards],
  );

  const syncVp = useCallback(() => {
    const el = getBoard();
    if (!el) return;
    setVp({
      x: Math.min(98, (el.scrollLeft / zoom / CANVAS_W) * 100),
      y: Math.min(98, (el.scrollTop / zoom / CANVAS_H) * 100),
      w: Math.min(100, (el.clientWidth / zoom / CANVAS_W) * 100),
      h: Math.min(100, (el.clientHeight / zoom / CANVAS_H) * 100),
    });
  }, [zoom]);

  useEffect(() => {
    const el = getBoard();
    if (!el) return;
    syncVp();
    el.addEventListener('scroll', syncVp, { passive: true });
    const ro = new ResizeObserver(syncVp);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', syncVp); ro.disconnect(); };
  }, [syncVp]);

  useEffect(() => { syncVp(); }, [zoom, syncVp]);

  const scrollToFrac = useCallback((clientX: number, clientY: number) => {
    const el = getBoard();
    const container = containerRef.current;
    if (!el || !container) return;
    const rect = container.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    el.scrollLeft = fx * CANVAS_W * zoom - el.clientWidth / 2;
    el.scrollTop = fy * CANVAS_H * zoom - el.clientHeight / 2;
  }, [zoom]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    scrollToFrac(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    scrollToFrac(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden cursor-crosshair select-none rounded-lg bg-background/60"
      style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '6px 6px' }}
      />

      {/* Collection blocks */}
      {collections.map((col) => {
        const n = cardCountFor(col.id);
        const canvasH = 52 + Math.max(48, n * 85) + 24;
        return (
          <div
            key={col.id}
            className="absolute rounded-sm"
            style={{
              left: `${((col.x ?? 0) / CANVAS_W) * 100}%`,
              top: `${((col.y ?? 0) / CANVAS_H) * 100}%`,
              width: `${(COLLECTION_W / CANVAS_W) * 100}%`,
              height: `${(canvasH / CANVAS_H) * 100}%`,
              backgroundColor: col.color,
              opacity: 0.75,
            }}
          />
        );
      })}

      {/* Viewport indicator */}
      <div
        className="absolute pointer-events-none rounded-sm border-2 border-primary bg-primary/10"
        style={{ left: `${vp.x}%`, top: `${vp.y}%`, width: `${vp.w}%`, height: `${vp.h}%` }}
      />
    </div>
  );
}
