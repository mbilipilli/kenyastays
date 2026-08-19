import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const FAQS = [
  {
    question: "What is Kenya Stays?",
    answer:
      "Kenya Stays is a platform that connects travelers with short-term rental options across Kenya, including apartments, holiday homes, and serviced stays.",
  },
  {
    question: "How do I book accommodation?",
    answer:
      "You can browse listings, select your preferred property, and follow the booking instructions provided. Most hosts require online confirmation and payment through secure channels.",
  },
  {
    question: "Is Kenya Stays only for tourists?",
    answer:
      "No. It caters to both tourists and locals looking for short-term stays, business trips, or weekend getaways.",
  },
  {
    question: "What types of properties are available?",
    answer:
      "Options range from budget apartments and family homes to luxury villas and serviced residences.",
  },
  {
    question: "How do I know if a property is safe?",
    answer:
      "Listings usually include verified photos, host details, and reviews from past guests. Always check ratings and host verification before booking.",
  },
  {
    question: "Can I list my property on Kenya Stays?",
    answer:
      "Yes. Property owners can register and upload their listings with photos, descriptions, and pricing details.",
  },
  {
    question: "Are there cancellation policies?",
    answer:
      "Yes. Each host sets their own cancellation terms, which are displayed before booking confirmation.",
  },
  {
    question: "Does Kenya Stays cover all regions in Kenya?",
    answer:
      "The platform features properties in major towns and tourist destinations like Nairobi, Mombasa, Nakuru, Diani, and Naivasha, with more areas being added regularly.",
  },
];

export function FaqSection() {
  return (
    <section id="faqs" className="bg-secondary/30">
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-medium text-primary shadow-sm">
            <HelpCircle className="size-3" /> FAQs
          </span>
          <h2 className="mt-3 font-serif text-2xl md:text-3xl">Frequently Asked Questions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick answers to common questions about booking and listing on Kenya Stays.
          </p>
        </div>

        <Accordion type="multiple" className="rounded-2xl border bg-card px-4">
          {FAQS.map(({ question, answer }) => (
            <AccordionItem key={question} value={question} className="border-b last:border-b-0">
              <AccordionTrigger className="py-4 text-left text-sm font-medium hover:no-underline">
                {question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
