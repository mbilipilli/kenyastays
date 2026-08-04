import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { createReview } from "@/lib/api/reviews.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReviewForm({ propertyId }: { propertyId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const qc = useQueryClient();
  const fn = useServerFn(createReview);

  const m = useMutation({
    mutationFn: () => fn({ data: { property_id: propertyId, rating, ...(comment.trim() ? { comment: comment.trim() } : {}) } }),
    onSuccess: () => {
      toast.success("Asante! Your review is live.");
      setComment("");
      setRating(0);
      qc.invalidateQueries({ queryKey: ["property", propertyId] });
    },
    onError: (e: Error) =>
      toast.error(
        /permission|policy|row-level/i.test(e.message)
          ? "Only guests who completed a stay here can review."
          : e.message,
      ),
  });

  return (
    <div className="mt-4 rounded-2xl border bg-card p-4">
      <div className="text-sm font-medium">Rate your stay</div>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-0.5"
          >
            <Star
              className={`size-6 transition ${
                n <= (hover || rating) ? "fill-primary text-primary" : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
        {rating > 0 && <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>}
      </div>
      <Textarea
        className="mt-3"
        rows={3}
        maxLength={1000}
        placeholder="Share a short note about the hosting, location and vibe…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button className="mt-3" size="sm" disabled={!rating || m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? "Posting…" : "Post review"}
      </Button>
    </div>
  );
}
