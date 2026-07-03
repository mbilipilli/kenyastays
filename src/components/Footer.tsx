import { Link } from "@tanstack/react-router";
import { Youtube, Linkedin, MessageCircle } from "lucide-react";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-sand/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <Logo className="size-9" />
            <div>
              <div className="font-serif text-lg font-semibold">Mbilipilli Stays</div>
              <div className="text-xs text-muted-foreground">Stay Local. Stay Kenyan.</div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Authentic Kenyan stays — from Nairobi streets to Maasai Mara retreats.</p>
        </div>
        <FooterCol title="Company" links={[["About Us", "/"], ["Contact", "/"], ["FAQs", "/"]]} />
        <FooterCol title="Hosts" links={[["Become a host", "/host/new"], ["Host dashboard", "/host"], ["Terms & Conditions", "/"]]} />
        <div>
          <h4 className="font-serif text-sm font-semibold">Follow</h4>
          <div className="mt-3 flex gap-3 text-muted-foreground">
            <a href="#" aria-label="YouTube" className="hover:text-primary"><Youtube className="size-5" /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-primary"><Linkedin className="size-5" /></a>
            <a href="#" aria-label="WhatsApp" className="hover:text-primary"><MessageCircle className="size-5" /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Mbilipilli Stays — Made with ❤️ in Kenya
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-serif text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([label, to]) => (
          <li key={label}><Link to={to} className="text-muted-foreground hover:text-primary">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
