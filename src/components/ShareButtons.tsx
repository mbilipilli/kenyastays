import { Share2, MessageCircle, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButtons({ title, className = "" }: { title: string; className?: string }) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = `${title} — book it on Mbilipilli Stays 🌶️`;

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* dismissed */
      }
    }
    copy();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button asChild size="sm" variant="outline" className="gap-1.5 border-acacia/40 text-acacia">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle className="size-4" /> WhatsApp
        </a>
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={copy}>
        <Link2 className="size-4" /> Copy link
      </Button>
      <Button size="sm" variant="ghost" className="gap-1.5 sm:hidden" onClick={nativeShare}>
        <Share2 className="size-4" /> Share
      </Button>
    </div>
  );
}
