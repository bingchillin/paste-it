'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/lib/auth-client';
import { useWorkpasteStore } from '@/store/useWorkpasteStore';
import { api } from '@/lib/api';

export function BoardSync() {
  const { data: session } = useSession();
  const loadFromServer = useWorkpasteStore((s) => s.loadFromServer);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!session?.user || syncedRef.current) return;
    syncedRef.current = true;

    Promise.all([api.getCollections(), api.getCards()])
      .then(([collections, cards]) => loadFromServer(collections, cards))
      .catch(() => {
        // Server unreachable — keep working from localStorage
        syncedRef.current = false;
      });
  }, [session?.user, loadFromServer]);

  return null;
}
