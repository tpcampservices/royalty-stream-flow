import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-background px-4 text-center">
      <section><ShieldX className="mx-auto mb-4 h-12 w-12 text-destructive" /><h1 className="font-heading text-2xl font-bold">You do not have access to this area</h1><p className="mt-2 text-muted-foreground">Ask an organization Admin if your responsibilities have changed.</p><Button asChild className="mt-6"><Link to="/">Return to dashboard</Link></Button></section>
    </main>
  );
}
