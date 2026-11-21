import React, { useEffect, useRef, useState } from 'react';
import * as db from './db';
import { Icon } from './icons';
import type { LiveChatMessage } from './types';
import { explain, useSite, when } from './ui';

// Public room for signed-in members. The five-hour lifetime is enforced by the SQL RPC/RLS;
// the client filters timestamps too so already-open windows never show expired posts.
const LIFETIME_MS = 5 * 60 * 60 * 1000;

export function LiveChat() {
  const { user, t, lang } = useSite();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const end = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    let serial = 0;
    const reload = async () => {
      const request = ++serial;
      try {
        const result = await db.liveChatHistory();
        if (!alive || request !== serial) return;
        setMessages(result);
        setNow(Date.now());
        setError('');
      } catch (e) {
        if (alive && request === serial) setError(explain(e, t));
      } finally {
        if (alive && request === serial) setLoading(false);
      }
    };
    void reload();
    const stop = db.listenLiveChat(() => { void reload(); });
    const poll = window.setInterval(() => { void reload(); }, 15000);
    const tick = window.setInterval(() => setNow(Date.now()), 10000);
    const onVisible = () => { if (document.visibilityState === 'visible') void reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      stop();
      window.clearInterval(poll);
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id, t]);

  const active = messages.filter(message => new Date(message.created_at).getTime() > now - LIFETIME_MS);
  useEffect(() => {
    if (!list.current) return;
    if (firstLoad.current || list.current.scrollHeight - list.current.scrollTop - list.current.clientHeight < 140) {
      end.current?.scrollIntoView({block: 'nearest'});
    }
    firstLoad.current = false;
  }, [messages]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !user || pending) return;
    setPending(true);
    setError('');
    try {
      await db.sendLiveChat(user.id, body);
      setDraft('');
      setMessages(await db.liveChatHistory());
      setNow(Date.now());
      end.current?.scrollIntoView({block: 'nearest'});
    } catch (e) {
      setError(explain(e, t));
    } finally {
      setPending(false);
    }
  }

  return <section className="rg-live-chat" role="tabpanel" id="rg-inbox-panel-live" aria-labelledby="rg-inbox-tab-live">
    <div className="rg-live-description"><span className="rg-live-dot" aria-hidden="true" />
      <span>{t('Zajednički razgovor svih prijavljenih korisnika', 'Shared chat for signed-in members')}</span>
    </div>
    <div className="rg-live-messages" ref={list} aria-live="polite" aria-relevant="additions text">
      {loading && <p className="rg-live-empty">{t('Učitavanje razgovora…','Loading chat…')}</p>}
      {!loading && !error && !active.length && <p className="rg-live-empty">{t('Još nema poruka. Napiši prvu!', 'No messages yet. Start the conversation!')}</p>}
      {active.map(message => <div key={message.id} className={'rg-live-message' + (message.sender === user?.id ? ' rg-live-mine' : '')}>
        <div className="rg-live-author"><strong>{message.sender === user?.id ? t('Ti','You') : message.sender_name}</strong><time dateTime={message.created_at}>{when(message.created_at, lang)}</time></div>
        <p>{message.body}</p>
      </div>)}
      <div ref={end} />
    </div>
    <div className="rg-live-composer">
      {error && <p className="rg-live-error" role="alert">{error}</p>}
      <div className="rg-live-expiry"><Icon name="clock" size={14}/>{t('Poruke se automatski brišu 5 sati nakon slanja.', 'Messages are automatically deleted 5 hours after sending.')}</div>
      <form onSubmit={e => void send(e)}>
        <label htmlFor="rg-live-text" className="rg-live-sr-only">{t('Poruka za live chat', 'Live chat message')}</label>
        <textarea id="rg-live-text" rows={2} maxLength={1000} required value={draft} disabled={pending} placeholder={t('Napiši poruku…','Write a message…')} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey && !e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/>
        <button type="submit" disabled={pending || !draft.trim()} aria-label={t('Pošalji poruku','Send message')}><Icon name="send" size={19}/><span>{pending?t('Šaljem…','Sending…'):t('Pošalji','Send')}</span></button>
      </form>
    </div>
  </section>;
}
