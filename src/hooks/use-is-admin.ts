import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { amIAdmin } from "@/lib/api/admin.functions";
import { useAuth } from "@/hooks/use-auth";

/**
 * Server-verified admin check. Never trust client state for gating admin UI —
 * this calls an authenticated server function that resolves the `admin` role.
 */
export function useIsAdmin() {
  const { user, loading } = useAuth();
  const amIAdminFn = useServerFn(amIAdmin);

  const q = useQuery({
    queryKey: ["auth", "is-admin", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const res = await amIAdminFn({ data: undefined as any });
      return !!res?.admin;
    },
  });

  return { isAdmin: !!user && q.data === true, loading: loading || (!!user && q.isLoading) };
}
