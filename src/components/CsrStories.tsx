import { HeartHandshake, Users, Sparkles } from "lucide-react";

const STORIES = [
  {
    icon: HeartHandshake,
    title: "Children's home visits",
    body: "1% of every Kenya Stays booking funds monthly visits and supplies to children's homes in Nairobi and Kisumu.",
  },
  {
    icon: Users,
    title: "Coastal clean-ups",
    body: "Hosts in Mombasa and Diani join quarterly beach clean-ups with their guests — over 4 tonnes collected so far.",
  },
  {
    icon: Sparkles,
    title: "Mama Mboga partnerships",
    body: "Breakfast baskets at our homestays are sourced from neighbourhood market vendors, keeping shillings local.",
  },
];

export function CsrStories({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-2xl border bg-sand/40 p-5">
      <h2 className="font-serif text-xl">Stays that give back</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every booking supports community work across Kenya.
      </p>
      <div className={`mt-4 grid gap-3 ${compact ? "" : "sm:grid-cols-3"}`}>
        {STORIES.map((s) => (
          <div key={s.title} className="rounded-xl border bg-card p-4">
            <s.icon className="size-5 text-primary" />
            <div className="mt-2 font-medium">{s.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
