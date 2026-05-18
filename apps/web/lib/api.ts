const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${init?.method ?? 'GET'} ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  // Collections
  getCollections: () => request<any[]>('/collections'),
  createCollection: (body: any) => request('/collections', { method: 'POST', body: JSON.stringify(body) }),
  updateCollection: (id: string, body: any) => request(`/collections/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCollection: (id: string) => request(`/collections/${id}`, { method: 'DELETE' }),
  reorderCollections: (ids: string[]) => request('/collections/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkCreateCollections: (body: any[]) => request('/collections/bulk', { method: 'POST', body: JSON.stringify(body) }),

  // Cards
  getCards: () => request<any[]>('/cards'),
  createCard: (body: any) => request('/cards', { method: 'POST', body: JSON.stringify(body) }),
  updateCard: (id: string, body: any) => request(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCard: (id: string) => request(`/cards/${id}`, { method: 'DELETE' }),
  deleteCardsByCollection: (collectionId: string) => request(`/cards/collection/${collectionId}`, { method: 'DELETE' }),
  reorderCards: (collectionId: string, ids: string[]) => request('/cards/reorder', { method: 'POST', body: JSON.stringify({ collectionId, ids }) }),
  bulkCreateCards: (body: any[]) => request('/cards/bulk', { method: 'POST', body: JSON.stringify(body) }),
};
