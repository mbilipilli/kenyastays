import logo from "@/assets/black-coma-symbol.png";

export function Logo({ className = "size-8" }: { className?: string }) {
  return <img src={logo} alt="Black Coma Ventures" className={className} width={64} height={64} />;
}
