import React, { useState } from 'react';
import * as db from './db';
import { pathOf } from './Catalog';
import { Avatar, ChatButton, cost, field, Field, Form, Link, status, Task, threadOther, useData, useSite, Wait, when } from './ui';
// Panel povezuje nalog sa njegovim zahtevima, terminima, prijavama i razgovorima.
export function Dashboard() {
  const ctx = useSite(),
    {
      user,
      me,
      lang,
      t
    } = ctx;
  const [tab, setTab] = useState('list');
  const q = useData(async () => {
    const [ls, ps, ws, threads, bs, apps, slots] = await Promise.all([db.rows('listings'), db.rows('profiles'), db.rows('works'), db.rows('threads'), db.rows('bookings'), db.rows('applications'), db.rows('slots')]);
    return {
      ls,
      ps,
      ws,
      threads,
      bs,
      apps,
      slots
    };
  }, 'panel' + user?.id);
  if (!q.data) return <section className="page wrap"><Wait error={q.error} /></section>;
  const d = q.data;
  const own = d.ls.filter(l => l.owner_id === user!.id);
  const name = (id: string) => d.ps.find(p => p.id === id)?.name || t('Korisnik', 'Member');
  const listing = (id: string) => {
    const l = d.ls.find(l => l.id === id);
    return l ? <Link to={pathOf(l)}>{l.title}</Link> : t('Privatan oglas', 'Private listing');
  };
  const empty = <p>{t('Još nema stavki.', 'No entries yet.')}</p>;
  async function decide(type: 'booking' | 'application', id: string, accept: boolean) {
    await db.rpc('decide_' + type, {
      [type]: id,
      accept
    });
    ctx.refresh();
  }
  return <section className="wrap page">
    <p className="eyebrow">REVLORD / {t('Radni prostor', 'Workspace')}</p>
    <h1>{t('Moj panel', 'My dashboard')}</h1>
    <div className="profile-bar">
      <Avatar p={me || undefined} />
      <b>{me?.name}</b>
      <button className="text-link" onClick={ctx.refresh}>{t('Osveži podatke', 'Refresh data')}</button>
      <Link to="/account/edit">{t('Uredi profil', 'Edit profile')}</Link>
      {ctx.admin && <Link to="/admin">{t('Administracija', 'Administration')}</Link>}
      <Task className="text-link" run={async () => {
        await db.logout();
        ctx.go('/');
      }}>{t('Odjavi se', 'Log out')}</Task>
    </div>
    <div className="tabs">{[['list', t('Moji oglasi', 'My listings')], ['work', t('Prijave', 'Proposals')], ['book', t('Rezervacije', 'Bookings')], ['slots', t('Dostupnost', 'Availability')], ['chat', t('Poruke', 'Messages')]].map(([v, l]) => <button key={v} aria-pressed={v === tab} onClick={() => setTab(v)}>{l}</button>)}</div>
    {tab === 'list' && <>
      <div className="actions">
        <Link className="primary" to="/new/service">{t('Dodaj uslugu', 'List a service')}</Link>
        <Link className="secondary" to="/new/project">{t('Objavi projekat', 'Post a project')}</Link>
      </div>
      {!own.length && empty}
      {own.map(l => <div className="manage-row" key={l.id}>
        <div>
          <small>{status(l.status, t)}</small>
          <h3>{listing(l.id)}</h3>
        </div>
        <Link className="text-link" to={'/edit/' + l.id}>{t('Izmeni', 'Edit')}</Link>
      </div>)}
    </>}
    {tab === 'chat' && <>{!d.threads.length && empty}{d.threads.map(th => <div className="manage-row" key={th.id}>
        <div>
          <b>{name(threadOther(th, user!.id))}</b>
          <p>{listing(th.listing_id)}</p>
        </div>
        <button className="secondary" onClick={() => ctx.openChat(th.id)}>{t('Otvori razgovor', 'Open chat')}</button>
      </div>)}</>}
    {tab === 'slots' && <>
      <p>{t('Dodaj vreme početka konsultacije. Vreme prikazujemo u tvojoj zoni.', 'Add a consultation start time. Times use your timezone.')} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
      <Form label={t('Dodaj slobodan termin', 'Add availability')} save={async f => {
        const date = new Date(field(f, 'start'));
        if (!(date.getTime() > Date.now())) throw Error(t('Izaberi buduće vreme.', 'Choose a future time.'));
        await db.insert('slots', {
          owner_id: user!.id,
          starts_at: date.toISOString()
        });
        ctx.refresh();
      }}><Field type="datetime-local" required name="start" label={t('Datum i vreme', 'Date and time')} /></Form>
      {d.slots.filter(s => s.owner_id === user!.id).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map(s => <div className="manage-row" key={s.id}>
        <b>{when(s.starts_at, lang)}</b>
        {s.booked ? t('Rezervisano', 'Booked') : d.bs.some(b => b.slot_id === s.id) ? t('Postoji zahtev', 'Has a request') : <Task className="secondary" run={async () => {
          await db.remove('slots', s.id);
          ctx.refresh();
        }}>{t('Ukloni', 'Remove')}</Task>}
      </div>)}
    </>}
    {tab === 'book' && <>{!d.bs.length && empty}{d.bs.map(b => {
        const s = d.slots.find(s => s.id === b.slot_id);
        return <article className="manage-row" key={b.id}>
        <div>
          <small>{status(b.status, t)} · {s ? when(s.starts_at, lang) : ''}</small>
          <h3>{listing(b.listing_id)}</h3>
          <p>{name(b.client_id)} · {b.brief}</p>
        </div>
        {s?.owner_id === user!.id && b.status === 'pending' && <div className="actions">
          <Task run={() => decide('booking', b.id, true)}>{t('Potvrdi', 'Confirm')}</Task>
          <Task className="secondary" run={() => decide('booking', b.id, false)}>{t('Odbij', 'Decline')}</Task>
        </div>}
      </article>;
      })}</>}
    {tab === 'work' && <>{!d.apps.length && empty}{d.apps.map(a => {
        const owner = own.some(l => l.id === a.listing_id),
          w = d.ws.find(x => x.id === a.work_id);
        return <article className="manage-row" key={a.id}>
        <div>
          <small>{status(a.status, t)}</small>
          <h3>{listing(a.listing_id)}</h3>
          <Link to={'/talent/' + a.applicant}>{name(a.applicant)}</Link>
          <p className="preserve">{a.proposal}</p>
          <b>{cost(a.price, t)} {a.deadline && ' · ' + a.deadline}</b>
          {w && <p><Link className="text-link" to={'/services/' + w.listing_id}>{w.title}</Link></p>}
        </div>
        <div className="actions">
          <ChatButton listing={a.listing_id} peer={owner ? a.applicant : undefined} />
          {owner && a.status === 'pending' && <>
            <Task run={() => decide('application', a.id, true)}>{t('Izaberi saradnika', 'Select collaborator')}</Task>
            <Task className="secondary" run={() => decide('application', a.id, false)}>{t('Odbij', 'Decline')}</Task>
          </>}
        </div>
      </article>;
      })}</>}
  </section>;
}
