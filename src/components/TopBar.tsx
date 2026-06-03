import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { TreePine } from "lucide-react";

export function TopBar() {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <TreePine className="size-4" />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight">Karibu Stays</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Button asChild variant="ghost" size="sm"><Link to="/search">Explore</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/trips">Trips</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/host">Host</Link></Button>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link to="/host">Host dashboard</Link>
              </Button>
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
