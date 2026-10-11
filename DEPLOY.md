# Deploy Four Clans แบบแยก frontend/backend

โปรเจกต์ใช้ npm workspaces: frontend เป็น static HTML ที่ build จาก `frontend/` และ backend เป็น Node.js + WebSocket ที่อยู่ใน `backend/` โดยใช้ engine ร่วมจาก `shared/` ไม่มีฐานข้อมูลในระบบห้องปัจจุบัน

## พัฒนาในเครื่อง

```sh
npm ci
npm run dev
```

หน้าเกม: `http://localhost:4178`; backend health: `http://localhost:4179/health`. กด Ctrl+C เพื่อปิดทั้งสอง process

## แยก deploy: static host + Node backend

### Backend

ตั้งบริการ Node จากราก repository เพื่อให้เห็น workspace `backend/` และ `shared/`. ตัวอย่างค่าของ Render Web Service:

| ค่า | ตั้งค่า |
|---|---|
| Root Directory | เว้นว่าง (ราก repository) |
| Build Command | `npm ci` |
| Start Command | `npm run start:backend` |
| Health Check | `/health` |
| Environment | `MAX_ROOMS=4` และ `ALLOWED_ORIGINS=https://<frontend-domain>` |

แพลตฟอร์มกำหนด `PORT` ให้เอง อย่าตั้ง `PUBLIC_WS_URL` ที่ backend

### Frontend

เชื่อม repository เดียวกันกับ static host เช่น Cloudflare Pages:

| ค่า | ตั้งค่า |
|---|---|
| Root directory | `/` หรือค่าว่าง |
| Build command | `npm ci && npm run build:frontend` |
| Build output directory | `frontend/dist` |
| Environment | `PUBLIC_WS_URL=wss://<backend-domain>/ws` |

`PUBLIC_WS_URL` เป็น build-time setting. หลังเปลี่ยนค่านี้ frontend ต้อง build ใหม่. ตั้ง `ALLOWED_ORIGINS` ที่ backend ให้ตรงกับ origin ของ frontend (protocol และ domain ไม่มี path หรือ slash ท้าย), แล้ว restart backend. สำหรับ custom domain ให้เพิ่ม origin เต็มของแต่ละโดเมนโดยคั่นด้วย comma

## Frontend บน Vercel + backend Node แยก

Repository นี้มี `vercel.json` สำหรับ build static frontend จากรากโปรเจกต์และ publish `frontend/dist`. Import repository ใน Vercel, ให้ Root Directory เป็นราก repository แล้วตั้ง Project Environment Variable:

```text
PUBLIC_WS_URL=wss://<backend-domain>/ws
```

Build command และ output directory ถูกกำหนดใน `vercel.json`. ตั้ง backend ให้ยอมรับ origin ของ Vercel ใน `ALLOWED_ORIGINS`, เช่น `https://four-clans-xyz.vercel.app`. โปรเจกต์ Vercel ใช้ได้เมื่อมี backend WebSocket ที่รันอยู่แล้ว; URL backend ต้องเป็นของบริการจริง ไม่ใช่ URL ตัวอย่าง

Vercel Functions รองรับ WebSocket แบบ public beta แต่ connection บน Hobby ปิดเมื่อครบ 300 วินาที และการเชื่อมต่อใหม่อาจไปคนละ instance ขณะที่เกมเก็บห้องใน RAM. การย้าย backend ไป Functions จึงต้องทำ shared room state/pub-sub ด้วย Redis และรองรับ reconnect ข้าม instance ก่อน

## Deploy รวมบน Node host

ตั้ง Build Command เป็น `npm ci && npm run build:frontend` และ Start Command เป็น `npm start`. Backend ให้บริการเฉพาะ `/health` และ WebSocket `/ws`; หากต้องการให้ URL เดียวเสิร์ฟ frontend ด้วย ให้ใช้ reverse proxy หรือ static hosting แยก และตั้ง `PUBLIC_WS_URL` ให้ชี้ไป backend

## ตัวแปร

| ตัวแปร | ใช้ที่ | ความหมาย |
|---|---|---|
| `PORT` | backend | พอร์ตที่แพลตฟอร์มส่งให้ (local default 4179) |
| `MAX_ROOMS` | backend | จำนวนห้องสูงสุด (default 8) |
| `ALLOWED_ORIGINS` | backend | origin ของ frontend ที่อนุญาต คั่นด้วย comma |
| `PUBLIC_WS_URL` | frontend build | URL WebSocket เช่น `wss://api.example.com/ws` |

`.env.example` เป็นตัวอย่างเท่านั้น; host ควรตั้งค่า environment ผ่านหน้า settings. ในเครื่อง `npm run dev` จะใส่ URL และ origin ค่า local ให้อัตโนมัติ

## ข้อจำกัด

สถานะห้องและแมตช์เก็บใน RAM ของ backend process เดียว การ restart ทำให้ห้องที่กำลังเล่นหาย และการเพิ่มหลาย instance ต้องออกแบบ shared state/routing ก่อน บริการ free อาจพักเมื่อไม่มี traffic และมีโควตาการใช้งาน ให้ดูเงื่อนไขปัจจุบันของแพลตฟอร์มก่อนเปิดให้ผู้เล่นใช้งานจริง
