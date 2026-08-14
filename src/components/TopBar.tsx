import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ShieldCheck } from "lucide-react";

export function TopBar() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className="size-9" />
          <div className="leading-tight">
            <div className="font-serif text-lg font-semibold tracking-tight">Kenya Stays</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stay Local. Stay Kenyan.</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {/* Admins get oversight only — no guest or host browsing surfaces */}
          {!isAdmin && (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/search">Explore</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link to="/trips">Trips</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link to="/host">Host</Link></Button>
            </>
          )}
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin"><ShieldCheck /> Admin</Link>
            </Button>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Link to="/admin">Admin console</Link>
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => signOut()}>Sign out</Button>
            </>
          ) : (
            <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}
