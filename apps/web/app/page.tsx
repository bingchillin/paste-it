'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Board } from '@/components/board/Board';
import { BoardSync } from '@/components/board/BoardSync';
import { CommandSearch } from '@/components/search/CommandSearch';
import { GuestBanner } from '@/components/shared/GuestBanner';
import { Tutorial } from '@/components/tutorial/Tutorial';
import { useWorkpasteStore } from '@/store/useWorkpasteStore';
import { PanelLeftClose, PanelLeftOpen, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { sidebarOpen, setSidebarOpen, setCommandSearchOpen, addCollection, setActiveCard } =
    useWorkpasteStore();

  useEffect(() => {
    useWorkpasteStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        addCollection('New Collection');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        setActiveCard('new:');
      }
      if (e.key === 'Escape') {
        setActiveCard(null);
        setCommandSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen, setSidebarOpen, setCommandSearchOpen, addCollection, setActiveCard]);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Desktop: sidebar sits inline, pushing the board ── */}
      <div className="hidden md:flex relative h-full shrink-0">
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden h-full"
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-10 top-2 z-10 h-8 w-8"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Toggle sidebar (⌘\)"
        >
          {sidebarOpen
            ? <PanelLeftClose className="h-4 w-4" />
            : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
      </div>

      {/* ── Mobile: sidebar slides over the board as an overlay ── */}
      <div className="md:hidden">
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/50"
                onClick={() => setSidebarOpen(false)}
              />
              {/* Drawer */}
              <motion.div
                key="drawer"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="fixed inset-y-0 left-0 z-50 h-full"
              >
                <Sidebar />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile hamburger — always visible when sidebar is closed */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-3 top-3 z-30 h-9 w-9 rounded-xl bg-card/80 shadow-sm backdrop-blur-sm border border-border"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Board — always full height, full remaining width */}
      <main data-tutorial="board" className="relative flex-1 overflow-hidden min-w-0">
        <Board />
      </main>

      <CommandSearch />
      <GuestBanner />
      <BoardSync />
      <Tutorial />
    </div>
  );
}
