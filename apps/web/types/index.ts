export interface LinkPreview {
  image: string;
  title: string;
  description: string;
  favicon: string;
  fetchedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  color: string;
  position: number;
  x: number;
  y: number;
  collapsed: boolean;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  collectionIds: string[];
  title: string;
  url?: string;
  linkPreview?: LinkPreview;
  notes?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export type DragType = 'collection' | 'card';

export interface DragItem {
  type: DragType;
  id: string;
  collectionId?: string;
}
