import React, { useEffect, useRef, useState } from 'react';
import * as db from './db';
import { categories, internal } from './data';
import { useSite, Task, Form, Field, field, Wait, Category, Avatar, Link } from './ui';
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
  const ctx = useSite(),
    {
      me,
      user,
      t
    } = ctx;
  const [display, setDisplay] = useState(me?.name || ''),
    [step, setStep] = useState(0),
    [intent, setIntent] = useState(me?.intent || 'both'),
    [cat, setCat] = useState(me?.category || 'scripting'),
    [branch, setBranch] = useState(me?.branch || ''),
    [spec, setSpec] = useState(me?.specialty || '');
  const c = categories.find(x => x[0] === cat) || categories[0],
    branches = [c[4], c[5]],
    b = branches.find(x => x[0] === branch) || branches[0],
    choices = b.slice(1) as string[];
  const chosen = choices.includes(spec) ? spec : choices[0];
  async function finish(skip = false) {
    await db.update('profiles', user!.id, {
      name: display.trim() || me?.name || '',
      intent: skip ? 'both' : intent,
      category: skip ? '' : cat,
      branch: skip ? '' : b[0],
      specialty: skip ? '' : chosen,
      onboarded: true
    });
    ctx.refreshMe();
    const next = sessionStorage.getItem('rg-return');
    sessionStorage.removeItem('rg-return');
    ctx.go(next ? internal(next) : skip ? '/panel' : intent === 'expert' ? '/new/service?category=' + cat + '&spec=' + encodeURIComponent(chosen) : '/services?q=' + encodeURIComponent(chosen));
  }
  return <section className="page wrap narrow" role="dialog" aria-labelledby="pref-title">
    <p className="eyebrow">{t('Podešavanje profila', 'Profile setup')} · {step + 1}/3</p>
    <h1 id="pref-title">{[t('Kako želiš da sarađuješ?', 'How would you like to work?'), t('Izaberi oblast', 'Choose a discipline'), t('Izaberi specijalizaciju', 'Choose a specialisation')][step]}</h1>
    <div className="draft">
      {step === 0 ? <>
        <label>
          {t('Javno ime', 'Public name')}
          <input maxLength={100} value={display} onChange={e => setDisplay(e.target.value)} />
        </label>
        <div className="choices">{[['client', t('Tražim stručnjaka', 'Hire a specialist')], ['expert', t('Nudim usluge', 'Offer services')], ['both', t('Oboje', 'Both')]].map(([v, l]) => <button key={v} aria-pressed={intent === v} onClick={() => setIntent(v)}>{l}</button>)}</div>
      </> : step === 1 ? <Category value={cat} change={x => {
        setCat(x);
        setBranch('');
        setSpec('');
      }} /> : <>
        <label>
          {t('Vrsta rada', 'Type of work')}
          <select value={b[0]} onChange={e => {
            setBranch(e.target.value);
            setSpec('');
          }}>{branches.map(x => <option key={x[0]} value={x[0]}>{x[0].split(' / ')[ctx.lang === 'sr' ? 0 : 1]}</option>)}</select>
        </label>
        <label>
          {t('Specijalizacija', 'Specialisation')}
          <select value={chosen} onChange={e => setSpec(e.target.value)}>{choices.map(x => <option key={x}>{x}</option>)}</select>
        </label>
      </>}
      <div className="actions">
        {step > 0 && <button onClick={() => setStep(step - 1)}>{t('Nazad', 'Back')}</button>}
        {step < 2 ? <button className="primary" onClick={() => setStep(step + 1)}>{t('Nastavi', 'Continue')}</button> : <Task run={() => finish()}>{t('Sačuvaj izbor', 'Save choices')}</Task>}
        <Task className="text-link" run={() => finish(true)}>{t('Preskoči', 'Skip')}</Task>
      </div>
    </div>
  </section>;
}
export function ProfileEdit() {
  const {
    me,
    t,
    refreshMe,
    go
  } = useSite();
  if (!me) return <Wait />;
  return <section className="wrap page narrow">
    <h1>{t('Uredi profil', 'Edit profile')}</h1>
    <Avatar p={me} />
    <Form label={t('Sačuvaj profil', 'Save profile')} save={async f => {
      const file = f.get('avatar') as File;
      let path = me.avatar;
      if (file?.size) path = await db.upload('avatars', me.id + '/' + crypto.randomUUID(), file);
      try {
        await db.update('profiles', me.id, {
          name: field(f, 'name'),
          bio: field(f, 'bio'),
          avatar: path
        });
      } catch (e) {
        if (path !== me.avatar) await db.dropFile('avatars', path);
        throw e;
      }
      if (me.avatar && path !== me.avatar) await db.dropFile('avatars', me.avatar);
      refreshMe();
      go('/panel');
    }}>
      <Field required name="name" maxLength={100} label={t('Javno ime', 'Public name')} value={me.name} />
      <Field name="bio" type="textarea" maxLength={3000} label={t('O meni', 'About me')} value={me.bio} />
      <label>
        {t('Profilna slika (do 2 MB)', 'Profile image (up to 2 MB)')}
        <input type="file" name="avatar" accept="image/png,image/jpeg,image/webp" />
      </label>
    </Form>
    <Link className="text-link" to="/preferences">{t('Izmeni interesovanja', 'Edit interests')}</Link>
  </section>;
}
