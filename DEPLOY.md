# Four Clans — เล่นออนไลน์และ deploy ฟรี

ปรับปรุง 9 ตุลาคม 2026 · โค้ด frontend และ backend ใช้ JavaScript · รองรับห้อง 2–4 คน รบพร้อมกันแบบทุกคนเป็นศัตรูกัน

## ลองในเครื่อง

ใช้ Node.js 22 ขึ้นไป เปิด Terminal ในโฟลเดอร์ `four-clans-design` แล้วรันทีละบรรทัด:

```sh
npm ci
npm run build
npm start
```

เปิด http://localhost:4179 แล้วกด **ออนไลน์ 4 คน** → ใส่ชื่อ → **สร้างห้องใหม่** → ส่งรหัส 6 ตัวให้เพื่อน → ทุกคนกด **พร้อมรบ** → เจ้าของห้องกด **เริ่มรบ** เมื่อครบ 2–4 คน เลือกเผ่าที่ไม่ซ้ำได้ก่อนเริ่ม ผู้เล่นคนที่ 5 จะเข้าไม่ได้

ทดสอบคนเดียวด้วย 4 แท็บที่เปิดใหม่ (อย่า Duplicate แท็บที่เข้าห้องแล้ว เพราะบางเบราว์เซอร์คัดลอก session กลับเข้าที่นั่งเดิม) เพื่อนที่ใช้ Wi-Fi เดียวกันเปิด `http://IP-เครื่องที่รันเซิร์ฟเวอร์:4179` ใช้ URL เดียวกันทุกคน และอนุญาต Node ผ่านไฟร์วอลล์ของเครื่องหากถูกถาม `localhost` ใช้ได้เฉพาะเครื่องตัวเอง การเล่นข้ามอินเทอร์เน็ตให้ deploy ตามด้านล่าง

- ในสนามใช้วิธีเล่นเดิม: เลือกคนงาน → เกี่ยวข้าว/ตักน้ำ → ก่อสร้าง → ส่งเข้าโรงฝึก → อัปเกรด → เดินบุก
- ผู้เล่นทุกคนมีทรัพยากรและหมอกสงครามแยกกัน การเปิดสายพัฒนาไม่หยุดเวลาเกมออนไลน์
- รีเฟรชแท็บเดิม/เน็ตหลุด: กลับเข้าด้วยสิทธิ์เดิมอัตโนมัติ เก็บที่นั่งไว้ 90 วินาทีหลังเซิร์ฟเวอร์ตรวจพบการหลุด ระหว่างนั้นเกมยังเดินต่อ เมื่อเกินเวลาจะยอมแพ้
- โทเคนกลับเข้าห้องเก็บใน sessionStorage ไม่ใส่ในลิงก์เชิญหรือรายชื่อผู้เล่น ห้ามส่งโทเคนนี้ให้ผู้อื่น
- ออกจากห้องขณะรบมีปุ่มยืนยันยอมแพ้ เจ้าของห้องออกแล้วเกมของคนอื่นยังทำงานบนเซิร์ฟเวอร์
- ห้องรอหมดอายุใน 30 นาที ห้องที่จบเก็บอีก 5 นาที แล้วปิด ห้องว่างหมดอายุอัตโนมัติ

## เตรียมไฟล์ขึ้น GitHub

แนะนำสร้าง repository สำหรับเกมนี้ แล้วนำ **เนื้อหาในโฟลเดอร์ `four-clans-design`** ไปเป็นราก repository เพื่อไม่ต้องอัปโหลดโปรเจกต์อื่นใน Playground

ไฟล์ที่จำเป็น: `package.json`, `package-lock.json`, `.node-version`, `.gitignore`, `server.cjs`, `multiplayer.cjs`, `engine-source.cjs`, `build-village.cjs`, `forest-rts-v2-backup.html`, โฟลเดอร์ `src/` และไฟล์ใน `assets/`: `jungle-atlas.webp`, `forest-floor.webp`, `pond.webp`, `walk-cycle.webp`, `ascension-atlas.webp`, `expedition-atlas.webp` พร้อมไฟล์ทดสอบ `test-*.cjs` และเอกสารนี้

ไม่ต้องอัปโหลด `node_modules/`, `.env`, รูป QA หรือ `dist/` ระบบ build จะสร้าง `dist/index.html` ให้ใหม่ ไม่ต้องใช้ฐานข้อมูลสำหรับห้องแบบชั่วคราวนี้

## ทางเลือก A — frontend + backend บน Render ตัวเดียว (เริ่มต้นง่ายที่สุด)

1. ใน Render สร้าง **New → Web Service** และเชื่อม repository เกม
2. กรอกค่าตามนี้:

| ช่องใน Render | ค่า |
|---|---|
| Language / Runtime | Node |
| Root Directory | เว้นว่าง ถ้าไฟล์เกมอยู่ราก repo; ถ้าอยู่ใน Playground repo ให้ใส่ `four-clans-design` |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Free** |
| Health Check Path | `/health` |
| Region | เลือกภูมิภาคใกล้ผู้เล่นที่สุดที่มีให้เลือก |

3. Environment: ใส่ `MAX_ROOMS=4` สำหรับเริ่มทดลอง ไม่ต้องใส่ `PORT` เพราะ Render ให้มาเอง ไม่ต้องตั้ง `PUBLIC_WS_URL` หรือ `ALLOWED_ORIGINS` เมื่อ frontend และ backend อยู่โดเมนเดียวกัน
4. Deploy แล้วเปิด `https://ชื่อบริการ.onrender.com` เพื่อเล่นได้ทั้งหน้าเว็บและ WebSocket ในโดเมนเดียว หน้าเกมเลือก `wss://ชื่อบริการ.onrender.com/ws` ให้อัตโนมัติ
5. ทดสอบ `https://ชื่อบริการ.onrender.com/health` ต้องได้ JSON ที่ `ok: true` แล้วชวนเพื่อนเปิดหน้าเกม URL เดียวกันเพื่อทดสอบสร้างห้อง

Render Web Services รองรับ WebSocket สาธารณะ และต้องใช้ `wss://` บนอินเทอร์เน็ต: [เอกสาร WebSockets](https://render.com/docs/websocket), [ขั้นตอน Web Service](https://render.com/docs/web-services)

## ทางเลือก B — frontend บน Cloudflare Pages + backend บน Render

**Backend**: deploy Render ตามทางเลือก A ให้สำเร็จก่อน สมมติได้ `https://four-clans-api.onrender.com` ชื่อนี้เป็นตัวอย่าง ต้องเปลี่ยนเป็นบริการของคุณ

**Frontend**: ใน Cloudflare สร้าง Pages project จาก repository เดียวกัน แล้วตั้งค่า:

| ช่องใน Cloudflare Pages | ค่า |
|---|---|
| Framework preset | None |
| Root directory | เว้นว่าง หรือ `four-clans-design` ตามตำแหน่งไฟล์ใน repo |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment `NODE_VERSION` | `22` |
| Environment `PUBLIC_WS_URL` | `wss://four-clans-api.onrender.com/ws` (เปลี่ยนเป็นของคุณ) |

Pages รองรับ static HTML และกำหนดโฟลเดอร์ผลลัพธ์ได้: [Cloudflare Static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)

เมื่อได้ frontend URL เช่น `https://four-clans.pages.dev` ให้กลับไป Render → Environment แล้วใส่:

```text
ALLOWED_ORIGINS=https://four-clans.pages.dev
```

บันทึกและ redeploy backend แล้วเปิด frontend URL เพื่อเข้าห้อง ถ้าใช้ custom domain ให้เพิ่ม origin ที่ตรงจริงโดยคั่นด้วย comma และไม่มี slash ท้าย เช่น:

```text
ALLOWED_ORIGINS=https://four-clans.pages.dev,https://game.example.com
```

`PUBLIC_WS_URL` เป็น **ค่าตอน build frontend** เปลี่ยนแล้วต้อง build/deploy Pages ใหม่ ส่วน `ALLOWED_ORIGINS` เป็น **ค่าตอนรัน backend** เปลี่ยนแล้วต้อง restart/redeploy Render หลีกเลี่ยง wildcard: preview deployment ของ Pages ที่โดเมนเปลี่ยนจะต้องอนุญาต origin นั้นโดยตรง

## ค่าตั้งระบบ

| ตัวแปร | ค่าเริ่มต้น | ใช้ที่ไหน |
|---|---|---|
| `PORT` | `4179` | backend อ่านตอนเริ่มรันและ bind `0.0.0.0` |
| `MAX_ROOMS` | `8` | จำนวนห้องสูงสุด เป็นเพดานซอฟต์แวร์ ไม่ใช่การรับรอง capacity ของโฮสต์ฟรี |
| `ALLOWED_ORIGINS` | โดเมนเดียวกับ backend | อนุญาต frontend ข้ามโดเมนแบบระบุชื่อ |
| `PUBLIC_WS_URL` | โดเมนเดียวกับหน้าเว็บ + `/ws` | frontend อ่านค่าที่ build ฝังลง HTML |

มี `.env.example` เป็นตัวอย่าง โปรเจกต์ไม่ได้โหลด `.env` อัตโนมัติ ในเครื่องใช้ `node --env-file=.env server.cjs` หรือ export ตัวแปรใน shell ถ้าจะใช้ `PUBLIC_WS_URL` ผ่าน `.env` ให้รัน `node --env-file=.env build-village.cjs` บนบริการโฮสต์ให้ใส่ในหน้า Environment ของบริการโดยตรง

## ข้อจำกัดของฟรีที่ควรรู้

Render Free พักบริการเมื่อไม่มี traffic เข้า 15 นาที และปลุกกลับประมาณ 1 นาที มี 750 ชั่วโมงต่อ workspace ต่อเดือน รวมทั้งโควตา bandwidth/build เมื่อเกินโควตาอาจถูกพักบริการหรือมีค่าใช้จ่ายตามการตั้งค่าบัญชี จึงควรดูหน้า usage โดยเฉพาะเกมที่ส่งข้อมูลต่อเนื่อง แพลตฟอร์มอาจ restart ได้: [เงื่อนไข Render Free](https://render.com/docs/free)

ห้องและแมตช์ในโค้ดนี้อยู่ใน RAM: restart/redeploy ทำให้ห้องหายและกลับเข้าแมตช์เก่าไม่ได้ ยังไม่มีการเซฟแมตช์ ระบบนี้ใช้ Node process เดียวและ instance เดียว ถ้าจะเพิ่มหลาย instance ต้องเพิ่มการจัดเส้นทางห้องและที่เก็บสถานะร่วมก่อน

ส่งสถานะ 10 ครั้ง/วินาที จำลอง 20 ครั้ง/วินาที มี compression, heartbeat, reconnect, จำกัดข้อความ 8 KiB, จำกัดคำสั่งต่อ connection และตรวจเจ้าของยูนิต/อาคารฝั่ง server แต่ยังไม่ใช่ระบบแข่งขันพร้อมรับผู้เล่นสาธารณะจำนวนมาก ยังไม่ได้วัดโหลดและ latency บนแพลน Free จริง

## หลัง deploy ให้ตรวจ

1. เปิดเว็บจากคนละเครื่อง/เครือข่าย แล้วสร้างและเข้าห้องเดียวกันให้ครบ 4 คน
2. คนที่ 5 ต้องถูกปฏิเสธ ทุกคนต้องกดพร้อมก่อนเริ่ม
3. แต่ละคนเก็บข้าว/น้ำ สร้างโรงฝึก ฝึกทหาร และส่งหน่วยมาพบกัน การโจมตีต้องเห็น HP ตรงกันเมื่ออยู่ในระยะมองเห็น
4. รีเฟรชแท็บเดิมระหว่างรบ ต้องกลับทีมเดิมและทรัพยากรเดิม
5. ปิดแท็บผู้เล่นคนหนึ่งเกินช่วง reconnect ผู้เล่นอื่นต้องยังเล่นต่อได้

## แก้ปัญหาทั่วไป

| อาการ | วิธีตรวจ |
|---|---|
| เปิดเว็บได้แต่สร้างห้องไม่ได้ | `/health` ของ backend ต้องได้ 200; รอ cold start แล้วลองใหม่; ตรวจค่า `PUBLIC_WS_URL` ว่ามี `/ws` |
| WebSocket ขึ้น 403 | ค่า `ALLOWED_ORIGINS` ต้องตรงกับ origin ของหน้าเว็บ รวม `https://` แต่ไม่รวม path/slash ท้าย |
| หน้า HTTPS แต่ socket ไม่ต่อ | ใช้ `wss://` แทน `ws://` |
| Build หาไฟล์ไม่เจอ | ตรวจ Root Directory และไฟล์ assets/backup HTML ที่ build ใช้ |
| เพื่อนเปิด localhost แล้วเข้าไม่ได้ | ส่ง URL ที่ deploy หรือ IP ใน LAN ของเครื่อง server แทน localhost |
| ห้องหายหลังอัปเดต | เป็นข้อจำกัดของการเก็บ RAM ต้องสร้างห้องใหม่ |
| หน้า 4178 ไม่มีออนไลน์ | รีเฟรชหน้าเดิมหลัง build หรือเปิด http://localhost:4179 ซึ่งรวม backend แล้ว |

## โครงสร้างและทดสอบ

- `server.cjs`: HTTP, WebSocket, lobby, session/reconnect, room lifecycle และ origin validation
- `multiplayer.cjs`: เกมกลาง, ตรวจคำสั่ง, หมอกสงครามแยกผู้เล่น, ตัดข้อมูลศัตรูที่ยังมองไม่เห็น
- `engine-source.cjs` + `src/economy.js` + `src/expedition.js`: engine ร่วมกับโหมดเล่นในเครื่อง
- `src/online.js`: หน้าห้อง, ส่งคำสั่ง, รับ snapshot, ประสาน HUD และการแสดงภาพเดิน
- `npm test`: ทดสอบเกมเดิมและ WebSocket clients จริง 4 ตัว; ต้องอนุญาตให้ Node เปิด localhost port ชั่วคราว

งานที่ทำรอบนี้ยังเป็นการพัฒนาและทดสอบในเครื่อง **ยังไม่ได้เผยแพร่ขึ้นบัญชี cloud ของคุณ**
