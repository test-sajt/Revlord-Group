import React, { useState } from 'react';
import * as db from './db';
import { Icon } from './icons';
import { Avatar, Link, explain, useData, useSite, Wait, when } from './ui';
import type { Profile, Review, ReviewStat } from './types';

export function Stars({value,size=16}:{value:number;size?:number}) {
  return <span className="rgv-stars" role="img" aria-label={`${value.toFixed(1)} / 5`}>
    {Array.from({length:5},(_,i)=><span key={i} className={i<Math.round(value)?'rgv-star-on':'rgv-star-off'}><Icon name="star" size={size}/></span>)}
  </span>;
}
export function RatingSummary({stat}:{stat?:ReviewStat}) {
  const {t}=useSite();
  return stat && stat.review_count>0
    ? <span className="rgv-rating"><Icon name="star" size={15}/><b>{Number(stat.rating_avg).toFixed(1)}</b><span>({stat.review_count})</span></span>
    : <span className="rgv-rating-empty">{t('Novo · Bez ocena','New · Not rated')}</span>;
}
export function Reviews({listingId,profileId,ownerId}:{listingId?:string;profileId?:string;ownerId:string}) {
  const {t,user,go,lang}=useSite();
  const [edit,setEdit]=useState(false);
  const [rating,setRating]=useState(5);
  const [body,setBody]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [nonce,setNonce]=useState(0);
  const key=(listingId?'l'+listingId:'p'+profileId)+'-'+nonce;
  const reviews=useData(async()=>{
    const results=await db.rows('reviews',listingId?{listing_id:listingId!}:{profile_id:profileId!},'*','created_at') as Review[];
    results.reverse();
    const authors=await Promise.all(Array.from(new Set(results.map(r=>r.reviewer_id))).map(id=>db.rows('profiles',{id})));
    const profiles=new Map(authors.flat().map(p=>[p.id,p]));
    return {results,profiles};
  },'reviews-'+key);
  const mine=reviews.data?.results.find(r=>r.reviewer_id===user?.id);
  const others=reviews.data?.results||[];
  const total=others.reduce((sum,r)=>sum+r.rating,0);
  const avg=others.length?total/others.length:0;
  const canReview=!!user && user.id!==ownerId;
  // The database also checks that the signed-in reviewer is not the listing owner.
  const start=()=>{setRating(mine?.rating||5);setBody(mine?.body||'');setEdit(true);setError('');setNotice('');};
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      await db.rpc('save_review',{target_listing:listingId||null,target_profile:profileId||null,stars:rating,note:body.trim()});
      setEdit(false);setNotice(t('Ocena je sačuvana.','Your review was saved.'));setNonce(n=>n+1);
      window.dispatchEvent(new Event('rg-ratings-refresh'));
    }catch(e){setError(explain(e,t));}finally{setBusy(false);}
  };
  return <section className="rgv-review-panel" id="ocene" aria-labelledby="rgv-reviews-title">
    <div className="rgv-review-heading"><div><p className="rgv-eyebrow">REVIEWS / REVLORD</p><h2 id="rgv-reviews-title">{t('Ocene i komentari','Ratings & reviews')}</h2>
      <p>{t('Stvarne ocene korisnika. Svaki korisnik može ostaviti jednu ocenu i kasnije je izmeniti.','Genuine community reviews. One review per user; edits are allowed.')}</p></div>
      <div className="rgv-score"><strong>{others.length?avg.toFixed(1):'—'}</strong><Stars value={avg}/><small>{others.length} {t('ocena','reviews')}</small></div>
    </div>
    {notice&&<p className="rgv-success" role="status">{notice}</p>}
    {!user ? <div className="rgv-review-prompt"><p>{t('Prijavi se da ostaviš ocenu.','Sign in to leave a review.')}</p><button className="secondary" onClick={()=>{sessionStorage.setItem('rg-return',location.pathname+'#ocene');go('/login');}}>{t('Prijavi se','Log in')}</button></div>
      : canReview && !edit && <button type="button" className="rgv-review-button" onClick={start}><Icon name="star" size={18}/>{mine?t('Izmeni svoju ocenu','Edit your review'):t('Napiši ocenu','Write a review')}</button>}
    {edit&&<form onSubmit={submit} className="rgv-review-form"><label>{t('Tvoja ocena','Your rating')}</label><div className="rgv-picker" role="group" aria-label={t('Izaberi ocenu od 1 do 5','Choose a rating from 1 to 5')}>
      {[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`${n} / 5`} aria-pressed={rating===n} onClick={()=>setRating(n)} className={n<=rating?'is-lit':''}><Icon name="star" size={29}/></button>)}
    </div><label htmlFor="rgv-review-body">{t('Komentar (5–1200 karaktera)','Comment (5–1200 characters)')}</label><textarea id="rgv-review-body" required minLength={5} maxLength={1200} rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder={t('Opiši svoje iskustvo sa ovim oglasom…','Describe your experience…')}/>
    <div className="rgv-review-form-actions"><button className="primary" type="submit" disabled={busy||body.trim().length<5}>{busy?t('Čuvanje…','Saving…'):t('Sačuvaj ocenu','Save review')}</button><button type="button" className="secondary" disabled={busy} onClick={()=>setEdit(false)}>{t('Otkaži','Cancel')}</button></div>
    {error&&<p className="notice" role="alert">{error}</p>}</form>}
    {!reviews.data?<Wait error={reviews.error}/>:!others.length?<p className="rgv-no-reviews">{t('Još nema ocena. Budi prvi koji će podeliti iskustvo.','No reviews yet. Be the first to share feedback.')}</p>:<div className="rgv-review-list">{others.map(r=>{
      const p=reviews.data!.profiles.get(r.reviewer_id) as Profile|undefined;
      return <article className="rgv-review" key={r.id}><div className="rgv-review-person"><Link to={'/talent/'+r.reviewer_id}><Avatar p={p}/><span><b>{p?.name||t('Korisnik','Member')}</b><time>{when(r.created_at,lang)}</time></span></Link><span className="rgv-review-star-row"><Stars value={r.rating}/></span></div><p className="rgv-review-text">{r.body}</p>{r.updated_at!==r.created_at&&<small>{t('Izmenjeno','Edited')}</small>}
      </article>;
    })}</div>}
  </section>;
}
