'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cloud } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { useSession } from '@/lib/auth-client';

export function GuestBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  if (session?.user || dismissed) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, delay: 1 }}
          className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:w-auto"
        >
          {/* Accent bar */}
          <div className="h-1 w-full bg-primary" />

          <div className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold">You&apos;re in guest mode</p>
                  <p className="text-sm text-muted-foreground">Data is saved locally only</p>
                </div>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="cursor-pointer rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Dismiss"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => setShowAuth(true)}
              className="w-full cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:opacity-80"
            >
              Sign in to sync across devices
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
