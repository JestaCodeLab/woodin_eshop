import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/account/LoginForm";
import { Header } from "@/components/layout/Header";
import { CoverImage } from "@/components/ui/CoverImage";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { accountsEnabled, getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Woodin account with a code sent to your email.",
  robots: { index: false },
};

async function LoginContent() {
  // Already signed in: nothing to do here.
  if (await getSession()) redirect("/account");
  return <LoginForm enabled={accountsEnabled()} />;
}

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="grid grid-cols-1 lg:min-h-[calc(100dvh-170px)] lg:grid-cols-2">
        {/* Campaign photo: large screens only (lazy, so phones never download it). */}
        <div className="relative hidden overflow-hidden bg-espresso lg:block">
          <CoverImage src="/images/women-pink-dress-green-blouse.jpg" alt="" pos="50% 25%" sizes="50vw" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-brown/55 via-transparent to-transparent" />
        </div>

        <div className="content-wrap flex items-center py-12 md:py-20 lg:px-[clamp(40px,6vw,110px)]">
          <div className="mx-auto flex w-full max-w-[460px] flex-col gap-8">
            <div className="flex flex-col gap-4">
              <Eyebrow>My account</Eyebrow>
              <h1 className="m-0 font-display text-[clamp(32px,4vw,48px)] font-normal leading-none text-brown">Sign in</h1>
              <p className="m-0 text-[17px] font-light leading-relaxed text-body">
                We email you a code, so there is no password to remember.
              </p>
            </div>
            <Suspense fallback={<div aria-busy="true" className="h-72 animate-pulse bg-sand" />}>
              <LoginContent />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
}
