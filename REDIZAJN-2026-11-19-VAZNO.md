# RevLord Group — neon redizajn / bez menjanja baze i naloga

Ova verzija nastavlja postojeći React + Vite + Supabase projekat. Zadržani su:
- postojeći Cloudflare Pages / GitHub postupak objavljivanja;
- Supabase URL i postojeći publishable key (vrednosti se podešavaju u Cloudflare environment variables, nisu upisane u kod);
- Google prijavljivanje, nalozi, oglasi, poruke, portfolio, rezervacije i prijave na projekte;
- putanje za pojedinačne oglase, profil i editor; logo i naziv ostaju isti.

## Šta je promenjeno

- `src/shell.tsx`: nova desktop navigacija i mobilni popup (Početna, Napravi oglas za posao, Ponudi svoje veštine, Pretraži oglase, Moj profil, Odjavi se); SR/EN neposredno levo od koverte; neprijavljeni korisnik vidi Prijavi se umesto koverte.
- `src/Catalog.tsx`: redizajnirana početna strana sa pristupom stvarnim oglasima, 7 kategorija iz baze, koracima za saradnju, pretragom i CTA dugmadima; preglednije hijerarhijske kategorije i filteri (budžet, valuta, tip posla, sortiranje, aktivni filteri, reset).
- `src/revamp.css`: novi responsive dark/neon identitet, animirani zeleni lava glow ispod menija, kartice, sticky navigacija, stilovi profila i obrazaca, podrška `prefers-reduced-motion`.
- `src/Inbox.tsx`: postojeća koverta i crveni broj ostaju, novi prikaz poruka ima dugme „Izbriši čet“ sa potvrdom.
- `src/db.js`, `src/db.d.ts`, `src/Messages.tsx`: nova funkcija za uklanjanje četa samo iz ličnog sandučeta. Ako migracija nije izvršena, stara istorija poruka nastavlja da radi; dugme za uklanjanje zahteva novu migraciju.
- `src/icons.tsx`, `src/main.tsx`, `index.html`, `tests/check-upgrade.mjs`: dodatne ikonice, povezivanje CSS-a, boja stranice i statičke provere.

## Obavezno pre korišćenja „Izbriši čet“

**Prvo napravi backup baze** preko postojećeg Supabase postupka za rezervnu kopiju. U postojećem Supabase projektu otvori **SQL Editor → New query** i jednom pokreni SAMO novu migraciju:

`supabase/migrations/20261119_revlord_redesign.sql`

Ova migracija:
1. dodaje samo tabelu `public.chat_hides`;
2. dodaje RPC `delete_chat_for_me(uuid)` i `chat_history(uuid)`;
3. menja postojeću `inbox_overview()` funkciju da sakrije razgovor **samo korisniku koji ga je uklonio**;
4. ne briše ni jednu postojeću poruku niti zajednički razgovor; ako stigne nova poruka nakon uklanjanja, razgovor se ponovo pojavljuje.

**NE pokretati ponovo `supabase/schema.sql`.** Ne treba praviti novu bazu. Ne treba ponavljati stari seed kategorija ako 135 kategorija već postoji.

## Kako objaviti bez rizika

1. Na GitHub-u prvo kreiraj novu granu (npr. `neon-redesign`) i ubaci **sadržaj** raspakovanog ZIP-a u root projekta; nikada ne ubacuj `node_modules` ni `.env.local`.
2. Sačuvaj backup postojeće baze i pokreni novu migraciju u postojećem Supabase SQL Editor-u.
3. Pokreni `npm ci` pa `npm run build` na svom računaru i proveri da nema TypeScript ili Vite grešaka.
4. Objavi preview build iz grane i proveri aplikaciju pre spajanja u `main`.
5. Kad pregled prođe, spoji granu u `main`; Cloudflare Pages koristi `npm run build` i output `dist`.
6. Ostavi postojeće promenljive `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` i, ako se koristi, `VITE_EMAIL_AUTH`. Ne unositi `service_role` ili Google Client Secret u frontend.

## Šta testirati posle objave

- **Neprijavljen korisnik:** Prijavi se, dugme menija, SR/EN, početna, kategorije, pretraga.
- **Prijavljen developer:** koverta, popup sa porukama, broj nepročitanih, ponudi veštine, portfolio, uređivanje profila.
- **Prijavljen klijent:** napravi oglas za posao, pretraži usluge, pošalji poruku, podnesi prijavu.
- **Izbriši čet:** ukloni samo iz svog sandučeta, proveri da druga strana i dalje vidi istoriju; kada pristigne nova poruka, čet se vraća.
- **Širine ekrana:** 320, 375, 390, 430, 768, 1024, 1440 px; navigacija, popup, filteri, kartice, profil, forma, slike.
- **Supabase RLS:** druga osoba ne sme menjati tuđi profil, oglase, slike, poruke.

## Realno stanje testiranja u pripremnom okruženju

- Sintaksa lokalnih TypeScript/TSX/JavaScript izvora: **proverena, bez prijavljenih sintaksnih grešaka**.
- `node tests/check-upgrade.mjs`: **10 statičkih provera prolazi**.
- Novi CSS: uspešno parsiran.
- `npm ci`, `npm run build` i PGlite integracioni testovi: **nisu mogli da budu izvršeni** jer npm paketi nisu dostupni u ovom okruženju.
- Živi Supabase, Cloudflare produkcija i stvarno vizuelno testiranje na svih 7 širina: **nisu izvršeni**. Prvo koristiti preview granu.

## O ocenama

Nisu dodate izmišljene ocene ili komentari koji bi se predstavljali kao stvarne recenzije. Početna strana koristi stvarne oglase iz baze i prikazuje mogućnosti i način rada platforme bez lažnih brojki.
