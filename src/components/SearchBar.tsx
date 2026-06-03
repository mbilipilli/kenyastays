import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CITIES } from "@/lib/constants";

export function SearchBar({ initialCity = "", initialQ = "" }: { initialCity?: string; initialQ?: string }) {
  const navigate = useNavigate();
  const [city, setCity] = useState(initialCity);
  const [q, setQ] = useState(initialQ);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/search", search: { city: city || undefined, q: q || undefined } });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-44"
        >
          <option value="">Any city</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Beach cottage, lodge near Mara..."
            className="h-11 pl-9"
          />
        </div>
        <Button type="submit" className="h-11">Search</Button>
      </div>
    </form>
  );
}
