import { LogoLoader } from "@/components/ui/LogoLoader";

/** Shown while a route that needs request-time data is being prepared. */
export default function Loading() {
  return <LogoLoader label="Loading" className="min-h-[70vh]" />;
}
