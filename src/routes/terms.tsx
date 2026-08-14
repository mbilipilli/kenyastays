import { createFileRoute } from "@tanstack/react-router";
import {
  Home,
  Camera,
  Banknote,
  CalendarCheck,
  Handshake,
  IdCard,
  Shield,
  HousePlus,
  TriangleAlert,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Footer } from "@/components/Footer";

const AGREEMENT_ITEMS = [
  {
    icon: Home,
    label: "Ownership & Compliance",
    summary: "You are the owner and comply with Kenyan laws.",
    detail:
      "Hosts must either own the property or have written authority to list it. All listings must comply with Kenyan land-use, zoning, tourism, and short-term rental regulations. Kenya Stays reserves the right to request proof of ownership or authority at any time.",
  },
  {
    icon: Camera,
    label: "Accurate Listings",
    summary: "Provide truthful details & photos.",
    detail:
      "Every listing must contain accurate descriptions, current photos, amenity details, and pricing. Misleading information, bait-and-switch pricing, or stock imagery that does not represent the actual stay is prohibited and may result in delisting.",
  },
  {
    icon: Banknote,
    label: "Pricing & Payments",
    summary: "Accept platform commission & receive payouts via M-Pesa.",
    detail:
      "Hosts agree to Kenya Stays' commission structure and any applicable service fees. Payouts are processed to the verified M-Pesa number on file after a booking is completed. The platform fee is retained by Kenya Stays; the stay payout is forwarded to the host.",
  },
  {
    icon: CalendarCheck,
    label: "Booking Policies",
    summary: "Honor bookings and follow cancellation rules.",
    detail:
      "Confirmed bookings must be honored. Hosts must maintain an accurate calendar and follow the cancellation and refund policies selected for their listing. Repeated cancellations or no-shows may lead to suspension.",
  },
  {
    icon: Handshake,
    label: "Guest Relations",
    summary: "Treat guests fairly & protect their privacy.",
    detail:
      "Hosts must communicate promptly and respectfully with guests, respect guest privacy, and not discriminate on the basis of race, ethnicity, religion, gender, disability, or nationality. Guest contact information may not be used for marketing or shared with third parties.",
  },
  {
    icon: IdCard,
    label: "Verification Docs",
    summary: "Upload ID, ownership proof & KRA PIN.",
    detail:
      "To list a property, hosts must provide a valid government-issued ID, proof of ownership or management authority, and a KRA PIN certificate. These documents are reviewed by the Kenya Stays compliance team before a listing can go live.",
  },
  {
    icon: Shield,
    label: "Platform Rules",
    summary: "No direct bookings or policy violations.",
    detail:
      "Circumventing Kenya Stays to accept direct payments or offline bookings discovered through the platform is not allowed. Fraud, fake reviews, harassment, or repeated policy violations will result in account suspension or permanent removal.",
  },
  {
    icon: HousePlus,
    label: "Host Liability",
    summary: "Responsible for safety & insurance.",
    detail:
      "Hosts are responsible for maintaining a safe, clean, and habitable property. Kenya Stays recommends appropriate insurance coverage. The platform is not liable for personal injury, theft, or property damage occurring during a stay.",
  },
  {
    icon: TriangleAlert,
    label: "Termination Terms",
    summary: "Honor pending bookings if ending agreement.",
    detail:
      "A host may terminate this agreement at any time by requesting account closure. Any bookings confirmed before termination must still be honored. Kenya Stays may also terminate or suspend access for violations of these terms.",
  },
];

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Kenya Stays" },
      { name: "description", content: "Read the Kenya Stays host agreement checklist, terms of service, and booking policies." },
      { property: "og:title", content: "Terms & Conditions — Kenya Stays" },
      { property: "og:description", content: "Read the Kenya Stays host agreement checklist, terms of service, and booking policies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Terms & Conditions
        </h1>
        <p className="mt-3 text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-foreground">
          <p>
            Welcome to Kenya Stays. These Terms & Conditions govern your use of our platform
            as a guest, host, or visitor. By accessing or using Kenya Stays, you agree to be
            bound by these terms and all applicable Kenyan laws and regulations.
          </p>
          <p>
            Kenya Stays is a marketplace that connects travelers with local hosts offering
            short-term accommodations. We are not a property owner, operator, or travel agent.
            The actual rental agreement is between the guest and the host.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Host Agreement Checklist
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Click each item below to read the full requirement before listing a property.
          </p>

          <Accordion type="multiple" className="mt-5 rounded-2xl border bg-card px-4">
            {AGREEMENT_ITEMS.map(({ icon: Icon, label, summary, detail }) => (
              <AccordionItem key={label} value={label} className="border-b last:border-b-0">
                <AccordionTrigger className="py-4 text-left hover:no-underline">
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="flex flex-col text-left">
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <span className="text-xs font-normal text-muted-foreground">{summary}</span>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-12 text-sm leading-relaxed text-muted-foreground">
                  {detail}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mt-10 space-y-4 text-sm leading-relaxed text-foreground">
          <h2 className="font-serif text-xl font-semibold text-foreground">Guest Booking Terms</h2>
          <p>
            Guests must provide accurate contact and payment information. Bookings are
            confirmed once payment is received and the host accepts or auto-confirms the
            reservation. Cancellation and refund terms are set by the host's chosen policy.
          </p>
          <p>
            All prices are shown in Kenyan Shillings (KES) and may include service fees,
            cleaning fees, and applicable taxes. M-Pesa is the primary payment method; card and
            PayPal options are processed through our integrated payment partners.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm leading-relaxed text-foreground">
          <h2 className="font-serif text-xl font-semibold text-foreground">Payments & Payouts</h2>
          <p>
            When a guest pays, the accommodation amount is allocated to the host and the
            platform fee is retained by Kenya Stays. Host payouts are made to the verified
            M-Pesa number after check-in or the completion window defined in the host's payout
            settings.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm leading-relaxed text-foreground">
          <h2 className="font-serif text-xl font-semibold text-foreground">Contact Us</h2>
          <p>
            For questions about these terms, contact our support team through the Help Center or
            email support@kenyastays.co.ke.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
