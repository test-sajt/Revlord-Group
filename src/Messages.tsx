import React, { useEffect, useRef, useState } from 'react';
import * as db from './db';
import type { Message, Thread } from './types';
import { explain, field, Field, Form, Link, ReportForm, Task, threadOther, useData, useSite, Wait, when } from './ui';
import { pathOf } from './Catalog';
export function Chat({
  id,
  close
}: {
  id: string;
  close: () => void;
}) {
  const {
    user,
    t,
    lang
  } = useSite();
  const q = useData(async () => {
    const thread = (await db.rows('threads', {
      id
    }))[0];
    if (!thread) throw Error('FORBIDDEN');
    const [p, ls] = await Promise.all([db.rows('profiles', {
      id: threadOther(thread, user!.id)
    }), db.rows('listings', {
      id: thread.listing_id
    })]);
    return {
      p: p[0],
      l: ls[0]
    };
  }, 'chat' + id + user?.id);
  const [messages, setMessages] = useState<Message[]>([]),
    [text, setText] = useState(''),
    [error, setError] = useState(''),
    [sent, setSent] = useState(false),
    [ready, setReady] = useState(false);
  const retry = useRef<{
    id: string;
    body: string;
  } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  // Realtime javlja promenu, a periodično čitanje nadoknađuje prekid WebSocket veze.
  useEffect(() => {
    let active = true,
      sequence = 0;
    async function fetchHistory() {
      const n = ++sequence;
      try {
        const data = await db.rows('messages', {
          thread_id: id
        }, '*', 'created_at');
        if (active && n === sequence) {
          setMessages(data);
          setError('');
          setReady(true);
        }
      } catch (e) {
        if (active) setError(explain(e, t));
      }
    }
    const unsubscribe = db.listen(id, fetchHistory);
    fetchHistory();
    const timer = setInterval(fetchHistory, 15000);
    return () => {
      active = false;
      clearInterval(timer);
      unsubscribe();
    };
  }, [id]);
  useEffect(() => {
    end.current?.scrollIntoView({
      block: 'nearest'
    });
  }, [messages.length]);
  return <aside className="chat" aria-label={t('Razgovor', 'Conversation')}>
    <div className="section-title">
      <b>{q.data?.p?.name || t('Razgovor', 'Conversation')}</b>
      <button aria-label={t('Zatvori', 'Close')} onClick={close}>×</button>
    </div>
    {q.error && <Wait error={q.error} />}
    {q.data?.l && <Link className="text-link" to={pathOf(q.data.l)}>{q.data.l.title}</Link>}
    <div className="chat-history" aria-live="polite">
      {error && <p role="alert">{error}</p>}
      {!ready && !error && <Wait />}
      {messages.map(m => <div className={m.sender === user!.id ? 'bubble mine' : 'bubble'} key={m.id}>
        <p>{m.body}</p>
        <small>{when(m.created_at, lang)}</small>
      </div>)}
      <div ref={end} />
    </div>
    <small>{t('Poruke vide učesnici razgovora. Ovlašćeni administratori mogu ih pregledati radi podrške i moderacije, uz evidenciju pristupa.', 'Participants can read these messages. Authorised administrators may review them for support or moderation. Their access is logged.')}</small>
    <Form label={t('Pošalji', 'Send')} save={async () => {
      const body = text.trim();
      if (!body) return;
      const mid = retry.current?.body === body ? retry.current.id : crypto.randomUUID();
      retry.current = {
        id: mid,
        body
      };
      let m: Message;
      try {
        m = await db.insert('messages', {
          id: mid,
          thread_id: id,
          sender: user!.id,
          body
        });
      } catch (e) {
        const prior = (await db.rows('messages', {
          id: mid,
          thread_id: id
        }))[0];
        if (!prior) throw e;
        m = prior;
      }
      setMessages(all => all.some(x => x.id === mid) ? all : [...all, m]);
      setText('');
      setSent(true);
      retry.current = null;
    }}><label>
        {t('Poruka', 'Message')}
        <textarea rows={2} required maxLength={6000} value={text} onChange={e => {
          setText(e.target.value);
          setSent(false);
        }} />
      </label></Form>
    {sent && <small role="status">{t('Poruka je sačuvana.', 'Message sent.')}</small>}
    <ReportForm thread={id} />
  </aside>;
}
export function Admin() {
  const ctx = useSite(),
    {
      t,
      lang
    } = ctx;
  const [thread, setThread] = useState(''),
    [review, setReview] = useState<Message[] | null>(null);
  const q = useData(async () => {
    const [reports, threads, people] = await Promise.all([db.rows('reports'), db.rpc<Thread[]>('moderation_threads', {}), db.rows('profiles')]);
    return {
      reports,
      threads,
      people
    };
  }, 'admin' + ctx.user?.id);
  if (!q.data) return <div className="wrap page"><Wait error={q.error} /></div>;
  const data = q.data;
  const name = (id: string) => data.people.find(p => p.id === id)?.name || id;
  return <section className="wrap page narrow">
    <h1>{t('Administracija', 'Administration')}</h1>
    <h2>{t('Prijave sadržaja', 'Content reports')}</h2>
    {!data.reports.length && <p>{t('Nema prijava.', 'No reports.')}</p>}
    {data.reports.map(r => <article className="manage-row" key={r.id}>
      <p>{r.reason}</p>
      {r.thread_id && <button onClick={() => {
        setThread(r.thread_id!);
        setReview(null);
      }}>{t('Izaberi razgovor', 'Select conversation')}</button>}
      {r.listing_id && <Link to={'/listing/' + r.listing_id}>{t('Otvori oglas', 'Open listing')}</Link>}
      {!r.resolved ? <Task run={async () => {
        await db.update('reports', r.id, {
          resolved: true
        });
        ctx.refresh();
      }}>{t('Označi kao rešeno', 'Mark resolved')}</Task> : t('Rešeno', 'Resolved')}
    </article>)}
    <h2>{t('Moderacija razgovora', 'Conversation review')}</h2>
    <Form label={t('Evidentiraj pristup i otvori', 'Log access and open')} save={async f => {
      setReview(null);
      setReview(await db.rpc<Message[]>('review_thread', {
        thread,
        justification: field(f, 'reason')
      }));
    }}>
      <label>
        {t('Razgovor', 'Conversation')}
        <select required value={thread} onChange={e => {
          setThread(e.target.value);
          setReview(null);
        }}>
          <option value="">{t('Izaberi', 'Choose')}</option>
          {data.threads.map(th => <option key={th.id} value={th.id}>{name(th.owner_id)} / {name(th.peer_id)} · {th.id.slice(0, 8)}</option>)}
        </select>
      </label>
      <Field required maxLength={3000} name="reason" label={t('Razlog pristupa (najmanje 3 znaka)', 'Reason for access (at least 3 characters)')} />
    </Form>
    {review && <section>
      <h3>{t('Poruke', 'Messages')} ({review.length})</h3>
      {review.map(m => <div className="manage-row" key={m.id}>
        <b>{name(m.sender)}</b>
        <small>{when(m.created_at, lang)}</small>
        <p>{m.body}</p>
      </div>)}
    </section>}
  </section>;
}
