# Revlord Group – Digital Services

**Počni od dokumenta [POKRETANJE.md](POKRETANJE.md).** Vodič je na srpskom i prati instalaciju do prve objave korisnika. Platforma se otvara preko lokalne ili javne veb-adrese.

## Kako je organizovan projekat

| Fajl | Uloga |
| --- | --- |
| src/entry.jsx i src/main.tsx | Pokretanje React aplikacije, navigacija, SR/EN, provera sesije i izbor stranice |
| src/db.js | Veza sa Supabase servisima, prijava, čitanje i pisanje podataka, prenos slika i obaveštenja o porukama |
| src/Account.tsx | Google i imejl prijava, oporavak lozinke, uređivanje profila i izbor specijalizacije |
| src/Catalog.tsx | Početna strana, pretraga, profili, galerije, rezervacije i prijave na projekat |
| src/Editor.tsx | Oglasi, nacrti, uređivanje radova i slika |
| src/Dashboard.tsx | Poruke, prijave, raspoloživi termini i izbor saradnika |
| src/Messages.tsx | Razgovori uživo i zabeleženi moderatorski pregledi |
| supabase/schema.sql | Tabele, dozvole, privatnost i pravila za istovremene promene |

Interfejs je na srpskom i engleskom. Tekst oglasa, portfolija i poruka ostaje na jeziku autora. Novi projekat počinje praznom bazom. Ilustracija početne stranice je deo identiteta sajta. Objavljeni rad sa slikom dobija mesto na naslovnoj strani.

Za lokalni rad pripremi .env.local po uputstvu, pokreni `npm install`, zatim `npm run dev`. Za objavu koristi `npm run build` i izlazni direktorijum `dist`. Bazu postavi jednom u zasebnom praznom Supabase projektu. Google, SMTP i administratorski pristup podešavaju se u nalogu vlasnika.

