'use client';

import { useState } from 'react';
import { authClient, signOut, useSession } from '@/lib/auth-client';
import { useWorkpasteStore } from '@/store/useWorkpasteStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Trash2, User, ChevronUp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function UserMenu() {
  const { data: session } = useSession();
  const [step, setStep] = useState<'idle' | 'confirm' | 'type'>('idle');
  const [typeValue, setTypeValue] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!session?.user) return null;

  const reset = () => { setStep('idle'); setTypeValue(''); };

  const handleDeleteFinal = async () => {
    setDeleting(true);
    try {
      await authClient.deleteUser();
    } catch { /* ignore — session is gone either way */ }
    useWorkpasteStore.setState({ collections: [], cards: [] });
    window.location.href = '/';
  };

  return (
    <>
      <Popover>
        <PopoverTrigger className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-sidebar-accent">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {session.user.image
              ? <img src={session.user.image} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />
              : <User className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{session.user.name}</p>
            <p className="truncate text-xs leading-tight text-muted-foreground">{session.user.email}</p>
          </div>
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </PopoverTrigger>

        <PopoverContent className="p-2" align="start" side="top" style={{ width: 'var(--radix-popper-anchor-width)' }}>
          <button
            onClick={() => setStep('confirm')}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete account
          </button>
          <button
            onClick={() => signOut()}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </PopoverContent>
      </Popover>

      {/* Step 1 — are you sure? */}
      <ConfirmDialog
        open={step === 'confirm'}
        title="Delete your account?"
        description="All your data will be permanently deleted. This cannot be undone."
        confirmLabel="Yes, continue"
        onConfirm={() => { setStep('type'); setTypeValue(''); }}
        onCancel={reset}
      />

      {/* Step 2 — type DELETE */}
      {step === 'type' && (
        <Dialog open onOpenChange={(o) => !o && reset()}>
          <DialogContent showCloseButton={false} className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Final confirmation</DialogTitle>
              <DialogDescription>
                Type <span className="font-mono font-semibold text-foreground">DELETE</span> to permanently remove your account and all its data.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={typeValue}
              onChange={(e) => setTypeValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && typeValue === 'DELETE' && handleDeleteFinal()}
              placeholder="DELETE"
              className="font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={reset} disabled={deleting}>Cancel</Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={typeValue !== 'DELETE' || deleting}
                onClick={handleDeleteFinal}
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
