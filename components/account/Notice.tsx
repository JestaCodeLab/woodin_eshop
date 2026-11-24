/** Message shown only when there is one, so it never reserves empty space in a form. */
export function Notice({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "info" | "success" }) {
  const cls = tone === "error" ? "border-lowstock text-lowstock" : tone === "success" ? "border-instock-dot text-instock" : "border-gold-btn text-body";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`m-0 border-l-2 bg-white px-4 py-3 text-[14px] leading-snug ${cls}`}>
      {children}
    </p>
  );
}
