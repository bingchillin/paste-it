'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, GripHorizontal, MoreHorizontal, Trash2, Pencil, Archive } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ColorPicker } from '@/components/shared/ColorPicker';
import { CardItem } from '@/components/board/CardItem';
import { useWorkpasteStore, useCardsForCollection } from '@/store/useWorkpasteStore';
import { hexToRgba } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { CANVAS_W, CANVAS_H, COLLECTION_W } from '@/lib/board';
import type { Collection } from '@/types';

interface CollectionBlockProps {
  collection: Collection;
  isHighlighted?: boolean;
  zoom?: number;
}

const BORDER_MASK = {
  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  WebkitMaskComposite: 'destination-out',
  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  maskComposite: 'exclude',
} as React.CSSProperties;

export function CollectionBlock({ collection, isHighlighted, zoom = 1 }: CollectionBlockProps) {
  const { updateCollection, deleteCollection, archiveCollection, highlightedCardId, editingCollectionId, setEditingCollection } = useWorkpasteStore();
  const cards = useCardsForCollection(collection.id);

  // Traveling border only on the collection itself — not when a card inside it is the search target
  const hasHighlightedCard = cards.some((c) => c.id === highlightedCardId);
  const showTravelingBorder = !!isHighlighted && !hasHighlightedCard;
  const showElevation = !!isHighlighted;

  const [isEditingName, setIsEditingName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nameValue, setNameValue] = useState(collection.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);

  const motionX = useMotionValue(collection.x ?? 0);
  const motionY = useMotionValue(collection.y ?? 0);
  const dragStateRef = useRef<{
    startX: number; startY: number; startMX: number; startMY: number;
  } | null>(null);
  const collectionElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isDraggingRef.current) {
      animate(motionX, collection.x ?? 0, { type: 'spring', stiffness: 260, damping: 28 });
      animate(motionY, collection.y ?? 0, { type: 'spring', stiffness: 260, damping: 28 });
    }
  }, [collection.x, collection.y, motionX, motionY]);

  useEffect(() => {
    if (editingCollectionId === collection.id) {
      setIsEditingName(true);
      setEditingCollection(null);
    }
  }, [editingCollectionId, collection.id, setEditingCollection]);

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `droppable-${collection.id}`,
    data: { type: 'collection', collectionId: collection.id },
  });

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== collection.name) updateCollection(collection.id, { name: trimmed });
    else setNameValue(collection.name);
    setIsEditingName(false);
  };

  const borderColor = isOver
    ? hexToRgba(collection.color, 0.6)
    : hexToRgba(collection.color, 0.22);

  return (
    <motion.div
      ref={(el) => { setDropRef(el); collectionElRef.current = el; }}
      animate={{ scale: showElevation ? 1.04 : 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      data-collection-id={collection.id}
      className="absolute w-72 rounded-2xl bg-card overflow-hidden"
      style={{
        x: motionX,
        y: motionY,
        touchAction: 'none',
        // Static border via inset box-shadow — no border class needed
        boxShadow: showElevation
          ? `inset 0 0 0 1.5px ${hexToRgba(collection.color, 0.5)}, 0 24px 60px rgba(0,0,0,0.22), 0 8px 20px ${hexToRgba(collection.color, 0.25)}`
          : isOver
          ? `inset 0 0 0 2px ${hexToRgba(collection.color, 0.6)}, 0 8px 24px rgba(0,0,0,0.12)`
          : `inset 0 0 0 1.5px ${borderColor}, 0 2px 12px rgba(0,0,0,0.08)`,
        zIndex: showElevation ? 10 : undefined,
      }}
    >
      {/* Header */}
      <div
        className="group/header flex items-center gap-2.5 px-4 py-3 cursor-grab active:cursor-grabbing"
        style={{ borderBottom: `1px solid ${hexToRgba(collection.color, 0.15)}`, touchAction: 'none' }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button, input')) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          isDraggingRef.current = true;
          dragStateRef.current = { startX: e.clientX, startY: e.clientY, startMX: motionX.get(), startMY: motionY.get() };
        }}
        onPointerMove={(e) => {
          if (!dragStateRef.current) return;
          const h = collectionElRef.current?.offsetHeight ?? 120;
          const rawX = dragStateRef.current.startMX + (e.clientX - dragStateRef.current.startX) / zoom;
          const rawY = dragStateRef.current.startMY + (e.clientY - dragStateRef.current.startY) / zoom;
          motionX.set(Math.max(0, Math.min(CANVAS_W - COLLECTION_W, rawX)));
          motionY.set(Math.max(0, Math.min(CANVAS_H - h, rawY)));
        }}
        onPointerUp={() => {
          if (!dragStateRef.current) return;
          dragStateRef.current = null;
          isDraggingRef.current = false;
          updateCollection(collection.id, { x: motionX.get(), y: motionY.get() });
        }}
        onPointerCancel={() => {
          dragStateRef.current = null;
          isDraggingRef.current = false;
          updateCollection(collection.id, { x: motionX.get(), y: motionY.get() });
        }}
      >
        <GripHorizontal
          className="h-4 w-4 shrink-0 opacity-30 transition-opacity group-hover/header:opacity-70"
          style={{ color: collection.color }}
        />

        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ColorPicker
            color={collection.color}
            onChange={(c) => updateCollection(collection.id, { color: c })}
          />
        </div>

        {isEditingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName();
              if (e.key === 'Escape') { setNameValue(collection.name); setIsEditingName(false); }
            }}
            className="flex-1 bg-transparent text-base font-semibold outline-none border-b border-dashed"
            style={{ borderColor: collection.color }}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 truncate text-base font-semibold"
            onDoubleClick={() => setIsEditingName(true)}
          >
            {collection.name}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover/header:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => useWorkpasteStore.setState({ activeCardId: `new:${collection.id}` })}
          title="Add card"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>

        <Popover>
          <PopoverTrigger
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-accent group-hover/header:opacity-100"
            title="More options"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="end">
            <button
              onClick={() => setIsEditingName(true)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Pencil className="h-3.5 w-3.5" /> Rename
            </button>
            <button
              onClick={() => archiveCollection(collection.id)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Cards */}
      <div className="p-3">
        <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
            <AnimatePresence>
              {cards.map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <CardItem
                    card={card}
                    collectionColor={collection.color}
                    isHighlighted={highlightedCardId === card.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>

        {cards.length === 0 && (
          <div
            className="flex h-12 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground"
            style={{ borderColor: hexToRgba(collection.color, 0.3) }}
          >
            Right-click or use + to add a card
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete collection?"
        description={`"${collection.name}" and all its cards will be permanently deleted.`}
        onConfirm={() => { setShowDeleteConfirm(false); deleteCollection(collection.id); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Traveling border — fades in/out, shown only when this collection is the search target */}
      <AnimatePresence>
        {showTravelingBorder && (
          <motion.div
            key="border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute inset-0 rounded-2xl border-travel"
            style={{
              padding: 2,
              background: `conic-gradient(from var(--border-angle), transparent 75%, ${collection.color} 88%, transparent 100%)`,
              ...BORDER_MASK,
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
