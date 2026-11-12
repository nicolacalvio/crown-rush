# Crown Rush

Gioco browser single player ispirato ai duelli strategici con carte, con grafica originale. Interfaccia italiana, 8 carte, avversario CPU, timer di 3 minuti, elisir doppio nell'ultimo minuto, pausa e rivincita.

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

Vittoria immediata distruggendo la torre del re. A tempo scaduto contano prima le corone, poi la somma dei punti vita delle torri. Non sono presenti multiplayer, account, acquisti o salvataggi remoti.

## ABI WebAssembly

- reset(): ricomincia la partita
- tick(dt: f32): avanza la simulazione, massimo 0.1 secondi
- play(slot: u32, x: f32, y: f32): schiera, restituisce 1, 0, -1 (elisir) o -2 (metà nemica)
- value(k: u32, i: u32): dati della partita
- unit(i: u32, k: u32): dati delle unità

Coordinate logiche del campo: 600 × 720. Nessun asset del gioco originale è incluso.
