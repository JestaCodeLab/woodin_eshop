import Link from "next/link";
import { Header } from "@/components/layout/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="content-wrap flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="m-0 font-display text-[clamp(36px,5vw,56px)] font-normal text-brown">We could not find that page</h1>
        <p className="m-0 text-[19px] font-light text-body">The piece may have sold out, or the link is out of date.</p>
        <Link href="/shop" className="label-caps mt-2 bg-brown px-8 py-4 text-ivory no-underline">
          Back to the shop
        </Link>
      </main>
    </>
  );
}
