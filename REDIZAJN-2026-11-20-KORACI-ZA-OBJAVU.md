# REVLORD GROUP — završeni redizajn 20.11.2026.

**VAŽNO:** Ovo je ažuriran kompletan kod sajta iz tvog ZIP-a, ne samo koncept. NISAM pristupao produkcionom Supabase nalogu niti zamenio sajt na Cloudflare Pages. Funkcije baze i Web Push slanja zahtevaju sledeće korake.

## Šta je već izmenjeno u kodu

1. **Naslovna:** desna hero kartica sada prikazuje isključivo dostavljeni originalni banner `/public/art/revlord-group-banner.jpg` (720 × 405, 16:9), bez `cover` sečenja, uvećavanja, animiranja ili teksta preko njega. Mali znak u navigaciji ostaje.
2. **Naslovna:** kompletno uklonjena sekcija `03 / DISCOVER TALENT — Services & portfolios`. Odeljak `Open opportunities / Otvoreni poslovi` ostaje kao 03.
3. **Istraživanje:** kategorije su prvobitno skrivene, uključujući početnu stranicu; klik na **Istraži po oblastima** otvara novi veliki dialog na računaru i bottom sheet na telefonu. Prikazuje stvarne kategorije i ugnježdene specijalizacije iz postojeće baze. Radi pretraživanje, nazad, ukloni izbor, prikaži rezultate.
4. **Oglasi:** nove kompaktne kartice za usluge **i** poslove sa autorom, avatarom, veštinama, opisom, cenom/budžetom, prosečnom ocenom ako je ima, dugmetom za detalje i kontaktom / prijavom. Postojeći način kontaktiranja (bez pristupa tuđim razgovorima) ostaje.
5. **Ocene:** SQL tabela sa jednom ocenom autora po oglasu, kao i po javnom profilu; 1–5 zvezdica, komentar, ime i datum autora, izmena postojeće ocene i 15 s pauze između uzastopnih uređivanja. Baza sprečava samostalno ocenjivanje svog oglasa/profila. Ne koristi se fiktivan prosek.
6. **Rangiranje:** oglasi sa boljim ocenama i više recenzija idu više. Formula u SQL pogledu smanjuje veštački uticaj jedne jedine ocene. Oglasi bez ocena idu iza ocenjenih, a unutar nerangiranih najnoviji pre starijih. Korisnik može izabrati „Najnoviji“ ili „Najstariji“.
7. **Pretraga:** budžet se poredi samo unutar izabrane valute; korigovano je tumačenje nulte gornje granice.
8. **Poruke i obaveštenja:** postojeći Realtime inbox je povezan sa dizajniranim popupom „Nova poruka Revlord-Group“ kad stigne nova nepročitana poruka. Pripremljena je podrška za sistemski push preko browser Service Workera, Supabase tabela i Edge Function servisa sa privatnim VAPID ključevima. Obaveštenja se odobravaju tek klikom korisnika; postoje i isključivanje i zaštita privatnosti sadržaja poruke.
9. **Mobilni izgled:** novi CSS za 320/360/390/430 px, 768 i 1440 px; ekran za kategorije, kartice i chat prilagođeni malom uređaju.
10. **Ikonice:** ubačena dostavljena ICO ikonica kao favicon i izvezena za PWA i push notifikacije.

## Obavezno: sačuvaj postojeći projekat i bazu

- Napravi backup Supabase baze i Storage pre novih SQL migracija.
- Na Cloudflare Pages-u koristi iste postojeće `VITE_SUPABASE_URL` i `VITE_SUPABASE_PUBLISHABLE_KEY` vrednosti. Nikad ne postavljaj servisni ključ ili privatni VAPID ključ u frontend varijable.
- U `supabase/migrations/` su stare migracije ostavljene netaknute. **Ako su već primenjene, ne pokreći ih ponovo.** Nova migracija je `20261120_reviews_and_push.sql`.

## Korak A — aktiviraj ocene u Supabase-u

1. Otvori svoj Supabase projekat, napravi backup.
2. U **SQL Editor-u** kopiraj i pokreni **samo** `supabase/migrations/20261120_reviews_and_push.sql` nakon prethodnih migracija.
3. Proveri da u **Table Editor-u** postoji `public.reviews`, `public.push_subscriptions`, `public.push_delivery_log`, a u pregledima `public.listing_review_stats` i `public.profile_review_stats`.
4. Registruj dva različita test naloga. Sa prvim objavi uslugu, sa drugim oceni uslugu, proveri zvezdice, ime i datum, zatim izmeni ocenu nakon 15 sekundi. Drugi pokušaj stvaranja dodatne ocene za isti oglas mora ažurirati postojeći zapis.
5. Proveri da autor ne može da oceni sopstveni oglas, čak ni direktnim API pozivom.
6. Proveri rangiranje u `/services` i `/projects` posle ostavljanja više ocena.

Ocene će biti prazne dok stvarni korisnici ne počnu da ih ostavljaju. SQL ne unosi izmišljene komentare i ne briše stara korisnička podešavanja.

## Korak B — aktiviraj browser notifikacije

### 1. Popup dok je sajt otvoren

Prikaz obaveštenja je već dodat u `src/Inbox.tsx`. Kada je osoba prijavljena i sajt ima aktivan Supabase Realtime, prikazuje se zelena kartica za novu nepročitanu poruku sa prečicom za otvaranje razgovora. Ako realtime privremeno nije dostupan, inbox proverava bazu periodično.

### 2. Web Push i kada sajt nije otvoren

Sama statična Cloudflare Pages stranica **ne može slati pozadinske push poruke**. Potreban je serverski deo koji je uključen u projekat.

1. Generiši jedan Web Push **VAPID** javni i privatni ključ (na primer preko alata `web-push`).
2. U Cloudflare Pages `Environment variables` dodaj **samo javni** ključ: `VITE_VAPID_PUBLIC_KEY`. Dodaj ga i u lokalni `.env.local` ako koristiš lokalni razvoj.
3. U Supabase Edge Function secrets postavi:
   - `VAPID_PUBLIC_KEY` = javni ključ iz prvog koraka;
   - `VAPID_PRIVATE_KEY` = **privatni** ključ (nikad u repo ili Vite konfiguraciju);
   - `VAPID_SUBJECT` = kontakt u obliku `mailto:adresa@tvoj-domen.tld`;
   - `RG_WEBHOOK_SECRET` = sopstvena dugačka slučajna tajna vrednost;
   - `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` treba da budu dostupni Edge Function okruženju.
4. Iz korena projekta uz podešen Supabase CLI objavi `supabase/functions/notify-message/index.ts`:
   `supabase functions deploy notify-message --no-verify-jwt`
5. U Supabase **Database Webhooks** postavi novi webhook: `public.messages` → `INSERT`, cilj je URL objavljene `notify-message` Edge Function. Postavi HTTP header `x-webhook-secret` na identičnu vrednost `RG_WEBHOOK_SECRET`. Bez njega Edge Function odbija poziv.
6. Napravi novi Cloudflare Pages deployment sa javnim VAPID ključem, učitaj stranicu u HTTPS pregledaču i prijavi se. U inboxu klikni **Uključi obaveštenja** i dozvoli sistemski prompt.
7. Sa drugog naloga pošalji poruku. Proveri u otvorenoj kartici, u pozadini i na instaliranoj mobilnoj aplikaciji kada preglednik to podržava. Na iPhone-u je često potrebno otvoriti sajt kao instaliranu web-aplikaciju (Add to Home Screen).
8. Klikom na sistemsku notifikaciju otvara se bezbedan link do razgovora. Pri odjavi se uređaj odjavljuje iz push pretplate. U inboxu postoji i **Isključi obaveštenja**.

Sistemski izgled notifikacije kontroliše Android/iOS/Windows/macOS i pregledač; prilagođeni zeleni dizajn važi za popup **unutar sajta**. Namerno ne prikazujemo privatni tekst poruke na zaključanom ekranu. Server grupiše više poruka u istom razgovoru u periodu od oko 25 sekundi radi manje spama.

### Ne stavljaj u frontend

`VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RG_WEBHOOK_SECRET` — sve ove vrednosti moraju ostati isključivo serverski secrets.

## Korak C — objavi novi frontend na Cloudflare Pages-u

1. Instaliraj Node.js 22 ili kompatibilnu verziju.
2. U projektu pokreni `npm ci` (računar mora da ima pristup npm registru).
3. Za lokalni razvoj kopiraj `.env.example` u `.env.local` i zameni javne placeholder vrednosti svojim postojećim podacima; nikada ne otkrivaj ključeve u chatu.
4. Pokreni `npm run build`; Cloudflare Pages build command treba da bude `npm run build`, a output folder `dist`.
5. Postavi svoj obnovljeni ZIP/repo na isti Cloudflare projekat, uz očuvanje `public/_redirects` datoteke.
6. Pre javnog objavljivanja proveri navedene liste na stvarnom telefonu i PC-u.

## Kriterijumi prihvatanja

- Na 320, 360, 390, 430, 768 i 1440 px nema horizontalnog skrola, odsečenog RevLord bannera ili preklopljenih dugmadi.
- Klik na **Istraži po oblastima** na naslovnoj ili u katalogu otvara panel, radi izbor kroz nivoe i zatvaranje/ESC; automatski se ne otvara na prvoj poseti.
- Usluge i poslovi imaju kartice, identitet autora, veštine, budžet/cenu i pravu putanju za kontakt/prijavu.
- Ocene rade u stvarnoj bazi sa dva različita naloga; jedna ocena po autoru i cilju, uređivanje postojeće, prosek i sortiranje.
- Slanje/čitanje poruka i dalje radi; korisnik ne vidi tuđe razgovore. Za kompletne push notifikacije Webhook, Edge Function i VAPID ključ moraju biti aktivni.
- Nisu obrisani postojeći profili, razgovori, oglasi, portfolio podaci ili prijave za poslove.

## Provere urađene u radnom okruženju

- 10 prethodnih i 24 nova offline testa prolaze (`node tests/check-upgrade.mjs` i `node tests/check-redesign.mjs`).
- 16 JS/TS/TSX datoteka prolazi proveru sintakse kroz TypeScript transpiler.
- Test prikaza CSS-a u headless Chromium-u rađen je na 320, 360, 390, 430, 768 i 1440 px; nema horizontalnog overflow-a, logo je 16:9 u svakom prikazu.
- **Nije potvrđen pun Vite build, Supabase integracija ili produkciona dostava Web Push-a.** U ovom radnom okruženju npm registry DNS nije dostupan. Nemoj tvrditi da je produkciono testirano dok se ne urade Koraci A–C.
