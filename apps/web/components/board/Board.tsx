'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CollectionBlock } from './CollectionBlock';
import { CardItemDragOverlay } from './CardItem';
import { CardModal } from './CardModal';
import { useWorkpasteStore, useCollections } from '@/store/useWorkpasteStore';
import { CANVAS_W, CANVAS_H, COLLECTION_W } from '@/lib/board';
import type { Card } from '@/types';
import { Plus, Search, ZoomIn, ZoomOut, Undo2, Redo2 } from 'lucide-react';

interface ContextMenuState {
  x: number;
  y: number;
  collectionId: string | null;
}

export function Board() {
  const {
    cards,
    reorderCards,
    moveCard,
    activeCardId,
    setActiveCard,
    highlightedCollectionId,
    zoom,
    setZoom: setStoreZoom,
    undo,
    redo,
    history,
  } = useWorkpasteStore();
  const collections = useCollections();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // zoomRef mirrors store zoom for use inside non-reactive callbacks (wheel handler)
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const scrollRef = useRef<HTMLDivElement>(null);
  const scaledCanvasRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ startX: number; startY: number; startScrollX: number; startScrollY: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeCard: Card | undefined = activeDragId
    ? cards.find((c) => c.id === activeDragId)
    : undefined;

  // Fix any collections that are outside the canvas bounds on first load
  useEffect(() => {
    const { collections: all, updateCollection } = useWorkpasteStore.getState();
    all.forEach((col) => {
      if (col.archived) return;
      const clampedX = Math.max(0, Math.min(CANVAS_W - COLLECTION_W, col.x ?? 0));
      const clampedY = Math.max(0, Math.min(CANVAS_H - 80, col.y ?? 0));
      if (clampedX !== (col.x ?? 0) || clampedY !== (col.y ?? 0)) {
        updateCollection(col.id, { x: clampedX, y: clampedY });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zoom toward a pivot point in scroll-container coordinates
  const applyZoom = useCallback((newZ: number, pivotX?: number, pivotY?: number, smooth = false) => {
    const el = scrollRef.current;
    const canvas = scaledCanvasRef.current;
    const clamped = Math.min(2, Math.max(0.25, Math.round(newZ * 1000) / 1000));
    if (clamped === zoomRef.current) return;
    if (canvas) {
      canvas.style.transition = smooth ? 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
    }
    if (el && pivotX !== undefined && pivotY !== undefined) {
      const old = zoomRef.current;
      const canvasX = (pivotX + el.scrollLeft) / old;
      const canvasY = (pivotY + el.scrollTop) / old;
      setStoreZoom(clamped);
      requestAnimationFrame(() => {
        el.scrollLeft = canvasX * clamped - pivotX;
        el.scrollTop = canvasY * clamped - pivotY;
      });
    } else {
      setStoreZoom(clamped);
    }
  }, [setStoreZoom]);

  // Button zoom — pivot on viewport center, with smooth animation
  const changeZoom = useCallback((delta: number) => {
    const el = scrollRef.current;
    const rect = el?.getBoundingClientRect();
    applyZoom(
      zoomRef.current + delta,
      rect ? rect.width / 2 : undefined,
      rect ? rect.height / 2 : undefined,
      true,
    );
  }, [applyZoom]);

  // Ctrl/Cmd + scroll to zoom toward cursor
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      applyZoom(zoomRef.current - e.deltaY * 0.001, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyZoom]);

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const isEditing = tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;
      if (isEditing) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if (e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const onDragStart = ({ active }: DragStartEvent) => {
    if (active.data.current?.type === 'card') setActiveDragId(String(active.id));
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.data.current?.type !== 'card') return;
    const overId = String(over.id);
    let targetCollectionId = collections.find(
      (c) => c.id === overId || overId === `droppable-${c.id}`
    )?.id;
    if (!targetCollectionId) {
      const overCard = cards.find((c) => c.id === overId);
      targetCollectionId = overCard?.collectionIds[0];
    }
    if (!targetCollectionId) return;
    const card = cards.find((c) => c.id === String(active.id));
    if (!card || card.collectionIds[0] === targetCollectionId) return;
    moveCard(String(active.id), targetCollectionId);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragId(null);
    if (!over || active.data.current?.type !== 'card') return;
    const card = cards.find((c) => c.id === String(active.id));
    if (!card) return;
    const collectionId = card.collectionIds[0];
    const collectionCards = cards
      .filter((c) => c.collectionIds.includes(collectionId))
      .sort((a, b) => a.position - b.position);
    const oldIndex = collectionCards.findIndex((c) => c.id === String(active.id));
    const newIndex = collectionCards.findIndex((c) => c.id === String(over.id));
    if (oldIndex !== newIndex && newIndex !== -1) {
      const reordered = [...collectionCards];
      const [removed] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, removed);
      reorderCards(collectionId, reordered.map((c) => c.id));
    }
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const collectionEl = target.closest('[data-collection-id]') as HTMLElement | null;
    setContextMenu({ x: e.clientX, y: e.clientY, collectionId: collectionEl?.dataset.collectionId ?? null });
  }, []);

  const dismissContextMenu = useCallback(() => setContextMenu(null), []);

  const parseActiveCardModal = () => {
    if (!activeCardId) return { cardId: null, collectionId: undefined };
    if (activeCardId.startsWith('new:')) return { cardId: null, collectionId: activeCardId.slice(4) };
    return { cardId: activeCardId, collectionId: undefined };
  };

  const { cardId: modalCardId, collectionId: modalCollectionId } = parseActiveCardModal();

  return (
    <>
      {/* Mobile search bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 flex items-center gap-2 px-14 py-2 bg-background/80 backdrop-blur-md border-b border-border">
        <button
          onClick={() => useWorkpasteStore.getState().setCommandSearchOpen(true)}
          className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span>Search collections and cards…</span>
          <span className="ml-auto text-xs opacity-50">⌘K</span>
        </button>
      </div>

      {/* Board canvas — scroll container */}
      <div
        ref={scrollRef}
        id="board-canvas"
        className="board-grid-bg relative h-full w-full overflow-auto pt-12 md:pt-0 cursor-grab"
        onContextMenu={handleContextMenu}
        onClick={dismissContextMenu}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const target = e.target as HTMLElement;
          // Portals render in document.body; their events bubble through the React tree
          // but the DOM target won't be inside this scroll container — skip those.
          if (!e.currentTarget.contains(target)) return;
          if (target.closest('[data-collection-id]')) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          panRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startScrollX: e.currentTarget.scrollLeft,
            startScrollY: e.currentTarget.scrollTop,
          };
          e.currentTarget.style.cursor = 'grabbing';
        }}
        onPointerMove={(e) => {
          if (!panRef.current) return;
          e.currentTarget.scrollLeft = panRef.current.startScrollX - (e.clientX - panRef.current.startX);
          e.currentTarget.scrollTop = panRef.current.startScrollY - (e.clientY - panRef.current.startY);
        }}
        onPointerUp={(e) => {
          if (!panRef.current) return;
          panRef.current = null;
          e.currentTarget.releasePointerCapture(e.pointerId);
          e.currentTarget.style.cursor = '';
        }}
        onPointerCancel={(e) => {
          panRef.current = null;
          e.currentTarget.style.cursor = '';
        }}
      >
        {/* Size wrapper — expands scroll area to match visual canvas after zoom */}
        <div style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom, position: 'relative', flexShrink: 0 }}>
          {/* Scaled canvas */}
          <div
            ref={scaledCanvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
            >
              {collections.map((col) => (
                <div key={col.id} data-collection-id={col.id} className="absolute top-0 left-0">
                  <CollectionBlock
                    collection={col}
                    isHighlighted={highlightedCollectionId === col.id}
                    zoom={zoom}
                  />
                </div>
              ))}

              <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
                {activeCard && (
                  <CardItemDragOverlay
                    card={activeCard}
                    collectionColor={
                      collections.find((c) => c.id === activeCard.collectionIds[0])?.color ?? '#888'
                    }
                  />
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>

        {/* Empty state */}
        {collections.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-lg font-semibold">Your board is empty</p>
            <p className="text-sm text-muted-foreground">
              Right-click anywhere or use the sidebar to create a Collection
            </p>
          </div>
        )}
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <div
            className="fixed z-50 min-w-[152px] overflow-hidden rounded-lg border bg-popover py-1 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.collectionId ? (
              <button
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                onClick={() => {
                  useWorkpasteStore.setState({ activeCardId: `new:${contextMenu.collectionId}` });
                  dismissContextMenu();
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                New Card
              </button>
            ) : (
              <button
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                onClick={() => {
                  useWorkpasteStore.getState().addCollection('New Collection');
                  dismissContextMenu();
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                New Collection
              </button>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Undo / Redo pill */}
      <div className="fixed bottom-5 right-[188px] z-20 flex items-center rounded-full border bg-card/95 shadow-md backdrop-blur-sm">
        <button
          onClick={undo}
          disabled={history.past.length === 0}
          title="Undo (Ctrl+Z)"
          suppressHydrationWarning
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={history.future.length === 0}
          title="Redo (Ctrl+Shift+Z)"
          suppressHydrationWarning
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Zoom controls pill */}
      <div className="fixed bottom-5 right-5 z-20 flex items-center rounded-full border bg-card/95 shadow-md backdrop-blur-sm">
        <button
          onClick={() => changeZoom(-0.1)}
          disabled={zoom <= 0.25}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          title="Zoom out (Ctrl + scroll)"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => applyZoom(1, undefined, undefined, true)}
          className="w-14 cursor-pointer text-center text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:text-foreground"
          title="Reset to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => changeZoom(0.1)}
          disabled={zoom >= 2}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          title="Zoom in (Ctrl + scroll)"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Card modal */}
      {activeCardId && (
        <CardModal
          cardId={modalCardId}
          defaultCollectionId={modalCollectionId ?? collections[0]?.id}
          onClose={() => setActiveCard(null)}
        />
      )}
    </>
  );
}
