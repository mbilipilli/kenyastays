import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TreePine } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(z.object({ redirect: z.string().optional() })),
  head: () => ({ meta: [{ title: "Sign in — Karibu Stays" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) navigate({ to: redirect ?? "/", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        toast.success("Check your email to verify, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error("Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-center px-4 py-10">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 self-center">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <TreePine className="size-5" />
        </span>
        <span className="font-serif text-xl">Karibu Stays</span>
      </Link>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="font-serif text-2xl">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in or create an account to book and host.</p>

        <Button variant="outline" className="mt-4 w-full" onClick={google} disabled={loading}>
          Continue with Google
        </Button>
        <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={loading}>Sign in</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div><Label>Full name</Label><Input required value={fullName} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Phone (Kenyan)</Label><Input placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={loading}>Create account</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
