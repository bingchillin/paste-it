'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useWorkpasteStore, useCollections } from '@/store/useWorkpasteStore';
import type { Card, Collection } from '@/types';
import { hexToRgba, getContrastColor } from '@/lib/colors';
import {
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Search,
  Trash2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Link as LinkIcon,
  List,
  Heading2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface CardModalProps {
  cardId: string | null;
  defaultCollectionId?: string;
  onClose: () => void;
}

function ToolbarBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        'cursor-pointer rounded p-1.5 transition-colors',
        active
          ? 'bg-foreground/10 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
    >
      {children}
    </button>
  );
}

export function CardModal({ cardId, defaultCollectionId, onClose }: CardModalProps) {
  const { cards, addCard, updateCard, deleteCard, setActiveCard } = useWorkpasteStore();
  const collections = useCollections();

  const existingCard: Card | undefined = cards.find((c) => c.id === cardId);
  const isNew = !existingCard;

  const [title, setTitle] = useState(existingCard?.title ?? '');
  const [url, setUrl] = useState(existingCard?.url ?? '');
  const [collectionId, setCollectionId] = useState(
    existingCard?.collectionIds[0] ?? defaultCollectionId ?? collections[0]?.id ?? ''
  );
  const [linkPreview, setLinkPreview] = useState(existingCard?.linkPreview ?? null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState('');
  const urlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlChangedByUserRef = useRef(false);
  const existingCardRef = useRef(existingCard);
  useEffect(() => { existingCardRef.current = existingCard; });

  // Close modal if the card is removed while open (e.g. undo after creating it)
  useEffect(() => {
    if (cardId && !existingCard) onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, existingCard]);

  const collection: Collection | undefined = collections.find((c) => c.id === collectionId);
  const filteredPickerCollections = collectionSearch
    ? collections.filter((c) => c.name.toLowerCase().includes(collectionSearch.toLowerCase()))
    : collections;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: existingCard?.notes
      ? (() => { try { return JSON.parse(existingCard.notes); } catch { return existingCard.notes; } })()
      : '',
    editorProps: {
      attributes: {
        class: 'min-h-[100px] outline-none text-sm leading-relaxed',
      },
    },
  });

  const fetchPreview = useCallback(async (rawUrl: string) => {
    if (!rawUrl) { setLinkPreview(null); return; }
    try { new URL(rawUrl); } catch { return; }
    setFetchingPreview(true);
    try {
      const res = await fetch('/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: rawUrl }),
      });
      const data = await res.json();
      if (!data.error) {
        setLinkPreview(data);
        const card = existingCardRef.current;
        if (card) updateCard(card.id, { linkPreview: data, url: rawUrl }, true);
      }
    } catch { /* no-op */ }
    setFetchingPreview(false);
  }, [updateCard]);

  useEffect(() => {
    // Only fetch when the user has actually typed a new URL — skip on modal open
    if (!urlChangedByUserRef.current) return;
    if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current);
    if (!url) { setLinkPreview(null); return; }
    urlTimeoutRef.current = setTimeout(() => fetchPreview(url), 800);
    return () => { if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current); };
  }, [url, fetchPreview]);

  const handleSave = () => {
    if (!title.trim()) { setTitleError(true); return; }
    const notes = editor ? JSON.stringify(editor.getJSON()) : undefined;
    if (isNew) {
      addCard({ collectionId, title: title.trim(), url: url || undefined, notes });
    } else {
      updateCard(existingCard!.id, {
        title: title.trim(),
        url: url || undefined,
        linkPreview: linkPreview ?? undefined,
        notes,
        collectionIds: [collectionId],
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (existingCard) { deleteCard(existingCard.id); setActiveCard(null); }
    onClose();
  };

  const setLink = () => {
    if (!editor) return;
    const href = window.prompt('Enter URL');
    if (href) editor.chain().focus().setLink({ href }).run();
    else editor.chain().focus().unsetLink().run();
  };

  return (
    <>
    <Dialog open={!showDeleteConfirm} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-xl gap-0 p-0 overflow-hidden" showCloseButton={false}>
        <div className="h-1 w-full transition-colors duration-300" style={{ backgroundColor: collection?.color ?? 'transparent' }} />

        <div className="max-h-[82vh] overflow-y-auto p-5">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0 transition-colors duration-300"
                style={{ backgroundColor: collection?.color ?? 'transparent' }}
              />
              <DialogTitle>{isNew ? 'New card' : 'Edit card'}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label className="mb-1.5 block text-xs">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                autoFocus
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSave()}
                placeholder="What is this about?"
                className={cn(titleError && 'border-destructive')}
              />
              {titleError && <p className="mt-1 text-xs text-destructive">Title is required</p>}
            </div>

            {/* Collection picker */}
            <div>
              <Label className="mb-1.5 block text-xs">Collection</Label>
              <Popover open={pickerOpen} onOpenChange={(o) => { setPickerOpen(o); if (!o) setCollectionSearch(''); }}>
                <PopoverTrigger className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm transition-colors hover:bg-muted/50">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={collectionId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.14 }}
                      className="flex flex-1 items-center gap-2 min-w-0"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-300"
                        style={{ backgroundColor: collection?.color }}
                      />
                      <span className="truncate font-medium">{collection?.name ?? 'Select collection'}</span>
                    </motion.span>
                  </AnimatePresence>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </PopoverTrigger>

                <PopoverContent align="start" className="w-64 p-2 gap-0">
                  {/* Search */}
                  <div className="relative mb-1.5">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      autoFocus
                      value={collectionSearch}
                      onChange={(e) => setCollectionSearch(e.target.value)}
                      placeholder="Search collections…"
                      className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {/* List */}
                  <div className="max-h-52 overflow-y-auto space-y-0.5">
                    {filteredPickerCollections.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => { setCollectionId(col.id); setPickerOpen(false); setCollectionSearch(''); }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: col.color }} />
                        <span className="flex-1 truncate text-left">{col.name}</span>
                        {col.id === collectionId && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </button>
                    ))}
                    {filteredPickerCollections.length === 0 && (
                      <p className="py-3 text-center text-xs text-muted-foreground">No collections found</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* URL */}
            <div>
              <Label className="mb-1.5 block text-xs">Link (optional)</Label>
              <div className="relative">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => { urlChangedByUserRef.current = true; setUrl(e.target.value); }}
                  placeholder="https://..."
                  className="pr-8"
                />
                {fetchingPreview && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <AnimatePresence>
                {linkPreview?.image && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden rounded-lg border"
                  >
                    <img src={linkPreview.image} alt="" className="h-36 w-full object-cover" />
                    {linkPreview.title && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground">
                        {linkPreview.favicon && (
                          <img src={linkPreview.favicon} alt="" className="h-3.5 w-3.5 rounded-sm" />
                        )}
                        <span className="flex-1 truncate">{linkPreview.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notes */}
            <div>
              <Label className="mb-1.5 block text-xs">Notes</Label>
              <div className="rounded-md border border-input bg-background">
                {/* Fixed formatting toolbar */}
                <div className="flex items-center gap-0.5 border-b border-input px-2 py-1">
                  <ToolbarBtn title="Bold" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
                    <Bold className="h-3.5 w-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn title="Italic" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
                    <Italic className="h-3.5 w-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn title="Underline" active={editor?.isActive('underline')} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon className="h-3.5 w-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn title="Strikethrough" active={editor?.isActive('strike')} onClick={() => editor?.chain().focus().toggleStrike().run()}>
                    <Strikethrough className="h-3.5 w-3.5" />
                  </ToolbarBtn>
                  <div className="mx-1 h-4 w-px bg-border" />
                  <ToolbarBtn title="Heading" active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
                    <Heading2 className="h-3.5 w-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn title="Bullet list" active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                    <List className="h-3.5 w-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn title="Link" active={editor?.isActive('link')} onClick={setLink}>
                    <LinkIcon className="h-3.5 w-3.5" />
                  </ToolbarBtn>
                </div>
                <div className="px-3 py-2">
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-between">
            <div>
              {!isNew && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSave}
                style={collection ? { backgroundColor: collection.color, border: 'none', color: getContrastColor(collection.color) } : undefined}
                className={collection ? 'hover:opacity-90' : ''}
              >
                {isNew ? 'Create' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={showDeleteConfirm}
      title="Delete card?"
      description={existingCard ? `"${existingCard.title}" will be permanently deleted.` : undefined}
      onConfirm={() => { setShowDeleteConfirm(false); handleDelete(); }}
      onCancel={() => setShowDeleteConfirm(false)}
    />
    </>
  );
}
