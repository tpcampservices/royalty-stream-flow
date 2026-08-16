import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Member, MemberRole, partyRoles } from '@/lib/types';
import { humanizeCatalogRole } from '@/lib/catalog';

interface Props {
  member: Member | null;
  roles: MemberRole[];
  onClose: () => void;
  onAdd: (role: string) => void;
  onRemove: (id: string) => void;
}

export default function PartyRolesDialog({ member, roles, onClose, onAdd, onRemove }: Props) {
  const assigned = new Set(roles.map((item) => item.role));

  return (
    <Dialog open={Boolean(member)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Catalog capacities — {member?.name}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Capacities describe what this person or organization can do. They do not create ownership by themselves.
        </p>
        <div className="space-y-2">
          {roles.length === 0 && <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">No catalog capacity assigned.</p>}
          {roles.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
              <span className="text-sm font-medium">{humanizeCatalogRole(item.role)}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.role}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {partyRoles.filter((role) => !assigned.has(role)).map((role) => (
            <Button key={role} type="button" variant="outline" size="sm" onClick={() => onAdd(role)}>
              <Plus className="mr-1 h-4 w-4" />{humanizeCatalogRole(role)}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
