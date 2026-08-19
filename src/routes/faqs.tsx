import { createFileRoute } from "@tanstack/react-router";
import { FaqSection } from "@/components/FaqSection";

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions — Kenya Stays" },
      { name: "description", content: "Find answers to common questions about booking and listing stays on Kenya Stays." },
      { property: "og:title", content: "Frequently Asked Questions — Kenya Stays" },
      { property: "og:description", content: "Quick answers about booking, hosting, and staying with Kenya Stays." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://kenyastayske.lovable.app/faqs" }],
  }),
  component: FaqsPage,
});

function FaqsPage() {
  return (
    <main className="min-h-screen">
      <FaqSection />
    </main>
  );
}
