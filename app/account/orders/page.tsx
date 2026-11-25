import { Package } from "lucide-react";
import { EmptyState } from "@/components/account/EmptyState";
import { OrderRow } from "@/components/account/OrderViews";
import { requireSession } from "@/lib/account";
import { toAccountOrder } from "@/lib/account-orders";
import { listOrders } from "@/lib/customers";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const session = await requireSession();
  const orders = await listOrders(session.customerId).then((o) => o.map(toAccountOrder)).catch(() => null);
  return (
    <section aria-label="Orders" className="flex flex-col gap-5">
      <h2 className="m-0 font-display text-[clamp(30px,3.4vw,44px)] font-normal">Orders</h2>
      {orders === null ? (
        <p className="m-0 text-[15px] text-body">We could not load your orders right now. Please try again in a moment.</p>
      ) : orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" action={{ label: "Start shopping", href: "/shop" }}>
          When you place an order it will show up here, with live tracking from payment to your door.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3.5">
          {orders.map((o) => (
            <OrderRow key={o.view.orderNumber} order={o} />
          ))}
        </div>
      )}
    </section>
  );
}
