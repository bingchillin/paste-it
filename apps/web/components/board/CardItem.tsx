'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, GripVertical, Trash2 } from 'lucide-react';
import { generateHTML } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { useWorkpasteStore } from '@/store/useWorkpasteStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Card } from '@/types';
import { hexToRgba } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface CardItemProps {
  card: Card;
  collectionColor: string;
  isHighlighted?: boolean;
}

function getNotesHTML(notes: string | undefined): string | null {
  if (!notes) return null;
  try {
    return generateHTML(JSON.parse(notes), [StarterKit, Underline, Link]);
  } catch {
    return null;
  }
}

const BORDER_MASK = {
  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  WebkitMaskComposite: 'destination-out',
  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  maskComposite: 'exclude',
} as React.CSSProperties;

export function CardItem({ card, collectionColor, isHighlighted }: CardItemProps) {
  const { setActiveCard, deleteCard } = useWorkpasteStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', collectionId: card.collectionIds[0] },
  });

  const hasPreviewImage = !!card.linkPreview?.image;
  const notesHTML = getNotesHTML(card.notes);

  return (
    <div
      ref={setNodeRef}
      data-card-id={card.id}
      className={cn('relative group/card', isHighlighted && !isDragging && 'z-10')}
      style={{
        transform: [
          transform ? CSS.Transform.toString(transform) : null,
          isHighlighted && !isDragging ? 'scale(1.05)' : null,
        ].filter(Boolean).join(' ') || undefined,
        transition: isDragging
          ? undefined
          : [transition, isHighlighted !== undefined ? 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' : null]
              .filter(Boolean).join(', ') || undefined,
      }}
    >
      {/* Card content */}
      <motion.div
        animate={{ opacity: isDragging ? 0.35 : 1 }}
        transition={{ duration: 0.15 }}
        className="group rounded-xl cursor-pointer select-none bg-card overflow-hidden"
        style={{ boxShadow: `inset 0 0 0 1.5px ${hexToRgba(collectionColor, 0.18)}` }}
        onClick={() => setActiveCard(card.id)}
      >
        <div className="h-[3px] w-full" style={{ backgroundColor: collectionColor }} />

        <div className="p-3.5">
          <div className="flex items-start gap-1.5">
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 shrink-0 cursor-grab touch-none opacity-0 transition-opacity group-hover:opacity-70 active:cursor-grabbing"
              title="Drag to reorder"
              style={{ color: collectionColor }}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <h3 className="flex-1 text-sm font-semibold leading-snug">{card.title}</h3>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
              className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100 hover:text-destructive"
              title="Delete card"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {hasPreviewImage && (
            <div className="mt-2 overflow-hidden rounded-lg">
              <img
                src={card.linkPreview!.image}
                alt={card.linkPreview?.title ?? card.title}
                className="h-32 w-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {card.url && (
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 -mx-1 flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              {card.linkPreview?.favicon && (
                <img src={card.linkPreview.favicon} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
              )}
              <span className="flex-1 truncate">
                {card.linkPreview?.title ||
                  (() => { try { return new URL(card.url).hostname.replace('www.', ''); } catch { return card.url; } })()}
              </span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
            </a>
          )}

          {notesHTML && (
            <div
              className="mt-2 line-clamp-3 text-xs text-muted-foreground leading-relaxed [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through [&_a]:underline [&_ul]:list-disc [&_ul]:pl-3 [&_ol]:list-decimal [&_ol]:pl-3 [&_h2]:font-semibold"
              dangerouslySetInnerHTML={{ __html: notesHTML }}
            />
          )}
        </div>
      </motion.div>

      {/* Traveling border */}
      <AnimatePresence>
        {isHighlighted && !isDragging && (
          <motion.div
            key="border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute inset-0 rounded-xl border-travel"
            style={{
              padding: 2,
              background: `conic-gradient(from var(--border-angle), transparent 75%, ${collectionColor} 88%, transparent 100%)`,
              ...BORDER_MASK,
            }}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete card?"
        description={`"${card.title}" will be permanently deleted.`}
        onConfirm={() => { setShowDeleteConfirm(false); deleteCard(card.id); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

export function CardItemDragOverlay({ card, collectionColor }: { card: Card; collectionColor: string }) {
  return (
    <div
      className="rounded-xl bg-card shadow-2xl rotate-2 opacity-90 overflow-hidden"
      style={{ boxShadow: `inset 0 0 0 1.5px ${hexToRgba(collectionColor, 0.4)}`, width: 200 }}
    >
      <div className="h-[3px] w-full" style={{ backgroundColor: collectionColor }} />
      <div className="p-3">
        <h3 className="text-sm font-semibold">{card.title}</h3>
      </div>
    </div>
  );
}
