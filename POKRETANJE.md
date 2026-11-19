# Revlord Group · Od ZIP fajla do javnog sajta

**Tvoj projekat Revlord Group je već pripremljen.** U Supabase projektu su postavljene tabele i dozvole. Potvrđeno je 11 tabela sa uključenom zaštitom redova. Lokalne adrese za povratak su sačuvane. U ovom privatnom paketu su već upisani Project URL i javni ključ u .env.local. Preskoči korake 2 i 3, kao i pravljenje .env.local. Za rad na računaru izvrši komande iz koraka 5. Za omogućavanje prijave završi Google podešavanja iz koraka 4.

Google callback za ovaj projekat je `https://zklpmyagdwiikncvcgft.supabase.co/auth/v1/callback`. Client Secret unosiš u Google podešavanja provajdera na Supabase kontrolnoj tabli.


Ovaj vodič prati podešavanje na Windows računaru. GitHub čuva kod, Cloudflare Pages prikazuje sajt, a Supabase čuva naloge, oglase, razgovore i termine. Za početak možeš koristiti besplatnu adresu koju dodeli Cloudflare. Lozinke baze, Google Client Secret i SMTP lozinku unosiš isključivo u odgovarajuće kontrolne table. Nije potrebno da ih šalješ u razgovor.

## 1. Raspakuj projekat

Preuzmi najnoviji ZIP. Klikni desnim tasterom na njega, izaberi **Raspakuj sve / Extract All** i otvori raspakovani folder. Pronađi folder u kojem su zajedno **package.json**, **src** i **supabase**. U nastavku je to „folder projekta“. Za prijavu i poruke sajt se otvara preko lokalne ili javne adrese koju ćeš dobiti u narednim koracima.

## 2. Napravi bazu u svom nalogu

1. Otvori [Supabase Dashboard](https://supabase.com/dashboard) i prijavi se. Izaberi svoju organizaciju na planu **Free**, pa **New project**.
2. Upiši naziv **Revlord Group**, izaberi odgovarajući evropski region i generiši jaku lozinku baze. Sačuvaj je u svom menadžeru lozinki. Klikni **Create new project** i sačekaj da projekat postane dostupan.
3. U folderu projekta otvori **supabase/schema.sql** pomoću Notepada ili drugog uređivača teksta. Pritisni **Ctrl+A**, pa **Ctrl+C**.
4. U novom, praznom Supabase projektu otvori **SQL Editor → New query**. Nalepi ceo sadržaj, pa klikni **Run**. Skripta postavlja tabele i dozvole. Ako vidiš crvenu SQL grešku, zapiši njen tekst i stani na tom koraku. Za postojeću bazu sa drugim aplikacijama izdvoji poseban projekat.
5. **Provera.** U **Table Editor → public** pronađi tabele **listings** (oglasi), **threads** (razgovori) i **messages** (pojedinačne poruke). U **Storage** treba da postoje spremišta **avatars** i **portfolio**. Prazne liste na prvom otvaranju sajta su očekivane. Prvi oglas se pojavljuje tek po objavi stvarnog korisnika.

## 3. Pripremi dve javne vrednosti za sajt

U otvorenom Supabase projektu klikni **Connect**. Kopiraj **Project URL** i **Publishable key**. Ključ je dostupan i pod **Settings → API Keys**. Podatke iz iste kartice koristi i lokalno i na Cloudflare-u. [Supabase vodič za API ključeve](https://supabase.com/docs/guides/getting-started/api-keys)

| Naziv postavke | Šta kopiraš |
| --- | --- |
| `VITE_SUPABASE_URL` | Puni Project URL, oblika `https://oznaka-projekta.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key koji počinje sa `sb_publishable_` |
| `VITE_EMAIL_AUTH` | Upiši `false` za početak sa Google prijavom. Promeni u `true` nakon podešavanja slanja mejlova u koraku 8. |

Pregledač može da pročita svaku vrednost sa prefiksom `VITE_`. Ključeve `sb_secret_` i `service_role` čuvaj van tih polja. Dozvole po korisniku sprovodi baza kroz politike iz SQL skripte.

## 4. Poveži dugme „Nastavi sa Google nalogom“

1. U Supabase projektu otvori **Authentication → Sign In / Providers → Google**. Kopiraj prikazanu adresu **Callback URL**. Obično se završava sa `/auth/v1/callback`. Tu adresu vraća Google nakon što korisnik izabere nalog.
2. U [Google Cloud konzoli](https://console.cloud.google.com/) izaberi projekat za Revlord ili napravi novi. Otvori **Google Auth Platform**. Ako je ovo prvo podešavanje, klikni **Get started**. U **Branding** popuni naziv aplikacije, adresu za podršku i kontakt. U **Audience** izaberi **External** ako će se prijavljivati ljudi van tvoje organizacije. Dok je aplikacija u režimu **Testing**, dodaj svoje test adrese u **Test users**.
3. U **Clients → Create client** izaberi **Web application**. Nazovi klijent **Revlord web**. U **Authorized JavaScript origins** dodaj `http://localhost:5173`. U **Authorized redirect URIs** nalepi tačnu Supabase adresu iz prve stavke. Klikni **Create**. Kopiraj **Client ID** i **Client secret**.
4. Vrati se u Supabase u podešavanje Google provajdera. Uključi ga, unesi ID i secret i klikni **Save**. U **Authentication → URL Configuration** za lokalnu proveru pod **Site URL** unesi `http://localhost:5173`. U **Redirect URLs** dodaj obe pune adrese ispod i sačuvaj promene.

```text
http://localhost:5173/auth/callback
http://localhost:5173/auth/reset
```

Supabase vraća korisnika na prvu adresu posle prijave, a na drugu posle zahteva za promenu lozinke. Za razvoj na računaru koristi isto ime domaćina i isti port od početka do kraja prijave. [Google prijava](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) · [Supabase adrese za povratak](https://supabase.com/docs/guides/auth/redirect-urls)

## 5. Pokreni sajt na računaru

1. Instaliraj aktuelno **LTS** izdanje sa [nodejs.org](https://nodejs.org/), pa zatvori i ponovo otvori terminal ako je već otvoren.
2. U Windows Exploreru otvori folder projekta. Klikni na adresnu liniju na vrhu, upiši **cmd** i pritisni **Enter**. Otvoriće se komandna linija u tom folderu. Ukucaj sledeću komandu.

```bat
notepad .env.local
```

3. Ako Notepad pita da li da napravi fajl, potvrdi. Nalepi tri reda ispod i zameni prve dve vrednosti svojim vrednostima iz koraka 3. Pritisni **Ctrl+S** i zatvori Notepad.

```dotenv
VITE_SUPABASE_URL=https://oznaka-projekta.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ovde_nalepi_svoj_kljuc
VITE_EMAIL_AUTH=false
```

4. U istom terminalu izvrši jednu po jednu komandu. Između komandi sačekaj da se vrati komandni red.

```bat
npm install
npm test
npm run proveri-vezu
npm run build
npm run dev -- --port 5173 --strictPort
```

   Komanda **npm test** pokreće osam grupa provera u privremenoj bazi u memoriji. **npm run proveri-vezu** čita tvoj Supabase projekat, proverava dostupnost javnih tabela i da privatne tabele odbijaju anonimni zahtev. Ove komande ne objavljuju oglase u tvojoj bazi. Ako Windows ne pronađe .env.local, u Exploreru uključi prikaz nastavaka datoteka i proveri da na kraju nije dodato .txt.

5. Otvori **http://localhost:5173** u Chrome-u ili Edge-u. Terminal ostavi otvoren dok koristiš sajt. Izaberi **Prijavi se**, klikni na Google prijavu i prijavi se jednim od odobrenih Google naloga. Vratićeš se na sajt. U Supabase kartici **Authentication → Users** proveri da postoji tvoja adresa.
6. Za sledeće lokalno pokretanje dovoljna je poslednja komanda. Ako menjaš `.env.local`, ugasi server sa **Ctrl+C** i pokreni ga ponovo.

## 6. Sačuvaj kod na GitHubu

1. Na [GitHubu](https://github.com/new) napravi nov repozitorijum **revlord-group**. Možeš izabrati **Private**. Ostavi ga praznog.
2. Klikni **uploading an existing file**, ili **Add file → Upload files** ako ta opcija već postoji. Otvori folder projekta u Exploreru. Pošalji izvorne foldere **src**, **public**, **supabase**, **tests**, **scripts** i ostale fajlove za izgradnju iz isporučenog paketa, uključujući **package.json**, **index.html**, TypeScript/Vite podešavanja i datoteku zaključanih verzija paketa ako postoji. Uključi i **.gitignore**. Izostavi **node_modules**, **dist**, **.git** i fajlove sa lokalnim pristupnim podacima, posebno **.env.local**. ZIP prvo raspakuj.
3. Potvrdi preko **Commit changes**. Na početnoj stranici repozitorijuma proveri da vidiš **package.json**. Ako si poslao ceo folder kao jedan podfolder, zapiši njegov naziv za **Root directory** u narednom koraku.

## 7. Objavi sajt na besplatni Cloudflare poddomen

1. U [Cloudflare Dashboard](https://dash.cloudflare.com/) otvori **Workers & Pages → Create application → Pages → Connect to Git**. Izaberi GitHub i odobri pristup repozitorijumu **revlord-group**.
2. Izaberi repozitorijum, produkcionu granu (obično **main**) i naziv projekta. U postavkama izgradnje unesi sledeće.

| Postavka u Cloudflare-u | Vrednost |
| --- | --- |
| Framework preset | React (Vite), ako je ponuđen |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Prazno ako se **package.json** vidi na početnoj stranici repozitorijuma. Inače putanja do njegovog foldera. |
| Environment variables, Production | Iste tri vrednosti kao u koraku 5 |

3. Klikni **Save and Deploy**. Kada objava dobije status **Success**, otvori stalnu produkcionu adresu koja se završava sa **.pages.dev**. Ako si vrednosti uneo naknadno pod **Settings → Variables and Secrets**, pokreni novu izgradnju. [Cloudflare Git povezivanje](https://developers.cloudflare.com/pages/get-started/git-integration/) · [Postavke izgradnje](https://developers.cloudflare.com/pages/configuration/build-configuration/)
4. Kopiraj stalnu adresu, npr. `https://tvoj-naziv.pages.dev`. U Supabase **Authentication → URL Configuration** postavi je kao **Site URL**. U **Redirect URLs** dodaj svoje pune produkcione adrese sa `/auth/callback` i `/auth/reset` na kraju. Zadrži i lokalne adrese za razvoj.
5. U Google **Auth Platform → Clients** otvori napravljeni web klijent i u **Authorized JavaScript origins** dodaj istu javnu adresu, bez putanje. Google **Authorized redirect URI** i dalje vodi do Supabase projekta. Za javnu prijavu u **Audience** postavi aplikaciju u produkciju i završi eventualne korake koje Google traži za tvoj nalog i brend.
6. **Provera.** Otvori javni link u drugom pregledaču ili na telefonu. Prijavi se preko Google-a. Završna adresa treba da bude tvoj javni sajt. Otvori stvarni objavljeni oglas, kopiraj njegov link u novu karticu i pritisni **F5**. Mora da se otvori isti oglas.

## 8. Uključi registraciju mejlom i oporavak lozinke

Ugrađeni Supabase pošiljalac ima ograničenja za članove projektnog tima. Za javne korisnike poveži sopstveni SMTP nalog kod provajdera transakcionih mejlova. Proveri da njegov besplatan paket i uslovi verifikacije pošiljaoca odgovaraju tvom nalogu i domenu. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

1. Kod provajdera potvrdi pošiljaoca i po potrebi domen. Kopiraj SMTP host, port, korisničko ime, lozinku i odobrenu adresu pošiljaoca.
2. U Supabase **Authentication → Email / SMTP settings** uključi **Custom SMTP**, unesi te podatke i sačuvaj. U **Sign In / Providers → Email** uključi prijavu mejlom i potvrdu adrese. Za standardne šablone potvrde i oporavka zadrži link koji koristi `{{ .ConfirmationURL }}`.
3. Lokalno promeni `VITE_EMAIL_AUTH` na `true` i pokreni ponovo razvojni server. Registruj sopstvenu adresu koja nije član Supabase tima. Otvori potvrdni link i prijavi se. Zatim pokreni oporavak lozinke i prijavi se novom lozinkom. Tok potvrde i oporavka proveri u istom pregledaču u kojem si ga započeo.
4. Posle uspešne provere u Cloudflare **Production** postavi `VITE_EMAIL_AUTH=true` i ponovo izgradi sajt. Ponovi oba toka na javnoj adresi.

## 9. Dodeli administratorski pristup vlasniku

1. Vlasnik se jednom prijavljuje na sajt. U Supabase **Authentication → Users** pronađi njegovu adresu i kopiraj **User UID**. Proveri adresu pre davanja ovlašćenja.
2. U **SQL Editor → New query** nalepi ovu komandu. Zameni tekst između apostrofa stvarnim UID-om vlasnika i klikni **Run**.

```sql
insert into public.admins (user_id)
values ('OVDE-NALEPI-UID-VLASNIKA')
on conflict do nothing;
```

3. Osveži sajt u nalogu vlasnika i otvori administraciju. Za pristup prijavljenom razgovoru unesi razlog. Posle otvaranja razgovora u Supabase **Table Editor → moderation_log** pronađi zapis sa UID-om administratora, razgovorom, razlogom i vremenom. Običan korisnik treba da ima pristup samo razgovorima u kojima učestvuje.

## 10. Prođi stvarne putanje pre predaje klijentu

Koristi dva zasebna profila pregledača za obične naloge, A i B. Za proveru pristupa razgovoru prvo koristi treći običan nalog C, a zatim dodeli nalogu C administraciju za poslednji test. U dogovoru s klijentom koristi stvarni prvi oglas i projekat ili zasebnu test-bazu. Ovi koraci proveravaju tvoju objavu i naloge kod provajdera.

| Ko radi | Radnja | Šta treba da vidiš |
| --- | --- | --- |
| A, stručnjak | Izabere oblast i specijalizaciju, pripremi uslugu, dodaje portfolio i sačuva nacrt | Nacrt se vidi u njegovom panelu. Posetilac ga ne nalazi u pretrazi. |
| A, pa B | A objavi uslugu i postavi termin. B unese naziv ili veštinu u pretragu i otvori rezultat | B otvara isti portfolio i vidi dostupnost u svojoj vremenskoj zoni. |
| A i B | Iz oglasa započnu razgovor i razmene po jednu poruku, zatim osveže stranicu | Obe osobe dobijaju odgovor i imaju istoriju razgovora. |
| B, pa A | B traži slobodan termin. A potvrdi zahtev | Status se promeni kod obe osobe. Ponovljena radnja ne stvara duplu rezervaciju. |
| B, pa A | B objavi projekat, A pošalje prijavu sa ponudom, B pregleda prijavu i izabere saradnika | Vlasnik vidi prijave za svoj projekat, a stručnjak status svoje prijave. |
| C kao običan korisnik, zatim kao administrator | A ili B prijavi razgovor. C najpre proveri da mu tuđi razgovor nije dostupan. Vlasnik mu potom dodeli admin pristup prema koraku 9. | Ovlašćeni pristup ima zabeležen razlog i trag pregleda. |
| A, B i C kao obični korisnici, pre dodele administracije | B i C zatraže isti A-ov termin. A pokuša da potvrdi oba zahteva. | Najviše jedna potvrđena rezervacija za isti termin. |
| Gost na telefonu | Otvori oglas direktnim linkom, promeni SR/EN i osveži stranicu | Jezik ostaje izabran, oglas dostupan, a sadržaj oglasa sačuvan kako ga je autor uneo. |

## Ako nešto stane

| Simptom | Gde da proveriš |
| --- | --- |
| Google prijavljuje `redirect_uri_mismatch` | Uporedi Google **Authorized redirect URIs** sa adresom koju prikazuje Supabase Google provider, uključujući protokol i celu putanju. |
| Google prijava radi samo vlasniku | Proveri **Audience**, **Testing/Production** i **Test users** kod Google-a. |
| Posle javne prijave otvara se localhost | Proveri **Site URL** i oba produkciona **Redirect URLs** u Supabase-u. |
| Prijava radi, a liste ili objava prikazuju grešku dozvole | Proveri da URL i javni ključ pripadaju istom projektu i da je ceo SQL završen uspešno. Sačuvaj tekst greške za otklanjanje uzroka. Pravila pristupa treba da ostanu uključena. |
| Registracija ne šalje mejl | Proveri Supabase **Auth logs**, dnevnike SMTP provajdera, potvrđenog pošiljaoca, adresu primaoca i kvotu slanja. |
| Lokalna adresa je zauzeta | Zaustavi prethodni Revlord terminal sa **Ctrl+C** i pokreni razvojni server jednom na portu 5173. |
| Javna izgradnja prijavljuje da nema package.json | U Cloudflare-u proveri **Root directory** prema rasporedu repozitorijuma, pa ponovi izgradnju. |

## Besplatni paketi i sopstveni domen

Prema cenovnicima proverenim 19. novembra 2026, Supabase Free obuhvata 500 MB baze po projektu, 1 GB prostora za datoteke i 50.000 mesečno aktivnih korisnika. Navodi i 5 GB redovnog i 5 GB keširanog izlaznog prenosa. Posle nedelju dana neaktivnosti projekat može biti pauziran. Vlasnik prati potrošnju u **Usage** i po potrebi vraća pauzirani projekat iz kontrolne table. [Supabase cenovnik](https://supabase.com/pricing)

Cloudflare Pages Free navodi do 500 izgradnji mesečno, jednu istovremenu izgradnju i pojedinačnu statičku datoteku do 25 MiB. Kada dosegneš mesečnu kvotu izgradnji, planiraj sledeću objavu nakon obnove kvote ili uz odobrenu promenu plana. Cene i pravila proveri neposredno pre lansiranja. [Cloudflare ograničenja](https://developers.cloudflare.com/pages/platform/limits/)

Kada kupiš domen, u Pages projektu otvori **Custom domains → Set up a domain** i prati DNS korake za tvoj domen. Sačekaj status **Active** i proveri HTTPS. Potom ponovi podešavanje produkcionog **Site URL**, obe adrese za povratak i Google **Authorized JavaScript origins** za novi domen. Uradi jednu prijavu, pošalji jednu poruku i otvori deljeni oglas preko nove adrese. [Cloudflare povezivanje domena](https://developers.cloudflare.com/pages/configuration/custom-domains/)
