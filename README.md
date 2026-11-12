# Crown Rush

Gioco browser single player ispirato ai duelli strategici con carte, con grafica originale. Interfaccia italiana, 12 carte e mazzi personalizzati da 8, avversario CPU, timer di 3 minuti, elisir doppio nell'ultimo minuto, pausa e rivincita.

Il motore di gioco in `src/lib.rs` gestisce truppe, targeting, torri, elisir, rotazione del mazzo, CPU e vittoria. Rust viene compilato realmente in WebAssembly, senza dipendenze esterne. JavaScript gestisce input, audio e rendering Canvas 2D.

## Compilare

Richiede Rust stabile, rustup e Python 3 per il server locale.

```sh
rustup target add wasm32-unknown-unknown
cargo test
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/crown_rush.wasm dist/
python3 -m http.server 8080 --directory dist
```

Apri http://localhost:8080. Servire via HTTP, non aprire index.html direttamente.

## Comandi

Seleziona una carta con il mouse o i tasti 1–4 e clicca nella tua metà del campo. La Palla di fuoco può essere usata ovunque. Spazio mette in pausa. Il tasto audio attiva suoni sintetizzati.

Vittoria immediata distruggendo la torre del re. A tempo scaduto contano prima le corone, poi la somma dei punti vita delle torri. Sono disponibili sfide WebRTC su invito. Non sono presenti account con password, acquisti o salvataggi remoti.

## ABI WebAssembly

- reset(): ricomincia la partita
- tick(dt: f32): avanza la simulazione, massimo 0.1 secondi
- play(slot: u32, x: f32, y: f32): schiera, restituisce 1, 0, -1 (elisir) o -2 (metà nemica)
- value(k: u32, i: u32): dati della partita
- unit(i: u32, k: u32): dati delle unità

Coordinate logiche del campo: 600 × 720. Nessun asset del gioco originale è incluso.

## Mazzi, profilo e inviti

La collezione contiene 12 carte; il mazzo ne include esattamente 8 diverse. Dal pulsante Mazzo rimuovi e aggiungi carte: le prime quattro saranno la mano iniziale della prossima partita. Mazzo e profilo opzionale (nome, partite, vittorie) sono salvati nel localStorage del dispositivo. Non è un account sincronizzato.

La Palla di fuoco può essere lanciata in tutta l'arena, infligge 420 danni alle truppe nemiche nel raggio di 90 e 200 danni alle torri colpite, con un indicatore visibile. Le truppe alleate sono immuni.

Per il multiplayer: apri Sfida un amico, crea una stanza e condividi il link. Il destinatario sceglie il proprio mazzo e preme Entra nella sfida. La simulazione Rust dell'host è autorevole: valida le mosse, disattiva il bot e invia lo stato all'ospite con coordinate e squadre invertite. L'ospite non simula autonomamente la partita. La pausa è disabilitata online; una disconnessione termina la sessione. Entrambi devono tenere la pagina aperta e in primo piano.

La segnalazione usa il servizio pubblico PeerJS, con client 1.5.5 da jsDelivr e STUN Google. Il traffico di gioco passa su WebRTC DataChannel. Non è configurato un relay TURN: reti restrittive possono impedire il collegamento. Gli invitati devono avere accesso alla pagina web; i link non aggirano la privacy dell'hosting. Non è stato eseguito un test fra due browser su reti reali.

Verifica aggiuntiva dell'interfaccia e del protocollo host/guest, con due istanze WASM reali e trasporto simulato:

```sh
node --experimental-vm-modules tests/ui.mjs
```
