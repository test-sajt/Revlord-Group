import React, { useState } from 'react';
import * as db from './db';
import { safeLink, videoEmbed } from './data';
import type { Listing, Work } from './types';
import { Category, field, Field, Form, Link, SignedImage, Task, useData, useSite, Wait } from './ui';
import { Missing, pathOf } from './Catalog';
// Nacrti i objave koriste isti obrazac. Tek izbor javnog statusa prikazuje oglas u katalogu.
export function Editor({
  id,
  kind
}: {
  id?: string;
  kind: 'service' | 'project';
}) {
  const {
    user
  } = useSite();
  const q = useData(async () => id ? (await db.rows('listings', {
    id,
    owner_id: user!.id
  }))[0] || null : null, 'edit' + id + user?.id);
  if (q.data === undefined) return <div className="wrap page"><Wait error={q.error} /></div>;
  if (id && !q.data) return <Missing />;
  return <EditForm l={q.data} kind={q.data?.kind || kind} />;
}
function EditForm({
  l,
  kind
}: {
  l: Listing | null;
  kind: 'service' | 'project';
}) {
  const ctx = useSite(),
    {
      t,
      go,
      user
    } = ctx;
  const [cat, setCat] = useState(l?.category || ctx.url.searchParams.get('category') || ctx.me?.category || 'development');
  return <section className="wrap page narrow">
    <p className="eyebrow">{kind === 'service' ? t('Usluge', 'Services') : t('Projekti', 'Projects')}</p>
    <h1>{l ? t('Uredi oglas', 'Edit listing') : kind === 'service' ? t('Predstavi svoju uslugu', 'List your service') : t('Objavi projekat', 'Post a project')}</h1>
    <Form label={t('Sačuvaj izmene', 'Save changes')} save={async f => {
      const ref = field(f, 'reference');
      if (ref && !safeLink(ref)) throw Error(t('Unesi HTTPS adresu reference.', 'Enter an HTTPS reference URL.'));
      const status = field(f, 'status') as Listing['status'];
      const body = field(f, 'body');
      if (status !== 'draft' && body.length < 10) throw Error(t('Opis treba da ima najmanje 10 znakova.', 'Enter at least 10 characters in the description.'));
      const data = {
        title: field(f, 'title'),
        category: cat,
        specialty: field(f, 'spec'),
        body,
        tags: field(f, 'tags'),
        price: field(f, 'price') ? Number(field(f, 'price')) : null,
        deadline: field(f, 'deadline') || null,
        reference_url: ref,
        status
      };
      const item = l ? await db.update('listings', l.id, data) : await db.insert('listings', {
        ...data,
        owner_id: user!.id,
        kind
      });
      ctx.refresh();
      go(kind === 'service' && !l ? '/edit/' + item.id : pathOf(item));
    }}>
      <Field name="title" required maxLength={150} value={l?.title} label={t('Naziv oglasa', 'Listing title')} />
      <Field name="body" type="textarea" maxLength={12000} value={l?.body} label={kind === 'project' ? t('Šta želiš da se napravi?', 'What do you need built?') : t('Šta klijent dobija?', 'What will the client receive?')} />
      <Category value={cat} change={setCat} />
      <Field name="spec" value={l?.specialty || ctx.url.searchParams.get('spec') || ctx.me?.specialty} label={t('Specijalizacija ili platforma', 'Specialisation or platform')} />
      <Field name="tags" value={l?.tags} label={t('Veštine i alati (odvojeni zarezom)', 'Skills and tools (comma separated)')} />
      <Field name="price" type="number" min="0" value={l?.price} label={t('Budžet u evrima (prazno za dogovor)', 'Budget in euros (leave blank to negotiate)')} />
      <Field name="deadline" type="date" value={l?.deadline} label={t('Rok (opciono)', 'Deadline (optional)')} />
      <Field name="reference" type="url" value={l?.reference_url} label={t('HTTPS referenca (opciono)', 'HTTPS reference (optional)')} />
      <label>
        {t('Vidljivost', 'Visibility')}
        <select name="status" defaultValue={l?.status || 'draft'}>
          <option value="draft">{t('Privatan nacrt', 'Private draft')}</option>
          <option value="published">{t('Javno objavljeno', 'Published publicly')}</option>
          {l && <option value="closed">{t('Zatvoreno', 'Closed')}</option>}
        </select>
      </label>
    </Form>
    {l && <div className="band">
      <Link className="text-link" to={pathOf(l)}>{t('Pregled oglasa', 'Preview listing')}</Link>
      {kind === 'service' && <WorksEditor listing={l} />}
    </div>}
    {!l && kind === 'service' && <p>{t('Sačuvaj nacrt da dodaš slike i video pre objavljivanja.', 'Save a draft to add images and video before publication.')}</p>}
  </section>;
}
function WorksEditor({
  listing
}: {
  listing: Listing;
}) {
  const ctx = useSite(),
    {
      t
    } = ctx;
  const [edit, setEdit] = useState<Work | null>(null),
    [formKey, reset] = useState(0);
  const q = useData(() => db.rows('works', {
    listing_id: listing.id
  }, '*', 'position'), 'editor-works' + listing.id);
  async function move(id: string, d: number) {
    await db.rpc('move_work', {
      work: id,
      direction: d
    });
    ctx.refresh();
  }
  return <section>
    <h2>Portfolio</h2>
    {!q.data ? <Wait error={q.error} /> : q.data.map((w, i) => <div className="manage-row" key={w.id}>
      {w.image_path && <SignedImage path={w.image_path} alt={w.title} />}
      <b>{w.title}</b>
      <div className="actions">
        <button onClick={() => setEdit(w)}>{t('Izmeni', 'Edit')}</button>
        <Task className="secondary" disabled={!i} run={() => move(w.id, -1)}>↑</Task>
        <Task className="secondary" disabled={i === q.data!.length - 1} run={() => move(w.id, 1)}>↓</Task>
        <Task className="secondary" run={async () => {
          if (!confirm(t('Ukloniti ovaj rad iz portfolija?', 'Remove this work from the portfolio?'))) return;
          await db.remove('works', w.id);
          if (w.image_path) await db.dropFile('portfolio', w.image_path);
          if (edit?.id === w.id) setEdit(null);
          ctx.refresh();
        }}>{t('Ukloni', 'Remove')}</Task>
      </div>
    </div>)}
    <h3>{edit ? t('Izmeni rad', 'Edit work') : t('Dodaj rad', 'Add work')}</h3>
    <Form key={(edit?.id || 'new') + formKey} label={t('Sačuvaj rad', 'Save work')} save={async f => {
      const file = f.get('image') as File;
      const video = field(f, 'video');
      if (video && !videoEmbed(video)) throw Error(t('Unesi YouTube ili Vimeo link ka videu.', 'Enter a YouTube or Vimeo video URL.'));
      let image = edit?.image_path || '';
      if (file.size) image = await db.upload('portfolio', listing.owner_id + '/' + listing.id + '/' + crypto.randomUUID(), file);
      if (!video && !image) throw Error(t('Dodaj sliku ili video.', 'Add an image or a video.'));
      const data = {
        title: field(f, 'title'),
        contribution: field(f, 'contribution'),
        video,
        image_path: image
      };
      try {
        if (edit) await db.update('works', edit.id, data);else await db.insert('works', {
          ...data,
          listing_id: listing.id,
          position: (q.data?.at(-1)?.position ?? 0) + 1
        });
      } catch (e) {
        if (file.size) await db.dropFile('portfolio', image);
        throw e;
      }
      if (edit?.image_path && edit.image_path !== image) await db.dropFile('portfolio', edit.image_path);
      setEdit(null);
      reset(x => x + 1);
      ctx.refresh();
    }}>
      <Field required maxLength={150} name="title" value={edit?.title} label={t('Naziv rada', 'Work title')} />
      <Field name="contribution" type="textarea" value={edit?.contribution} label={t('Opis rada i tvoj doprinos', 'Description and your contribution')} />
      <label>
        {t('Slika (do 4 MB)', 'Image (up to 4 MB)')}
        <input type="file" name="image" accept="image/png,image/jpeg,image/webp" />
      </label>
      <Field name="video" type="url" value={edit?.video} label="YouTube / Vimeo" />
    </Form>
    {edit && <button onClick={() => setEdit(null)}>{t('Otkaži izmenu', 'Cancel edit')}</button>}
  </section>;
}
