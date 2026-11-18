export function AppSkeleton() {
  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900"
      aria-busy="true"
      aria-label="Memuat data security-log"
    >
      {/* Header Skeleton */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="Logo security-log"
                className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-contain shadow-xs"
              />
              <div className="space-y-1.5">
                <div className="h-4 w-28 animate-pulse rounded-md bg-slate-200" />
                <div className="h-3 w-48 max-w-[52vw] animate-pulse rounded-md bg-slate-200/70" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-6 w-36 animate-pulse rounded-full bg-sky-100" />
              <div className="hidden h-6 w-32 animate-pulse rounded-full bg-slate-100 md:block" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1">
            <div className="h-11 animate-pulse rounded-lg bg-slate-900/15" />
            <div className="h-11 animate-pulse rounded-lg bg-slate-200/70" />
          </div>
        </div>
      </header>

      {/* Main Content Form Skeleton */}
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2 px-1 text-xs font-medium text-slate-500">
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-sky-500" />
          <span>Memuat data identitas hotel &amp; riwayat shift dari Supabase Cloud...</span>
        </div>

        {/* Kartu 1: Kop & Identitas Hotel */}
        <section className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-200" />
            <div className="space-y-1.5">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="h-3 w-64 max-w-[70vw] rounded bg-slate-100" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="h-11 w-full rounded-xl bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-28 rounded bg-slate-200" />
              <div className="h-11 w-full rounded-xl bg-slate-100" />
            </div>
          </div>
        </section>

        {/* Kartu 2: Identitas & Waktu Shift */}
        <section className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-200" />
            <div className="space-y-1.5">
              <div className="h-4 w-44 rounded bg-slate-200" />
              <div className="h-3 w-56 max-w-[65vw] rounded bg-slate-100" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-14 rounded-xl bg-slate-200/80" />
            <div className="h-14 rounded-xl bg-slate-100" />
            <div className="h-14 rounded-xl bg-slate-100" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div className="h-11 rounded-xl bg-slate-100" />
            <div className="h-11 rounded-xl bg-slate-100" />
            <div className="h-11 rounded-xl bg-slate-100" />
          </div>
        </section>

        {/* Kartu 3: Log Kegiatan & Aksi Shift */}
        <section className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-200" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 rounded bg-slate-200" />
              <div className="h-3 w-52 max-w-[60vw] rounded bg-slate-100" />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="h-11 w-full rounded-xl bg-slate-100" />
            <div className="h-11 w-full rounded-xl bg-slate-100" />
            <div className="h-12 w-full rounded-xl bg-slate-200/70" />
          </div>
        </section>
      </main>
    </div>
  );
}
