
type CatSvc = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  category_id: string | null;
  image_url: string | null;
};
type Cat = { id: string; name: string; image_url?: string | null };

// Groups services into collapsible category dropdowns with an optional image
// (placeholder when none set) on both the category header and each service row.
function CategoryAccordion({
  services,
  categories,
  selectedId,
  onSelect,
  primary,
}: {
  services: CatSvc[];
  categories: Cat[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  primary: string;
}) {
  const groups = useMemo(() => {
    const byCat = new Map<string, CatSvc[]>();
    for (const s of services) {
      const key = s.category_id ?? "__uncat__";
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(s);
    }
    const ordered: { cat: Cat; items: CatSvc[] }[] = [];
    for (const c of categories) {
      const items = byCat.get(c.id);
      if (items && items.length) ordered.push({ cat: c, items });
    }
    const uncat = byCat.get("__uncat__");
    if (uncat && uncat.length) ordered.push({ cat: { id: "__uncat__", name: "Services" }, items: uncat });
    return ordered;
  }, [services, categories]);

  // Open the group that contains the selection, else the first group.
  const initialOpen = useMemo(() => {
    const sel = services.find((s) => s.id === selectedId);
    const key = sel?.category_id ?? groups[0]?.cat.id;
    return key ? new Set([key]) : new Set<string>();
  }, []);
  const [open, setOpen] = useState<Set<string>>(initialOpen);
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // No categories at all → flat list fallback.
  if (groups.length === 1 && groups[0].cat.id === "__uncat__") {
    return (
      <div className="space-y-3">
        {groups[0].items.map((s) => (
          <ServiceRow key={s.id} s={s} active={selectedId === s.id} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(({ cat, items }) => {
        const isOpen = open.has(cat.id);
        return (
          <div key={cat.id} className="overflow-hidden rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => toggle(cat.id)}
              className="flex w-full items-center gap-3 bg-slate-50/60 px-4 py-3 text-left transition hover:bg-slate-100"
            >
              <CatImage url={cat.image_url} />
              <div className="flex-1">
                <div className="font-semibold text-slate-900">{cat.name}</div>
                <div className="text-xs text-slate-500">{items.length} option{items.length > 1 ? "s" : ""}</div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-slate-100 p-3">
                {items.map((s) => (
                  <ServiceRow key={s.id} s={s} active={selectedId === s.id} onSelect={onSelect} primary={primary} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CatImage({ url }: { url?: string | null }) {
  if (url) {
    return <img src={url} alt="" className="h-11 w-11 rounded-lg object-cover" />;
  }
  return (
    <div className="grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-slate-300">
      <ImageIcon className="h-5 w-5" />
    </div>
  );
}

function ServiceRow({
  s,
  active,
  onSelect,
  primary,
}: {
  s: CatSvc;
  active: boolean;
  onSelect: (id: string) => void;
  primary?: string;
}) {
  return (
    <button
      onClick={() => onSelect(s.id)}
      style={active ? { borderColor: primary } : undefined}
      className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
        active ? "bg-slate-900/[0.02] shadow-sm" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <CatImage url={s.image_url} />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium text-slate-900">{s.name}</h3>
          <span className="text-base font-semibold text-slate-900">{money(s.price_cents, s.currency)}</span>
        </div>
        {s.description && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{s.description}</p>}
        <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" /> {s.duration_minutes} min
        </div>
      </div>
      <div
        className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full ring-1 transition ${
          active ? "bg-slate-900 ring-slate-900" : "ring-slate-300 group-hover:ring-slate-400"
        }`}
      >
        {active && <Check className="h-3 w-3 text-white" />}
      </div>
    </button>
  );
}
