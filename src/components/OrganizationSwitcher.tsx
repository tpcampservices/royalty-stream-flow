import { Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function OrganizationSwitcher() {
  const { memberships, currentOrganizationId, setCurrentOrganizationId } = useAuth();

  return (
    <label className="flex items-center gap-2 text-sm">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span className="sr-only">Current organization</span>
      <select
        aria-label="Current organization"
        value={currentOrganizationId ?? ''}
        onChange={(event) => setCurrentOrganizationId(event.target.value)}
        className="h-9 max-w-52 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {memberships.map((membership) => (
          <option key={membership.organization_id} value={membership.organization_id}>
            {membership.organization.name}
          </option>
        ))}
      </select>
    </label>
  );
}
