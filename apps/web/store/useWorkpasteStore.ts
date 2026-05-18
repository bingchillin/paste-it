'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Collection, Card } from '@/types';
import { randomCollectionColor } from '@/lib/colors';
import { CANVAS_W, CANVAS_H, COLLECTION_W } from '@/lib/board';
import { api } from '@/lib/api';

interface HistorySnapshot {
  collections: Collection[];
  cards: Card[];
}

interface UIState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  commandSearchOpen: boolean;
  tutorialOpen: boolean;
  highlightedCardId: string | null;
  highlightedCollectionId: string | null;
  activeCardId: string | null;
  editingCollectionId: string | null;
  zoom: number;
  history: { past: HistorySnapshot[]; future: HistorySnapshot[] };
}

interface DataState {
  collections: Collection[];
  cards: Card[];
}

interface Actions {
  // Collections
  addCollection: (name: string, color?: string) => Collection;
  updateCollection: (id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>) => void;
  deleteCollection: (id: string) => void;
  deleteCollections: (ids: string[]) => void;
  archiveCollection: (id: string) => void;
  restoreCollection: (id: string) => void;
  reorderCollections: (orderedIds: string[]) => void;
  setAllCollapsed: (collapsed: boolean) => void;

  // Cards
  addCard: (data: { collectionId: string; title: string; url?: string; notes?: string }) => Card;
  updateCard: (id: string, updates: Partial<Omit<Card, 'id' | 'createdAt'>>, silent?: boolean) => void;
  deleteCard: (id: string) => void;
  reorderCards: (collectionId: string, orderedIds: string[]) => void;
  moveCard: (cardId: string, toCollectionId: string) => void;

  autoArrange: (vpWidth: number, vpHeight: number) => void;
  loadFromServer: (collections: Collection[], cards: Card[]) => void;

  // UI
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setCommandSearchOpen: (open: boolean) => void;
  setTutorialOpen: (open: boolean) => void;
  setHighlightedCard: (id: string | null) => void;
  setHighlightedCollection: (id: string | null) => void;
  setActiveCard: (id: string | null) => void;
  setEditingCollection: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  undo: () => void;
  redo: () => void;
}

type WorkpasteStore = DataState & UIState & Actions;

function snapshot(s: { collections: Collection[]; cards: Card[]; history: UIState['history'] }) {
  return {
    history: {
      past: [...s.history.past.slice(-49), { collections: s.collections, cards: s.cards }],
      future: [] as HistorySnapshot[],
    },
  };
}

// Fire-and-forget — never blocks or throws into the store
function sync(p: Promise<unknown>) {
  p.catch(() => {});
}

export const useWorkpasteStore = create<WorkpasteStore>()(
  persist(
    (set, get) => ({
      // Data
      collections: [],
      cards: [],

      // UI (also persisted so sidebar state survives reload)
      sidebarOpen: true,
      sidebarWidth: 260,
      commandSearchOpen: false,
      tutorialOpen: false,
      highlightedCardId: null,
      highlightedCollectionId: null,
      editingCollectionId: null,
      activeCardId: null,
      zoom: 1,
      history: { past: [], future: [] },

      // Collection actions
      addCollection: (name, color) => {
        const existing = get().collections;
        const col = existing.length % 3;
        const row = Math.floor(existing.length / 3);
        const collection: Collection = {
          id: crypto.randomUUID(),
          name,
          color: color ?? randomCollectionColor(),
          position: existing.length,
          x: col * 380 + 40,
          y: row * 360 + 40,
          collapsed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          ...snapshot(s),
          collections: [...s.collections, collection],
          editingCollectionId: collection.id,
        }));
        sync(api.createCollection({ _id: collection.id, name: collection.name, color: collection.color, position: collection.position, x: collection.x, y: collection.y, collapsed: collection.collapsed, archived: false }));
        return collection;
      },

      updateCollection: (id, updates) => {
        set((s) => ({
          ...snapshot(s),
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
        sync(api.updateCollection(id, updates));
      },

      deleteCollection: (id) => {
        set((s) => ({
          ...snapshot(s),
          collections: s.collections
            .filter((c) => c.id !== id)
            .map((c, i) => ({ ...c, position: i })),
          cards: s.cards.filter((card) => !card.collectionIds.includes(id)),
        }));
        sync(api.deleteCollection(id));
        sync(api.deleteCardsByCollection(id));
      },

      deleteCollections: (ids) => {
        set((s) => ({
          ...snapshot(s),
          collections: s.collections
            .filter((c) => !ids.includes(c.id))
            .map((c, i) => ({ ...c, position: i })),
          cards: s.cards.filter((card) => !card.collectionIds.some((id) => ids.includes(id))),
        }));
        ids.forEach((id) => {
          sync(api.deleteCollection(id));
          sync(api.deleteCardsByCollection(id));
        });
      },

      setAllCollapsed: (collapsed) => {
        set((s) => ({
          collections: s.collections.map((c) => ({ ...c, collapsed })),
        }));
        // UI-only preference — not synced to server
      },

      archiveCollection: (id) => {
        set((s) => ({
          ...snapshot(s),
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, archived: true, updatedAt: new Date().toISOString() } : c
          ),
        }));
        sync(api.updateCollection(id, { archived: true }));
      },

      restoreCollection: (id) => {
        set((s) => ({
          ...snapshot(s),
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, archived: false, updatedAt: new Date().toISOString() } : c
          ),
        }));
        sync(api.updateCollection(id, { archived: false }));
      },

      reorderCollections: (orderedIds) => {
        set((s) => ({
          ...snapshot(s),
          collections: orderedIds
            .map((id, i) => {
              const col = s.collections.find((c) => c.id === id);
              return col ? { ...col, position: i } : null;
            })
            .filter(Boolean) as Collection[],
        }));
        sync(api.reorderCollections(orderedIds));
      },

      // Card actions
      addCard: ({ collectionId, title, url, notes }) => {
        const collectionCards = get().cards.filter((c) =>
          c.collectionIds.includes(collectionId)
        );
        const card: Card = {
          id: crypto.randomUUID(),
          collectionIds: [collectionId],
          title,
          url,
          notes,
          position: collectionCards.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ ...snapshot(s), cards: [...s.cards, card] }));
        sync(api.createCard({ _id: card.id, collectionIds: card.collectionIds, title: card.title, url: card.url, notes: card.notes, position: card.position }));
        return card;
      },

      updateCard: (id, updates, silent = false) => {
        set((s) => ({
          ...(silent ? {} : snapshot(s)),
          cards: s.cards.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
        if (!silent) sync(api.updateCard(id, updates));
      },

      deleteCard: (id) => {
        set((s) => ({ ...snapshot(s), cards: s.cards.filter((c) => c.id !== id) }));
        sync(api.deleteCard(id));
      },

      reorderCards: (collectionId, orderedIds) => {
        set((s) => ({
          ...snapshot(s),
          cards: s.cards.map((card) => {
            const newPos = orderedIds.indexOf(card.id);
            if (newPos !== -1 && card.collectionIds.includes(collectionId)) {
              return { ...card, position: newPos };
            }
            return card;
          }),
        }));
        sync(api.reorderCards(collectionId, orderedIds));
      },

      moveCard: (cardId, toCollectionId) => {
        const toCollectionCards = get().cards.filter((c) =>
          c.collectionIds.includes(toCollectionId)
        );
        const newPosition = toCollectionCards.length;
        set((s) => ({
          ...snapshot(s),
          cards: s.cards.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  collectionIds: [toCollectionId],
                  position: newPosition,
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }));
        sync(api.updateCard(cardId, { collectionIds: [toCollectionId], position: newPosition }));
      },

      autoArrange: (vpWidth, vpHeight) => {
        set((s) => {
          const active = [...s.collections]
            .filter((c) => !c.archived)
            .sort((a, b) => a.position - b.position);
          const n = active.length;
          if (n === 0) return s;
          const COL_STEP = COLLECTION_W + 92;
          const ROW_STEP = 420;
          const PAD = 40;
          const MAX_ROWS = Math.max(1, Math.floor((CANVAS_H - PAD) / ROW_STEP));
          const cols = Math.max(1, Math.min(
            Math.floor((CANVAS_W - PAD) / COL_STEP),
            Math.max(Math.ceil(n / MAX_ROWS), Math.ceil(Math.sqrt(n))),
          ));
          const rows = Math.ceil(n / cols);
          const bboxW = PAD + (cols - 1) * COL_STEP + COLLECTION_W + PAD;
          const bboxH = PAD + (rows - 1) * ROW_STEP + 420 + PAD;
          const fitZoom = Math.min(vpWidth / bboxW, vpHeight / bboxH);
          const newZoom = Math.max(0.25, Math.min(s.zoom, fitZoom));
          const updatedSet = new Set(active.map((c) => c.id));
          const updatedPositions: { id: string; x: number; y: number }[] = [];
          const nextCollections = s.collections.map((col) => {
            if (!updatedSet.has(col.id)) return col;
            const idx = active.findIndex((c) => c.id === col.id);
            const x = PAD + (idx % cols) * COL_STEP;
            const y = PAD + Math.floor(idx / cols) * ROW_STEP;
            updatedPositions.push({ id: col.id, x, y });
            return { ...col, x, y, updatedAt: new Date().toISOString() };
          });
          // Fire API updates after state is set
          setTimeout(() => {
            updatedPositions.forEach(({ id, x, y }) => sync(api.updateCollection(id, { x, y })));
          }, 0);
          return { ...snapshot(s), zoom: newZoom, collections: nextCollections };
        });
      },

      loadFromServer: (collections, cards) => {
        set({ collections, cards, history: { past: [], future: [] } });
      },

      undo: () => {
        set((s) => {
          const { past, future } = s.history;
          if (past.length === 0) return s;
          const previous = past[past.length - 1];
          return {
            ...previous,
            history: {
              past: past.slice(0, -1),
              future: [{ collections: s.collections, cards: s.cards }, ...future].slice(0, 50),
            },
          };
        });
      },

      redo: () => {
        set((s) => {
          const { past, future } = s.history;
          if (future.length === 0) return s;
          const next = future[0];
          return {
            ...next,
            history: {
              past: [...past, { collections: s.collections, cards: s.cards }].slice(-50),
              future: future.slice(1),
            },
          };
        });
      },

      // UI actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setCommandSearchOpen: (open) => set({ commandSearchOpen: open }),
      setTutorialOpen: (open) => set({ tutorialOpen: open }),
      setHighlightedCard: (id) => set({ highlightedCardId: id }),
      setHighlightedCollection: (id) => set({ highlightedCollectionId: id }),
      setActiveCard: (id) => set({ activeCardId: id }),
      setEditingCollection: (id) => set({ editingCollectionId: id }),
      setZoom: (zoom) => set({ zoom }),
    }),
    {
      name: 'workpaste-data',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        collections: state.collections,
        cards: state.cards,
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
);

export const useCollections = () =>
  useWorkpasteStore(
    useShallow((s) =>
      [...s.collections]
        .filter((c) => !c.archived)
        .sort((a, b) => a.position - b.position)
    )
  );

export const useArchivedCollections = () =>
  useWorkpasteStore(
    useShallow((s) =>
      [...s.collections]
        .filter((c) => c.archived)
        .sort((a, b) => a.updatedAt > b.updatedAt ? -1 : 1)
    )
  );

export const useCardsForCollection = (collectionId: string) =>
  useWorkpasteStore(
    useShallow((s) =>
      s.cards
        .filter((c) => c.collectionIds.includes(collectionId))
        .sort((a, b) => a.position - b.position)
    )
  );
