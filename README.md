# Four Clans

เกม RTS บนเว็บด้วย JavaScript และ Canvas มีโหมดเล่นคนเดียว/บอท และห้องออนไลน์ 2–4 คนผ่าน WebSocket

## เริ่มพัฒนาในเครื่อง

ใช้ Node.js 22 ขึ้นไป

```sh
npm ci
npm run dev
```

เปิดหน้าเกมที่ <http://localhost:4178> ส่วน backend เปิดที่พอร์ต 4179 และ health check อยู่ที่ <http://localhost:4179/health> คำสั่ง `npm run dev` จะ build frontend, ตั้ง WebSocket URL สำหรับเครื่องตัวเอง และเปิดทั้งสองส่วนพร้อมกัน กด Ctrl+C เพื่อปิด

ถ้าต้องการ build หรือรันแยก: `npm run build:frontend`, `npm run start:backend` โดย frontend ใช้ `PUBLIC_WS_URL` ตอน build และ backend ใช้ `PORT`, `ALLOWED_ORIGINS`, `MAX_ROOMS` ตอนรัน

## โครงสร้าง

- `frontend/` — UI, assets, builder และ static dev server; build ออกที่ `frontend/dist/`
- `backend/` — HTTP health endpoint และ WebSocket server สำหรับห้อง/เกมออนไลน์
- `shared/` — game engine ที่ frontend builder และ backend ใช้ร่วมกัน
- `scripts/dev.cjs` — เปิด frontend และ backend แยกพอร์ตสำหรับพัฒนา
- `test-*.cjs` — สคริปต์ทดสอบที่มีอยู่เดิม (รันด้วย `npm test`)

## Deploy

อ่าน [คู่มือ deploy](DEPLOY.md) สำหรับการโฮสต์ frontend และ backend แยกกัน หรือ backend แบบ Node service เดียว

เกมยังเป็นต้นแบบ ตัวเลขสมดุลอยู่ระหว่างทดลอง สถานะห้องอยู่ใน RAM และหายเมื่อ backend เริ่มใหม่ ยังไม่มีระบบเซฟแมตช์
