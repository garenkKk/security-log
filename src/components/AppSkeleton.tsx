export function AppSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="Logo security-log"
              className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-contain shadow-xs"
            />
            <div>
              <div className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                security-log
              </div>
              <div className="text-xs font-medium text-slate-500">
                Digital Security Shift &amp; Monthly Report
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
            <div className="h-11 rounded-lg bg-slate-900/10 animate-pulse" />
            <div className="h-11 rounded-lg bg-slate-200/70 animate-pulse" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5 sm:px-6">
        <div className="h-36 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse" />
        <div className="h-56 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse" />
        <div className="h-64 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse" />
      </main>
    </div>
  );
}
