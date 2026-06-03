import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, Home, LogOut, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Your account" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Guest";

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
        <Avatar className="size-14"><AvatarImage src={user?.user_metadata?.avatar_url} /><AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback></Avatar>
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
        </div>
      </div>

      <ul className="mt-4 divide-y rounded-2xl border bg-card">
        <Row to="/trips" icon={Briefcase} label="My trips" />
        <Row to="/host" icon={Home} label="Host dashboard" />
        <Row to="/host/new" icon={Sparkles} label="List a new stay" />
      </ul>

      <div className="mt-4 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mb-1 size-4 text-acacia" />
        ID verification & host badges are coming soon — boosting trust for travelers.
      </div>

      <Button variant="outline" className="mt-4 w-full gap-2" onClick={() => supabase.auth.signOut()}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </main>
  );
}

function Row({ to, icon: Icon, label }: { to: string; icon: typeof Home; label: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 p-4 hover:bg-muted">
        <Icon className="size-5 text-primary" />
        <span className="flex-1 font-medium">{label}</span>
        <span className="text-muted-foreground">›</span>
      </Link>
    </li>
  );
}
