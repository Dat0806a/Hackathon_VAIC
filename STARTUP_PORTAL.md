# Nexora Flow — Startup Portal

> Tài liệu chức năng **phía Startup / Founder**  
> Domain: [nexora-flow.cloud](https://nexora-flow.cloud)  
> Repo: [Dat0806a/Hackathon_VAIC](https://github.com/Dat0806a/Hackathon_VAIC)  
> Cập nhật theo codebase hiện tại (luồng gọn như Intake)

---

## 1. Mục tiêu

Startup Portal giúp founder:

1. **Chuẩn hóa hồ sơ** (form / OCR / pitch deck + Gemini)  
2. **So khớp đối tác thật** (7 chiều điểm, có giải thích) — không còn partner “Mô phỏng” seed  
3. **Gửi intro có kiểm soát** (không auto-send)  
4. **Theo dõi kết nối** (pending / accepted / rejected, vòng review)  
5. **Tùy chỉnh tài khoản cá nhân** (avatar, tên 7 ngày, trạng thái, nghề/ngành)  
6. *(Tuỳ chọn)* So khớp NĐT + kiểm chứng M5–9 khi bật flag  

**Nguyên tắc:** AI gợi ý — founder duyệt.

---

## 2. Ai dùng & điều kiện vào

| Mục | Chi tiết |
|-----|----------|
| Vai trò | `startup` |
| Đăng ký | `/register` → tài khoản **pending** |
| Duyệt | Admin NIC tại `/admin` → **active** |
| Đăng nhập | `/login?tab=startup` (email-password hoặc Google OAuth) |
| Session | Zustand `dealflow-auth-storage` (localStorage) |
| Pending / rejected | Redirect `/pending` |

---

## 3. Quy trình cốt lõi (sidebar)

```
Tổng quan → Hồ sơ → So khớp → Kết nối
```

| Bước | Route | Việc cần làm |
|------|-------|----------------|
| 1 | `/dashboard` | Xem tiến độ, CTA bước tiếp theo |
| 2 | `/setup` | Điền / upload deck → xác nhận hồ sơ **chính thức** |
| 3 | `/matches` | Chạy so khớp → xem điểm → gửi intro |
| 4 | `/connections` | Theo dõi lời mời & vòng thẩm định |

Đã **gỡ** khỏi luồng chính: Sandbox, Danh bạ đối tác (redirect về dashboard / matches).

---

## 4. Bản đồ route Startup

### 4.1 Bắt buộc (nav)

| Route | Màn hình |
|-------|----------|
| `/dashboard` | Tổng quan |
| `/setup` | Thiết lập hồ sơ startup |
| `/matches` | So khớp đối tác |
| `/connections` | Kết nối của tôi |

### 4.2 Menu user

| Route | Màn hình |
|-------|----------|
| `/account` | Tùy chỉnh cá nhân |
| `/setup` | Hồ sơ khởi nghiệp (lại) |
| *(flag)* `/investor-matches` | So khớp nhà đầu tư |
| *(flag)* `/evaluations` | Danh sách kiểm chứng |
| *(flag)* `/notifications` | Thông báo validation |

### 4.3 Redirect / legacy

| Route | Hành vi |
|-------|---------|
| `/sandbox` | → `/dashboard` |
| `/partners` | → `/matches` |
| `/login`, `/register` (trong SPA) | → Next pages tương ứng |

---

## 5. Chi tiết từng module

### 5.1 Đăng ký / Đăng nhập

- **Register:** email, mật khẩu, họ tên → API auth → chờ admin  
- **Login:**  
  - Email + password → `POST /api/auth/login` (qua `/intake-api`)  
  - Google OAuth → `/api/auth/google?intent=startup`  
- Chỉ role `startup` vào portal; intake bị chặn với message rõ  
- Session rehydrate + `GET /auth/me` khi boot  
- Token refresh khi 401  

### 5.2 Tổng quan — `/dashboard`

- Chào founder + tên startup (hồ sơ official)  
- Path pills: **Hồ sơ → So khớp → Kết nối**  
- CTA chính theo trạng thái (chưa hồ sơ / dirty / chưa match / chờ connect…)  
- Stats: hoàn thiện %, số match, điểm cao, connection pending/accepted  
- Match gần đây + radar 7 chiều (nếu có data)  
- Nút **Làm mới** (spin animation)  
- Live reload: focus / tab / event profile·matches·connections  

### 5.3 Hồ sơ startup — `/setup`

| Tab | Nội dung |
|-----|----------|
| Nhập trực tiếp | Form nhiều bước: tên, ngành, tech, stage, market, funding, team… |
| Ảnh (OCR) | Upload ảnh → AI extract → gợi ý field |
| Tài liệu / deck | PDF/DOCX/PPTX → Gemini multimodal extract |
| Lịch sử | Version hồ sơ; so sánh; confirm restore |

- **Draft** local vs **official** server  
- Confirm: `confirm-create` / `confirm-update`  
- Dirty warning: so khớp dùng bản server cũ cho đến khi lưu  
- Progress + ETA khi AI đang xử lý  

### 5.4 So khớp đối tác — `/matches`

- **Cập nhật so khớp:** `POST /startup/matches/run`  
- **7 chiều** (trọng số mặc định):

| Chiều | Weight |
|-------|--------|
| Lĩnh vực | 25% |
| Công nghệ | 15% |
| Giai đoạn | 15% |
| Hợp tác | 15% |
| Gọi vốn | 10% |
| Thị trường | 10% |
| Năng lực | 10% |

- Breakdown score, lý do khớp, rủi ro, recommendation  
- Lọc / sort / search  
- **Gửi kết nối:** message preview, dedupe (không gửi trùng)  
- **Ẩn partner demo / “Mô phỏng”** (seed + `isDemo`) — chỉ hiện org thật (vd. Summer AI)  
- Progress panel + ETA khi chạy match  
- Reload button có animation  

### 5.5 Kết nối — `/connections`

- Trạng thái: pending → (round1 / round2…) → accepted / rejected  
- Rút lại request (pending)  
- Vòng 2: trả lời text / video (camera preflight)  
- Không còn “Mở sandbox”  
- Ẩn connection tới partner demo  
- Silent poll ~25s + live events  

### 5.6 Tùy chỉnh cá nhân — `/account`

| Field | Ghi chú |
|-------|---------|
| Tên hiển thị | Đổi **1 lần / 7 ngày** |
| Avatar | Upload, nén JPEG |
| Trạng thái | online / away / busy / dnd / offline / custom + note |
| Nghề / vai trò | Dropdown + tự nhập |
| Ngành quan tâm | Tối đa 8 tag |
| Headline | ≤ 160 ký tự |

- **Key theo email** (ổn định sau logout/login)  
- Lưu local + **Vercel Blob** (`/api/personal-profile`)  
- Hydrate khi login (sidebar + form)  
- Bắt buộc bấm **Lưu**  

### 5.7 Validation NĐT (additive, feature flag)

Master: `ENABLE_INVESTOR_PIPELINE` / `NEXT_PUBLIC_*`

| Route | Vòng |
|-------|------|
| `/investor-matches` | Match startup ↔ investor seed |
| `/evaluations` | List case |
| `/evaluations/[id]` | Hub case + accept journey |
| `.../pitch` | Round 1 — video pitch + AI Q&A |
| `.../simulation` | Round 2 — business sim |
| `.../proof` | Round 3 — product video |
| `/notifications` | Notif pipeline |

- **Không thay thế** so khớp đối tác  
- Không auto-tạo case từ matching thường  
- Camera/mic preflight (không silent deny)  

### 5.8 Thông báo hệ thống (admin → user)

- Admin soạn rich-text tại `/admin` → tab Thông báo  
- Lưu **Vercel Blob** (shared mọi account)  
- Popup sau login trên trang **làm việc** (`/setup`, `/matches`, …)  
- **Không** hiện: `/login`, `/dashboard`, landing, 404, `/programs` home  
- Tắt 1 lần (session) hoặc vĩnh viễn (browser)  

---

## 6. API Startup (tóm tắt)

Browser: `/intake-api` → `api.nexora-flow.cloud` (hầu hết).  
Local bridge: `/api/v1` cho OCR/extract Gemini.

| Nhóm | Endpoint (ví dụ) |
|------|------------------|
| Auth | `/api/auth/login`, `/register`, `/me`, `/refresh` |
| Profile | `/api/startup/profile`, `confirm-create`, `confirm-update`, versions |
| Extract | `/api/v1/startup/extractions/image\|document`, `/api/public/extract` |
| Match | `/api/startup/matches`, `/matches/run` |
| Connections | `/api/startup/connections` CRUD + rounds |
| Personal | `/api/personal-profile` (GET/PUT by email) |
| Google | `/api/auth/google`, `/callback` |

---

## 7. UX / kỹ thuật nổi bật

| Chủ đề | Hành vi |
|--------|---------|
| i18n | VI / EN đầy đủ portal |
| Theme | Light / dark |
| Live reload | Focus, visibility, BroadcastChannel, events sau mutation |
| Processing UI | % + phase + ETA (match, extract, OCR) |
| Perf Windows | `perf-lite`: tắt Lenis/WebGL/blur nặng |
| Demo partners | Lọc `isDemo` + blocklist tên seed |
| Sandbox | Đã gỡ khỏi product path |

---

## 8. File / thư mục code chính

```
src/deal-flow/
  frontend/
    PortalApp.tsx          # Routes SPA
    pages/
      Dashboard.tsx
      SetupProfile.tsx
      Matches.tsx
      Connections.tsx
      AccountSettings.tsx
      InvestorMatches.tsx
      Evaluations.tsx
      PitchRoom.tsx / SimulationRound.tsx / ProofRound.tsx
    components/Layout.tsx  # Sidebar 4 mục
    store/useAuthStore.ts
    store/useStartupStore.ts
    api.ts
  backend/
    matchingService.ts
    aiService.ts
    db.ts                  # Không seed DEFAULT_PARTNERS demo
    partnerProvider.ts
src/components/account/AccountPersonalization.tsx
src/lib/personal-profile.ts
src/app/api/personal-profile/route.ts
src/investor/                 # Validation additive
```

---

## 9. Biến môi trường liên quan

| Env | Dùng cho |
|-----|----------|
| `NEXT_PUBLIC_API_URL` | `https://api.nexora-flow.cloud` |
| `NEXT_PUBLIC_APP_URL` | Origin app (OAuth redirect) |
| `GEMINI_API_KEY` | Extract deck/OCR |
| `GOOGLE_CLIENT_ID` / `SECRET` | SSO |
| `BLOB_READ_WRITE_TOKEN` | Personal profile + announcements shared |
| `ENABLE_INVESTOR_PIPELINE` / `VALIDATION_*` | Bật/tắt M5–9 |

---

## 10. Checklist demo Startup

1. Register → admin duyệt  
2. Login → `/dashboard`  
3. `/setup` upload deck → AI fill → **xác nhận hồ sơ**  
4. `/matches` → **Cập nhật so khớp** → chỉ thấy partner thật  
5. Gửi intro → `/connections` theo dõi  
6. `/account` tùy chỉnh → **Lưu** → logout/login vẫn còn  
7. *(Tuỳ chọn)* Investor match → accept case → pitch  

---

## 11. Định vị một dòng

> **Startup Portal Nexora Flow:** hồ sơ chuẩn → so khớp có giải thích với đối tác thật → intro do founder duyệt → theo dõi kết nối; tùy chỉnh cá nhân bền theo email; validation NĐT là lớp additive.

---

*Cập nhật khi thêm/bớt module. Xem thêm: `TONG_HOP_CHUC_NANG.md` (toàn product), `STARTUP_PORTAL.md` (file này).*
