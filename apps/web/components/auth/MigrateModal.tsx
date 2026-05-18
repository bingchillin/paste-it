'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useWorkpasteStore } from '@/store/useWorkpasteStore';
import { Loader2, Upload } from 'lucide-react';

interface MigrateModalProps {
  onClose: () => void;
}

export function MigrateModal({ onClose }: MigrateModalProps) {
  const { collections, cards } = useWorkpasteStore();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const migrate = async () => {
    setLoading(true);
    try {
      // Push collections first to get server IDs
      const serverCols = await api.bulkCreateCollections(
        collections.map(({ id, name, color, position, x, y, collapsed }) => ({
          name, color, position, x, y, collapsed,
        }))
      ) as any[];

      // Build a map from local ID → server ID
      const idMap: Record<string, string> = {};
      collections.forEach((col, i) => { idMap[col.id] = serverCols[i]._id; });

      // Push cards with remapped collection IDs
      const cardPayloads = cards.map(({ title, url, linkPreview, notes, position, collectionIds }) => ({
        title, url, linkPreview, notes, position,
        collectionIds: collectionIds.map((cid) => idMap[cid] ?? cid),
      }));

      if (cardPayloads.length > 0) await api.bulkCreateCards(cardPayloads);
      setDone(true);
    } catch (e) {
      console.error('Migration failed', e);
    }
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Import your local data?</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {collections.length} collections and {cards.length} cards were imported to your account.
            </p>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You have{' '}
              <span className="font-medium text-foreground">{collections.length} collections</span>{' '}
              and{' '}
              <span className="font-medium text-foreground">{cards.length} cards</span>{' '}
              saved locally. Do you want to import them into your account?
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>
                Skip
              </Button>
              <Button className="flex-1 gap-2" onClick={migrate} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
