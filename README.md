# 8bp-overlay

Floating aim-assist overlay buat **8 Ball Pool** (Android) — solver bank/kick multi-rail
di atas layar game. Solver core identik dengan `ball_solver_agent.py`
(verified: kick=15 / bank=11 sol, exact match + 60 random case lulus reflection check).

## File
- `8bp_overlay.js` — script utama, jalan di **AutoJs6** (runtime Auto.js modern,
  open source: github.com/kkevsekk1/AutoX)
- `solver_core.js` — solver geometry murni (JS, node --check OK)
- `overlay_head.js` / `ui_part.js` / `overlay_tail.js` — bagian-bagian 8bp_overlay.js
- `ball_solver_agent.py` — versi Python asli (spec/API reference)
- versi web: https://brebros.github.io/ball-solver/

## Cara pakai
1. Install AutoJs6 di HP Android.
2. Import `8bp_overlay.js`, jalankan.
3. Izinkan: **Tampil di atas aplikasi lain** (overlay) + **Aksesibilitas** (buat gesture swipe).
4. Buka 8 Ball Pool → panel kecil muncul di layar:
   - tarik 3 bola (C = cue putih, O = object, P = target pocket)
   - tombol `KICK`/`BANK` ganti mode, `rails N` ganti max rail (1–5)
   - tap baris solusi → jalur + ghost ball kegambar
   - `SHOOT` → swipe gesture otomatis sesuai arah bidik

## Fitur overlay
- solver multi-rail kick/bank (1–5 rail) + list solusi
- hub `X` — 6 garis dari 6 lubang, konvergen ke satu lingkaran yang bisa digeser
- handle `A` — garis pantul V (kick/bank): asal dari cue (KICK) / object (BANK),
  memantul sampai 3× di cushion, geser A buat ganti arah
- auto swipe shot (`SHOOT`)

## Status
- [x] solver core verified (match Python, semua field)
- [x] V-bounce ray: verifikasi numerik vs simulasi independen (max diff 0.00e+00)
- [x] overlay UI + drag C/O/P/X/A + list (ditulis, blm dites di device)
- [x] auto swipe shot (gesture; timing/power blm dikalibrasi)
- [ ] kalibrasi power swipe per jarak
- [ ] (opsional) deteksi bola otomatis via warna pixel

## Catatan
- Pakai akun alt — overlay = ToS violation, kena deteksi = ban.
- Coordinate system sama persis dgn versi Python: table [0,W]x[0,H],
  `solve_kick(C,O,P,W,H)` / `solve_bank(O,P,C,W,H)`, dict Solution identik.
