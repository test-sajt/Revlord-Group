import React, { useEffect, useRef, useState } from 'react';
import * as db from './db';
import { categories, normalize, safeLink, videoEmbed } from './data';
import type { Listing, Profile, Work } from './types';
import { Icon } from './icons';
import { Avatar, catName, ChatButton, cost, field, Field, Form, Link, needLogin, ReportForm, SignedImage, Task, useData, useSite, Wait, when } from './ui';
export const pathOf = (l: Listing) => (l.kind === 'project' ? '/projects/' : '/services/') + l.id;
// Naslovna, pretraga i portfolio čitaju zapise koje je baza dozvolila trenutnom posetiocu.
async function catalog(kind: 'service' | 'project') {
  const [list, people, works, slots] = await Promise.all([db.rows('listings', {
    kind,
    status: 'published'
  }), db.rows('profiles'), db.rows('works'), db.rows('slots', {
    booked: false
  })]);
  return {
    list: list.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    people,
    works: works.sort((a, b) => a.position - b.position),
    slots
  };
}
function Search({
  value = '',
  search
}: {
  value?: string;
  search: (q: string) => void;
}) {
  const {
    t
  } = useSite();
  const [q, set] = useState(value);
  useEffect(() => set(value), [value]);
  return <form className="search" onSubmit={e => {
    e.preventDefault();
    search(q.trim());
  }}>
    <Icon name="search" />
    <input value={q} onChange={e => set(e.target.value)} aria-label={t('Pretraga', 'Search')} placeholder={t('Pretraži usluge, veštine ili alate…', 'Search services, skills or tools…')} />
    <button className="primary">{t('Pretraži', 'Search')}</button>
  </form>;
}
function Card({
  l,
  p,
  w
}: {
  l: Listing;
  p?: Profile;
  w?: Work;
}) {
  const {
    t
  } = useSite();
  return <article className="card">
    {l.kind === 'service' && <Link className="thumbnail" to={pathOf(l)}>{w?.image_path ? <SignedImage path={w.image_path} alt={w.title} /> : <span className="art-placeholder"><Icon name={categories.find(x => x[0] === l.category)?.[1] || 'folder'} size={52} /></span>}</Link>}
    <div className="card-copy">
      <span className="meta">{catName(l.category, t)} · {l.specialty}</span>
      <h3><Link to={pathOf(l)}>{l.title}</Link></h3>
      <p>{l.body.slice(0, 155)}</p>
      <div className="card-foot">
        <Link className="credit" to={'/talent/' + l.owner_id}>
          <Avatar p={p} />
          {p?.name || t('Autor', 'Creator')}
        </Link>
        <b>{cost(l.price, t)}</b>
      </div>
    </div>
  </article>;
}
function Cards({
  data,
  items
}: {
  data: Awaited<ReturnType<typeof catalog>>;
  items: Listing[];
}) {
  return <div className="cards">{items.map(l => <Card key={l.id} l={l} p={data.people.find(p => p.id === l.owner_id)} w={data.works.find(w => w.listing_id === l.id && w.image_path)} />)}</div>;
}
function Empty({
  project = false
}: {
  project?: boolean;
}) {
  const {
    t
  } = useSite();
  return <div className="empty">
    <Icon name={project ? 'folder' : 'layers'} size={28} />
    <p>{project ? t('Trenutno nema otvorenih projekata.', 'There are no open projects yet.') : t('Još nema objavljenih usluga.', 'No services have been published yet.')}</p>
    <Link to={project ? '/new/project' : '/new/service'} className="text-link">{project ? t('Objavi prvi projekat', 'Post a project') : t('Predstavi svoju uslugu', 'List your service')}</Link>
  </div>;
}
export function Home() {
  const {
    t,
    go
  } = useSite();
  const s = useData(() => catalog('service'), 'home-service'),
    p = useData(() => catalog('project'), 'home-project');
  const featured = s.data?.works.find(w => w.image_path && s.data!.list.some(l => l.id === w.listing_id));
  const l = s.data?.list.find(x => x.id === featured?.listing_id);
  return <>
    <section className="hero-zone"><div className="wrap hero">
        <div className="intro">
          <p className="eyebrow">
            <span className="signal" />
            {t('Mreža digitalnih stručnjaka', 'Digital talent network')}
          </p>
          <h1>
            {t('Ko ti treba za', 'Who do you need')}
            <em>{t('sledeći projekat?', 'for your next project?')}</em>
          </h1>
          <p>{t('Upoznaj autore kroz njihove radove. Pronađi saradnika za igru, brend ili sajt i dogovori posao direktno.', 'Meet creators through their work. Find a collaborator for a game, a brand or a website and discuss the project directly.')}</p>
          <Search search={q => go('/services?q=' + encodeURIComponent(q))} />
          <div className="suggestions">
            <span>{t('Istraži', 'Explore')}</span>
            {['Roblox', 'Python', 'Blender'].map(q => <Link key={q} to={'/services?q=' + q}>{q}</Link>)}
          </div>
        </div>
        <article className="featured">{featured && l ? <>
            <Link className="feature-image" to={pathOf(l)}><SignedImage path={featured.image_path} alt={featured.title} /></Link>
            <div className="feature-tag">{t('Iz portfolija', 'From the portfolio')}</div>
            <div className="feature-caption"><div>
                <span className="meta">{l.specialty}</span>
                <Link to={pathOf(l)}><h2>{featured.title}</h2></Link>
              </div></div>
          </> : <>
            <img className="brand-art" src="/art/revlord-world.jpg" alt={t('Studijska ilustracija futurističke stanice u šumi', 'Studio illustration of a futuristic forest station')} />
            <div className="feature-caption"><div>
                <span className="meta">REVLORD GROUP</span>
                <h2>Digital Services</h2>
              </div></div>
          </>}</article>
      </div></section>
    <div className="wrap">
      <section className="categories">
        <h2>{t('Istraži po oblastima', 'Explore by discipline')}</h2>
        <div className="cat-grid">{categories.map(c => <Link key={c[0]} to={'/services?category=' + c[0]}>
            <Icon name={c[1]} size={26} />
            {t(c[2], c[3])}
          </Link>)}</div>
      </section>
      {[s, p].map((q, i) => <section className="band" key={i}>
        <div className="section-title">
          <h2>{i ? t('Otvoreni projekti', 'Open projects') : t('Usluge i portfoliji', 'Services and portfolios')}</h2>
          <Link className="text-link" to={i ? '/projects' : '/services'}>{t('Vidi sve', 'View all')}</Link>
        </div>
        {!q.data ? <Wait error={q.error} /> : q.data.list.length ? <Cards data={q.data} items={q.data.list.slice(0, 3)} /> : <Empty project={!!i} />}
      </section>)}
      <section className="about band" id="about">
        <h2>{t('O nama', 'About us')}</h2>
        <div>
          <p>{t('Revlord Group povezuje ljude kojima treba digitalni rad sa ljudima koji ga stvaraju.', 'Revlord Group connects people who need digital work with the people who create it.')}</p>
          <p>{t('Izaberi stručnjaka na osnovu portfolija ili objavi opis projekta i uporedi prijave. Razgovor i dogovor o terminu ostaju uz oglas.', 'Choose a specialist through their portfolio or publish a brief and compare proposals. Conversations and bookings stay connected to the listing.')}</p>
        </div>
      </section>
    </div>
  </>;
}
export function Browse({
  kind
}: {
  kind: 'service' | 'project';
}) {
  const {
      url,
      t,
      go
    } = useSite(),
    q = url.searchParams,
    data = useData(() => catalog(kind), 'catalog-' + kind);
  function filter(k: string, v: string) {
    const next = new URLSearchParams(q);
    if (v) next.set(k, v);else next.delete(k);
    go(url.pathname + (next.size ? '?' + next : ''));
  }
  const list = (data.data?.list || []).filter(l => {
    const p = data.data?.people.find(x => x.id === l.owner_id),
      c = categories.find(c => c[0] === l.category);
    const words = normalize([l.title, l.body, l.tags, l.specialty, c?.[2], c?.[3], p?.name].join(' '));
    return normalize(q.get('q') || '').split(/\s+/).every(x => words.includes(x)) && (!q.get('category') || q.get('category') === l.category) && (!q.get('spec') || l.specialty === q.get('spec')) && (!q.get('max') || l.price !== null && l.price <= Number(q.get('max'))) && (!q.get('free') || data.data?.slots.some(s => s.owner_id === l.owner_id && Date.parse(s.starts_at) > Date.now()));
  });
  return <section className="wrap page">
    <p className="eyebrow">REVLORD / {kind === 'service' ? t('Usluge', 'Services') : t('Projekti', 'Projects')}</p>
    <h1>{kind === 'service' ? t('Pronađi stručnjaka', 'Find talent') : t('Otvoreni projekti', 'Open projects')}</h1>
    <Search value={q.get('q') || ''} search={v => filter('q', v)} />
    <div className="filters">
      <label>
        {t('Oblast', 'Discipline')}
        <select value={q.get('category') || ''} onChange={e => filter('category', e.target.value)}>
          <option value="">{t('Sve oblasti', 'All disciplines')}</option>
          {categories.map(c => <option key={c[0]} value={c[0]}>{t(c[2], c[3])}</option>)}
        </select>
      </label>
      <label>
        {t('Specijalizacija', 'Specialisation')}
        <select value={q.get('spec') || ''} onChange={e => filter('spec', e.target.value)}>
          <option value="">{t('Sve', 'All')}</option>
          {Array.from(new Set(data.data?.list.map(l => l.specialty).filter(Boolean))).map(x => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label>
        {t('Maksimalni budžet (€)', 'Maximum budget (€)')}
        <input type="number" min="0" value={q.get('max') || ''} onChange={e => filter('max', e.target.value)} />
      </label>
      {kind === 'service' && <label className="check">
        <input type="checkbox" checked={q.has('free')} onChange={e => filter('free', e.target.checked ? '1' : '')} />
        {t('Slobodan termin', 'Available time')}
      </label>}
    </div>
    {q.size > 0 && <Link className="text-link" to={url.pathname}>{t('Ukloni filtere', 'Clear filters')}</Link>}
    {!data.data ? <Wait error={data.error} /> : list.length ? <>
      <p className="result-bar">{t('Rezultati', 'Results')} ({list.length})</p>
      <Cards data={data.data} items={list} />
    </> : q.size ? <p className="empty">{t('Nema rezultata za izabrane filtere.', 'No results match these filters.')}</p> : <Empty project={kind === 'project'} />}
  </section>;
}
function Gallery({
  works
}: {
  works: Work[];
}) {
  const {
    t
  } = useSite();
  const [active, set] = useState<Work | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (active) ref.current?.showModal();else ref.current?.close();
  }, [active]);
  return <>
    <div className="work-list">{works.map(w => <article key={w.id}>
        <button className="work-cover" onClick={() => set(w)} aria-label={t('Otvori rad', 'View work') + ' ' + w.title}>
          {w.image_path ? <SignedImage path={w.image_path} alt={w.title} /> : <b>▶ {w.title}</b>}
          <span><Icon name="expand" /></span>
        </button>
        <h3>{w.title}</h3>
        <p>{w.contribution}</p>
      </article>)}</div>
    <dialog ref={ref} onCancel={() => set(null)}>
      <button className="modal-close" aria-label={t('Zatvori', 'Close')} onClick={() => set(null)}>×</button>
      {active && <>
        {active.image_path && <SignedImage path={active.image_path} alt={active.title} />}
        {videoEmbed(active.video) && <iframe title={active.title} src={videoEmbed(active.video)} allowFullScreen />}
        <div className="light-foot">{active.title}</div>
      </>}
    </dialog>
  </>;
}
function Engage({
  l,
  p
}: {
  l: Listing;
  p?: Profile;
}) {
  const ctx = useSite(),
    {
      t,
      user,
      lang
    } = ctx;
  const [slot, setSlot] = useState(ctx.url.searchParams.get('slot') || ''),
    [note, setNote] = useState(''),
    [attempt, bump] = useState(0);
  const data = useData(async () => {
    const slots = l.kind === 'service' ? await db.rows('slots', {
      owner_id: l.owner_id,
      booked: false
    }, '*', 'starts_at') : [];
    const own = user && l.kind === 'project' ? await db.rows('listings', {
      owner_id: user.id,
      status: 'published',
      kind: 'service'
    }) : [];
    const works = own.length ? (await db.rows('works')).filter(w => own.some(o => o.id === w.listing_id)) : [];
    return {
      slots: slots.filter(x => Date.parse(x.starts_at) > Date.now()),
      works
    };
  }, l.id + (user?.id || '') + attempt);
  const [date, setDate] = useState(''),
    [brief, setBrief] = useState('');
  const localDay = (x: string) => new Date(x).toLocaleDateString('sv-SE');
  const days = Array.from(new Set(data.data?.slots.map(s => localDay(s.starts_at))));
  const restoredDay = data.data?.slots.find(s => s.id === slot)?.starts_at;
  const chosen = days.includes(date) ? date : restoredDay ? localDay(restoredDay) : days[0];
  const isOwner = user?.id === l.owner_id;
  const started = useRef(false);
  useEffect(() => {
    if (!user || isOwner || started.current || ctx.url.searchParams.get('action') !== 'message') return;
    started.current = true;
    db.rpc<string>('open_thread', {
      listing: l.id,
      peer: null
    }).then(ctx.openChat).catch(e => setNote(e.message));
  }, [user?.id, l.id]);
  return <aside className="booking">
    <Link className="credit" to={'/talent/' + l.owner_id}>
      <Avatar p={p} />
      <b>{p?.name || t('Autor', 'Creator')}</b>
    </Link>
    <div className="booking-price">
      {t('Budžet', 'Budget')}
      <strong>{cost(l.price, t)}</strong>
    </div>
    {l.deadline && <p>{t('Rok', 'Deadline')} · {l.deadline}</p>}
    <hr />
    {isOwner ? <Link className="primary" to={'/edit/' + l.id}>{t('Uredi oglas', 'Edit listing')}</Link> : l.status === 'published' ? <>{l.kind === 'service' ? <>
        <h3>{t('Kalendar', 'Availability')}</h3>
        <small>{Intl.DateTimeFormat().resolvedOptions().timeZone}</small>
        {!data.data ? <Wait error={data.error} /> : days.length ? <Form label={t('Pošalji zahtev za termin', 'Request a booking')} save={async f => {
          const id = field(f, 'slot');
          if (!user) {
            sessionStorage.setItem('rg-return', ctx.url.pathname + '?slot=' + encodeURIComponent(id));
            ctx.go('/login');
            return;
          }
          try {
            await db.rpc('request_booking', {
              slot: id,
              listing: l.id,
              brief_text: field(f, 'brief')
            });
            setNote(t('Zahtev je sačuvan. Status prati u panelu.', 'Request saved. Check the dashboard for its status.'));
          } catch (e) {
            setSlot('');
            bump(x => x + 1);
            throw e;
          }
        }}>
          <label>
            {t('Dan', 'Day')}
            <select value={chosen} onChange={e => {
              setDate(e.target.value);
              setSlot('');
            }}>{days.map(d => <option key={d}>{d}</option>)}</select>
          </label>
          <label>
            {t('Termin', 'Time')}
            <select required name="slot" value={slot} onChange={e => setSlot(e.target.value)}>
              <option value="">{t('Izaberi vreme', 'Choose a time')}</option>
              {data.data.slots.filter(s => localDay(s.starts_at) === chosen).map(s => <option key={s.id} value={s.id}>{when(s.starts_at, lang)}</option>)}
            </select>
          </label>
          {user && <label>
            {t('Opis posla', 'Project brief')}
            <textarea name="brief" required maxLength={6000} value={brief} onChange={e => setBrief(e.target.value)} />
          </label>}
        </Form> : <p>{t('Nema slobodnih termina. Pošalji poruku za dogovor.', 'No open times. Send a message to discuss availability.')}</p>}
        <ChatButton listing={l.id} />
      </> : !user ? <button className="primary" onClick={() => needLogin(ctx)}>{t('Prijavi se za slanje ponude', 'Sign in to apply')}</button> : <Form label={t('Pošalji prijavu', 'Submit proposal')} save={async f => {
        if (needLogin(ctx)) return;
        await db.rpc('apply_project', {
          listing: l.id,
          proposal_text: field(f, 'proposal'),
          amount: field(f, 'price') || null,
          due: field(f, 'due') || null,
          work: field(f, 'work') || null
        });
        setNote(t('Prijava je zabeležena. Status je u tvom panelu.', 'Your proposal is recorded. See its status in the dashboard.'));
      }}>
        <Field required maxLength={6000} name="proposal" type="textarea" label={t('Tvoja ponuda', 'Your proposal')} />
        <Field name="price" type="number" min="0" label={t('Cena (€)', 'Price (€)')} />
        <Field name="due" type="date" label={t('Rok', 'Delivery date')} />
        <label>
          {t('Tvoj portfolio rad', 'Your portfolio work')}
          <select name="work">
            <option value="">{t('Opciono', 'Optional')}</option>
            {data.data?.works.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
          </select>
        </label>
      </Form>}</> : <p>{t('Oglas je zatvoren.', 'Listing closed.')}</p>}
    <Task className="secondary" run={async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            url: location.href,
            title: l.title
          });
        } catch (e) {
          if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
        }
      } else {
        await navigator.clipboard.writeText(location.href);
        setNote(t('Link je kopiran.', 'Link copied.'));
      }
    }}>{t('Podeli', 'Share')}</Task>
    {note && <p role="status">{note}</p>}
    <ReportForm listing={l.id} />
  </aside>;
}
export function Detail({
  id,
  kind
}: {
  id: string;
  kind: 'project' | 'service';
}) {
  const {
    t,
    user
  } = useSite();
  const q = useData(async () => {
    const l = (await db.rows('listings', {
      id,
      kind
    }))[0];
    if (!l) return null;
    const [ps, ws] = await Promise.all([db.rows('profiles', {
      id: l.owner_id
    }), db.rows('works', {
      listing_id: id
    }, '*', 'position')]);
    return {
      l,
      p: ps[0],
      ws
    };
  }, kind + id + user?.id);
  if (q.data === undefined) return <div className="page wrap"><Wait error={q.error} /></div>;
  if (!q.data) return <Missing />;
  const {
    l,
    p,
    ws
  } = q.data;
  return <section className="wrap page">
    <Link className="crumb" to={kind === 'project' ? '/projects' : '/services'}>{kind === 'project' ? t('Otvoreni projekti', 'Open projects') : t('Sve usluge', 'All services')}</Link>
    <p className="eyebrow">{catName(l.category, t)} / {l.specialty}</p>
    <h1>{l.title}</h1>
    <div className="detail-grid">
      <div>
        <p className="lead preserve">{l.body}</p>
        <div className="suggestions">{l.tags.split(',').filter(Boolean).map((x, i) => <span key={i}>{x.trim()}</span>)}</div>
        {safeLink(l.reference_url) && <p><a className="text-link" href={safeLink(l.reference_url)} rel="noreferrer" target="_blank">{t('Otvori referencu', 'Open reference')}</a></p>}
        {ws.length > 0 && <>
          <h2>Portfolio</h2>
          <Gallery works={ws} />
        </>}
      </div>
      <Engage l={l} p={p} />
    </div>
  </section>;
}
export function PublicProfile({
  id
}: {
  id: string;
}) {
  const {
    t
  } = useSite();
  const q = useData(async () => {
    const [ps, ls, ws] = await Promise.all([db.rows('profiles', {
      id
    }), db.rows('listings', {
      owner_id: id,
      status: 'published',
      kind: 'service'
    }), db.rows('works')]);
    return {
      p: ps[0],
      ls,
      ws
    };
  }, 'person' + id);
  if (!q.data) return <div className="wrap page"><Wait error={q.error} /></div>;
  const {
    p,
    ls,
    ws
  } = q.data;
  if (!p) return <Missing />;
  return <section className="wrap page">
    <Avatar p={p} />
    <h1>{p.name || t('Autor', 'Creator')}</h1>
    <p className="lead preserve">{p.bio}</p>
    <h2>{t('Usluge autora', 'Services')}</h2>
    <div className="cards">{ls.map(l => <Card key={l.id} l={l} p={p} w={ws.find(w => w.listing_id === l.id && w.image_path)} />)}</div>
  </section>;
}
export function Missing() {
  const {
    t
  } = useSite();
  return <section className="wrap page">
    <h1>{t('Stranica nije dostupna', 'Page unavailable')}</h1>
    <Link to="/">{t('Početna', 'Home')}</Link>
  </section>;
}
