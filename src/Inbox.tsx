import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as db from './db';
import type { InboxItem } from './types';
import { Icon } from './icons';
import { explain, useSite, when } from './ui';

// Messages are shared; "delete chat" only removes the conversation from the current person's view.
// A new message brings it back. The other participant's history is never deleted.
export function Inbox() {
  const ctx = useSite();
  const { user, lang, t, openChat } = ctx;
  const [items, setItems] = useState<InboxItem[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState('');
  const [deleting, setDeleting] = useState('');
  const [toast,setToast]=useState<{thread:string;sender:string}|null>(null);
  const [notifyStatus,setNotifyStatus]=useState<'on'|'off'|'local'|'error'>('off');
  const [notifyError,setNotifyError]=useState('');
  const lastMessages=useRef<Map<string,string>>(new Map());
  const inboxInitialized=useRef(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(false); setConfirmId(''); }, [ctx.url.pathname, user?.id]);
  useEffect(()=>{
    setToast(null);setNotifyStatus('off');inboxInitialized.current=false;lastMessages.current.clear();
    if(!user)return;
    db.notificationsEnabled().then(on=>setNotifyStatus(on?'on':(!db.pushConfigured && db.canNotify() && Notification.permission==='granted' && localStorage.getItem('rg-notifications-optout')!=='true')?'local':'off')).catch(()=>setNotifyStatus('off'));
  },[user?.id]);
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(null),7000);return()=>window.clearTimeout(timer);},[toast]);
  useEffect(() => {
    setItems([]); setError(''); setLoading(true);
    if (!user) return;
    let alive = true;
    let serial = 0;
    const reload = async () => {
      const n = ++serial;
      try { const response:InboxItem[] = await db.inbox(); if (alive && serial === n) {
        const latest=new Map<string,string>();
        for(const item of response){
          const current=item.last_at || '';
          latest.set(item.thread_id,current);
          if(inboxInitialized.current && current && Number(item.unread)>0 && current>(lastMessages.current.get(item.thread_id)||'')){
            setToast({thread:item.thread_id,sender:item.peer_name || t('Korisnik','Member')});
            if(document.visibilityState==='hidden') {
              void db.notificationsEnabled().then(active=>{
                if(!active) void db.showInTabNotification(item.thread_id).catch(()=>{});
              }).catch(()=>{});
            }
          }
        }
        lastMessages.current=latest;
        inboxInitialized.current=true;
        setItems(response);setError('');setLoading(false);
      }}
      catch (e) {if (alive && serial === n) {setError(explain(e,t));setLoading(false);}}
    };
    void reload();
    const unsubscribe = db.listenInbox(reload);
    const timer = window.setInterval(reload, 20000);
    window.addEventListener('rg-inbox-refresh', reload);
    const onFocus = () => {if(document.visibilityState==='visible')void reload();};
    document.addEventListener('visibilitychange', onFocus);
    return () => {alive=false;window.clearInterval(timer);unsubscribe();window.removeEventListener('rg-inbox-refresh',reload);document.removeEventListener('visibilitychange',onFocus);};
  }, [user?.id]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {if (!container.current?.contains(e.target as Node)) setOpen(false);};
    const escape = (e: KeyboardEvent) => {if(e.key==='Escape'){setOpen(false);setConfirmId('');}};
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
    return ()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};
  },[open]);
  if (!user) return null;
  const unread = items.reduce((sum,item)=>sum + Number(item.unread || 0), 0);
  async function hideChat(id:string) {
    setDeleting(id);setError('');
    try {
      await db.deleteChatForMe(id);
      setItems(list=>list.filter(item=>item.thread_id!==id));
      setConfirmId('');
      window.dispatchEvent(new Event('rg-inbox-refresh'));
    } catch(e) {setError(explain(e,t));}
    finally{setDeleting('');}
  }
  const disable=async()=>{
    setNotifyError('');
    try{await db.disableNotifications();setNotifyStatus('off');}
    catch(e){setNotifyError(explain(e,t));}
  };
  const enable=async()=>{
    setNotifyError('');
    try{const mode=await db.enableNotifications(user!.id);setNotifyStatus(mode==='push'?'on':'local');}
    catch(e){setNotifyStatus('error');setNotifyError(explain(e,t));}
  };
  return <div className="inbox-holder" ref={container}>
    <button className="inbox-trigger" type="button" aria-label={t('Poruke','Messages') + (unread ? ` (${unread} ${t('nepročitanih','unread')})`:'')} aria-expanded={open} aria-haspopup="dialog" onClick={()=>setOpen(v=>!v)}>
      <Icon name="mail" size={23}/>
      {unread>0 && <span className="inbox-badge" aria-hidden="true">{unread>99?'99+':unread}</span>}
    </button>
    {open && <section className="inbox-popover rg-inbox-popover" role="dialog" aria-label={t('Moje poruke','My messages')}>
      <div className="inbox-top"><div><small className="rg-inbox-caption">REVLORD / INBOX</small><strong>{t('Poruke','Messages')}</strong></div><button type="button" aria-label={t('Zatvori','Close')} onClick={()=>setOpen(false)}><Icon name="close" size={19}/></button></div>
      {error && <p className="notice" role="alert">{error}</p>}
      {loading && !error && <p className="inbox-empty">{t('Učitavanje poruka…','Loading messages…')}</p>}
      {!loading && !error && !items.length && <p className="inbox-empty">{t('Još nema razgovora. Pregledaj oglase i započni razgovor.','No conversations yet. Browse listings to get started.')}</p>}
      <div className="rgv-notif-settings"><div className="rgv-notif-settings-heading"><Icon name="bell" size={18}/><span>{t('Obaveštenja o porukama','Message notifications')}</span></div>
        {notifyStatus==='on'?<div><p className="rgv-notif-on">{t('Uključena obaveštenja za ovaj uređaj.','Notifications are enabled on this device.')}</p><button type="button" className="rgv-notif-disable" onClick={()=>void disable()}>{t('Isključi obaveštenja','Disable notifications')}</button></div>:notifyStatus==='local'?<div><p className="rgv-notif-on">{t('Obaveštenja u otvorenom pregledaču su uključena.','Open-tab notifications enabled.')}</p><button type="button" className="rgv-notif-disable" onClick={()=>void disable()}>{t('Isključi obaveštenja','Disable notifications')}</button></div>:<><button type="button" className="rgv-notif-enable" onClick={()=>void enable()}><Icon name="bell" size={17}/>{t('Uključi obaveštenja','Enable notifications')}</button><p>{db.pushConfigured?t('Dozvoli obaveštenja u pregledaču da poruke stižu i van stranice.','Allow browser notifications for background messages.'):t('Obaveštenja rade dok je stranica otvorena; za poruke kada je zatvorena potrebno je podesiti Web Push server.','Notifications work while the page is open; background push needs server setup.')}</p></>}
        {notifyError&&<p className="notice" role="alert">{notifyError}</p>}
      </div>
      <div className="inbox-list">{items.map(item => <div className="rg-inbox-row" key={item.thread_id}>
        <div className="rg-inbox-row-top"><button className={'inbox-item' + (Number(item.unread)?' unread':'')} onClick={()=>{openChat(item.thread_id);setOpen(false);}}>
          <span className="inbox-item-top"><b>{item.peer_name}</b>{Number(item.unread)>0 && <span className="inbox-item-count">{item.unread}</span>}</span>
          <small>{item.listing_title}</small><span className="inbox-preview">{item.last_body || t('Započni razgovor','Start the conversation')}</span>
          {item.last_at && <time>{when(item.last_at,lang)}</time>}
        </button><button className="rg-delete-chat" type="button" aria-label={t('Izbriši čet sa korisnikom ','Delete chat with ') + item.peer_name} title={t('Izbriši čet','Delete chat')} onClick={()=>setConfirmId(id=>id===item.thread_id?'':item.thread_id)}><Icon name="trash" size={18}/></button></div>
        {confirmId===item.thread_id && <div className="rg-delete-confirm" role="group" aria-label={t('Potvrda brisanja četa','Confirm chat removal')}>
          <p>{t('Ukloniti čet samo iz tvog sandučeta? Druga osoba zadržava razgovor.','Remove this chat from your inbox? The other person keeps their history.')}</p>
          <div><button type="button" disabled={!!deleting} onClick={()=>void hideChat(item.thread_id)}>{deleting===item.thread_id?t('Uklanjam…','Removing…'):t('Da, izbriši','Yes, remove')}</button><button type="button" onClick={()=>setConfirmId('')}>{t('Otkaži','Cancel')}</button></div>
        </div>}
      </div>)}</div>
    </section>}
    {toast && createPortal(<aside className="rgv-message-toast" role="status" aria-live="polite"><img src="/icons/revlord-192.png" width="45" height="45" alt=""/><div className="rgv-toast-body"><strong>Nova poruka Revlord-Group</strong><p>{t('Nova poruka od','New message from')} <b>{toast.sender}</b></p><button type="button" onClick={()=>{openChat(toast.thread);setToast(null);}}>{t('Otvori razgovor','Open conversation')} <Icon name="chevron" size={14}/></button></div><button type="button" className="rgv-toast-close" onClick={()=>setToast(null)} aria-label={t('Zatvori obaveštenje','Dismiss notification')}><Icon name="close" size={17}/></button></aside>,document.body)}
  </div>;
}
