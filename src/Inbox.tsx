import React, { useEffect, useRef, useState } from 'react';
import * as db from './db';
import type { InboxItem } from './types';
import { Icon } from './icons';
import { explain, useSite, when } from './ui';

// One inbox for both customer and advertiser, on every page and every screen size.
export function Inbox() {
  const ctx = useSite();
  const { user, lang, t, openChat } = ctx;
  const [items, setItems] = useState<InboxItem[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [ctx.url.pathname, user?.id]);
  useEffect(() => {
    setItems([]);
    setError('');
    setLoading(true);
    if (!user) return;
    let alive = true;
    let serial = 0;
    const reload = async () => {
      const number = ++serial;
      try {
        const response = await db.inbox();
        if (alive && serial === number) { setItems(response); setError(''); setLoading(false); }
      } catch (e) {
        if (alive && serial === number) { setError(explain(e, t)); setLoading(false); }
      }
    };
    void reload();
    const unsubscribe = db.listenInbox(reload);
    const timer = window.setInterval(reload, 20000);
    window.addEventListener('rg-inbox-refresh', reload);
    const onFocus = () => { if (document.visibilityState === 'visible') void reload(); };
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      alive = false;
      window.clearInterval(timer);
      unsubscribe();
      window.removeEventListener('rg-inbox-refresh', reload);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user?.id]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!container.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  if (!user) return null;
  const unread = items.reduce((sum, item) => sum + Number(item.unread || 0), 0);
  return <div className="inbox-holder" ref={container}>
    <button className="inbox-trigger" type="button" aria-label={t('Poruke', 'Messages') + (unread ? ` (${unread} ${t('nepročitanih', 'unread')})` : '')} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(x => !x)}>
      <Icon name="mail" size={23} />
      {unread > 0 && <span className="inbox-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <section className="inbox-popover" role="dialog" aria-label={t('Moje poruke', 'My messages')}>
      <div className="inbox-top"><strong>{t('Poruke', 'Messages')}</strong><button type="button" aria-label={t('Zatvori', 'Close')} onClick={() => setOpen(false)}>×</button></div>
      {error && <p className="notice" role="alert">{error}</p>}
      {loading && !error && <p className="inbox-empty">{t('Učitavanje poruka…', 'Loading messages…')}</p>}
      {!loading && !error && !items.length && <p className="inbox-empty">{t('Još nema razgovora.', 'No conversations yet.')}</p>}
      <div className="inbox-list">{items.map(item => <button key={item.thread_id} className={'inbox-item' + (Number(item.unread) ? ' unread' : '')} onClick={() => { openChat(item.thread_id); setOpen(false); }}>
        <span className="inbox-item-top"><b>{item.peer_name}</b>{Number(item.unread) > 0 && <span className="inbox-item-count">{item.unread}</span>}</span>
        <small>{item.listing_title}</small>
        <span className="inbox-preview">{item.last_body || t('Započni razgovor', 'Start the conversation')}</span>
        {item.last_at && <time>{when(item.last_at, lang)}</time>}
      </button>)}</div>
    </section>}
  </div>;
}
