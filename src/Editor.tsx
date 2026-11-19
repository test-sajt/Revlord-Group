import React, { useState } from 'react';
import * as db from './db';
import { safeLink, videoEmbed } from './data';
import type { Listing, Work } from './types';
import { CategoryTrail, categoryTitle, field, Field, Form, Link, SignedImage, Task, useCategories, useData, useSite, Wait } from './ui';
import { Missing, pathOf } from './Catalog';
// Nacrti i objave koriste isti obrazac. Tek izbor javnog statusa prikazuje oglas u katalogu.
export function Editor({
  id,
  kind
}: {
  id?: string;
  kind: 'service' | 'project';
}) {
  const {
    user
  } = useSite();
  const q = useData(async () => id ? (await db.rows('listings', {
    id,
    owner_id: user!.id
  }))[0] || null : null, 'edit' + id + user?.id);
  if (q.data === undefined) return <div className="wrap page"><Wait error={q.error} /></div>;
  if (id && !q.data) return <Missing />;
  return <EditForm l={q.data} kind={q.data?.kind || kind} />;
}
function PendingImages({ files, onRemove }: {files: File[]; onRemove: (i:number)=>void}) {
  const [urls, setUrls] = useState<string[]>([]);
  React.useEffect(() => {
    const next = files.map(f => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach(u => URL.revokeObjectURL(u));
  }, [files]);
  return <>{files.map((f,i) => <div className="image-tile" key={i}>
    {urls[i] && <img src={urls[i]} alt={f.name} />}
    <button type="button" onClick={() => onRemove(i)}>×</button>
    <small>{f.name}</small>
  </div>)}</>;
}
function DraftCover({file,path,title}:{file?:File;path?:string;title:string}) {
  const [src,setSrc]=useState('');
  React.useEffect(()=>{
    if(!file) {setSrc('');return;}
    const url=URL.createObjectURL(file);setSrc(url);
    return ()=>URL.revokeObjectURL(url);
  },[file]);
  return file ? <div className="listing-preview-image">{src && <img src={src} alt={title}/>}</div> : path ?
    <div className="listing-preview-image"><SignedImage bucket="listing-images" path={path} alt={title}/></div> : null;
}
function EditForm({l,kind}:{l:Listing|null;kind:'service'|'project'}) {
  const ctx=useSite(); const {t,go,user}=ctx;
  const hierarchy=useCategories();
  const initialRoot=l?.category === 'web' || l?.category === 'scripting' ? 'development' : (l?.category || ctx.url.searchParams.get('category') || ctx.me?.category || 'development');
  const [root,setRoot]=useState(initialRoot);
  const [node,setNode]=useState(l?.category_id || ctx.url.searchParams.get('cat') || initialRoot);
  const [files,setFiles]=useState<File[]>([]);
  const [removed,setRemoved]=useState<string[]>([]);
  const [cover,setCover]=useState<string | null>(null);
  const [showPreview,setShowPreview]=useState(false);
  const [previewTitle,setPreviewTitle]=useState(l?.title||'');
  const [previewBody,setPreviewBody]=useState(l?.body||'');
  const images=useData(() => l ? db.rows('listing_images',{listing_id:l.id},'*','position') : Promise.resolve([]), 'edit-images-'+l?.id);
  const originals=(images.data || []).filter(im => !removed.includes(im.id));
  const count=originals.length+files.length;
  const chosenCover=cover || (originals.find(x=>x.is_cover) ? 'old:'+originals.find(x=>x.is_cover)!.id : originals[0] ? 'old:'+originals[0].id : files.length ? 'new:0' : null);
  const activeNode=hierarchy.data?.find(x=>x.id===node);
  const title=activeNode && activeNode.parent_id ? categoryTitle(activeNode,ctx.lang) : '';
  async function save(f: FormData) {
    if (!user) throw Error('FORBIDDEN');
    if (count>5) throw Error(t('Najviše pet slika po oglasu.','Maximum five images per listing.'));
    const ref=field(f,'reference');
    if (ref && !safeLink(ref)) throw Error(t('Unesi HTTPS adresu reference.','Enter an HTTPS reference URL.'));
    const status=field(f,'status') as Listing['status'];
    const body=field(f,'body');
    if (status!=='draft' && body.length<10) throw Error(t('Opis mora imati najmanje 10 znakova.','Description must have at least 10 characters.'));
    if (files.some(x=>!['image/jpeg','image/png','image/webp'].includes(x.type) || x.size>4194304 || x.size===0)) throw Error('IMAGE');
    const data: Partial<Listing>={title:field(f,'title'),body,category:l && ['web','scripting'].includes(l.category) && node==='development' ? l.category : root,
      category_id:l && !l.category_id && node==='development' && ['web','scripting'].includes(l.category) ? null : node||root,
      specialty:title || field(f,'spec'),tags:field(f,'tags'),
      price:field(f,'price') ? Number(field(f,'price')) : null,
      currency:field(f,'currency') as Listing['currency'],
      job_type:field(f,'job_type') as Listing['job_type'],
      deadline:field(f,'deadline')||null,reference_url:ref};
    // A new advertisement is kept as a draft until the uploads and image records succeed.
    const item=l ? await db.update('listings',l.id,data) : await db.insert('listings',{
      ...data, status:'draft',owner_id:user.id,kind
    });
    const uploaded:string[]=[];
    try {
      for (const f of files) uploaded.push(await db.upload('listing-images',user.id+'/'+item.id+'/'+crypto.randomUUID(),f));
      const galleryPaths=[...originals.map(im=>im.image_path),...uploaded];
      const coverPath=chosenCover?.startsWith('old:') ? originals.find(im=>im.id===chosenCover.slice(4))?.image_path :
        chosenCover?.startsWith('new:') ? uploaded[Number(chosenCover.slice(4))] : galleryPaths[0];
      await db.rpc('save_listing_gallery',{listing:item.id,paths:galleryPaths,cover_path:coverPath || null});
      if (status !== item.status) await db.update('listings',item.id,{status});
      for(const old of images.data || []) if(removed.includes(old.id)) await db.dropFile('listing-images',old.image_path).catch(()=>{});
    } catch (e) {
      // The SQL gallery transaction is atomic. A draft stays for a new listing if upload fails.
      // Uploaded media is kept if it may have been committed; no existing image is deleted on failure.
      if(!l) { ctx.refresh(); go('/edit/'+item.id); }
      throw e;
    }
    ctx.refresh(); go(pathOf({...item,status}));
  }
  return <section className="wrap page narrow">
    <p className="eyebrow">{kind==='service' ? t('Usluge','Services') : t('Projekti','Projects')}</p>
    <h1>{l ? t('Uredi oglas','Edit listing') : kind==='service' ? t('Predstavi svoju uslugu','List your service') : t('Objavi projekat','Post a project')}</h1>
    <Form label={t('Sačuvaj izmene','Save changes')} save={save}>
      <label>{t('Naziv oglasa','Listing title')}<input name="title" required maxLength={150} value={previewTitle} onChange={e=>setPreviewTitle(e.target.value)} /></label>
      <label>{kind==='project' ? t('Šta želiš da se napravi?','What do you need built?') : t('Detaljan opis usluge','Describe your service')}<textarea rows={6} name="body" maxLength={12000} value={previewBody} onChange={e=>setPreviewBody(e.target.value)} /></label>
      {!hierarchy.data ? <Wait error={hierarchy.error}/> : <CategoryTrail nodes={hierarchy.data} root={root} onRootChange={r=>{setRoot(r);setNode(r);}} value={node} onChange={setNode}/>}
      <Field name="spec" value={l?.specialty || ctx.url.searchParams.get('spec') || ctx.me?.specialty} label={t('Dodatna specijalizacija (ako nije izabrana)','Additional specialisation (if not selected)')}/>
      <Field name="tags" value={l?.tags} label={t('Veštine i alati (odvojeni zarezom)','Skills and tools (comma separated)')}/>
      <div className="two-fields"><Field name="price" type="number" min="0" value={l?.price} label={t('Budžet / cena','Budget / price')}/>
        <label>{t('Valuta','Currency')}<select name="currency" defaultValue={l?.currency || 'EUR'}>{['EUR','USD','RSD','GBP'].map(x=><option key={x}>{x}</option>)}</select></label></div>
      <label>{t('Tip posla','Job type')}<select name="job_type" defaultValue={l?.job_type || 'fixed'}>{[['fixed','Fiksni budžet','Fixed'],['hourly','Po satu','Hourly'],['oneoff','Jednokratno','One-off'],['ongoing','Dugoročno','Ongoing']].map(([v,sr,en])=><option key={v} value={v}>{t(sr,en)}</option>)}</select></label>
      <Field name="deadline" type="date" value={l?.deadline} label={t('Rok (opciono)','Deadline (optional)')}/>
      <Field name="reference" type="url" value={l?.reference_url} label={t('HTTPS referenca (opciono)','HTTPS reference (optional)')}/>
      <div className="upload-section"><h2>{t('Slike oglasa','Listing images')} ({count}/5)</h2>
        <p>{t('Naslovna slika se prikazuje u pretrazi. Do pet JPG, PNG ili WebP slika, svaka najviše 4 MB.','Cover appears in search. Up to five JPG, PNG or WebP files, each max 4 MB.')}</p>
        {l && !images.data && <Wait error={images.error}/>}
        <div className="upload-grid">
          {originals.map(im=><div className="image-tile" key={im.id}>
            <SignedImage bucket="listing-images" path={im.image_path} alt={t('Slika oglasa','Listing image')}/>
            <button type="button" title={t('Ukloni','Remove')} aria-label={t('Ukloni sliku','Remove image')} onClick={()=>{setRemoved(prev=>[...prev,im.id]); if(chosenCover==='old:'+im.id)setCover(null);}}>×</button>
            <label className="cover-radio"><input type="radio" name="cover_choice" checked={chosenCover==='old:'+im.id} onChange={()=>setCover('old:'+im.id)}/>{t('Naslovna','Cover')}</label>
          </div>)}
          {files.map((file,i)=><div key={i} className="new-image-choice"><PendingImages files={[file]} onRemove={()=>{setFiles(fs=>fs.filter((_,j)=>j!==i));setCover(null);}} />
            <label className="cover-radio"><input type="radio" name="cover_choice" checked={chosenCover==='new:'+i} onChange={()=>setCover('new:'+i)}/>{t('Naslovna','Cover')}</label>
          </div>)}
        </div>
        <label>{t('Dodaj ili zameni slike','Add or replace images')}
          <input type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={count>=5} onChange={e=>{
            const chosen=Array.from(e.target.files||[]);
            if(chosen.some(x=>x.size>4194304 || !['image/png','image/jpeg','image/webp'].includes(x.type))) {window.alert(t('Slike moraju biti JPG, PNG ili WebP i do 4 MB.','Images must be JPG, PNG or WebP and up to 4 MB.'));e.target.value='';return;}
            if(count+chosen.length>5) {window.alert(t('Najviše pet slika.','Maximum five images.'));e.target.value='';return;}
            setFiles(old=>[...old,...chosen]);e.target.value='';
          }}/></label>
      </div>
      <label>{t('Vidljivost','Visibility')}<select name="status" defaultValue={l?.status||'draft'}>
        <option value="draft">{t('Privatan nacrt','Private draft')}</option><option value="published">{t('Javno objavljeno','Published publicly')}</option>{l && <option value="closed">{t('Zatvoreno','Closed')}</option>}
      </select></label>
      <button type="button" className="secondary" onClick={()=>setShowPreview(x=>!x)}>{showPreview ? t('Sakrij pregled','Hide preview') : t('Pregled pre objavljivanja','Preview before publishing')}</button>
      {showPreview && <article className="listing-preview">
        <DraftCover title={previewTitle} file={chosenCover?.startsWith('new:') ? files[Number(chosenCover.slice(4))] : undefined}
          path={chosenCover?.startsWith('old:') ? originals.find(x=>x.id===chosenCover.slice(4))?.image_path : undefined}/>
        <p className="meta">{root} / {title}</p><h3>{previewTitle || t('Naziv oglasa','Listing title')}</h3><p className="preserve">{previewBody}</p><p>{t('Slike','Images')}: {count}</p></article>}
    </Form>
    {l && <div className="band">
      <div className="actions"><Link className="text-link" to={pathOf(l)}>{t('Pogledaj oglas','View listing')}</Link>
        <Task className="secondary" run={async()=>{
          if(!confirm(t('Trajno obrisati oglas? Povezane prijave, rezervacije ili razgovori moraju se sačuvati; takve oglase zatvori umesto brisanja.','Delete this listing permanently? Listings with related proposals, bookings or conversations should be closed instead.')))return;
          await db.remove('listings',l.id);
          for(const im of images.data||[]) await db.dropFile('listing-images',im.image_path).catch(()=>{});
          ctx.refresh();go('/panel');
        }}>{t('Obriši oglas','Delete listing')}</Task></div>
      {kind==='service' && <WorksEditor listing={l} />}
    </div>}
  </section>;
}
function WorksEditor({
  listing
}: {
  listing: Listing;
}) {
  const ctx = useSite(),
    {
      t
    } = ctx;
  const [edit, setEdit] = useState<Work | null>(null),
    [formKey, reset] = useState(0);
  const q = useData(() => db.rows('works', {
    listing_id: listing.id
  }, '*', 'position'), 'editor-works' + listing.id);
  async function move(id: string, d: number) {
    await db.rpc('move_work', {
      work: id,
      direction: d
    });
    ctx.refresh();
  }
  return <section>
    <h2>Portfolio</h2>
    {!q.data ? <Wait error={q.error} /> : q.data.map((w, i) => <div className="manage-row" key={w.id}>
      {w.image_path && <SignedImage path={w.image_path} alt={w.title} />}
      <b>{w.title}</b>
      <div className="actions">
        <button onClick={() => setEdit(w)}>{t('Izmeni', 'Edit')}</button>
        <Task className="secondary" disabled={!i} run={() => move(w.id, -1)}>↑</Task>
        <Task className="secondary" disabled={i === q.data!.length - 1} run={() => move(w.id, 1)}>↓</Task>
        <Task className="secondary" run={async () => {
          if (!confirm(t('Ukloniti ovaj rad iz portfolija?', 'Remove this work from the portfolio?'))) return;
          await db.remove('works', w.id);
          if (w.image_path) await db.dropFile('portfolio', w.image_path);
          if (edit?.id === w.id) setEdit(null);
          ctx.refresh();
        }}>{t('Ukloni', 'Remove')}</Task>
      </div>
    </div>)}
    <h3>{edit ? t('Izmeni rad', 'Edit work') : t('Dodaj rad', 'Add work')}</h3>
    <Form key={(edit?.id || 'new') + formKey} label={t('Sačuvaj rad', 'Save work')} save={async f => {
      const file = f.get('image') as File;
      const video = field(f, 'video');
      if (video && !videoEmbed(video)) throw Error(t('Unesi YouTube ili Vimeo link ka videu.', 'Enter a YouTube or Vimeo video URL.'));
      let image = edit?.image_path || '';
      if (file.size) image = await db.upload('portfolio', listing.owner_id + '/' + listing.id + '/' + crypto.randomUUID(), file);
      if (!video && !image) throw Error(t('Dodaj sliku ili video.', 'Add an image or a video.'));
      const data = {
        title: field(f, 'title'),
        contribution: field(f, 'contribution'),
        video,
        image_path: image
      };
      try {
        if (edit) await db.update('works', edit.id, data);else await db.insert('works', {
          ...data,
          listing_id: listing.id,
          position: (q.data?.at(-1)?.position ?? 0) + 1
        });
      } catch (e) {
        if (file.size) await db.dropFile('portfolio', image);
        throw e;
      }
      if (edit?.image_path && edit.image_path !== image) await db.dropFile('portfolio', edit.image_path);
      setEdit(null);
      reset(x => x + 1);
      ctx.refresh();
    }}>
      <Field required maxLength={150} name="title" value={edit?.title} label={t('Naziv rada', 'Work title')} />
      <Field name="contribution" type="textarea" value={edit?.contribution} label={t('Opis rada i tvoj doprinos', 'Description and your contribution')} />
      <label>
        {t('Slika (do 4 MB)', 'Image (up to 4 MB)')}
        <input type="file" name="image" accept="image/png,image/jpeg,image/webp" />
      </label>
      <Field name="video" type="url" value={edit?.video} label="YouTube / Vimeo" />
    </Form>
    {edit && <button onClick={() => setEdit(null)}>{t('Otkaži izmenu', 'Cancel edit')}</button>}
  </section>;
}
