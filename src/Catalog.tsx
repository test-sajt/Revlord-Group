import React, { useEffect, useRef, useState } from 'react';
import * as db from './db';
import { categories, normalize, safeLink, videoEmbed } from './data';
import type { CategoryNode, Listing, ListingImage, Profile, Work } from './types';
import { Icon } from './icons';
import { Avatar, catName, categoryParents, categoryTitle, ChatButton, cost, field, Field, Form, Link, needLogin, ReportForm, SignedImage, Task, useCategories, useData, useSite, Wait, when } from './ui';
export const pathOf = (l: Listing) => (l.kind === 'project' ? '/projects/' : '/services/') + l.id;
// Naslovna, pretraga i portfolio čitaju zapise koje je baza dozvolila trenutnom posetiocu.
async function catalog(kind: 'service' | 'project') {
  const [list, people, works, slots, images] = await Promise.all([db.rows('listings', {
    kind,
    status: 'published'
  }), db.rows('profiles'), db.rows('works'), db.rows('slots', {
    booked: false
  }), db.rows('listing_images')]);
  return {
    list: list.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    people,
    works: works.sort((a, b) => a.position - b.position),
    slots,
    images
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
  w,
  image
}: {
  l: Listing;
  p?: Profile;
  w?: Work;
  image?: ListingImage;
}) {
  const {
    t
  } = useSite();
  return <article className="card">
    <Link className="thumbnail" to={pathOf(l)}>{image?.image_path ? <SignedImage path={image.image_path} bucket="listing-images" alt={l.title} /> : w?.image_path ? <SignedImage path={w.image_path} alt={w.title} /> : <span className="art-placeholder"><Icon name={categories.find(x => x[0] === l.category)?.[1] || 'folder'} size={52} /></span>}</Link>
    <div className="card-copy">
      <span className="meta">{catName(l.category, t)} · {l.specialty}</span>
      <h3><Link to={pathOf(l)}>{l.title}</Link></h3>
      <p>{l.body.slice(0, 155)}</p>
      <div className="card-foot">
        <Link className="credit" to={'/talent/' + l.owner_id}>
          <Avatar p={p} />
          {p?.name || t('Autor', 'Creator')}
        </Link>
        <b>{cost(l.price, t, l.currency)}</b>
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
  return <div className="cards">{items.map(l => <Card key={l.id} l={l} p={data.people.find(p => p.id === l.owner_id)} w={data.works.find(w => w.listing_id === l.id && w.image_path)} image={data.images.find(im => im.listing_id === l.id && im.is_cover) || data.images.find(im => im.listing_id === l.id)} />)}</div>;
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
  const { t, go, lang, user } = useSite();
  const hierarchy = useCategories();
  const s = useData(() => catalog('service'), 'home-service');
  const p = useData(() => catalog('project'), 'home-project');
  const featured = s.data?.works.find(w => w.image_path && s.data!.list.some(l => l.id === w.listing_id));
  const featuredListing = s.data?.list.find(x => x.id === featured?.listing_id);
  const roots = (hierarchy.data || []).filter(c => !c.parent_id && c.active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const counts = (id:string) => (hierarchy.data || []).filter(node => node.active && node.id !== id && categoryParents(hierarchy.data || [], node.id).includes(id)).length;
  return <div className="rg-home">
    <section className="rg-hero-zone" aria-labelledby="rg-hero-title">
      <div className="rg-hero-grid" aria-hidden="true" />
      <div className="wrap rg-hero-layout">
        <div className="rg-hero-copy">
          <div className="rg-kicker"><span className="rg-kicker-light" />REVLORD GROUP <span className="rg-kicker-rule" /> {t('PLATFORMA ZA DIGITALNE TALENTE','DIGITAL TALENT PLATFORM')}</div>
          <h1 id="rg-hero-title">{t('Prave veštine.','The right skills.')}<br /><span className="rg-neon-heading">{t('Velike ideje.','Big ideas.')}</span></h1>
          <p className="rg-hero-lead">{t('Pronađi developere, dizajnere i gaming kreatore. Ili pokaži svetu šta umeš — direktno, brzo i na jednom mestu.','Find developers, designers and gaming creators. Or show the world what you can do — directly, simply, in one place.')}</p>
          <div className="rg-hero-actions">
            <Link to="/services" className="primary rg-hero-main-cta">{t('Pronađi stručnjaka','Find a specialist')} <Icon name="arrow-up-right" size={18}/></Link>
            <Link to="/new/service" className="rg-outline-cta">{t('Ponudi svoje veštine','Offer your skills')} <Icon name="chevron" size={16}/></Link>
          </div>
          <div className="rg-hero-search"><Search search={q => go('/services?q=' + encodeURIComponent(q))} /></div>
          <div className="rg-hero-tags"><small>{t('Popularne oblasti','Explore skills')}</small>{['Roblox','FiveM','React','Blender'].map(tag => <Link key={tag} to={'/services?q=' + encodeURIComponent(tag)}>{tag} <span>↗</span></Link>)}</div>
        </div>
        <div className="rg-hero-art-wrap">
          <div className="rg-art-glow" aria-hidden="true"/>
          <article className="rg-hero-art">
            {featured && featuredListing
              ? <Link className="rg-hero-art-image" to={pathOf(featuredListing)}><SignedImage path={featured.image_path} alt={featured.title}/></Link>
              : <img className="rg-hero-art-image" src="/art/revlord-world.jpg" alt={t('Ilustracija digitalnog sveta RevLord Group','RevLord Group digital world illustration')} />}
            <div className="rg-art-top"><span className="rg-art-status"><i/> {t('KREATIVNOST BEZ GRANICA','CREATE WITHOUT LIMITS')}</span><span className="rg-art-index">RG / 01</span></div>
            <div className="rg-art-caption"><span>{featuredListing ? t('IZ ISTAKNUTOG PORTFOLIJA','FEATURED PORTFOLIO') : 'REVLORD GROUP / DIGITAL SERVICES'}</span>
              <h2>{featured && featuredListing ? featured.title : t('Poveži ideju sa talentom.','Connect ideas with talent.')}</h2>
              <p>{featuredListing ? featuredListing.specialty : t('Gaming • Razvoj • Dizajn • Digitalne usluge','Gaming • Development • Design • Digital services')}</p>
            </div>
          </article>
          <div className="rg-art-stamp" aria-hidden="true"><Icon name="sparkles" size={24}/><span>BUILD<br/>CREATE<br/>CONNECT</span></div>
        </div>
      </div>
      <div className="wrap rg-hero-underbar"><span><Icon name="check" size={16}/>{t('Direktna komunikacija','Direct messaging')}</span><span><Icon name="check" size={16}/>{t('Portfolio i specijalizacije','Portfolios & specialties')}</span><span><Icon name="check" size={16}/>{t('Oglasi za poslove i usluge','Jobs & services in one place')}</span></div>
    </section>

    <section className="wrap rg-discover" id="disciplines">
      <div className="rg-section-heading"><div><p className="rg-section-eyebrow">01 / {t('ISTRAŽI OBLASTI','EXPLORE DISCIPLINES')}</p><h2>{t('Sve što ti treba,','Whatever you need,')}<br/><span>{t('na jednom mestu.','all in one place.')}</span></h2></div><Link className="rg-section-all" to="/services">{t('Sve kategorije','All categories')} <Icon name="arrow-up-right" size={18}/></Link></div>
      {!hierarchy.data ? <Wait error={hierarchy.error} /> : roots.length ? <div className="rg-discipline-grid">{roots.map((node, index) => <Link key={node.id} to={'/services?cat=' + encodeURIComponent(node.id)} className={'rg-discipline-card rg-discipline-'+node.id}>
        <span className="rg-disc-head"><span className="rg-disc-icon"><Icon name={node.icon} size={24}/></span><small>{String(index+1).padStart(2,'0')}</small></span>
        <strong>{categoryTitle(node,lang)}</strong><span className="rg-disc-footer"><span>{counts(node.id)} {t('specijalizacija','specialties')}</span><Icon name="arrow-up-right" size={18}/></span>
      </Link>)}</div> : <p className="empty">{t('Trenutno nema kategorija.','No categories are available yet.')}</p>}
    </section>

    <section className="rg-how-band" id="about"><div className="wrap">
      <div className="rg-section-heading"><div><p className="rg-section-eyebrow">02 / {t('KAKO FUNKCIONIŠE','HOW IT WORKS')}</p><h2>{t('Jednostavno od početka','Simple from the start')}<br/><span>{t('do dogovora.','to the final agreement.')}</span></h2></div><p className="rg-section-description">{t('Bilo da tražiš nekoga za projekat ili želiš nove klijente, ovde počinje saradnja.','Whether you need someone for a project or want to find new clients, collaboration starts here.')}</p></div>
      <div className="rg-steps">
        <article><span className="rg-step-number">01</span><span className="rg-step-icon"><Icon name="search" size={25}/></span><h3>{t('Pronađi ili objavi','Explore or post')}</h3><p>{t('Pregledaj specijalizacije ili objavi posao sa jasnim opisom.','Browse specialties or publish a job with a clear brief.')}</p></article>
        <article><span className="rg-step-number">02</span><span className="rg-step-icon"><Icon name="mail" size={25}/></span><h3>{t('Razgovaraj direktno','Connect directly')}</h3><p>{t('Postavi pitanja i dogovori detalje sa drugom stranom u porukama.','Ask questions and agree on details through on-site messages.')}</p></article>
        <article><span className="rg-step-number">03</span><span className="rg-step-icon"><Icon name="sparkles" size={25}/></span><h3>{t('Pokreni saradnju','Make it happen')}</h3><p>{t('Pregledaj portfolio, dogovori obim posla i kreni sa projektom.','Review portfolios, agree on the scope, and get started.')}</p></article>
      </div>
    </div></section>

    <div className="wrap rg-home-listings">
      {[s,p].map((query,i) => <section className="rg-listings-band" key={i}>
        <div className="rg-section-heading"><div><p className="rg-section-eyebrow">0{i+3} / {i ? t('PRILIKE ZA RAD','OPEN OPPORTUNITIES') : t('ISTRAŽI RADOVE','DISCOVER TALENT')}</p><h2>{i ? t('Otvoreni poslovi','Jobs to explore') : t('Usluge i portfoliji','Services & portfolios')}</h2></div><Link className="rg-section-all" to={i ? '/projects' : '/services'}>{t('Pogledaj sve','View all')} <Icon name="arrow-up-right" size={18}/></Link></div>
        {!query.data ? <Wait error={query.error}/> : query.data.list.length ? <Cards data={query.data} items={query.data.list.slice(0,3)}/> : <Empty project={!!i}/>}
      </section>)}
    </div>
    <section className="wrap rg-final-cta"><div className="rg-final-orb" aria-hidden="true"/><p className="rg-section-eyebrow">REVLORD GROUP / {t('ZAPOČNI DANAS','GET STARTED')}</p><h2>{t('Sledeći veliki projekat','Your next big project')}<br/><span>{t('počinje ovde.','starts right here.')}</span></h2><p>{t('Postavi oglas za saradnju ili predstavi svoje veštine i portfolio.','Post a job or showcase your skills and portfolio.')}</p><div className="rg-final-actions"><Link className="primary" to="/new/project">{t('Napravi oglas za posao','Post a job')} <Icon name="arrow-up-right" size={17}/></Link><Link className="rg-outline-cta" to="/new/service">{t('Ponudi svoje veštine','Offer your skills')}</Link></div></section>
  </div>;
}
export function Browse({kind}: {kind: 'service' | 'project'}) {
  const { url, t, go, lang } = useSite();
  const q = url.searchParams;
  const data = useData(() => catalog(kind), 'catalog-' + kind);
  const hierarchy = useCategories();
  const nodes = hierarchy.data || [];
  const [categorySearch, setCategorySearch] = useState('');
  const [draftMin, setDraftMin] = useState(q.get('min') || '');
  const [draftMax, setDraftMax] = useState(q.get('max') || '');
  useEffect(() => {setCategorySearch('');}, [q.get('cat')]);
  useEffect(() => {setDraftMin(q.get('min') || '');setDraftMax(q.get('max') || '');}, [q.get('min'),q.get('max')]);
  const selected = q.get('cat') || q.get('category') || '';
  const current = nodes.find(n => n.id === selected);
  const ancestors = selected ? categoryParents(nodes, selected) : [];
  const children = nodes.filter(n => n.active && n.parent_id === (selected || null))
    .sort((a,b) => a.sort_order-b.sort_order || a.name_sr.localeCompare(b.name_sr));
  const visibleChildren = children.filter(n => normalize(n.name_sr + ' ' + n.name_en).includes(normalize(categorySearch)));
  const filterCount = ['cat','q','min','max','currency','type','free'].filter(key => q.has(key)).length;
  const legacyRoot = (c: string) => c === 'web' || c === 'scripting' ? 'development' : c;
  function filter(k: string, v: string) {
    const next = new URLSearchParams(q);
    if (v) next.set(k, v); else next.delete(k);
    if (k === 'cat') next.delete('category');
    go(url.pathname + (next.size ? '?' + next : ''));
  }
  const numericMax = q.get('max') && Number(q.get('max'));
  const numericMin = q.get('min') && Number(q.get('min'));
  const list = (data.data?.list || []).filter(l => {
    const person = data.data?.people.find(x => x.id === l.owner_id);
    const search = normalize([l.title,l.body,l.tags,l.specialty,l.category,person?.name].join(' '));
    const words = normalize(q.get('q') || '').split(/\s+/).filter(Boolean);
    // Old listings have no category_id. Keep them searchable by their existing title/tags/specialty;
    // no automatic database reclassification or invented subcategory is applied.
    const possibleRoots = [legacyRoot(l.category)];
    if (['development','scripting','web'].includes(l.category) && /roblox|fivem|minecraft|unity|unreal|sa-mp|open\.mp|godot|gaming|game developer/i.test(search)) possibleRoots.push('gaming');
    const currentName = normalize(categoryTitle(current,'sr'));
    const meaningful = currentName.split(/\W+/).filter(x=>x.length>=4);
    const matchesNode = !selected || (l.category_id
      ? categoryParents(nodes, l.category_id).includes(selected)
      : (ancestors.length === 1 ? possibleRoots.includes(selected)
        : possibleRoots.includes(ancestors[0]) && meaningful.some(x=>search.includes(x))));
    return matchesNode && words.every(x => search.includes(x))
      && (!q.get('currency') || l.currency === q.get('currency'))
      && (!q.get('type') || l.job_type === q.get('type'))
      && (!numericMin || l.price !== null && l.price >= numericMin)
      && (!numericMax || l.price !== null && l.price <= numericMax)
      && (!q.has('free') || data.data?.slots.some(slot => slot.owner_id === l.owner_id && Date.parse(slot.starts_at) > Date.now()));
  }).sort((a,b) => q.get('sort') === 'oldest' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
  const reset = () => go(url.pathname);
  const applyBudget = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(q);
    if (draftMin && Number(draftMin) >= 0) params.set('min',draftMin); else params.delete('min');
    if (draftMax && Number(draftMax) >= 0) params.set('max',draftMax); else params.delete('max');
    go(url.pathname + (params.size?'?'+params:''));
  };
  return <section className="wrap page browse-page rg-browse">
    <div className="rg-browse-head"><div><p className="rg-section-eyebrow">REVLORD / {kind === 'service' ? t('STRUČNJACI','TALENT') : t('PROJEKTI','PROJECTS')}</p>
      <h1>{kind === 'service' ? t('Pronađi pravog stručnjaka','Find your next specialist') : t('Poslovi koji čekaju tebe','Find your next project')}</h1>
      <p>{kind === 'service' ? t('Odaberi oblast, pronađi talenat i dogovori saradnju direktno.','Choose a discipline, find talent and get in touch directly.') : t('Pronađi projekte koji odgovaraju tvojim veštinama.','Find projects that match your skills.')}</p></div>
      <div className="rg-browse-mode"><Link to="/services" className={kind==='service'?'is-active':''}><Icon name="sparkles" size={17}/>{t('Usluge','Services')}</Link><Link to="/projects" className={kind==='project'?'is-active':''}><Icon name="briefcase" size={17}/>{t('Poslovi','Jobs')}</Link></div>
    </div>
    <div className="browse-disciplines rg-browse-categories">
      <div className="section-title"><div><p className="rg-section-eyebrow">01 / {t('KATEGORIJE','CATEGORIES')}</p><h2>{selected ? categoryTitle(current,lang) : t('Istraži po oblastima','Explore by discipline')}</h2>
        <small>{selected ? t('Izaberi užu specijalizaciju ili pogledaj oglase ispod.','Choose a specialty or browse matching listings below.') : t('Odaberi oblast da suziš rezultate.','Choose a discipline to narrow the results.')}</small></div>
      {selected && <button className="rg-category-back" onClick={() => filter('cat', ancestors.at(-2) || '')}><Icon name="chevron" size={17}/> {t('Korak nazad','Go back')}</button>}</div>
      {selected && <div className="breadcrumbs"><button onClick={() => filter('cat','')}>{t('Sve oblasti','All disciplines')}</button>{ancestors.map(id => <React.Fragment key={id}><Icon name="chevron" size={13}/><button aria-current={id===selected ? 'page' : undefined} onClick={() => filter('cat',id)}>{categoryTitle(nodes.find(n=>n.id===id),lang)}</button></React.Fragment>)}</div>}
      {!hierarchy.data ? <Wait error={hierarchy.error}/> : <>
        {children.length>9 && <label className="rg-category-search"><Icon name="search" size={18}/><input value={categorySearch} onChange={e=>setCategorySearch(e.target.value)} placeholder={t('Pretraži specijalizacije…','Search specialties…')} aria-label={t('Pretraži specijalizacije','Search specialties')}/></label>}
        <div className="category-step-grid">{visibleChildren.map(node => <button key={node.id} className="category-step" onClick={() => filter('cat',node.id)}><span className="rg-step-icon-mini"><Icon name={node.icon} size={20}/></span><span>{categoryTitle(node,lang)}</span><Icon name="chevron" size={16}/></button>)}</div>
        {!visibleChildren.length && children.length>0 && <p className="empty">{t('Nema kategorija za ovu pretragu.','No specialties match this search.')}</p>}
        {!children.length && selected && <p className="rg-category-end"><Icon name="check" size={17}/>{t('Specijalizacija je izabrana — rezultati su ispod.','Specialty selected — see results below.')}</p>}
      </>}
    </div>
    <div className="rg-search-filters"><Search value={q.get('q') || ''} search={v => filter('q',v)}/>
      <details className="filters-drawer rg-filter-drawer"><summary><Icon name="sliders" size={19}/>{t('Napredni filteri','Advanced filters')}{filterCount>0 && <span className="rg-filter-count">{filterCount}</span>}<Icon name="down" size={18}/></summary>
        <div className="rg-filter-content">
          <form className="rg-budget-row" onSubmit={applyBudget}><label>{t('Budžet od','Budget from')}<input type="number" min="0" value={draftMin} onChange={e=>setDraftMin(e.target.value)} placeholder="0" /></label><label>{t('Budžet do','Budget up to')}<input type="number" min="0" value={draftMax} onChange={e=>setDraftMax(e.target.value)} placeholder="∞" /></label><button type="submit" className="secondary">{t('Primeni','Apply')}</button></form>
          <div className="rg-filter-selects">
            <label>{t('Valuta','Currency')}<select value={q.get('currency') || ''} onChange={e=>filter('currency',e.target.value)}><option value="">{t('Sve valute','All currencies')}</option>{['EUR','USD','RSD','GBP'].map(c=><option key={c}>{c}</option>)}</select></label>
            <label>{t('Tip posla','Job type')}<select value={q.get('type') || ''} onChange={e=>filter('type',e.target.value)}><option value="">{t('Svi tipovi','All types')}</option>{[['fixed','Fiksni budžet','Fixed'],['hourly','Po satu','Hourly'],['oneoff','Jednokratno','One-off'],['ongoing','Dugoročno','Ongoing']].map(([v,sr,en])=><option key={v} value={v}>{t(sr,en)}</option>)}</select></label>
            <label>{t('Sortiranje','Sort by')}<select value={q.get('sort') || 'newest'} onChange={e=>filter('sort',e.target.value)}><option value="newest">{t('Najnoviji','Newest first')}</option><option value="oldest">{t('Najstariji','Oldest first')}</option></select></label>
          </div>
          {kind==='service' && <label className="rg-filter-check"><input type="checkbox" checked={q.has('free')} onChange={e=>filter('free',e.target.checked?'1':'')}/>{t('Samo stručnjaci sa slobodnim terminima','Only specialists with available times')}</label>}
          <button className="rg-filter-reset" type="button" onClick={reset}>{t('Resetuj sve filtere','Reset all filters')} ×</button>
        </div>
      </details>
    </div>
    <div className="rg-listings-results"><div className="rg-results-top"><span><Icon name="layers" size={18}/>{t('Pronađeno oglasa','Listings found')} <strong>{list.length}</strong></span>
      {filterCount>0 && <button className="rg-results-reset" onClick={reset}>{t('Očisti pretragu','Clear filters')} ×</button>}</div>
      <div className="rg-filter-chips">{Array.from(q.entries()).filter(([k])=>k!=='sort').map(([k,v]) => <button key={k} onClick={()=>filter(k,'')} aria-label={t('Ukloni filter ','Remove filter ') + k}>{k==='cat'?categoryTitle(current,lang):k==='q'?v:k==='currency'?v:k==='type'?v:k==='min'?t('Od ','From ')+v:k==='max'?t('Do ','To ')+v:t('Slobodni termini','Available times')} <span>×</span></button>)}</div>
      {!data.data ? <Wait error={data.error}/> : list.length ? <Cards data={data.data} items={list}/> : <div className="rg-no-results"><Icon name="search" size={30}/><h3>{t('Nema oglasa za izabrane uslove','No listings found for these filters')}</h3><p>{t('Probaj drugu oblast ili resetuj filtere.','Try another category or clear your filters.')}</p><button className="secondary" onClick={reset}>{t('Resetuj filtere','Clear filters')}</button><Link to={kind==='service'?'/new/service':'/new/project'} className="text-link">{kind==='service'?t('Ponudi svoje veštine','Offer your skills'):t('Objavi posao','Post a job')}</Link></div>}
    </div>
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
function ListingGallery({images, title}: {images: ListingImage[]; title:string}) {
  const {t} = useSite();
  const [active,setActive] = useState(0);
  const [zoom,setZoom] = useState(false);
  const ordered = [...images].sort((a,b) => Number(b.is_cover)-Number(a.is_cover) || a.position-b.position);
  const image = ordered[Math.min(active,ordered.length-1)];
  return <div className="listing-gallery">
    <button className="listing-cover-image" type="button" onClick={() => setZoom(true)} aria-label={t('Uvećaj sliku oglasa','Enlarge listing image')}><SignedImage bucket="listing-images" path={image.image_path} alt={title} /></button>
    {ordered.length>1 && <div className="listing-thumbs">{ordered.map((x,i) => <button type="button" key={x.id} aria-label={t('Slika','Image')+' '+(i+1)} aria-pressed={active===i} onClick={() => setActive(i)}><SignedImage bucket="listing-images" path={x.image_path} alt={title+' '+(i+1)}/></button>)}</div>}
    {zoom && <div className="image-zoom" role="dialog" aria-modal="true" aria-label={t('Slika oglasa','Listing image')}><button type="button" className="modal-close" onClick={() => setZoom(false)} aria-label={t('Zatvori','Close')}>×</button><SignedImage bucket="listing-images" path={image.image_path} alt={title}/></div>}
  </div>;
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
      <strong>{cost(l.price, t, l.currency)}</strong>
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
    const [ps, ws, imgs] = await Promise.all([db.rows('profiles', {
      id: l.owner_id
    }), db.rows('works', {
      listing_id: id
    }, '*', 'position'), db.rows('listing_images', {listing_id: id}, '*', 'position')]);
    return {
      l,
      p: ps[0],
      ws, imgs
    };
  }, kind + id + user?.id);
  if (q.data === undefined) return <div className="page wrap"><Wait error={q.error} /></div>;
  if (!q.data) return <Missing />;
  const {
    l,
    p,
    ws, imgs
  } = q.data;
  return <section className="wrap page">
    <Link className="crumb" to={kind === 'project' ? '/projects' : '/services'}>{kind === 'project' ? t('Otvoreni projekti', 'Open projects') : t('Sve usluge', 'All services')}</Link>
    <p className="eyebrow">{catName(l.category, t)} / {l.specialty}</p>
    <h1>{l.title}</h1>
    <div className="detail-grid">
      <div>
        {imgs.length > 0 && <ListingGallery images={imgs} title={l.title} />}
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
export function PublicProfile({ id }: {id:string}) {
  const {t,user} = useSite();
  const q=useData(async()=>{
    const [profiles,listings,works,portfolios,images]=await Promise.all([
      db.rows('profiles',{id}),db.rows('listings',{owner_id:id,status:'published'}),
      db.rows('works'),db.rows('portfolio_projects',{owner_id:id},'*','created_at'),db.rows('listing_images')
    ]);
    return {p:profiles[0],ls:listings,ws:works,portfolios,images};
  },'person'+id);
  if(!q.data) return <section className="page wrap"><Wait error={q.error}/></section>;
  const {p,ls,ws,portfolios,images}=q.data;
  if(!p) return <Missing/>;
  const links=[['GitHub',p.github_url],['Behance',p.behance_url],[t('Veb-sajt','Website'),p.website_url]].filter(([,v])=>safeLink(v));
  return <section className="wrap page profile-page">
    <div className="profile-cover">{p.cover ? <img src={db.avatar(p.cover)} alt=""/> : <span className="cover-placeholder"/>}
      <div className="profile-cover-avatar"><Avatar p={p}/></div></div>
    <div className="profile-head">
      <div><h1>{p.name || t('Autor','Creator')}</h1>{p.username && <p className="profile-handle">@{p.username}</p>}
        <span className={'availability '+(p.available?'yes':'')}>{p.available ? t('Dostupan za posao','Available for work') : t('Trenutno nedostupan','Currently unavailable')}</span></div>
      {user?.id===id && <div className="actions"><Link className="primary" to="/account/edit">{t('Uredi profil','Edit profile')}</Link>
        <Link className="secondary" to="/account/portfolio">{t('Dodaj projekat','Add project')}</Link></div>}
    </div>
    {p.bio && <p className="lead preserve">{p.bio}</p>}
    {p.about && <div className="profile-panel"><h2>{t('O meni','About me')}</h2><p className="preserve">{p.about}</p></div>}
    {!!p.skills?.length && <div className="profile-panel"><h2>{t('Veštine i specijalizacije','Skills and specialisations')}</h2><div className="skill-tags">{p.skills.map((s,i)=><span key={i}>{s}</span>)}</div></div>}
    {!!links.length && <div className="profile-links">{links.map(([name,href])=><a key={name} href={safeLink(href)} target="_blank" rel="noopener noreferrer">{name} ↗</a>)}</div>}
    <section className="band"><div className="section-title"><h2>Portfolio</h2>{user?.id===id && <Link className="text-link" to="/account/portfolio">{t('Upravljaj projektima','Manage projects')}</Link>}</div>
      {portfolios.length ? <div className="portfolio-grid">{portfolios.map(project=><article className="portfolio-card" key={project.id}>
        {project.image_paths[0] && <div className="portfolio-cover"><SignedImage path={project.image_paths[0]} alt={project.title}/></div>}
        <div className="portfolio-card-copy"><h3>{project.title}</h3><p className="preserve">{project.description}</p>
        {project.image_paths.length>1 && <div className="portfolio-thumbs">{project.image_paths.slice(1).map(path=><SignedImage key={path} path={path} alt={project.title}/>)}</div>}
        {safeLink(project.project_url) && <a className="text-link" href={safeLink(project.project_url)} target="_blank" rel="noopener noreferrer">{t('Pogledaj projekat','View project')} ↗</a>}</div>
      </article>)}</div> : <p className="empty">{t('Portfolio još nema projekata.','No portfolio projects yet.')}</p>}
    </section>
    <section className="band"><div className="section-title"><h2>{t('Objavljeni oglasi i usluge','Published listings and services')}</h2>{user?.id===id && <Link className="text-link" to="/new/service">{t('Dodaj uslugu','Add service')}</Link>}</div>
      {ls.length ? <div className="cards">{ls.map(l=><Card key={l.id} l={l} p={p} w={ws.find(w=>w.listing_id===l.id && w.image_path)} image={images.find(im=>im.listing_id===l.id && im.is_cover)||images.find(im=>im.listing_id===l.id)}/>)}</div> : <p className="empty">{t('Još nema objavljenih oglasa.','No published listings yet.')}</p>}
    </section>
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
