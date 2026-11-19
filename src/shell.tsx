import React, { useEffect, useState } from 'react';
import { Icon } from './icons';
import { Inbox } from './Inbox';
import { Avatar, Link, useSite } from './ui';
// Navigacija koristi iste putanje na oba jezika kako bi deljeni link radio za svakog posetioca.
function Brand() {
  return <Link className="brand" to="/">
    <img src="/mark.svg" alt="" />
    <span>
      <b>REVLORD<span className="brand-group"> GROUP</span></b>
      <small>DIGITAL SERVICES</small>
    </span>
  </Link>;
}
export function LogoHeader() {
  const {
    t,
    user,
    me,
    url,
    lang,
    setLang
  } = useSite();
  const [menu, show] = useState(false);
  useEffect(() => show(false), [url.pathname, url.hash]);
  const links = <>
    <Link to="/services">{t('Pronađi stručnjaka', 'Find talent')}</Link>
    <Link to="/projects">{t('Otvoreni projekti', 'Open projects')}</Link>
    <Link to="/#about">{t('O nama', 'About us')}</Link>
  </>;
  const account = <Link to={user ? '/panel' : '/login'}>{user ? t('Moj panel', 'Dashboard') : t('Prijavi se', 'Log in')}</Link>;
  return <header>
    <div className="wrap header">
      <Brand />
      <nav className="wide">{links}</nav>
      <div className="header-actions">
        <div className="lang" role="group" aria-label={t('Jezik', 'Language')}>
          <Icon name="globe" size={16} />
          {(['sr', 'en'] as const).map((l, i) => <React.Fragment key={l}>
            {i > 0 && <i>/</i>}
            <button aria-label={l === 'sr' ? 'Srpski' : 'English'} aria-pressed={lang === l} className={lang === l ? 'selected' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
          </React.Fragment>)}
        </div>
        <Inbox />
        <span className="login-link">{account}</span>
        <Link className="primary post" to="/new/project">
          <Icon name="plus" size={15} />
          {t('Objavi projekat', 'Post a project')}
        </Link>
        {user && <Link className="header-avatar" to="/panel"><Avatar p={me || undefined} /></Link>}
        <button className="hamb" aria-label={t('Meni', 'Menu')} aria-expanded={menu} onClick={() => show(!menu)}><Icon name={menu ? 'close' : 'menu'} /></button>
      </div>
    </div>
    {menu && <nav className="mobile-nav">
      {links}
      {account}
      <span className="mobile-language"><button onClick={() => setLang('sr')} aria-pressed={lang==='sr'}>SR</button> / <button onClick={() => setLang('en')} aria-pressed={lang==='en'}>EN</button></span>
      <Link to="/new/project">{t('Objavi projekat', 'Post a project')}</Link>
    </nav>}
  </header>;
}
export function Footer() {
  const {
    t
  } = useSite();
  return <footer><div className="wrap">
      <Brand />
      <p><Link to="/services">{t('Usluge', 'Services')}</Link> · <Link to="/projects">{t('Projekti', 'Projects')}</Link> · <Link to="/#about">{t('O nama', 'About us')}</Link></p>
    </div></footer>;
}
