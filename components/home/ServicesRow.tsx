export function ServicesRow({ services }: { services: { title: string; body: string }[] }) {
  return (
    <section aria-label="Services" className="border-y border-line">
      <ul className="content-wrap m-0 grid list-none gap-7 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((s) => (
          <li key={s.title} className="flex flex-col gap-2">
            <span className="font-display text-[21px]">{s.title}</span>
            <span className="text-sm font-light leading-[1.6] text-muted">{s.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
