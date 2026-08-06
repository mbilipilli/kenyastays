import logo from "@/assets/logo-chili.png";

export function Logo({ className = "size-8" }: { className?: string }) {
  return <img src={logo} alt="Kenya Stays" className={className} width={64} height={64} />;
}
