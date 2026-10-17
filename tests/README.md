# tests

- `integration_test.js` — stub runtime AutoJs6 (device/floaty/ui/Paint/canvas) lalu jalankan
  `8bp_overlay.js` utuh: cek window XML kebentuk, jumlah solusi, binding list, tombol, drag, draw, swipe.
  Jalankan: `node tests/integration_test.js`. (Script utuh disisipkan saat generate.)
- `ray_test.js` — ekstrak kode garis pantul V dari render.js, jalankan di node, banding hasil
  dengan simulasi Python independen (max diff 0.00e+00).
