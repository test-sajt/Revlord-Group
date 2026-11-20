import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as db from './db';
import { LogoHeader, Footer } from './shell';
import { Browse, Detail, Home, Missing, pathOf, PublicProfile } from './Catalog';
import { Callback, Login, Preferences, ProfileEdit, PortfolioEditor } from './Account';
import { Admin, Chat } from './Messages';
import { Dashboard } from './Dashboard';
import { Editor } from './Editor';
import { explain, Link, Site, useData, useSite, Wait } from './ui';
import type { Lang, Profile, User } from './types';
import './style.css';
// Korisnik dobija samo sopstveni panel. Stvarna kontrola pristupa je u SQL pravilima.
function Private({
  children
}: {
  children: React.ReactNode;
}) {
  const ctx = useSite();
  useEffect(() => {
    if (!ctx.loading && !ctx.user) {
      sessionStorage.setItem('rg-return', ctx.url.pathname + ctx.url.search);
      ctx.go('/login');
    }
  }, [ctx.loading, ctx.user, ctx.url.pathname]);
  return ctx.user ? <>{children}</> : <Wait />;
}
function ListingLink({
  id
}: {
  id: string;
}) {
  const {
    go
  } = useSite();
  const q = useData(() => db.rows('listings', {
    id
  }), 'resolve' + id);
  useEffect(() => {
    if (q.data?.[0]) go(pathOf(q.data[0]));
  }, [q.data]);
  return q.data && !q.data.length ? <Missing /> : <Wait error={q.error} />;
}
function Page() {
  const ctx = useSite();
  const p = ctx.url.pathname.replace(/\/$/, '') || '/';
  const parts = p.split('/').filter(Boolean);
  if (p === '/auth/callback' || p === '/auth/reset') return <Callback reset={p.endsWith('reset')} />;
  if (ctx.user && ctx.loading) return <div className="page wrap"><Wait /></div>;
  if (ctx.user && ctx.me && !ctx.me.onboarded) return <Preferences />;
  if (p === '/') return <Home />;
  if (p === '/login' || p === '/register') return <Login />;
  if (p === '/services' || p === '/projects') return <Browse kind={p === '/services' ? 'service' : 'project'} />;
  if (p === '/projects/new' || p === '/new/project' || p === '/new/service') return <Private><Editor kind={p === '/new/service' ? 'service' : 'project'} /></Private>;
  if (parts.length === 2 && parts[0] === 'talent') return <PublicProfile id={parts[1]} />;
  if (parts.length === 2 && ['services', 'projects'].includes(parts[0])) return <Detail id={parts[1]} kind={parts[0] === 'services' ? 'service' : 'project'} />;
  if (parts.length === 2 && parts[0] === 'listing') return <ListingLink id={parts[1]} />;
  if (parts.length === 2 && parts[0] === 'edit') return <Private><Editor id={parts[1]} kind="service" /></Private>;
  if (p === '/panel') return <Private><Dashboard /></Private>;
  if (p === '/preferences') return <Private><Preferences /></Private>;
  if (p === '/account/edit') return <Private><ProfileEdit /></Private>;
  if (p === '/account/portfolio') return <Private><PortfolioEditor /></Private>;
  if (p === '/admin') return <Private>{ctx.admin ? <Admin /> : <Missing />}</Private>;
  return <Missing />;
}
export function App({
  url: raw,
  navigate
}: {
  url: string;
  navigate: (href: string) => void;
}) {
  const url = useMemo(() => new URL(raw), [raw]);
  const [lang, setLanguage] = useState<Lang>(() => {
    try {
      return localStorage.getItem('rg-lang') === 'en' ? 'en' : 'sr';
    } catch {
      return 'sr';
    }
  });
  const t = useCallback((s: string, e: string) => lang === 'sr' ? s : e, [lang]);
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(!db.configured),
    [me, setMe] = useState<Profile | null>(null),
    [admin, setAdmin] = useState(false),
    [profileVersion, reload] = useState(0),
    [version, rev] = useState(0),
    [chat, setChat] = useState(''),
    [error, setError] = useState('');
  const refresh = () => rev(x => x + 1);
  useEffect(() => {
    document.documentElement.lang = lang === 'sr' ? 'sr-Latn' : 'en';
    try {
      localStorage.setItem('rg-lang', lang);
    } catch {}
  }, [lang]);
  useEffect(() => {
    if (!db.configured) return;
    return db.watchAuth(u => {
      setUser(old => old?.id === u?.id ? old : u);
      setReady(true);
    });
  }, []);
  useEffect(() => {
    let live = true;
    setMe(null);
    setAdmin(false);
    setChat('');
    setError('');
    if (user) Promise.all([db.profile(user), db.rows('admins', {
      user_id: user.id
    }, '*', 'user_id')]).then(([p, a]) => {
      if (live) {
        setMe(p);
        setAdmin(a.length > 0);
      }
    }).catch(e => {
      if (live) setError(e.message);
    });
    return () => {
      live = false;
    };
  }, [user?.id, profileVersion]);
  useEffect(() => {
    setChat('');
    if (url.hash === '#about') requestAnimationFrame(() => document.getElementById('about')?.scrollIntoView());else window.scrollTo(0, 0);
  }, [url.pathname, url.hash]);
  useEffect(() => {
    const requested=url.searchParams.get('thread');
    if(!requested || !/^[a-f0-9-]{36}$/i.test(requested)) return;
    if(user)setChat(requested);
    else if(ready){sessionStorage.setItem('rg-return','/?thread='+encodeURIComponent(requested));navigate('/login');}
  },[url.search,user?.id,ready]);
  useEffect(() => {
    document.title = (document.querySelector('h1')?.textContent?.trim() || 'Revlord Group') + ' | Digital Services';
  }, [url, lang, me]);
  const ctx = {
    lang,
    t,
    setLang: setLanguage,
    url,
    user,
    me,
    admin,
    loading: !ready || !!user && me?.id !== user.id,
    refreshMe: () => reload(x => x + 1),
    version,
    refresh,
    go: navigate,
    openChat: setChat
  };
  return <Site.Provider value={ctx}>
    <a className="skip" href="#content">{t('Preskoči na sadržaj', 'Skip to content')}</a>
    <LogoHeader />
    <main id="content" key={url.pathname + '|' + (url.pathname.startsWith('/auth/') ? 'auth' : user?.id || 'guest')}>{error ? <section className="wrap page">
        <p role="alert">{explain(Error(error), t)}</p>
        <button onClick={ctx.refreshMe}>{t('Ponovi povezivanje', 'Retry connection')}</button>
      </section> : !db.configured ? <section className="wrap page narrow">
        <p className="eyebrow">REVLORD GROUP</p>
        <h1>{t('Povezivanje platforme', 'Connect the platform')}</h1>
        <p>{explain(Error('CONFIG'), t)}</p>
        <code>VITE_SUPABASE_URL<br />VITE_SUPABASE_PUBLISHABLE_KEY</code>
      </section> : !ready ? <section className="wrap page"><Wait /></section> : <Page />}</main>
    <Footer />
    {chat && user && <Chat key={chat + user.id} id={chat} close={() => setChat('')} />}
  </Site.Provider>;
}
import './workspace.css';
import './revamp.css';
import './revlord-20261120.css';
