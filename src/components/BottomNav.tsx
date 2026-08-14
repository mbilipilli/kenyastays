import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/use-is-admin";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Explore", icon: Search },
  { to: "/trips", label: "Trips", icon: Briefcase },
  { to: "/account", label: "You", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const { isAdmin } = useIsAdmin();
  if (isAdmin) return null;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
