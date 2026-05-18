'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useWorkpasteStore, useCollections } from '@/store/useWorkpasteStore';
import { scrollToCollection } from '@/lib/scrollToCollection';

export function CommandSearch() {
  const {
    cards,
    commandSearchOpen,
    setCommandSearchOpen,
    setHighlightedCard,
    setHighlightedCollection,
  } = useWorkpasteStore();
  const collections = useCollections();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandSearchOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setCommandSearchOpen]);

  const navigateTo = useCallback(
    (cardId: string | null, collectionId: string) => {
      setCommandSearchOpen(false);
      // Small delay so the search panel closes before scrolling
      setTimeout(() => {
        if (cardId) {
          setHighlightedCard(cardId);
          setHighlightedCollection(collectionId);
          scrollToCollection(collectionId);
          setTimeout(() => { setHighlightedCard(null); setHighlightedCollection(null); }, 2500);
        } else {
          setHighlightedCollection(collectionId);
          scrollToCollection(collectionId);
          setTimeout(() => setHighlightedCollection(null), 2500);
        }
      }, 150);
    },
    [setCommandSearchOpen, setHighlightedCard, setHighlightedCollection]
  );

  return (
    <AnimatePresence>
      {commandSearchOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setCommandSearchOpen(false)}
          />

          {/* Search panel — Command wraps everything so cmdk context is available */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.12 }}
            className="fixed left-1/2 top-[20vh] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border bg-popover shadow-2xl"
          >
            <Command>
              <CommandInput placeholder="Search collections and cards..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                {collections.length > 0 && (
                  <CommandGroup heading="Collections">
                    {collections.map((col) => (
                      <CommandItem
                        key={col.id}
                        value={`collection-${col.name}`}
                        onSelect={() => navigateTo(null, col.id)}
                        className="gap-2"
                      >
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                        <span className="flex-1 truncate min-w-0">{col.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {cards.filter((c) => c.collectionIds.includes(col.id)).length} cards
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {cards.length > 0 && (
                  <CommandGroup heading="Cards">
                    {cards.map((card) => {
                      const col = collections.find((c) => c.id === card.collectionIds[0]);
                      return (
                        <CommandItem
                          key={card.id}
                          value={`card-${card.title}`}
                          onSelect={() => navigateTo(card.id, card.collectionIds[0])}
                          className="gap-2"
                        >
                          {col && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />}
                          <span className="flex-1 truncate">{card.title}</span>
                          {col && <span className="text-xs text-muted-foreground">{col.name}</span>}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
