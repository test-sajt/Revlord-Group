import React, { useEffect, useState } from 'react';
import * as db from './db';
import { Icon } from './icons';
import { Inbox } from './Inbox';
import { Avatar, Link, useSite } from './ui';

// The existing brand, routes and authentication are retained. Navigation is shared by desktop and mobile.
function Brand() {
  return <Link className="brand" to="/">
    <img src="/mark.svg" alt="" />
    <span><b>REVLORD<span className="brand-group"> GROUP</span></b><small>DIGITAL SERVICES</small></span>
  </Link>;
}

export function LogoHeader() {
  const ctx = useSite();
  const { t, user, me, url, lang, setLang } = ctx;
  const [menu, showMenu] = useState(false);
  const [signoutError, setSignoutError] = useState('');
  useEffect(() => { showMenu(false); setSignoutError(''); }, [url.pathname, url.search, user?.id]);
  useEffect(() => {
    if (!menu) return;
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') showMenu(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [menu]);
  const nav = [
    { to:'/', icon:'home', label:t('Početna','Home'), featured:false },
    { to:'/new/project', icon:'briefcase', label:t('Napravi oglas za posao','Post a job'), featured:false },
    { to:'/new/service', icon:'sparkles', label:t('Ponudi svoje veštine','Offer your skills'), featured:false },
    { to:'/services', icon:'search', label:t('Pretraži oglase','Browse listings'), featured:true },
    { to:user && me ? '/talent/' + me.id : '/login', icon:'user', label:t('Moj profil','My profile'), featured:false },
  ];
  const active = (to:string) => to === '/' ? url.pathname === '/' : (url.pathname === to || (to === '/services' && url.pathname.startsWith('/services')));
  async function signOut() {
    setSignoutError('');
    try { await db.logout(); showMenu(false); ctx.go('/'); }
    catch (error) { setSignoutError(error instanceof Error ? error.message : String(error)); }
  }
  const languages = <div className="rg-languages" role="group" aria-label={t('Izaberi jezik','Select language')}>
    <button type="button" onClick={() => setLang('sr')} className={lang === 'sr' ? 'is-active':''} aria-pressed={lang === 'sr'}>SR</button>
    <span aria-hidden="true">/</span>
    <button type="button" onClick={() => setLang('en')} className={lang === 'en' ? 'is-active':''} aria-pressed={lang === 'en'}>EN</button>
  </div>;
  return <header className="site-header">
    <div className="wrap header rg-header-inner">
      <Brand />
      <nav className="rg-desktop-nav" aria-label={t('Glavna navigacija','Main navigation')}>
        {nav.map(item => <Link key={item.to} to={item.to} className={'rg-nav-link' + (item.featured ? ' nav-featured':'') + (active(item.to) ? ' is-current':'')}>
          {item.label}
        </Link>)}
        {user && <button type="button" className="rg-nav-link rg-logout" onClick={signOut}>{t('Odjavi se','Log out')}</button>}
      </nav>
      <div className="header-actions rg-header-actions">
        {languages}
        {user ? <Inbox /> : <Link className="rg-signin" to="/login">{t('Prijavi se','Log in')}</Link>}
        <button type="button" className={'hamb rg-menu-trigger' + (menu ? ' is-open':'')} aria-label={menu ? t('Zatvori meni','Close menu') : t('Otvori meni','Open menu')} aria-expanded={menu} aria-controls="rg-mobile-menu" onClick={() => showMenu(v => !v)}><Icon name={menu ? 'close' : 'menu'} size={23} /></button>
      </div>
    </div>
    {signoutError && <div className="rg-header-error" role="alert">{signoutError}</div>}
    {menu && <>
      <button type="button" className="rg-menu-backdrop" aria-label={t('Zatvori meni','Close menu')} onClick={() => showMenu(false)} />
      <nav id="rg-mobile-menu" className="rg-mobile-panel" aria-label={t('Mobilna navigacija','Mobile navigation')}>
        <div className="rg-lava" aria-hidden="true"><i/><i/><i/></div>
        <div className="rg-menu-content">
          <p className="rg-menu-overline">REVLORD <span> / </span> MENU</p>
          <div className="rg-menu-heading"><span>{t('Tvoj prostor za sledeću ideju','Your next big idea starts here')}</span><Icon name="sparkles" size={20}/></div>
          <div className="rg-menu-links">
            {nav.map((item, i) => <Link key={item.to} to={item.to} className={'rg-mobile-link' + (item.featured?' mobile-featured':'') + (active(item.to) ? ' is-current':'')}>
              <span className="rg-mobile-link-icon"><Icon name={item.icon} size={20}/></span>
              <span>{item.label}</span><Icon name="arrow-up-right" size={18}/>
            </Link>)}
          </div>
          <div className="rg-menu-bottom">
            {user ? <div className="rg-menu-user"><Avatar p={me || undefined}/><div><b>{me?.name || t('Moj nalog','My account')}</b><small>{t('Prijavljen korisnik','Signed-in member')}</small></div></div> : <p>{t('Prijavi se da objavljuješ oglase i šalješ poruke.','Log in to post listings and send messages.')}</p>}
            {user ? <button type="button" className="rg-menu-signout" onClick={signOut}><Icon name="logout" size={18}/>{t('Odjavi se','Log out')}</button>
              : <Link to="/login" className="rg-menu-signout"><Icon name="user" size={18}/>{t('Prijavi se','Log in')}</Link>}
          </div>
        </div>
      </nav>
    </>}
  </header>;
}

export function Footer() {
  const {t} = useSite();
  return <footer className="rg-footer"><div className="wrap rg-footer-inner">
    <div><Brand/><p>{t('Mesto gde ideje pronalaze prave ljude.','Where great ideas meet the right people.')}</p></div>
    <nav aria-label={t('Navigacija u podnožju','Footer navigation')}>
      <Link to="/">{t('Početna','Home')}</Link>
      <Link to="/services">{t('Pronađi stručnjaka','Find talent')}</Link>
      <Link to="/projects">{t('Poslovi','Jobs')}</Link>
      <Link to="/#about">{t('Kako funkcioniše','How it works')}</Link>
    </nav>
    <small>© {new Date().getFullYear()} RevLord Group</small>
  </div></footer>;
}
