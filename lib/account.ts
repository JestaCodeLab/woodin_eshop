import "server-only";
import { getSession } from "./auth";
import { getCustomer, profileOf, type Profile } from "./customers";

/** Details to prefill at checkout for the signed-in customer. Null for guests or when unavailable. */
export async function getCheckoutPrefill(): Promise<(Profile & { email: string }) | null> {
  const session = await getSession();
  if (!session) return null;
  const profile = await getCustomer(session.customerId).then(profileOf).catch(() => null);
  return { name: profile?.name ?? "", phone: profile?.phone ?? "", address: profile?.address ?? "", area: profile?.area ?? "", email: session.email };
}
