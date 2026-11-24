import { AddressesManager } from "@/components/account/AddressesManager";
import { requireSession } from "@/lib/account";
import { getAddresses, getCustomer } from "@/lib/customers";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const session = await requireSession();
  const customer = await getCustomer(session.customerId).catch(() => null);
  return (
    <section aria-label="Addresses" className="flex flex-col gap-6">
      <h2 className="m-0 font-display text-[clamp(30px,3.4vw,44px)] font-normal">Addresses</h2>
      <p className="m-0 max-w-[560px] text-[15px] font-light text-body">Your default address is filled in for you at checkout. You can still choose another one there.</p>
      {customer ? <AddressesManager addresses={getAddresses(customer)} /> : <p className="m-0 text-[15px] text-body">We could not load your addresses right now. Please try again in a moment.</p>}
    </section>
  );
}
