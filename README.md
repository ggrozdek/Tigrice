# Tigrice

Slovenski MVP načrtovalnika performance cheer treningov za trenerja v Mariboru.

## Funkcije

- Skupine, nivo 0–3, cilj 20–180 minut, poudarki, cilji, intenzivnost, oprema in omejitve.
- Sestavljanje po pravilih iz knjižnice: ogrevanje, stalni razteg telesa, tehnična priprava, izbrani elementi, koreografija in lažji zaključni razteg. Skupno trajanje se ujema z zahtevanim časom.
- Prosti opis prepozna določene slovenske ključne besede in omejitve. Prepoznani pogoji so pregledni v načrtu; ostalo se ohrani kot opomba. To ni generativni jezikovni model in ne razume poljubnih navodil.
- Urejanje vseh polj vaje, brisanje, premikanje s puščicami ali med sklopi in razveljavitev do 20 zadnjih strukturnih sprememb.
- Zamenjava samo ene vaje: enaka kategorija, intenzivnost, isti cilji in potrebna oprema, upravičen nivo, upoštevane omejitve in približno trajanje. Dejanski čas v načrtu ostane enak. Če ni kandidata, se načrt ne spremeni.
- Ročno sestavljanje, dodajanje sklopov, lastne vaje, lastne skupine, trajno shranjevanje in podvajanje načrtov.
- Nova knjižnica performance cheer z razlago položaja, izvedbe, ponovitev in popravkov. Skoki in obrati so vezani na izrecna dovoljenja skupine. Zahtevni elementi so drilli že osvojenih gibov pod vodstvom trenerja.
- Drsnik 10–100 % tehnike v glavnem delu; prednastavitve Tehnika 100 %, Mešano 50 %, Koreografija 20 %. V koreografskem in mešanem načrtu se polni elementi izbirajo iz preseka dovoljenih elementov in elementov v koreografiji.
- Skupini Mladinska (2× tedensko; 90 min je predlog) in Osnovnošolska (1× tedensko po 45 min). Dovoljenja in seznam koreografije sta začetno prazna, da jih določi trener. Števili članic sta prilagodljiva začetna primera.

## Arhitektura in model

React + TypeScript; Vinext/Vite za odjemalca in strežniške poti; Base UI/Shadcn za dostopne kontrole; Cloudflare D1 za podatke. Zasebni dostop zagotavlja Sites. MVP je namenjen enemu trenerju; pred deljenjem več neodvisnim trenerjem je treba dodati lastništvo zapisov in preverjanje uporabnika pri vsaki poizvedbi.

| Entiteta | Polja in povezave |
|---|---|
| Group | id, name, level, members, notes, sessionsPerWeek, defaultDuration, allowedSkills[], choreographySkills[] |
| Level | 0: uvod, 1: osnove, 2: nadgradnja, 3: napredni; interni nivoji zahtevnosti, ne uradna tekmovalna klasifikacija |
| Exercise | id, name, category, levels[], duration v minutah, intensity, equipment[], goals[], tags[], instructions, custom, performanceCheer, skill? |
| Settings | groupId, level, duration, focus[], goals[], intensity, equipment[], restrictions[], description, details, techniquePercent, varyWarmup, allowedSkills[], choreographySkills[] |
| Training | id, title, date, settings, blocks[], warnings[], revision, updatedAt |
| Block | id, category, urejeni items[] |
| Item | kopija Exercise + instanceId in notes; položaj v polju določa vrstni red |
| Category | Ogrevanje, Razteg telesa, Tehnika, Skoki, Obrati, Parter, Koreografija, Kondicija, Zaključni razteg |
| Intensity | Nizka, Srednja, Visoka |
| Goal | Tehnika, Usklajenost, Moč, Gibljivost, Vzdržljivost |
| Equipment | Blazine, Elastike, Stožci, Pomponi, Uteži 0,5 kg, Ščitniki za kolena; prazno polje pomeni brez opreme |
| Restrictions | Brez skokov, Brez opore na zapestjih, Brez partnerskih vaj; izključujejo oznake jump, wrist, partner |

`lib/model.ts` definira domenski model. `lib/catalog.ts` vsebuje osnovno knjižnico, `lib/engine.ts` izbiro in zamenjave. `lib/validation.ts` je skupna validacija za strežnik in odjemalca. `app/api/data/route.ts` obravnava branje in shranjevanje prek pripravljenih SQL poizvedb. `lib/database.ts` centralizira D1 binding.

Tabela `groups` shranjuje skupine in spremembe začetnih primerov. `exercises` shranjuje lastne vaje. Osnovna knjižnica je različicena skupaj s kodo; njeno urejanje ustvari lastno kopijo. `trainings` shranjuje celoten dokument treninga skupaj z naslovom, datumom, revizijo in časom spremembe. Vaje v treningu so posnetki: sprememba knjižnice ne spreminja zgodovine. JSON dokument omogoča atomaren zapis vrstnega reda in urejanj. Pri večjem obsegu je mogoče vaje/sklope razdeliti v povezane tabele brez spremembe domenskega vmesnika.

Shranjeni podatki niso v localStorage. Osnutek in zgodovina razveljavitev sta v pomnilniku odprte strani. Brskalnik opozori pred odhodom z neshranjenimi spremembami. Strežnik uporablja revizijo za preprečevanje tihega prepisovanja zastarele različice (HTTP 409). Stran ohrani spremembe, narejene med potekom shranjevanja.

## Razvoj

1. `npm ci`
2. `npm run dev`
3. Lokalno bazo inicializiraj z migracijami iz `drizzle/` za binding DB; razvoj uporablja `.wrangler/state/v3`. Lokalni placeholder database_id je določen v `vite.config.ts`.
4. `npm run db:generate` ustvari novo migracijo po spremembi `db/schema.ts`. Že objavljenih migracij ne spreminjaj.
5. `npm run build` pripravi Worker v `dist/server/index.js` z `default.fetch`.

Pri objavi Sites ustvari D1 in izvede migracije. `.openai/hosting.json` vsebuje samo identifikator projekta in logične bindinge. Uporabniški podatki in skrivnosti niso v izvornem arhivu.

## Preverjanje

- `node tests/run.mjs`: veljavnost knjižnice, unikatni ID-ji, 336 kombinacij nivojev/trajanj/intenzivnosti/razmerij, omejitve, enakovrednost zamenjav, neodvisnost posnetkov in zavračanje neveljavnih podatkov.
- `node tests/api.mjs`: samo proti lokalni testni bazi na localhost:3000; vstavi zapise z ID-ji `test-api-*`. Preveri shranjevanje, branje, posodobitev, kopijo, konflikt revizije, lastne vaje/skupine in neveljavne zahteve. Po testu odstrani te testne zapise iz lokalne baze.
- `node_modules/.bin/tsc --noEmit`: preverjanje tipov.
- Pregled v brskalniku ni bil zahtevan in ni bil izveden. Odprl se je razvojni predogled; odzivi poti in strežniški dnevniki so bili preverjeni.
- WebMCP `read_training_draft` in `generate_training_draft` uporabljata isti model kot UI. Registracija je zaznana po zmožnostih in očiščena ob zaprtju komponente. Združljiv validacijski kontekst ni bil na voljo; WebMCP ni funkcionalno preverjen in ni pogoj za običajno uporabo.

## Vsebinski okvir

Vsebina izhaja iz trenerjevega opisa dejanskega treninga in priloženih zapiskov: tek ali delo v paru, stabilizacija, stalni razteg, tehnične priprave, skoki in obrati, delo na mix ter umiritev. TT je uporabnik potrdil kot toe touch. Nejasne rokopisne kratice niso pretvorjene v izmišljena navodila.

Terminološka opora: [ICU – Performance Cheer Coaching Education](https://cheerunion.org/education-schedule/course/) in [ICU – Performance Cheer Glossary](https://cheerunion.org/education-schedule/performancecheerglossary/). Gre za trenerjeve delovne predloge, ne uradni program ali dokaz skladnosti s tekmovalnimi pravili. Novih zahtevnih gimnastičnih elementov se ne uvaja samo s tekstovnim opisom.

## Priljubljene in obvezne vaje

Pri vaji v knjižnici ali treningu izberi pogostost: Običajna izbira, Priljubljena ali Vedno vključi. Oznaka je globalna za tega trenerja in velja za ID različice v knjižnici, vključno z njeno intenzivnostjo. Ročne spremembe posnetka v treningu ne prepišejo te izvorne vaje.

`exercise_preferences` trajno shranjuje `exercise_id` in `mode` (favorite / always); izbira off odstrani zapis. Ne spreminja osnovne knjižnice ali shranjenih treningov. API preveri obstoj osnovne ali lastne vaje. Migracija 0001 doda samo novo tabelo; obstoječi podatki ostanejo nedotaknjeni.

Samodejna izbira uporablja uteženo naključno razvrščanje: priljubljena ima štirikratno utež glede na enako ustrezno običajno vajo. Cilji dodatno vplivajo na utež. To ni zagotovilo štirikratne končne pogostosti. Obvezne vaje se vključijo pred ostalimi, z njihovim trajanjem iz knjižnice. Razmerje tehnike in koreografije ostane nespremenjeno; obvezna vaja se vključi cela, če se prilega času svojega sklopa. Vaje morajo ustrezati izbranim sklopom, nivoju, intenzivnosti, opremi in omejitvam. Izpuščene obvezne vaje sprožijo obvestilo; pri nemogoči sestavi se ohrani prejšnji osnutek in prikaže napaka. Ročno sestavljanje in zamenjava posamezne vaje ostaneta pod nadzorom trenerja.

Dodatna preverjanja: statistični preizkus 800 parov sestavitev, prileganje celih obveznih vaj času sklopa, izključitve, pomanjkanje časa in odstranitev oznake (`tests/run.mjs`); trajno shranjevanje vseh treh načinov in nespremenjenost knjižnice ter treningov (`tests/preferences-api.mjs`).

## Videz Društva Tigrice

Svetla tema uporablja vijolične poudarke, temno vijolično tipografijo, motiv tigrastih prask in tanke diagonalne linije. Praske so izviren dekorativni motiv, ustvarjen za aplikacijo. `app/tigrice.css` razširja obstoječe sloge, `public/tigrice-praske.png` vsebuje prosojno grafiko. Vzorci so omejeni na glavo in majhne robne poudarke; vsebina vaj in obrazcev ostane na mirni svetli podlagi. Dekoracije so izločene iz dostopnega imena in ne prestrezajo klikov. Tema ohranja mobilno postavitev, vidna stanja fokusa in zmanjšano gibanje.

## Prehod na performance cheer

Migracija 0002 doda stolpec groups.profile (JSON) za urnik in nabore elementov. Stare migracije in uporabniški zapisi se ne prepisujejo. Ob branju se stare kategorije preslikajo v nov besednjak, besedilo in vrstni red zgodovinskih treningov pa ostaneta nespremenjena. Stari načrti dobijo opozorilo za pregled. Stare lastne vaje ostanejo vidne, vendar so izločene iz samodejne izbire, dokler jih trener ne pregleda in označi za performance cheer. Nove knjižnične vaje imajo nove ID-je; starih priljubljenih ne vežemo na vsebinsko nepovezane vaje. UI omogoča ponovno izbiro ter odstranitev starih oznak.

Osnutek vsebuje posnetek dovoljenj skupine. Sprememba skupine posodobi izhodiščne nastavitve; že odprt načrt je treba ponovno sestaviti. Shrani, ponovno odpri in podvoji ohranijo drsnik, nabor elementov in vsa navodila.

Običajno ogrevanje daje prednost teku in ustrezni stabilizaciji; Različno uporablja naključno izbiro. Priljubljene vplivajo na izbiro tudi pri ogrevanju. Razteg telesa in lažji zaključni razteg imata vedno isto osnovno vsebino. Čas okvirno rezervira 17 % za ogrevanje, 14 % za glavni razteg in 6 % za zaključek, z minimalnimi časi pri kratkem treningu. Drsnik razdeli preostale minute. Tehnična priprava je pred specifičnimi elementi; če ni dovoljenih elementov, tehnični čas porabi za predpriprave. UI opozori na elemente, ki se zaradi časa ali omejitev niso vključili.

Preverjeno: 10 avtomatiziranih preizkusov, vključno s 336 sestavitvami in statistično izbiro priljubljenih; API shranjevanje, ponovni odčitek profilov skupin, podvajanje, konflikt revizij, validacija in priljubljene. Testni izvajalnik prevede le navedene lokalne datoteke s TypeScript, brez pregledovanja nedostopnih nadrejenih map.

## Javni repozitorij

Ta repozitorij vsebuje izvorno kodo in začetno knjižnico vaj, brez shranjenih treningov, osebnih nastavitev, baze podatkov ali poverilnic. Identifikator zasebne objave je odstranjen. Za spletno uporabo je potreben strežnik Cloudflare Workers z bazo D1 in zaščitenim dostopom (Sites); GitHub Pages sam ne izvaja tega strežniškega dela. Ob novi objavi se ustvari lasten identifikator projekta.
