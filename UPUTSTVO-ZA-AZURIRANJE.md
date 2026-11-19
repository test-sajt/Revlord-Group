# RevLord Group — ažuriranje postojeće platforme (19. novembar 2026.)

**Ovo je nadogradnja postojećeg Vite/React + Supabase + Cloudflare Pages projekta, a ne novi sajt.** Svi postojeći SQL objekti u `supabase/schema.sql` ostaju neizmenjeni. **NE izvršavati `supabase/schema.sql` ponovo na produkcionoj bazi** — on je predviđen za instalaciju u novu, praznu bazu. Ne menjati Project URL, Supabase Project ID, OAuth klijent, domen ni naloge.

## Redosled za bezbedno puštanje u rad

1. U Supabase Dashboard-u napravi **backup baze pre migracije**, i posebno preuzmi kopiju konfiguracije Storage/Authentication. Ako je produkcija aktivna, izaberi miran termin za migraciju. Sačuvaj postojeći Git commit kao rezervnu verziju sajta.
2. U **postojećem** Supabase projektu otvori **SQL Editor → New query**, nalepi sadržaj fajla `supabase/migrations/20261119_revlord_upgrade.sql` i izvrši ga **jednom**. Ovo dodaje tabele/kolone/funkcije/politike i 135 kategorija i podkategorija, bez `DROP TABLE`, brisanja oglasa ili korisnika. `BEGIN/COMMIT` garantuje celovitu SQL migraciju. Ako migracija prijavi grešku, ne objavljuj frontend koji očekuje nove kolone — prvo reši grešku i proveri stanje transakcije.
3. U **Table Editor** proveri da postoje `categories`, `listing_images` i `portfolio_projects` i nove kolone `profiles`, `listings` i `threads`. U Storage proveri novi privatni bucket `listing-images`; postojeći `avatars` i `portfolio` moraju ostati. Proveri da su kategorije unesene i da nema dupliranih ID-jeva.
4. U GitHub repozitorijumu `Revlord-Group` (povezanom sa Cloudflare Pages projektom) **zameni izmenjene fajlove iz ZIP-a**, uz očuvanje svog postojećeg `.env.local` (ako ga imaš lokalno). Nemoj uploadovati `.env.local` ili tajne ključeve u GitHub. Najbezbednije je otvoriti novi Git branch, pregledati izmene, a zatim spojiti u `main`.
5. Lokalno, na računaru sa Node.js 20+ i pristupom npm registru:

```bash
npm ci
npm run build
npm test
npm run dev
```

6. U Cloudflare → Workers & Pages → `revlord-group` proveri da je povezano isto GitHub skladište i `main` branch. Build command: `npm run build`, output: `dist`, framework Vite, root `/`. Nakon slanja Git izmena Cloudflare Pages automatski pravi novo izdanje. Ne pravi novi Pages projekat, jer bi to promenilo domen.
7. Proveri HTTPS na `https://revlord-group.pages.dev/` i izvrši test iz liste ispod kao prijavljeni korisnik, drugi korisnik, moderator i gost.

## Potrebne environment promenljive (Cloudflare Pages → Settings → Variables and Secrets)

| Promenljiva | Šta uneti |
| --- | --- |
| `VITE_SUPABASE_URL` | **Postojeća** `https://<projekat>.supabase.co` adresa. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Postojeći JAVNI** ključ sa prefiksom `sb_publishable_` iz Supabase-a. |
| `VITE_EMAIL_AUTH` | Opciono `true` ako je e-mail lozinka omogućena u Supabase Auth-u. |

**Ne unositi** `service_role`, Google Client Secret, JWT secret ili baznu lozinku u `VITE_` promenljive ili GitHub. Google OAuth ostaje pod istim Google Cloud projektom i postojećim Supabase callback URL-om. U Supabase Auth → URL Configuration proveri Site URL `https://revlord-group.pages.dev` i dozvoljene callback URL-ove (postojeći `/auth/callback` i `/auth/reset`). Ako koristiš drugi domen ili preview deployment, dodaj samo odgovarajuće dozvoljene adrese. Nema potrebe za novim OAuth klijentom niti novim korisničkim nalozima.

## Šta je dodato / promenjeno

| Deo | Fajlovi | Funkcija |
| --- | --- | --- |
| Poruke u zaglavlju | `src/Inbox.tsx` (novo), `src/shell.tsx`, `src/Messages.tsx`, `src/Dashboard.tsx`, `src/workspace.css`, `src/style.css` | Koverta u header-u na desktopu i telefonu, crvena oznaka nepročitanih, popup lista razgovora i mali chat popup; Realtime + 20 s rezervno osvežavanje. Nema dupliranja poruka. |
| Kategorije / napredna pretraga | `src/Catalog.tsx`, `src/ui.tsx`, `src/data.ts`, `src/CategoryAdmin.tsx` (novo) | 7 glavnih oblasti, trostepena hijerarhija, admin uređivanje, breadcrumb nazad, pretraga, budžet, valuta, tip posla, sortiranje i reset. Nasleđeni oglasi ostaju vidljivi. |
| Oglasi / slike | `src/Editor.tsx`, `src/Catalog.tsx`, `src/db.js` | Cover + galerija (max 5), lokalni pregled pre objave, siguran upload u Storage, pregled pre slanja, valute i tip posla, obrisati ako nema povezanih zahteva; u suprotnom zatvori. Stari radovi `works` ostaju. |
| Profili / portfolio | `src/Account.tsx`, `src/Catalog.tsx`, `src/main.tsx` | Cover, avatar, username, bio, detaljan opis, veštine, linkovi, dostupnost, samostalni projekti sa galerijama. |
| Tipovi / API | `src/types.ts`, `src/db.d.ts`, `src/db.js` | Novi modeli, potpisani URL-ovi, RPC za inbox i slike. |
| SQL migracija | `supabase/migrations/20261119_revlord_upgrade.sql` (novo) | Nove tabele, kolone, RLS politike, Storage bucket, admin upravljanje i SQL functions `inbox_overview`, `mark_thread_read`, `save_listing_gallery`. |
| Testovi / pokretanje | `tests/integration.mjs`, `tests/bootstrap.mjs`, `package.json`, `README.md` | Testiranje stare šeme plus dodatne migracije. |

## Provera nakon objave (VAŽNO)

- Odjavljeni posetilac vidi **stvarne** javne oglase i profile, ali ne vidi razgovore niti nacrte.
- Registracija i Google login ne traže pravljenje novih naloga. E-mail auth testirati samo ako je omogućen.
- Korisnik A pošalje korisniku B poruku. B vidi crveno `1` na koverti i na telefonu i na desktopu; kada otvori razgovor, broj se smanjuje na 0. Osvežavanje stranice ne vraća već pročitanu poruku.
- Korisnik C ne može čitati razgovor A↔B ni pozvati RPC za čitanje tuđeg razgovora.
- Kreiraj oglas: naslov, kategorija → potkategorija → specijalizacija, naslovna i ostale slike, do 5, cena i valuta, tip posla, preview, objavi. Pogledaj istu sliku u kartici i detalju.
- Odbij JPG/PNG/WebP datoteku veću od 4 MB, drugi format i šest slika. Slika mora ostati u Supabase Storage-u i nakon refresh-a.
- Pretraži `/services?cat=gaming-fivem` ili klikom kroz hijerarhiju do `FiveM Developer`; proveri da su rezultati povezani sa stvarnim oglasima, zatim resetuj filtere.
- Na profilu promeni cover, username, bio, veštine, linkove i dostupnost; dodaj projekt sa slikom. Drugi korisnik ne može sačuvati izmene tog profila.
- Moderator može u `/admin` dodavati, preimenovati i sakrivati kategorije; obični korisnici ne mogu. Brisanje korišćene kategorije mora biti blokirano.
- Oglasi sa prijavama, rezervacijama i razgovorima ne smeju biti izbrisani kršeći relacije — umesto toga izaberi status **Zatvoreno**.
- Proveri na 320, 375, 390, 430, 768 px i desktopu: nema horizontalnog skrolovanja, koverta se vidi u header-u i chat ne zauzima celu stranicu.

## Napomene o migraciji i starim oglasima

Postojeće kolone `listings.category`, `specialty`, `tags`, `price` nisu obrisane. Nova `category_id` je **nullable**, pa stari oglasi bez nje ostaju vidljivi u katalogu (uz kompatibilnost za stare `scripting` i `web` kategorije). Za precizno filtriranje starih oglasa prema novoj specijalizaciji njihov vlasnik treba da izabere novu kategoriju pri sledećem uređivanju; sistem **ne izmišlja** podkategorije starim oglasima. Dodatne kolone imaju bezbedne default vrednosti. Oznake nepročitanog za stare poruke mogu se pojaviti prvi put dok se ti razgovori ne otvore; same poruke nisu menjane.

## Povratak na prethodnu verziju

Git: vrati prethodni commit i redeploy ako frontend napravi problem. SQL migracija je **aditivna**: nove tabele i kolone mogu ostati dok se ne reši problem. **Ne briši migrirane tabele** bez posebnog backupa i dogovora, jer nakon početka korišćenja u njima mogu postojati nove poruke o pročitanosti, slike i projekti. Za eventualno vraćanje same baze koristi backup/postupak za rollback koji odgovara tvom Supabase planu.

## Granica testiranja u ovom paketu

Postojeći ZIP nije sadržao `.env.local` ili privilegovane podatke za produkciju; live konekcija sa korisničkim nalozima, Storage-om, Auth-om i Cloudflare-om **nije testirana** niti su menjani produkcioni podaci. U okruženju izrade npm registry nije bio dostupan, pa kompletan `npm ci`, Vite build i PGlite SQL integration test nisu mogli biti izvršeni. TypeScript/TSX kod je prošao sintaksnu proveru i semantičku proveru sa privremenim React type-stubovima (stubovi nisu deo ZIP-a). Obavezno pokreni gornje komande pre puštanja u produkciju i testiraj funkcije iz liste.
