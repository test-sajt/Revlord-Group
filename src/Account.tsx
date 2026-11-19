import React, { useEffect, useRef, useState } from 'react';
import * as db from './db';
import { categories, internal } from './data';
import { useSite, Task, Form, Field, field, Wait, CategoryTrail, categoryParents, categoryTitle, useCategories, SignedImage, Avatar, Link, useData } from './ui';
export function Login() {
  const {
    t,
    go,
    user
  } = useSite();
  const [mode, setMode] = useState('signin'),
    [note, setNote] = useState('');
  const reset = location.pathname === '/auth/reset';
  const modes = [['signin', t('Prijava', 'Log in')], ['signup', t('Registracija', 'Register')], ['recover', t('Oporavak', 'Recover password')]];
  if (user && !reset) return <section className="page wrap narrow">
    <h1>{t('Moj nalog', 'My account')}</h1>
    <Link to="/panel" className="primary">{t('Otvori panel', 'Open dashboard')}</Link>
  </section>;
  return <section className="wrap page narrow">
    <p className="eyebrow">REVLORD GROUP</p>
    <h1>{reset ? t('Nova lozinka', 'New password') : t('Dobro došli.', 'Welcome.')}</h1>
    {!reset && <Task run={db.google}>{t('Nastavi sa Google nalogom', 'Continue with Google')}</Task>}
    {(db.emailEnabled || reset) && <>
      <div className="tabs">{!reset && modes.map(([m, l]) => <button key={m} aria-pressed={mode === m} onClick={() => {
          setMode(m);
          setNote('');
        }}>{l}</button>)}</div>
      <Form key={mode} label={reset ? t('Sačuvaj novu lozinku', 'Save new password') : modes.find(a => a[0] === mode)![1]} save={async f => {
        await db.email(reset ? 'reset' : mode, field(f, 'email'), String(f.get('password') || ''));
        if (reset || mode === 'signin') go(internal(sessionStorage.getItem('rg-return')));else setNote(t('Proveri sanduče i otvori link u istom pregledaču.', 'Check your inbox and open the link in this browser.'));
      }}>{!reset && <Field type="email" required name="email" label={t('Imejl adresa', 'Email address')} />}{(reset || mode !== 'recover') && <label>
          {t('Lozinka', 'Password')}
          <input name="password" type="password" required minLength={mode === 'signup' || reset ? 8 : 1} autoComplete={mode === 'signin' && !reset ? 'current-password' : 'new-password'} />
        </label>}</Form>
      {note && <p role="status">{note}</p>}
    </>}
  </section>;
}
// Jednokratni kod razmenjujemo za sesiju u pregledaču koji je započeo PKCE prijavu.
export function Callback({
  reset
}: {
  reset: boolean;
}) {
  const {
    t,
    go
  } = useSite();
  const [error, setError] = useState(''),
    [ready, setReady] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const p = new URLSearchParams(location.search),
        code = p.get('code');
      if (p.has('error')) throw Error(p.get('error_description') || 'OAuth');
      if (code) await db.callback(code);
      if (!(await db.session())) throw Error(t('Link je istekao. Ponovi prijavu u istom pregledaču.', 'This link has expired. Sign in again in this browser.'));
      if (reset) {
        history.replaceState(null, '', '/auth/reset');
        setReady(true);
      } else go(internal(sessionStorage.getItem('rg-return')));
    })().catch(e => setError(e.message));
  }, []);
  if (ready) return <Login />;
  return <section className="wrap page">{error ? <>
      <p role="alert">{error}</p>
      <Link to="/login">{t('Povratak na prijavu', 'Return to sign in')}</Link>
    </> : <Wait />}</section>;
}
export function Preferences() {
  const ctx=useSite(); const {me,user,t,lang}=ctx;
  const hierarchy=useCategories();
  const [display,setDisplay]=useState(me?.name || '');
  const [step,setStep]=useState(0);
  const [intent,setIntent]=useState(me?.intent || 'both');
  const initialRoot=me?.category==='scripting'||me?.category==='web' ? 'development' : me?.category || 'development';
  const [root,setRoot]=useState(initialRoot);
  const [selected,setSelected]=useState(initialRoot);
  const nodes=hierarchy.data || [];
  async function finish(skip=false) {
    const path=categoryParents(nodes,selected);
    const spec=categoryTitle(nodes.find(x=>x.id===selected),lang);
    await db.update('profiles',user!.id,{
      name:display.trim()||me?.name||'',intent:skip?'both':intent,
      category:skip?'':root,branch:skip?'':(path[1]||''),
      specialty:skip?'':spec,onboarded:true
    });
    ctx.refreshMe();
    const next=sessionStorage.getItem('rg-return');sessionStorage.removeItem('rg-return');
    ctx.go(next ? internal(next) : skip ? '/panel' : intent==='expert' ? '/new/service?category='+encodeURIComponent(root)+'&cat='+encodeURIComponent(selected) : '/services?cat='+encodeURIComponent(selected));
  }
  return <section className="page wrap narrow" role="dialog" aria-labelledby="pref-title">
    <p className="eyebrow">{t('Podešavanje profila','Profile setup')} · {step+1}/2</p>
    <h1 id="pref-title">{step===0 ? t('Kako želiš da sarađuješ?','How would you like to work?') : t('Izaberi oblast i specijalizaciju','Choose discipline and specialisation')}</h1>
    <div className="draft">
      {step===0 ? <><label>{t('Javno ime','Public name')}<input maxLength={100} value={display} onChange={e=>setDisplay(e.target.value)}/></label>
      <div className="choices">{[['client',t('Tražim stručnjaka','Hire a specialist')],['expert',t('Nudim usluge','Offer services')],['both',t('Oboje','Both')]].map(([v,label])=><button key={v} aria-pressed={intent===v} onClick={()=>setIntent(v)}>{label}</button>)}</div></> :
      !hierarchy.data ? <Wait error={hierarchy.error}/> : <CategoryTrail nodes={nodes} root={root} value={selected} onRootChange={x=>{setRoot(x);setSelected(x);}} onChange={setSelected}/>}
      <div className="actions">{step>0 && <button onClick={()=>setStep(0)}>{t('Nazad','Back')}</button>}
        {step===0 ? <button className="primary" onClick={()=>setStep(1)}>{t('Nastavi','Continue')}</button> : <Task run={()=>finish()}>{t('Sačuvaj izbor','Save choices')}</Task>}
        <Task className="text-link" run={()=>finish(true)}>{t('Preskoči','Skip')}</Task>
      </div>
    </div>
  </section>;
}
export function ProfileEdit() {
  const {me,t,refreshMe,go}=useSite();
  if(!me) return <Wait/>;
  return <section className="wrap page narrow">
    <h1>{t('Uredi profil','Edit profile')}</h1>
    <div className="profile-cover compact">{me.cover ? <img src={db.avatar(me.cover)} alt=""/> : <span className="cover-placeholder"/>}<div className="profile-cover-avatar"><Avatar p={me}/></div></div>
    <Form label={t('Sačuvaj izmene','Save changes')} save={async f=>{
      const avatar=f.get('avatar') as File | null;
      const cover=f.get('cover') as File | null;
      for(const k of ['github_url','behance_url','website_url']) {const v=field(f,k);if(v && !/^https:\/\//i.test(v)) throw Error(t('Link mora početi sa https://','Link must start with https://'));}
      const username=field(f,'username');
      if(username && !/^[A-Za-z0-9_]{3,30}$/.test(username)) throw Error(t('Korisničko ime: 3–30 slova, brojeva ili _.','Username: 3–30 letters, numbers or _.'));
      let avatarPath=me.avatar, coverPath=me.cover;
      try {
        if(avatar?.size) avatarPath=await db.upload('avatars',me.id+'/avatar/'+crypto.randomUUID(),avatar);
        if(cover?.size) coverPath=await db.upload('avatars',me.id+'/cover/'+crypto.randomUUID(),cover);
        await db.update('profiles',me.id,{
          name:field(f,'name'),username,bio:field(f,'bio'),about:field(f,'about'),
          skills:field(f,'skills').split(',').map(x=>x.trim()).filter(Boolean).slice(0,30),
          github_url:field(f,'github_url'),behance_url:field(f,'behance_url'),website_url:field(f,'website_url'),
          available:f.get('available')==='on',avatar:avatarPath,cover:coverPath
        });
      } catch(e){
        if(avatarPath!==me.avatar) await db.dropFile('avatars',avatarPath).catch(()=>{});
        if(coverPath!==me.cover) await db.dropFile('avatars',coverPath).catch(()=>{});
        throw e;
      }
      if(me.avatar && avatarPath!==me.avatar) await db.dropFile('avatars',me.avatar).catch(()=>{});
      if(me.cover && coverPath!==me.cover) await db.dropFile('avatars',me.cover).catch(()=>{});
      refreshMe();go('/talent/'+me.id);
    }}>
      <Field name="name" required maxLength={100} label={t('Javno ime','Display name')} value={me.name}/>
      <Field name="username" maxLength={30} label={t('Korisničko ime (3–30 znakova)','Username (3–30 characters)')} value={me.username}/>
      <Field name="bio" type="textarea" maxLength={3000} label={t('Kratak opis','Short bio')} value={me.bio}/>
      <Field name="about" type="textarea" maxLength={8000} label={t('Detaljan opis o sebi','Detailed description')} value={me.about}/>
      <Field name="skills" label={t('Veštine i specijalizacije (odvojene zarezom)','Skills and specialisations (comma separated)')} value={me.skills?.join(', ') || ''}/>
      <div className="two-fields"><label>{t('Profilna slika, do 2 MB','Avatar, up to 2 MB')}<input type="file" name="avatar" accept="image/jpeg,image/png,image/webp"/></label>
        <label>{t('Cover / banner, do 2 MB','Cover / banner, up to 2 MB')}<input type="file" name="cover" accept="image/jpeg,image/png,image/webp"/></label></div>
      <label className="check"><input type="checkbox" name="available" defaultChecked={me.available}/>{t('Dostupan za posao','Available for work')}</label>
      <Field name="github_url" type="url" label="GitHub (HTTPS)" value={me.github_url}/>
      <Field name="behance_url" type="url" label="Behance (HTTPS)" value={me.behance_url}/>
      <Field name="website_url" type="url" label={t('Lični sajt (HTTPS)','Website (HTTPS)')} value={me.website_url}/>
    </Form>
    <div className="actions"><Link className="secondary" to="/account/portfolio">{t('Dodaj projekat u portfolio','Add portfolio project')}</Link><Link className="text-link" to="/preferences">{t('Izmeni interesovanja','Edit interests')}</Link></div>
  </section>;
}

export function PortfolioEditor(){
  const ctx=useSite();const {me,user,t}=ctx;
  const projects=useData(()=>db.rows('portfolio_projects',{owner_id:user!.id},'*','created_at'),'manage-portfolio-'+user?.id);
  const [editing,setEditing]=useState('');
  const current=projects.data?.find(p=>p.id===editing);
  const [files,setFiles]=useState<File[]>([]);
  const [removed,setRemoved]=useState<string[]>([]);
  const existing=(current?.image_paths || []).filter(p=>!removed.includes(p));
  const count=existing.length+files.length;
  async function save(f:FormData){
    if(count>5) throw Error(t('Najviše pet slika po projektu.','Maximum five images per project.'));
    const url=field(f,'project_url');if(url && !/^https:\/\//i.test(url)) throw Error('HTTPS required');
    const id=current?.id || crypto.randomUUID();
    const uploaded:string[]=[];
    try {
      for(const file of files){if(file.size>4194304 || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('IMAGE');
        uploaded.push(await db.upload('portfolio',user!.id+'/profile/'+id+'/'+crypto.randomUUID(),file));}
      const data={title:field(f,'title'),description:field(f,'description'),project_url:url,image_paths:[...existing,...uploaded]};
      if(current) await db.update('portfolio_projects',current.id,data);
      else await db.insert('portfolio_projects',{id,owner_id:user!.id,...data});
    } catch(e){for(const path of uploaded) await db.dropFile('portfolio',path).catch(()=>{});throw e;}
    for(const path of removed) await db.dropFile('portfolio',path).catch(()=>{});
    setEditing('');setRemoved([]);setFiles([]);ctx.refresh();
  }
  return <section className="wrap page narrow">
    <p className="eyebrow">REVLORD / PORTFOLIO</p>
    <h1>{t('Moji portfolio projekti','My portfolio projects')}</h1>
    <Link className="text-link" to={'/talent/'+user!.id}>{t('Moj javni profil','My public profile')}</Link>
    {!projects.data ? <Wait error={projects.error}/> : <div className="portfolio-manage-list">{projects.data.map(p=><div key={p.id} className="manage-row"><div><b>{p.title}</b><p>{p.description.slice(0,150)}</p></div><div className="actions"><button className="secondary" onClick={()=>{setEditing(p.id);setFiles([]);setRemoved([]);}}>{t('Uredi','Edit')}</button>
      <Task className="secondary" run={async()=>{if(!confirm(t('Obriši ovaj portfolio projekat?','Delete portfolio project?')))return;
        await db.remove('portfolio_projects',p.id);for(const path of p.image_paths) await db.dropFile('portfolio',path).catch(()=>{});ctx.refresh();}}>{t('Obriši','Delete')}</Task></div></div>)}</div>}
    <h2>{current ? t('Uredi projekat','Edit project') : t('Dodaj projekat','Add project')}</h2>
    <Form key={editing || 'new'} label={t('Sačuvaj projekat','Save project')} save={save}>
      <Field required maxLength={150} name="title" value={current?.title || ''} label={t('Naziv projekta','Project title')}/>
      <Field name="description" maxLength={8000} type="textarea" value={current?.description || ''} label={t('Opis i tvoj doprinos','Description and contribution')}/>
      <Field name="project_url" type="url" value={current?.project_url || ''} label={t('Link projekta (HTTPS)','Project URL (HTTPS)')}/>
      <p>{t('Galerija','Gallery')}: {count}/5</p>
      <div className="upload-grid">{existing.map(path=><div className="image-tile" key={path}><SignedImage path={path} alt="Portfolio"/><button type="button" onClick={()=>setRemoved(xs=>[...xs,path])}>×</button></div>)}
        {files.map((f,i)=><PortfolioPending key={i} file={f} onRemove={()=>setFiles(fs=>fs.filter((_,j)=>i!==j))}/>)}</div>
      <label>{t('Slike (do pet, po 4 MB)','Images (up to five, 4 MB each)')}<input type="file" multiple disabled={count>=5} accept="image/jpeg,image/png,image/webp" onChange={e=>{
        const chosen=Array.from(e.target.files||[]);if(chosen.length+count>5){alert(t('Najviše pet slika.','Maximum five images.'));return;}setFiles(v=>[...v,...chosen]);e.target.value='';}}/></label>
    </Form>
    {editing && <button className="secondary" onClick={()=>{setEditing('');setFiles([]);setRemoved([]);}}>{t('Otkaži','Cancel')}</button>}
  </section>;
}

function PortfolioPending({file,onRemove}:{file:File;onRemove:()=>void}){
  const [preview,setPreview]=useState('');
  useEffect(()=>{const src=URL.createObjectURL(file);setPreview(src);return()=>URL.revokeObjectURL(src);},[file]);
  return <div className="image-tile">{preview && <img src={preview} alt={file.name}/>}<small>{file.name}</small><button type="button" aria-label="Remove image" onClick={onRemove}>×</button></div>;
}
