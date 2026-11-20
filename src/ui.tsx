import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { CategoryNode, Lang, Profile, Tables, Thread, User } from './types';
import * as db from './db';
import { Icon } from './icons';
import { categories } from './data';
export type T = (sr: string, en: string) => string;
type Context = {
  lang: Lang;
  t: T;
  setLang: (v: Lang) => void;
  user: User | null;
  me: Profile | null;
  admin: boolean;
  loading: boolean;
  refreshMe: () => void;
  go: (p: string) => void;
  url: URL;
  openChat: (id: string) => void;
  version: number;
  refresh: () => void;
};
export const Site = createContext<Context>(null!);
export const useSite = () => useContext(Site);
export function Link({
  to,
  children,
  className
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  const {
    go
  } = useSite();
  return <a className={className} href={to} onClick={e => {
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      go(to);
    }
  }}>{children}</a>;
}
export function explain(e: unknown, t: T) {
  const raw = e instanceof Error ? e.message : String(e);
  if (/OWN_REVIEW_FORBIDDEN/.test(raw)) return t('Ne možeš oceniti svoj profil ili oglas.','You cannot rate your own profile or listing.');
  if (/REVIEW_SLOW_DOWN/.test(raw)) return t('Sačekaj 15 sekundi pre ponovnog uređivanja ocene.','Please wait 15 seconds before editing again.');
  if (/INVALID_REVIEW/.test(raw)) return t('Izaberi 1–5 zvezdica i napiši komentar od najmanje 5 karaktera.','Choose 1–5 stars and write at least 5 characters.');
  if (/NOTIFICATIONS_DENIED/.test(raw)) return t('Obaveštenja nisu dozvoljena. Uključi ih u podešavanjima pregledača.','Notifications are blocked. Enable them in browser settings.');
  if (/NOTIFICATIONS_UNSUPPORTED|PUSH_UNSUPPORTED/.test(raw)) return t('Ovaj pregledač ne podržava obaveštenja u ovoj verziji sajta.','Notifications are unavailable in this browser.');
  if (/SLOT_UNAVAILABLE/.test(raw)) return t('Termin više nije dostupan. Izaberi sledeći slobodan termin.', 'This time is unavailable. Choose another available time.');
  if (/CONFIG/.test(raw)) return t('Platforma čeka povezivanje sa bazom. Vlasnik treba da podesi Supabase prema uputstvu POKRETANJE.md.', 'The platform is waiting for its database connection. The owner needs to configure Supabase.');
  if (/IMAGE/.test(raw)) return t('Koristi JPG, PNG ili WebP. Najviše 4 MB za rad i 2 MB za avatar.', 'Use JPG, PNG or WebP. Maximum 4 MB for artwork and 2 MB for avatars.');
  if (/duplicate|unique/i.test(raw)) return t('Zapis sa istim podacima već postoji.', 'A matching record already exists.');
  if (/foreign key/i.test(raw)) return t('Ovaj zapis je povezan sa postojećim zahtevom i mora ostati sačuvan.', 'This record is linked to an existing request and must be retained.');
  if (/invalid login/i.test(raw)) return t('Proveri adresu i lozinku.', 'Check your email and password.');
  if (/PROJECT_AWARDED/.test(raw)) return t('Projekat ima izabranog saradnika. Za novi posao napravi novi projekat.', 'A collaborator has been selected. Create a new project for another job.');
  return t('Radnja nije uspela. ', 'Action failed. ') + raw;
}
// Promena naloga ili putanje skriva stare rezultate dok traje novi upit.
export function useData<T>(load: () => Promise<T>, key: string) {
  const {
    version,
    t
  } = useSite();
  const token = key + '|' + version;
  const [state, set] = useState<{
    token: string;
    data?: T;
    error?: string;
  }>({
    token: ''
  });
  useEffect(() => {
    let active = true;
    Promise.resolve().then(load).then(data => {
      if (active) set({
        token,
        data
      });
    }, e => {
      if (active) set({
        token,
        error: explain(e, t)
      });
    });
    return () => {
      active = false;
    };
  }, [token]);
  return state.token === token ? state : {
    token
  };
}
export function Wait({
  error
}: {
  error?: string;
}) {
  const {
    t,
    refresh
  } = useSite();
  return <div className="notice" role="status">{error || t('Učitavanje…', 'Loading…')}{error && <button onClick={refresh}>{t('Pokušaj ponovo', 'Retry')}</button>}</div>;
}
export function Task({
  run,
  children,
  kind = 'button',
  className = 'primary',
  disabled = false
}: {
  run: () => Promise<unknown>;
  children: React.ReactNode;
  kind?: 'button' | 'submit';
  className?: string;
  disabled?: boolean;
}) {
  const {
    t
  } = useSite();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  return <>
    <button type={kind} className={className} disabled={disabled || busy} onClick={async () => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        await run();
      } catch (e) {
        setError(explain(e, t));
      } finally {
        lock.current = false;
        setBusy(false);
      }
    }}>{busy ? t('Sačekaj…', 'Working…') : children}</button>
    {error && <p role="alert" className="notice">{error}</p>}
  </>;
}
export function Form({
  save,
  children,
  label
}: {
  save: (f: FormData) => Promise<void>;
  children: React.ReactNode;
  label: string;
}) {
  const {
    t
  } = useSite();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  return <form className="draft" onSubmit={async e => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await save(new FormData(e.currentTarget));
    } catch (e) {
      setError(explain(e, t));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }}>
    {children}
    {error && <div className="notice" role="alert">{error}</div>}
    <button className="primary" disabled={busy}>{busy ? t('Sačekaj…', 'Working…') : label}</button>
  </form>;
}
export const field = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
export function Field({
  name,
  label,
  value = '',
  type = 'text',
  required = false,
  maxLength,
  min,
  max
}: {
  name: string;
  label: string;
  value?: string | number | null;
  type?: string;
  required?: boolean;
  maxLength?: number;
  min?: string;
  max?: string;
}) {
  return <label>{label}{type === 'textarea' ? <textarea name={name} defaultValue={value ?? ''} rows={4} required={required} maxLength={maxLength} /> : <input name={name} defaultValue={value ?? ''} type={type} step={type === 'number' ? '0.01' : undefined} min={min} max={max} required={required} maxLength={maxLength} />}</label>;
}
export function Category({
  value,
  change
}: {
  value: string;
  change: (x: string) => void;
}) {
  const {
    t
  } = useSite();
  return <label>
    {t('Oblast', 'Discipline')}
    <select value={value} onChange={e => change(e.target.value)}>{categories.map(c => <option key={c[0]} value={c[0]}>{t(c[2], c[3])}</option>)}</select>
  </label>;
}
export function catName(id: string, t: T) {
  const c = categories.find(x => x[0] === id);
  return c ? t(c[2], c[3]) : id;
}
export function cost(n: number | null, t: T, currency = 'EUR') {
  return n == null ? t('Po dogovoru', 'Negotiable') : new Intl.NumberFormat(t('sr-Latn', 'en-IE'), {
    style: 'currency',
    currency: ['EUR', 'USD', 'RSD', 'GBP'].includes(currency) ? currency : 'EUR',
    maximumFractionDigits: 2
  }).format(n);
}
export function when(s: string, lang: Lang) {
  return new Date(s).toLocaleString(lang === 'sr' ? 'sr-Latn-RS' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}
export function status(s: string, t: T) {
  return {
    pending: t('Na čekanju', 'Pending'),
    accepted: t('Prihvaćeno', 'Accepted'),
    declined: t('Odbijeno', 'Declined'),
    draft: t('Nacrt', 'Draft'),
    published: t('Objavljeno', 'Published'),
    closed: t('Zatvoreno', 'Closed')
  }[s] ?? s;
}
export function Avatar({
  p
}: {
  p?: Profile;
}) {
  return p?.avatar ? <img className="avatar" alt="" src={db.avatar(p.avatar)} /> : <span className="avatar">{(p?.name || 'R').slice(0, 1)}</span>;
}
export function SignedImage({
  path,
  alt,
  bucket = 'portfolio'
}: {
  path: string;
  alt: string;
  bucket?: string;
}) {
  const [src, set] = useState('');
  useEffect(() => {
    let active = true;
    function load() {
      db.mediaUrl(bucket, path).then(x => active && set(x)).catch(() => active && set(''));
    }
    load();
    const timer = setInterval(load, 3300000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [path, bucket]);
  return src ? <img src={src} alt={alt} loading="lazy" /> : <span className="art-placeholder" aria-label={alt} />;
}
export function needLogin(ctx: Context) {
  if (ctx.user) return false;
  sessionStorage.setItem('rg-return', ctx.url.pathname + ctx.url.search);
  ctx.go('/login');
  return true;
}
export function ChatButton({
  listing,
  peer
}: {
  listing: string;
  peer?: string;
}) {
  const ctx = useSite();
  return <Task className="secondary" run={async () => {
    if (!ctx.user) {
      sessionStorage.setItem('rg-return', '/services/' + listing + '?action=message');
      ctx.go('/login');
      return;
    }
    ctx.openChat(await db.rpc<string>('open_thread', {
      listing,
      peer: peer || null
    }));
  }}><Icon name="chat" size={17}/>{ctx.t('Poruka', 'Message')}</Task>;
}
export function ReportForm({
  thread,
  listing
}: {
  thread?: string;
  listing?: string;
}) {
  const ctx = useSite();
  const [open, setOpen] = useState(false),
    [sent, setSent] = useState(false);
  return sent ? <p role="status">{ctx.t('Prijava je poslata moderatoru.', 'Report sent to moderation.')}</p> : open ? <Form label={ctx.t('Pošalji prijavu', 'Send report')} save={async f => {
    await db.insert('reports', {
      reporter: ctx.user!.id,
      reason: field(f, 'reason'),
      thread_id: thread || null,
      listing_id: listing || null
    });
    setSent(true);
  }}><Field required maxLength={3000} name="reason" label={ctx.t('Razlog prijave', 'Reason for report')} /></Form> : <button className="text-link" onClick={() => {
    if (!needLogin(ctx)) setOpen(true);
  }}>{ctx.t('Prijavi sadržaj', 'Report content')}</button>;
}
export const threadOther = (x: Thread, user: string) => x.owner_id === user ? x.peer_id : x.owner_id;
export function mine<K extends keyof Tables>(table: K, id?: string) {
  return id ? db.rows(table, {
    id
  }) : Promise.resolve([]);
}

// Category hierarchy is stored in Supabase: administrators can change it without a frontend rebuild.
export function useCategories() {
  return useData(() => db.rows('categories', {}, '*', 'sort_order'), 'category-tree');
}
export function categoryTitle(node: CategoryNode | undefined, lang: Lang) {
  return node ? (lang === 'sr' ? node.name_sr : node.name_en) : '';
}
export function categoryParents(nodes: CategoryNode[], id: string): string[] {
  const seen = new Set<string>(); const chain: string[] = [];
  let current = nodes.find(n => n.id === id);
  while (current && !seen.has(current.id)) {
    chain.unshift(current.id); seen.add(current.id);
    current = nodes.find(n => n.id === current!.parent_id);
  }
  return chain;
}
export function CategoryTrail({
  nodes, value, onChange, root, onRootChange
}: {
  nodes: CategoryNode[]; value: string;
  onChange: (v: string) => void;
  root?: string; onRootChange?: (v: string) => void;
}) {
  const { t, lang } = useSite();
  const active = nodes.filter(x => x.active).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const chain = categoryParents(nodes, value);
  const selectedRoot = root || chain[0] || '';
  const groups = active.filter(n => n.parent_id === selectedRoot);
  const selectedGroup = chain[1] || '';
  const items = active.filter(n => n.parent_id === selectedGroup);
  const rootOptions = active.filter(n => !n.parent_id);
  return <div className="category-trail">
    <label>{t('Glavna kategorija', 'Main category')}
      <select required value={selectedRoot} onChange={e => { onRootChange?.(e.target.value); onChange(e.target.value); }}>
        <option value="">{t('Izaberi oblast', 'Choose discipline')}</option>
        {rootOptions.map(n => <option key={n.id} value={n.id}>{categoryTitle(n, lang)}</option>)}
      </select>
    </label>
    {selectedRoot && groups.length > 0 && <label>{t('Podkategorija', 'Subcategory')}
      <select value={selectedGroup} onChange={e => onChange(e.target.value || selectedRoot)}>
        <option value="">{t('Sve podkategorije', 'All subcategories')}</option>
        {groups.map(n => <option key={n.id} value={n.id}>{categoryTitle(n, lang)}</option>)}
      </select>
    </label>}
    {selectedGroup && items.length > 0 && <label>{t('Specijalizacija', 'Specialisation')}
      <select value={chain[2] || ''} onChange={e => onChange(e.target.value || selectedGroup)}>
        <option value="">{t('Sve specijalizacije', 'All specialisations')}</option>
        {items.map(n => <option key={n.id} value={n.id}>{categoryTitle(n, lang)}</option>)}
      </select>
    </label>}
  </div>;
}
