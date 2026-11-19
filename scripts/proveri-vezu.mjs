// Provera koristi iste JAVNE vrednosti kao sajt. Izvršava isključivo čitanja.
import {createClient} from '@supabase/supabase-js';

const url=process.env.VITE_SUPABASE_URL;
const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url?.startsWith('https://') || !key?.startsWith('sb_publishable_')) {
  console.error('Proveri Project URL i Publishable key u .env.local.');
  process.exit(1);
}
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
try {
  for (const table of ['profiles','listings','works','slots']) {
    const {error}=await db.from(table).select('id').limit(1);
    if (error) throw Error(table+' — '+error.message);
    console.log('U redu: javni upit za '+table);
  }
  for (const table of ['messages','bookings','applications','threads','admins','moderation_log']) {
    const {error}=await db.from(table).select('*').limit(1);
    if (error?.code!=='42501') throw Error('Proveri dozvole za '+table+' ('+(error?.message||'dozvoljeno anonimno čitanje')+').');
  }
  const {data,error}=await db.auth.getSession();
  if (error || data.session) throw Error('Provera mora biti anonimna.');
  console.log('U redu: privatne tabele odbijaju anonimni zahtev. Sledeća provera je prijava u pregledaču.');
} catch (err) {
  console.error('Povezivanje nije potvrđeno. '+err.message);
  process.exitCode=1;
}

