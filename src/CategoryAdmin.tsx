import React, { useState } from 'react';
import * as db from './db';
import { categoryParents, categoryTitle, field, Form, useCategories, useSite, Task, Wait } from './ui';
import type { CategoryNode } from './types';

// Admins manage the tree without deploying new JavaScript. Linked categories cannot be deleted.
export function CategoryAdmin() {
  const { t, lang, refresh } = useSite();
  const nodes = useCategories();
  const [selected, setSelected] = useState('');
  const [parent, setParent] = useState('');
  if (!nodes.data) return <Wait error={nodes.error} />;
  const current = nodes.data.find(n => n.id === selected);
  const roots = nodes.data.filter(n => !n.parent_id);
  const forbiddenParents = current ? nodes.data.filter(n => categoryParents(nodes.data!, n.id).includes(current.id)).map(n => n.id) : [];
  return <section className="admin-categories">
    <h2>{t('Kategorije i podkategorije', 'Categories and subcategories')}</h2>
    <p>{t('Možeš dodati novu kategoriju, promeniti naziv i vidljivost ili obrisati kategoriju bez povezanih oglasa i potomaka.', 'Add categories, change names and visibility, or delete unused categories without children.')}</p>
    <div className="filters">
      <label>{t('Izaberi za izmenu', 'Choose to edit')}
        <select value={selected} onChange={e => { setSelected(e.target.value); setParent(''); }}>
          <option value="">{t('Nova kategorija', 'New category')}</option>
          {nodes.data.map(n => <option key={n.id} value={n.id}>{'— '.repeat(Math.max(0, categoryParents(nodes.data!, n.id).length - 1))}{categoryTitle(n, lang)} {!n.active ? ' (skriveno)' : ''}</option>)}
        </select>
      </label>
    </div>
    <Form key={selected || 'new'} label={t('Sačuvaj kategoriju', 'Save category')} save={async f => {
      const data: Partial<CategoryNode> = {
        name_sr: field(f, 'name_sr'), name_en: field(f, 'name_en'),
        parent_id: field(f, 'parent') || null,
        sort_order: Number(field(f, 'sort_order') || '0'), active: f.get('active') === 'on',
        icon: field(f, 'icon') || 'folder'
      };
      if (!data.name_sr || !data.name_en) throw Error(t('Naziv je obavezan.', 'The title is required.'));
      if (current) await db.update('categories', current.id, data);
      else {
        const slug = data.name_en!.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55) || 'category';
        await db.insert('categories', { ...data, id: slug + '-' + crypto.randomUUID().slice(0, 8) });
      }
      setSelected(''); refresh();
    }}>
      <label>{t('Nadkategorija (prazno = glavna)', 'Parent category (empty = top level)')}
        <select name="parent" defaultValue={current?.parent_id || parent}>
          <option value="">{t('Glavna kategorija', 'Top level')}</option>
          {nodes.data.filter(n => !forbiddenParents.includes(n.id) && categoryParents(nodes.data!, n.id).length < 3).map(n => <option key={n.id} value={n.id}>{categoryTitle(n, lang)}</option>)}
        </select>
      </label>
      <label>{t('Naziv na srpskom', 'Serbian title')}<input name="name_sr" required maxLength={100} defaultValue={current?.name_sr || ''} /></label>
      <label>{t('Naziv na engleskom', 'English title')}<input name="name_en" required maxLength={100} defaultValue={current?.name_en || ''} /></label>
      <label>{t('Ikonica', 'Icon')}<select name="icon" defaultValue={current?.icon || 'folder'}>{['folder','code','pen','box','web','film','globe','terminal'].map(x => <option key={x} value={x}>{x}</option>)}</select></label>
      <label>{t('Redosled', 'Order')}<input name="sort_order" type="number" defaultValue={current?.sort_order || 0} /></label>
      <label className="check"><input type="checkbox" name="active" defaultChecked={current?.active ?? true} />{t('Vidljivo korisnicima', 'Visible to users')}</label>
    </Form>
    {current && <div className="actions">
      <Task className="secondary" run={async () => {
        if (!window.confirm(t('Trajno obrisati kategoriju? Ovo radi samo ako nije korišćena.', 'Permanently delete unused category?'))) return;
        await db.remove('categories', current.id); setSelected(''); refresh();
      }}>{t('Obriši nekorišćenu kategoriju', 'Delete unused category')}</Task>
      <button type="button" onClick={() => setSelected('')}>{t('Otkaži izmenu', 'Cancel edit')}</button>
    </div>}
    <p className="note">{t('Postojeći oglasi se ne menjaju automatski. Sakrij kategoriju umesto brisanja kada je već korišćena.', 'Existing advertisements are not changed. Hide a category instead of deleting it if already used.')}</p>
  </section>;
}
