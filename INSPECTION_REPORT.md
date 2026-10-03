# รายงานตรวจ dm_lm_codex.zip และหน้าเว็บที่สร้าง

ตรวจจากไฟล์ที่แนบวันที่ 3 ตุลาคม 2569 ไม่ได้ใช้ dm_codex.zip ชุดก่อนเป็นแหล่งข้อมูล และไม่ได้แก้ repository GitHub ในงานนี้

## โครงสร้างต้นฉบับ

ไฟล์หลัก 33 ไฟล์ ประกอบด้วย Word 9 ฉบับ, Excel 1 ไฟล์ และ ZIP ย่อย 23 ชุด ไม่มีฐานข้อมูล production แนบมา

ZIP ย่อยเป็น baseline ที่สะสมโมดูลตามระยะงาน เมื่อตรวจแยกตามเส้นทาง พบ 90 เส้นทางไฟล์ที่ไม่ซ้ำ มีเพียง package.json ที่เนื้อหาต่างกันระหว่างชุด โค้ดและเอกสารที่มีเส้นทางซ้ำกันตรงกันทุกไบต์ เลือก Sangha_Data_Platform_GoLive_PIR_Baseline ซึ่งมีครบทั้ง 90 เส้นทางเป็นฐานของตัวรัน ไม่เลือกทับไฟล์ตามเวลาใน ZIP และไม่ผสม package.json จากหลายชุด

ชุด GoLive มี Prisma schema 33 models, 12 enums และ .mjs services / tests แต่ยังไม่ใช่แอป Next.js ที่รันได้ครบ:

- package.json มีคำสั่ง next / vitest / tsx / prisma แต่ไม่มี dependencies และ lockfile
- มี src/app/directory/page.tsx และ API ทำเนียบ แต่ไม่มี app layout และชุดตั้งค่าแอปครบ
- service stores ส่วนใหญ่ใช้ Map / arrays; transaction เป็น test adapter ไม่ใช่ PostgreSQL transaction
- public-directory store ที่ export เริ่มโดยไม่มี activeRelease ต้องกำหนดชุด projection ก่อนเรียกได้
- auth ต้องมี account/credential/grant provider ที่เชื่อถือได้ต่อเพิ่ม
- ไม่พบ connection หรือ database dump สำหรับ PostgreSQL จริง

เอกสาร Word ระบุขอบเขตข้อมูลสมมติและมีสถานะ Confirmed / Proposal / Needs Legal Review คงสถานะเดิมทั้งหมด ไม่ตีความเอกสาร baseline เป็นการอนุมัติ production

## ข้อมูลที่แยกและเชื่อม

- หน่วยงาน 3 แห่งจาก prisma/seed.ts: SYN-ORG-CENTRAL, SYN-ORG-EDU-01, SYN-ORG-EXAM-01
- บุคคล 2 คนจาก publicLabel ของ seed: Synthetic Person Acting และ Synthetic Person Appointed
- ตำแหน่ง Synthetic Education Lead และประวัติสมมติ 2 ช่วงจาก validFrom / validUntil ของ seed
- ทำเนียบสาธารณะเริ่มต้น 1 รายการจาก tests/public/directory-privacy.test.mjs ใช้เฉพาะ publicEntryId, organizationName, organizationType, positionTitle และ releasedAssignments ที่จำเป็น ไม่คัดลอก privatePhone/privateEmail/appointmentDocumentId/personId ที่เป็น private marker ใน fixture
- ข้อความ Word ทั้ง 9 ฉบับ แยกย่อหน้าและแถวตาราง ไม่รวมรูปแบบหน้าและภาพ
- Markdown 24 ฉบับจากชุด GoLive
- Excel 4 ชีต: ReadMe, Candidates, Applications และ Data Dictionary; ไม่แก้ไข workbook ต้นฉบับ
- header Candidates / Applications อยู่แถว 6, แถว 7 เป็นที่กรอกเริ่มต้น และแถว 8 เป็นตัวอย่างซึ่งมีคำแนะนำให้ลบก่อน upload

ตัวแยกข้อมูล seed สร้าง UUID ด้วย namespace และ SHA-256 แบบเดียวกับ seed.ts เพื่อคงความสัมพันธ์ของรหัสสมมติ ไม่รัน Prisma seed กับฐานข้อมูลภายนอก

## สิ่งที่สร้าง

index.html ฝัง CSS / JavaScript / ข้อมูลสมมติ / เอกสารและไฟล์ Word-XLSX ที่ดาวน์โหลดได้ไว้ในไฟล์เดียว มีหน้า: ภาพรวม, ทำเนียบ, หน่วยงาน, บุคคล, ประวัติตำแหน่ง, เอกสารและแม่แบบ, โมดูลและผลตรวจ และจัดการข้อมูลสมมติ

server.mjs ใช้ Node.js standard library เรียกโมดูลจาก baseline จริง:

- PublicDirectoryStore / getPublicDirectoryResponse สำหรับทำเนียบและ rate limit
- createOrganisation / reparentOrganisation สำหรับหน่วยงานและ cycle prevention
- createPerson สำหรับบุคคลสมมติ
- appendAssignment สำหรับประวัติตำแหน่งและ overlap checks
- createSession / authorize สำหรับ session และการอนุญาตฝั่ง server

เพิ่ม adapter เก็บข้อมูล JSON แบบเขียน temp แล้ว rename, ใช้ revision ตรวจการแก้ทับจากคนละหน้าต่าง, serialize mutation ในตัวรันเดียว, และแก้ไขบนสำเนาข้อมูลก่อนบันทึก หากคำขอหรือการบันทึกผิดพลาดจะไม่เปลี่ยนชุดข้อมูลที่ใช้งาน

การเพิ่มข้อมูลใหม่และการเผยแพร่เป็นคนละการทำงาน หน้า API สาธารณะอ่าน released projection เท่านั้น บัญชี editor เป็นบัญชี local DATA_STEWARD ที่สร้างโดยตัวรัน ไม่ใช่ role admin และไม่อ้างว่าต่อ Auth.js / IdP / MFA จริงแล้ว รหัสสุ่มเปลี่ยนทุกครั้งที่เริ่มตัวรัน session เป็น HttpOnly / SameSite Strict cookie และ mutation ตรวจ origin กับ CSRF token

ต้นฉบับใน baseline/ และ source_files/ คงทุกไบต์เดิม เอกสาร Proposal / Legal Review ไม่ได้ถูกแก้หรือเปลี่ยนสถานะ

## ผลตรวจต้นฉบับที่รันจริง

รัน Node กับไฟล์ตรวจ .mjs 25 ไฟล์จากชุด GoLive: ผ่าน 17, ไม่ผ่าน 8

สาเหตุหลัก: fixtures ของ org, people, positions, status และ education ตั้ง sessionExpiresAt เป็น 2026-10-01T00:00:00Z แล้วเรียกบริการโดยใช้เวลาจริง ซึ่งหมดอายุแล้ว ส่วน QA / UAT / Training เรียกชุดเหล่านี้ต่อ จึงไม่ผ่านด้วย รายละเอียดที่บันทึกจริงอยู่ใน data/baseline-test-results.json

ไม่แก้ authorization เพื่อให้ fixture หมดอายุผ่าน และไม่เปลี่ยนผล failed เป็น passed ตัวรันใหม่สร้าง sessionExpiresAt เป็นเวลาปัจจุบันบวก 60 นาที จึงไม่ใช้ principal ที่หมดอายุจาก fixtures เหล่านี้

ไม่ได้รัน Prisma migration, stable seed rerun .ts, PostgreSQL integration, Next.js build/lint หรือ production deploy เพราะชุดต้นฉบับและ infrastructure ยังไม่ครบ

## ผลทดสอบหน้าเว็บและตัวรันใหม่

JavaScript syntax / node --check server.mjs: ผ่าน

HTTP integration ผ่าน 6 ชุด:

1. เปิดหน้า HTML และค้น public projection ที่ใช้โมดูลต้นฉบับจริง ตรวจ public field allowlist และผู้ถือครองตามวันที่
2. เข้า/ออกจาก session ตรวจรหัสผิด CSRF และ endpoint ที่ห้ามอ่านไฟล์ source/state
3. เพิ่มหน่วยงาน/บุคคล บันทึกเป็นไฟล์ JSON อ่าน state จากดิสก์ และตรวจ stale revision กับข้อมูล invalid ที่ไม่ถูกบันทึก
4. ย้ายหน่วยงาน ปฏิเสธ cycle และเก็บ previousParentId พร้อมเหตุผล
5. ปฏิเสธ timeline ที่ทับซ้อน เพิ่ม timeline หลังช่วงเดิม แล้วเผยแพร่ให้ค้นหาผ่าน public API ได้
6. public rate limit ให้ HTTP 429 พร้อม Retry-After

Frontend controller ผ่าน 10 กลุ่มใน DOM adapter:

- render ครบ 8 หน้า
- จำนวนเอกสาร/โมดูล/models/ชีตตรงข้อมูลต้นฉบับ
- หน่วยงาน/บุคคล/ประวัติเริ่มต้นตรง seed ที่แยก
- ผู้ดำรงตำแหน่งตามวันที่ใน public fixture
- ค้นหาและ pagination ตาม controller
- escape ข้อความก่อนใส่ HTML
- ค้นหาหน่วยงาน / กรองประวัติตามวันที่
- ค้นเอกสารตามประเภทและเนื้อหา
- ตรวจว่า binary Word / XLSX ที่ฝังใน HTML ตรงกับไฟล์ต้นฉบับทุกไบต์

ไม่ได้ตรวจภาพ/การคลิก/การพิมพ์ในเบราว์เซอร์จริง สภาพแวดล้อมไม่มี Chromium และการติดตั้งในรอบก่อนล้มเหลว ดังนั้นไม่อ้าง browser E2E หรือ visual QA มี CSS responsive แต่ยังต้องตรวจภาพจริงก่อนใช้งานบนอุปกรณ์เป้าหมาย

## ขอบเขตที่ยังต้องพัฒนาต่อ

หน้าใหม่ทำงานได้สำหรับอ่านข้อมูลต้นฉบับและจัดการข้อมูลสมมติบนเครื่อง ยังไม่ใช่ระบบหลายผู้ใช้หรือ PostgreSQL production การสมัครสอบ, import Excel, malware scan, account mapping approval, สถานะองค์กร, private documents, independent approver และการเปิดบริการจริงยังเป็น baseline ของโมดูลเหล่านั้น

การดาวน์โหลด backup ผ่านหน้าเว็บทำได้ ส่วนการ restore ให้หยุดตัวรันและแทนไฟล์ state จาก backup ของแอปนี้ ไม่อ้างว่าเป็นกระบวนการ backup/restore infrastructure ตามเอกสารต้นฉบับ
