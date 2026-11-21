# Live chat — instalacija na postojeći RevLord Group sajt (21.11.2026)

**Zadržani su postojeći oglasi, nalozi, privatne poruke, obaveštenja i dizajn.** Novi *Live chat* je posebna zajednička soba dostupna prijavljenim korisnicima. Privatne poruke iz kartice *Poruke* se NE brišu automatski; pet sati važi isključivo za novi zajednički live chat.

## 1. Supabase baza (OBAVEZNO)

1. Uloguj se na **isti Supabase projekat** koji već koristi sajt.
2. U **Database → Extensions** uključi `pg_cron` (ako je dostupan) **pre** narednog koraka. To omogućava brisanje isteklih poruka u bazi svakog minuta, čak i ako niko ne otvori sajt.
3. Otvori **SQL Editor**, napravi novi upit i pokreni kompletan sadržaj fajla **`supabase/migrations/20261121_live_chat_5h.sql`**.
4. Proveri da SQL Editor prijavljuje uspešno izvršavanje.

**Ne pokreći `supabase/schema.sql` ponovo nad postojećim sajtom.** Nova migracija dodaje samo `live_chat_messages`, dva pravila pristupa i funkciju za čitanje razgovora, plus Realtime praćenje i opcioni cron zadatak. Ne menja postojeće privatne razgovore.

Ako `pg_cron` nije dostupan, istekle poruke se i dalje ne prikazuju posle 5 sati (ograničenje je u bazi i u aplikaciji), a stare stavke se fizički brišu čim bilo koji prijavljen korisnik otvori/osveži Live chat. Za **automatsko fizičko brisanje i kada sajt nema posetioce**, potreban je aktivan `pg_cron`. Ako ga uključiš kasnije, ponovo pokreni isti SQL fajl, što je bezbedno.

Ako je `pg_cron` uključen, aktivan zadatak možeš proveriti u SQL Editor-u:

```sql
select jobname, schedule, command
from cron.job
where jobname = 'rg-live-chat-five-hour-cleanup';
```

## 2. Objavi izmenjeni sajt

Zameni kod sajta kodom iz ovog ZIP-a. Zadrži postojeće `.env.local` ili hosting environment varijable (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` itd.). Lokalno: `npm install`, `npm run build`, pa objavi generisani `dist` po postojećem vodiču `REDIZAJN-2026-11-20-KORACI-ZA-OBJAVU.md`.

SQL migracija mora biti primenjena da bi Live chat zaista slao i čitao poruke. Samo otpremanje ZIP-a nije dovoljno. Bez migracije u Live chat kartici biće prikazana greška umesto lažnog razgovora.

## 3. Kako radi

- Klik na **kovertu** otvara postojeći prozor, sada sa dve kartice: **Poruke** i **Live chat**.
- **Poruke**: dosadašnji privatni razgovori, obaveštenja, brojač nepročitanih, brisanje četa samo za sebe — bez promene ponašanja.
- **Live chat**: zajednička soba za prijavljene korisnike. Prikazuju se korisnička imena, tekst i vreme. Poruke stižu preko Supabase Realtime veze, uz rezervno osvežavanje na 15 sekundi.
- Svaka live chat poruka ističe **5 sati od vremena slanja na serveru** (ne od vremena prijema). Klijent je skriva po isteku; SQL je ne vraća posle isteka. Sa aktivnim cron zadatkom redovi se brišu svakog minuta.
- Na **telefonu** se kartice otvaraju preko celog ekrana, sa **X** za izlaz. Na **računaru** ostaju pop-up ispod koverte.
- Moguće je slati Enter, a Shift+Enter unosi novi red. Ograničenje po poruci: 1000 znakova.

Za proveru: prijavi se sa dva različita naloga na dve kartice/uređaja, pošalji poruku u Live chat i potvrdi da se pojavljuje na oba. Zatim prebaci na Poruke i proveri da su stari privatni razgovori i obaveštenja na mestu.
