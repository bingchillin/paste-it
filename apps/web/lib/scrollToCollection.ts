import { useWorkpasteStore } from '@/store/useWorkpasteStore';
import { COLLECTION_W } from '@/lib/board';

export function scrollToCollection(collectionId: string) {
  const state = useWorkpasteStore.getState();
  const collection = state.collections.find((c) => c.id === collectionId);
  if (!collection) return;

  const board = document.getElementById('board-canvas');
  if (!board) return;

  const zoom = state.zoom;
  const x = (collection.x ?? 0) * zoom;
  const y = (collection.y ?? 0) * zoom;

  board.scrollTo({
    left: Math.max(0, x - board.clientWidth / 2 + (COLLECTION_W * zoom) / 2),
    top: Math.max(0, y - board.clientHeight / 2 + 60 * zoom),
    behavior: 'smooth',
  });
}
