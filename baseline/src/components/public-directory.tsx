'use client';

import { FormEvent, useEffect, useId, useState } from 'react';

type Entry = { publicEntryId: string; organizationName: string; organizationType: string; positionTitle: string; currentHolder: string | null };
type Response = { entries?: Entry[]; page?: number; total?: number; error?: string };

export function PublicDirectory() {
  const queryId = useId(); const typeId = useId();
  const [query, setQuery] = useState(''); const [type, setType] = useState(''); const [page, setPage] = useState(1);
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: Response }>({ loading: true, error: null, data: {} });
  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await fetch(`/api/public/directory?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}&page=${page}&pageSize=20`);
      const data: Response = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Directory is unavailable.');
      setState({ loading: false, error: null, data });
    } catch (cause) { setState({ loading: false, error: cause instanceof Error ? cause.message : 'Directory is unavailable.', data: {} }); }
  };
  useEffect(() => { void load(); }, [page]);
  const submit = (event: FormEvent) => { event.preventDefault(); setPage(1); void load(); };
  const entries = state.data.entries ?? []; const total = state.data.total ?? 0;
  return <section aria-labelledby="directory-heading" className="mx-auto max-w-6xl p-4 sm:p-6">
    <h1 id="directory-heading" className="text-2xl font-semibold">Public directory</h1>
    <p className="mt-2 text-sm text-slate-600">Released public information only. Current holders are shown for today.</p>
    <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]" aria-label="Search directory">
      <label htmlFor={queryId} className="grid gap-1 text-sm font-medium">Search<input id={queryId} value={query} onChange={(event) => setQuery(event.target.value)} className="rounded border p-2" /></label>
      <label htmlFor={typeId} className="grid gap-1 text-sm font-medium">Type<select id={typeId} value={type} onChange={(event) => setType(event.target.value)} className="rounded border p-2"><option value="">All types</option><option value="SYNTHETIC_OFFICE">Synthetic office</option></select></label>
      <button type="submit" className="self-end rounded bg-slate-900 px-4 py-2 text-white">Search</button>
    </form>
    <p className="mt-4" aria-live="polite">{state.loading ? 'Loading directory…' : state.error ? state.error : `${total} result${total === 1 ? '' : 's'}`}</p>
    {!state.loading && !state.error && <>
      {entries.length === 0 ? <p className="mt-6 rounded border p-4">No released records match this search.</p> : <ul className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Directory results">{entries.map((entry) => <li key={entry.publicEntryId} className="rounded border p-4"><h2 className="font-semibold">{entry.organizationName}</h2><dl className="mt-2 grid gap-1 text-sm"><div><dt className="sr-only">Type</dt><dd>{entry.organizationType}</dd></div><div><dt className="inline font-medium">Position: </dt><dd className="inline">{entry.positionTitle}</dd></div><div><dt className="inline font-medium">Current holder: </dt><dd className="inline">{entry.currentHolder ?? 'Not published'}</dd></div></dl></li>)}</ul>}
      <nav className="mt-5 flex gap-3" aria-label="Directory pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-2 disabled:opacity-50">Previous</button><span className="self-center" aria-current="page">Page {page}</span><button type="button" disabled={entries.length < 20} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-2 disabled:opacity-50">Next</button></nav>
    </>}
  </section>;
}
