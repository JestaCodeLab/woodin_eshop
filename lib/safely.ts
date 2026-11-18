import "server-only";
import { unstable_rethrow } from "next/navigation";

/**
 * Runs a data fetch for an optional page section. If the live store is down the section
 * renders nothing instead of taking the whole page with it. Framework control-flow errors
 * (prerender interrupts, notFound, redirect) are re-thrown untouched.
 */
export async function safely<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e);
    console.error("[safely]", e instanceof Error ? e.message : e);
    return null;
  }
}
