import { ProfileForm } from "@/components/account/ProfileForm";
import { requireSession } from "@/lib/account";
import { PhoneVerification } from "@/components/account/PhoneVerification";
import { customerNames, getCustomer, phoneState } from "@/lib/customers";

export const metadata = { title: "Account details" };

export default async function DetailsPage() {
  const session = await requireSession();
  const customer = await getCustomer(session.customerId).catch(() => null);
  const { first, last } = customer ? customerNames(customer) : { first: "", last: "" };
  const phone = customer ? phoneState(customer) : null;
  return (
    <section aria-label="Account details" className="flex flex-col gap-7">
      <h2 className="m-0 font-display text-[clamp(30px,3.4vw,44px)] font-normal">Account details</h2>
      {customer ? (
        <ProfileForm initial={{ firstName: first, lastName: last, phone: customer.billing?.phone ?? "", email: session.email }} />
      ) : (
        <p className="m-0 text-[15px] text-body">We could not load your details right now. Please try again in a moment.</p>
      )}
      {phone?.e164 ? (
        <div className="flex max-w-[720px] flex-col gap-3 border-t border-line pt-7">
          <h3 className="m-0 font-display text-[24px] font-normal">Phone verification</h3>
          <PhoneVerification phone={phone.display} verified={phone.verified} variant="inline" />
        </div>
      ) : null}
    </section>
  );
}
