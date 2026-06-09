import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createProperty } from "@/lib/api/properties.functions";
import { getUploadUrl } from "@/lib/api/storage.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AMENITIES, CITIES, PROPERTY_TYPES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/host/new")({
  head: () => ({ meta: [{ title: "Create a listing" }] }),
  component: NewListing,
});

function NewListing() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("apartment");
  const [city, setCity] = useState<string>(CITIES[0]);
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState(3500);
  const [guests, setGuests] = useState(2);
  const [beds, setBeds] = useState(1);
  const [baths, setBaths] = useState(1);
  const [amen, setAmen] = useState<string[]>(["Wi-Fi"]);
  const [landmarks, setLandmarks] = useState("");
  const [eco, setEco] = useState(false);
  const [community, setCommunity] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [photos, setPhotos] = useState<{ path: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();
  const uploadFn = useServerFn(getUploadUrl);
  const createFn = useServerFn(createProperty);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const { path, token } = await uploadFn({ data: { filename: file.name } });
        const { error } = await supabase.storage.from("property-photos").uploadToSignedUrl(path, token, file);
        if (error) throw error;
        setPhotos((prev) => [...prev, { path, preview: URL.createObjectURL(file) }]);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title, description: desc, property_type: type as any, city, address: address || undefined,
          price_kes: price, max_guests: guests, bedrooms: beds, bathrooms: baths,
          amenities: amen,
          landmarks: landmarks ? landmarks.split(",").map((s) => s.trim()).filter(Boolean) : [],
          is_eco: eco, is_community: community,
          cover_image: photos[0]?.path ?? imageUrl.trim() || undefined,
          image_paths: [...photos.map((p) => p.path), ...(imageUrl.trim() ? [imageUrl.trim()] : [])],
        },
      }),
    onSuccess: async () => {
      toast.success("Listing published!");
      await queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      navigate({ to: "/host" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-serif text-3xl">List your place</h1>
      <p className="mt-1 text-sm text-muted-foreground">Share a few details and you'll be live in minutes.</p>

      <div className="mt-6 space-y-5 rounded-2xl border bg-card p-5">
        <div>
          <Label>Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cozy studio in Westlands" />
        </div>
        <div>
          <Label>Description *</Label>
          <Textarea rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What makes your space special?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {PROPERTY_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <Label>City</Label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <Label>Address / neighborhood</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Kilimani, off Argwings Kodhek" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div><Label>Price KES</Label><Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} /></div>
          <div><Label>Guests</Label><Input type="number" min={1} value={guests} onChange={(e) => setGuests(+e.target.value)} /></div>
          <div><Label>Beds</Label><Input type="number" min={0} value={beds} onChange={(e) => setBeds(+e.target.value)} /></div>
          <div><Label>Baths</Label><Input type="number" min={0} value={baths} onChange={(e) => setBaths(+e.target.value)} /></div>
        </div>
        <div>
          <Label>Amenities</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AMENITIES.map((a) => (
              <label key={a} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <Checkbox checked={amen.includes(a)} onCheckedChange={(v) => setAmen(v ? [...amen, a] : amen.filter((x) => x !== a))} />
                {a}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>Nearby landmarks (comma separated)</Label>
          <Input value={landmarks} onChange={(e) => setLandmarks(e.target.value)} placeholder="Westgate Mall, Sarit Centre" />
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
            <Checkbox checked={eco} onCheckedChange={(v) => setEco(!!v)} /> Eco-friendly
          </label>
          <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
            <Checkbox checked={community} onCheckedChange={(v) => setCommunity(!!v)} /> Community-run
          </label>
        </div>

        <div>
          <Label>Photos</Label>
          <Input
            className="mt-2"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/apartment1.jpg"
          />
          <div className="mt-2 grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.path} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                <img src={p.preview} alt="" className="size-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">Cover</span>}
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((x) => x.path !== p.path))}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted">
              {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
              <span>{uploading ? "Uploading…" : "Add photos"}</span>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => onUpload(e.target.files)} />
            </label>
          </div>
        </div>

        <Button size="lg" className="w-full" disabled={create.isPending || !title || !desc} onClick={() => create.mutate()}>
          {create.isPending ? "Publishing…" : "Publish listing"}
        </Button>
      </div>
    </main>
  );
}
