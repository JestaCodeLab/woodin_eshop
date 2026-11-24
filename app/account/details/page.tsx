import { ProfileForm } from "@/components/account/ProfileForm";
import { requireSession } from "@/lib/account";
import { customerNames, getCustomer } from "@/lib/customers";

export const metadata = { title: "Account details" };

export default async function DetailsPage() {
  const session = await requireSession();
  const customer = await getCustomer(session.customerId).catch(() => null);
  const { first, last } = customer ? customerNames(customer) : { first: "", last: "" };
  return (
    <section aria-label="Account details" className="flex flex-col gap-7">
      <h2 className="m-0 font-display text-[clamp(30px,3.4vw,44px)] font-normal">Account details</h2>
      {customer ? (
        <ProfileForm initial={{ firstName: first, lastName: last, phone: customer.billing?.phone ?? "", email: session.email }} />
      ) : (
        <p className="m-0 text-[15px] text-body">We could not load your details right now. Please try again in a moment.</p>
      )}
    </section>
  );
}
