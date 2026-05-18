'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  Archive,
  ChevronsDownUp,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  Map,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { UserMenu } from '@/components/auth/UserMenu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useWorkpasteStore, useCollections, useArchivedCollections } from '@/store/useWorkpasteStore';
import { scrollToCollection } from '@/lib/scrollToCollection';
import { hexToRgba } from '@/lib/colors';
import type { Card, Collection } from '@/types';
import { Minimap } from '@/components/board/Minimap';

// ── Sortable card row ─────────────────────────────────────────────────────────

function CardRow({
  card,
  collectionColor,
  onClick,
}: {
  card: Card;
  collectionColor: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md py-1.5 pl-6 pr-2 hover:bg-sidebar-accent">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: hexToRgba(collectionColor, 0.8) }}
      />
      <button
        onClick={onClick}
        className="flex-1 cursor-pointer truncate text-left text-sm text-muted-foreground transition-colors hover:text-sidebar-foreground"
      >
        {card.title}
      </button>
    </div>
  );
}

// ── Sortable collection group ─────────────────────────────────────────────────

function SortableCollectionGroup({
  collection,
  cards,
  showHandle,
  selectMode,
  isSelected,
  onToggleSelect,
  onCardClick,
  onAddCard,
  onToggleCollapse,
  onNavigateTo,
}: {
  collection: Collection;
  cards: Card[];
  showHandle: boolean;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (shiftKey: boolean) => void;
  onCardClick: (cardId: string) => void;
  onAddCard: () => void;
  onToggleCollapse: () => void;
  onNavigateTo: () => void;
}) {
  const pendingClickRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (selectMode) { onToggleSelect(e.shiftKey); return; }
    // If a timer is pending this is the 2nd click of a double-click — cancel and let onDoubleClick handle it
    if (pendingClickRef.current) {
      clearTimeout(pendingClickRef.current);
      pendingClickRef.current = null;
      return;
    }
    pendingClickRef.current = setTimeout(() => {
      pendingClickRef.current = null;
      onToggleCollapse();
    }, 180);
  };

  const handleDoubleClick = () => {
    onNavigateTo();
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: collection.id,
    data: { type: 'collection' },
    disabled: selectMode,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
    >
      <div
        className={cn("group/col flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent", selectMode && "cursor-pointer")}
        onClick={selectMode ? (e) => onToggleSelect(e.shiftKey) : undefined}
      >
        {selectMode ? (
          <span className="pointer-events-none shrink-0 text-muted-foreground">
            {isSelected
              ? <CheckSquare className="h-4 w-4 text-primary" />
              : <Square className="h-4 w-4" />}
          </span>
        ) : (
          showHandle && (
            <button
              {...attributes}
              {...listeners}
              className="shrink-0 cursor-grab touch-none opacity-0 transition-opacity group-hover/col:opacity-70 active:cursor-grabbing"
              title="Drag to reorder"
              style={{ color: collection.color }}
              tabIndex={-1}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )
        )}

        <button
          onClick={selectMode ? undefined : handleClick}
          onDoubleClick={selectMode ? undefined : handleDoubleClick}
          className={cn("flex flex-1 cursor-pointer items-center gap-2 min-w-0", selectMode && "pointer-events-none")}
        >
          {!selectMode && (collection.collapsed
            ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />)}
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: collection.color }}
          />
          <span className={cn('flex-1 truncate text-sm font-medium', isSelected && 'text-primary')}>{collection.name}</span>
        </button>

        {!selectMode && (
          <button
            onClick={onAddCard}
            title="Add card"
            className="shrink-0 cursor-pointer opacity-0 transition-opacity group-hover/col:opacity-100"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {!selectMode && !collection.collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {cards.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                collectionColor={collection.color}
                onClick={() => onCardClick(card.id)}
              />
            ))}
            {cards.length === 0 && (
              <p className="py-1 pl-10 text-xs italic text-muted-foreground/50">No cards yet</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export function Sidebar() {
  const {
    cards,
    sidebarWidth,
    setSidebarWidth,
    setSidebarOpen,
    addCollection,
    updateCollection,
    deleteCollection,
    deleteCollections,
    reorderCollections,
    restoreCollection,
    setAllCollapsed,
    setHighlightedCard,
    setHighlightedCollection,
    autoArrange,
    setTutorialOpen,
  } = useWorkpasteStore();
  const collections = useCollections();
  const archivedCollections = useArchivedCollections();

  const [query, setQuery] = useState('');
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Multi-select
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const [showMinimap, setShowMinimap] = useState(true);
  const lastSelectedIdRef = useRef<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; type: 'collection' | 'card' } | null>(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(sidebarWidth);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const allCollapsed = collections.every((c) => c.collapsed);

  const filteredCollections = collections.filter((col) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      col.name.toLowerCase().includes(q) ||
      cards.filter((c) => c.collectionIds.includes(col.id)).some((c) => c.title.toLowerCase().includes(q))
    );
  });

  const getFilteredCards = (collectionId: string) => {
    const q = query.toLowerCase();
    return cards
      .filter((c) => c.collectionIds.includes(collectionId))
      .filter((c) => !query || c.title.toLowerCase().includes(q))
      .sort((a, b) => a.position - b.position);
  };

  const onResizeMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const maxW = Math.min(400, window.innerWidth * 0.85);
      setSidebarWidth(Math.min(maxW, Math.max(200, startWidth.current + ev.clientX - startX.current)));
    };
    const onUp = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleAutoArrange = () => {
    const canvas = document.getElementById('board-canvas') as HTMLDivElement | null;
    autoArrange(canvas?.clientWidth ?? 800, canvas?.clientHeight ?? 600);
    requestAnimationFrame(() => {
      canvas?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    });
  };

  const closeIfMobile = () => { if (window.innerWidth < 768) setSidebarOpen(false); };

  const navigateToCard = (cardId: string, collectionId: string) => {
    setHighlightedCard(cardId);
    setHighlightedCollection(collectionId);
    closeIfMobile();
    scrollToCollection(collectionId);
    setTimeout(() => { setHighlightedCard(null); setHighlightedCollection(null); }, 2500);
  };

  const navigateToCollection = (collectionId: string) => {
    setHighlightedCollection(collectionId);
    closeIfMobile();
    scrollToCollection(collectionId);
    setTimeout(() => setHighlightedCollection(null), 2500);
  };

  const toggleSelect = (id: string, shiftKey: boolean) => {
    if (shiftKey && lastSelectedIdRef.current) {
      const anchorIdx = filteredCollections.findIndex((c) => c.id === lastSelectedIdRef.current);
      const targetIdx = filteredCollections.findIndex((c) => c.id === id);
      if (anchorIdx !== -1 && targetIdx !== -1) {
        const [from, to] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
        const rangeIds = filteredCollections.slice(from, to + 1).map((c) => c.id);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          rangeIds.forEach((rid) => next.add(rid));
          return next;
        });
        return;
      }
    }
    lastSelectedIdRef.current = id;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
  };

  const handleBatchDelete = () => {
    deleteCollections(Array.from(selectedIds));
    exitSelectMode();
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setDragging({ id: String(active.id), type: active.data.current?.type });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    if (!over || active.id === over.id) return;
    if (active.data.current?.type === 'collection') {
      const oldIdx = collections.findIndex((c) => c.id === active.id);
      const newIdx = collections.findIndex((c) => c.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        reorderCollections(arrayMove(collections, oldIdx, newIdx).map((c) => c.id));
      }
    }
  };

  const draggingCollection = dragging?.type === 'collection'
    ? collections.find((c) => c.id === dragging.id)
    : null;

  const showHandles = !query && !selectMode;

  return (
    <aside
      data-tutorial="sidebar"
      className="relative flex h-full shrink-0 flex-col border-r bg-sidebar w-full md:w-auto"
      style={{ minWidth: `min(${sidebarWidth}px, 85vw)`, maxWidth: `min(${sidebarWidth}px, 85vw)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <svg className="h-3.5 w-3.5 text-primary-foreground" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="6" height="6" rx="1.5" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" />
              <rect x="9" y="9" width="6" height="6" rx="1.5" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight">Workpaste</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            title={allCollapsed ? 'Expand all' : 'Collapse all'}
            onClick={() => setAllCollapsed(!allCollapsed)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {allCollapsed
              ? <ChevronsUpDown className="h-4 w-4" />
              : <ChevronsDownUp className="h-4 w-4" />}
          </button>
          <button
            title={selectMode ? 'Cancel selection' : 'Select collections'}
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            className={cn(
              'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors',
              selectMode
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <CheckSquare className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            data-tutorial="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search collections & cards..."
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      {/* New Collection or batch-delete bar */}
      <div className="px-3 pb-3">
        {selectMode && selectedIds.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set(filteredCollections.map((c) => c.id)))}
              className="cursor-pointer text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              All
            </button>
            <button
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        ) : selectMode ? (
          <button
            onClick={() => setSelectedIds(new Set(filteredCollections.map((c) => c.id)))}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-sidebar-border py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent"
          >
            Select all
          </button>
        ) : (
          <button
            data-tutorial="add-collection"
            onClick={() => addCollection('New Collection')}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:opacity-80"
          >
            <Plus className="h-4 w-4" />
            New Collection
          </button>
        )}
      </div>

      {/* Sortable collections list */}
      <ScrollArea data-tutorial="collections" className="flex-1 min-h-0">
        <div className="px-2 pb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={filteredCollections.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredCollections.map((col) => (
                <SortableCollectionGroup
                  key={col.id}
                  collection={col}
                  cards={getFilteredCards(col.id)}
                  showHandle={showHandles}
                  selectMode={selectMode}
                  isSelected={selectedIds.has(col.id)}
                  onToggleSelect={(shiftKey) => toggleSelect(col.id, shiftKey)}
                  onCardClick={(cardId) => navigateToCard(cardId, col.id)}
                  onAddCard={() => useWorkpasteStore.setState({ activeCardId: `new:${col.id}` })}
                  onToggleCollapse={() => updateCollection(col.id, { collapsed: !col.collapsed })}
                  onNavigateTo={() => navigateToCollection(col.id)}
                />
              ))}
            </SortableContext>

            <DragOverlay dropAnimation={{ duration: 120, easing: 'ease' }}>
              {draggingCollection && (
                <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2 shadow-lg">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: draggingCollection.color }}
                  />
                  <span className="text-sm font-medium">{draggingCollection.name}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {filteredCollections.length === 0 && query && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Archived section */}
      {archivedCollections.length > 0 && (
        <div className="border-t border-sidebar-border px-2 py-2">
          <button
            onClick={() => setArchivedOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {archivedOpen
              ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            <Archive className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Archived</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">{archivedCollections.length}</span>
          </button>

          <AnimatePresence initial={false}>
            {archivedOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-1 space-y-0.5">
                  {archivedCollections.map((col) => (
                    <div
                      key={col.id}
                      className="group/archived flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full opacity-60"
                        style={{ backgroundColor: col.color }}
                      />
                      <span className="flex-1 truncate text-sm text-muted-foreground">{col.name}</span>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/archived:opacity-100">
                        <button
                          title="Restore"
                          onClick={() => restoreCollection(col.id)}
                          className="cursor-pointer rounded p-1 hover:bg-accent hover:text-foreground"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Delete permanently"
                          onClick={() => setDeleteConfirmId(col.id)}
                          className="cursor-pointer rounded p-1 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Canvas section ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-sidebar-border bg-gradient-to-b from-transparent to-primary/[0.04]">
        <div className="space-y-2.5 px-3 py-3">
          {/* Header row */}
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/15">
              <Map className="h-3 w-3 text-primary" />
            </div>
            <span className="flex-1 text-xs font-bold uppercase tracking-widest text-foreground/70">Canvas</span>
          </div>

          {/* Minimap visualization */}
          <AnimatePresence initial={false}>
            {showMinimap && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="overflow-hidden rounded-lg border border-primary/25 shadow-inner ring-1 ring-primary/10">
                  <Minimap />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auto-arrange CTA */}
          <button
            onClick={handleAutoArrange}
            disabled={collections.length === 0}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LayoutGrid className="h-4 w-4" />
            Auto-arrange
          </button>

          {/* Minimap toggle CTA */}
          <button
            onClick={() => setShowMinimap((v) => !v)}
            className={cn(
              'flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
              showMinimap
                ? 'bg-primary/10 text-primary hover:bg-primary/15'
                : 'bg-muted/60 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
            )}
          >
            {showMinimap ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showMinimap ? 'Hide minimap' : 'Show minimap'}
          </button>
        </div>
      </div>

      {/* User strip */}
      <div className="shrink-0 border-t border-sidebar-border">
        <div className="flex items-center">
          <div className="flex-1 min-w-0">
            <UserMenu />
          </div>
          <button
            data-tutorial="help-btn"
            onClick={() => setTutorialOpen(true)}
            title="Help & tour"
            className="mr-2 shrink-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onResizeMouseDown}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20"
      />

      <ConfirmDialog
        open={!!deleteConfirmId}
        title="Delete permanently?"
        description={`"${archivedCollections.find((c) => c.id === deleteConfirmId)?.name ?? ''}" and all its cards will be permanently deleted.`}
        onConfirm={() => { if (deleteConfirmId) deleteCollection(deleteConfirmId); setDeleteConfirmId(null); }}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ConfirmDialog
        open={showBatchDeleteConfirm}
        title={`Delete ${selectedIds.size} collection${selectedIds.size !== 1 ? 's' : ''}?`}
        description="All cards inside them will be permanently deleted."
        onConfirm={() => { setShowBatchDeleteConfirm(false); handleBatchDelete(); }}
        onCancel={() => setShowBatchDeleteConfirm(false)}
      />
    </aside>
  );
}
