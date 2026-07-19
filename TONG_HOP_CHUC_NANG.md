# Nexora Flow — Tổng hợp chức năng dự án

> **AI Deal-flow Matchmaker** · Vietnam AI Innovation Challenge / NIC  
> Domain: [nexora-flow.cloud](https://nexora-flow.cloud)  
> Repo: [Dat0806a/Hackathon_VAIC](https://github.com/Dat0806a/Hackathon_VAIC)  
> Cập nhật theo codebase hiện tại (Hackathon_VAIC)

---

## 1. Tóm tắt sản phẩm

**Nexora Flow** là nền tảng kết nối deal-flow có **bằng chứng (evidence-bound)**:

- Startup tải pitch deck → AI chuẩn hóa hồ sơ  
- Hệ thống **so khớp có giải thích** với đối tác (doanh nghiệp, viện trường, lab, quỹ)  
- Soạn **email giới thiệu do người duyệt** (không auto-send)  
- Theo dõi kết nối → phòng giả lập → (tuỳ chọn) quy trình kiểm chứng với nhà đầu tư  

**Nguyên tắc cốt lõi:** *AI gợi ý — con người quyết định.*

### 1.1 Pipeline 5 bước (landing)

| Bước | Tên | Nội dung |
|------|-----|----------|
| 01 | Ingest & chuẩn hóa | Upload deck → trích product, tech, market, stage, nhu cầu hợp tác |
| 02 | Match & rank | Chấm điểm / xếp hạng đối tác phù hợp |
| 03 | Giải thích match | Fit score, lý do, hình thức hợp tác, nguồn evidence |
| 04 | Draft intro | Soạn lời giới thiệu; user preview/edit/approve |
| 05 | Sync & meeting | Gợi ý lịch, theo dõi funnel tới term sheet |

### 1.2 Giá trị nổi bật

- Match **có giải thích** (không black-box)  
- Intro **100% human-approved**  
- Match **hai chiều**: Startup ↔ Partner / Intake program  
- Song ngữ **VI / EN**, theme sáng/tối  
- Validation investor **additive** — bật/tắt flag, không phá matching lõi  

---

## 2. Đối tượng người dùng & không gian làm việc

| Vai trò | Không gian | Mục tiêu chính |
|---------|------------|----------------|
| **Startup / Founder** | Portal (SPA deal-flow) | Hồ sơ, so khớp đối tác, kết nối, sandbox, validation investor |
| **Intake / Program staff** | Workspace App Router | Quản lý chương trình, nhận hồ sơ, xếp hạng, báo cáo NIC |
| **Ứng viên public** | `/apply/[token]` | Nộp hồ sơ qua link chương trình (không bắt buộc login portal) |
| **Admin** | `/admin` | Vận hành / duyệt (kênh quản trị) |
| **Khách** | Landing `/` | Hiểu sản phẩm, đăng ký / đăng nhập |

Chuyển không gian: menu user có **chuyển Startup ↔ Intake** (cùng nền tảng, flow khác nhau).

---

## 3. Marketing & nền tảng chung

### 3.1 Landing (`/`)

- Hero, pain points, process 5 bước, audience (startup vs partner)  
- Feature cards: match giải thích, intro duyệt tay, scheduling, copilot, funnel, data control  
- FAQ, CTA early access, marquee hệ sinh thái  
- SEO: Open Graph, sitemap, robots, security.txt, JSON-LD  

### 3.2 Pháp lý & tài khoản

| Route | Chức năng |
|-------|-----------|
| `/login` | Đăng nhập (tab startup / workspace), email-password + Google OAuth |
| `/register` | Đăng ký startup |
| `/pending` | Tài khoản chờ duyệt / bị từ chối |
| `/auth/callback` | Callback sau OAuth |
| `/privacy`, `/terms` | Chính sách & điều khoản |
| `/workspace/login` | Cổng đăng nhập workspace Intake |

### 3.3 Đa ngôn ngữ & UX nền

- `i18n` toàn site (VI mặc định / EN)  
- Theme light/dark  
- Product tutorial (onboarding UI)  
- Layout full-frame, shell thống nhất (sidebar + user menu)  

---

## 4. Startup Portal (Deal-flow)

Ứng dụng SPA nhúng trong Next (`PortalApp` + React Router).  
**Home app:** `/dashboard` · **Marketing:** `/`

### 4.1 Xác thực & phiên

- Đăng ký / đăng nhập; session lưu local (Zustand + rehydrate)  
- Google OAuth (`/api/auth/google` + callback), `redirect_uri` theo origin/host  
- `GET /auth/me` kiểm tra phiên; pending/rejected → `/pending`  
- Logout, bảo vệ route (ProtectedRoute)  

### 4.2 Tổng quan — `/dashboard`

- Hoàn thiện hồ sơ (%), CTA thiết lập  
- Thống kê: đối tác khớp, điểm cao (≥80), kết nối chờ / đã chấp nhận  
- Match gần đây + radar fit theo 7 chiều  
- Pipeline tóm tắt: hồ sơ → so khớp → kết nối  
- Strip **validation investor** (khi flag bật): case cần action (accept / pitch / chờ duyệt…)  

### 4.3 Hồ sơ startup — `/setup`

| Tab / luồng | Mô tả |
|-------------|--------|
| Nhập trực tiếp | Form chuẩn hóa nhiều bước (sector, tech, stage, market, funding, capability…) |
| Ảnh (OCR) | Upload ảnh → nhận dạng chữ hỗ trợ điền |
| Tài liệu / pitch deck | Upload deck → AI extract (Gemini) → review trước khi gộp |
| Lịch sử | Version profile; so sánh thay đổi trước khi **xác nhận chính thức** |

- Profile **SSOT trên server** sau confirm; draft local cảnh báo “dirty” nếu chưa lưu  
- So khớp chỉ tin cậy khi hồ sơ official đã confirm  

### 4.4 So khớp đối tác — `/matches`

- Chạy / cập nhật matching (startup profile ↔ partner library)  
- **7 chiều điểm** (trọng số mặc định):

| Chiều | Weight |
|-------|--------|
| Lĩnh vực (industry) | 25% |
| Công nghệ | 15% |
| Giai đoạn (stage) | 15% |
| Hình thức hợp tác | 15% |
| Gọi vốn | 10% |
| Thị trường | 10% |
| Năng lực | 10% |

- Breakdown score, lý do khớp, rủi ro / thiếu thông tin  
- Lọc: loại hình, partnership, min score, search, sort  
- **Gửi kết nối**: soạn message, preview, gửi có kiểm soát (không auto)  
- Dedupe / chặn gửi trùng connection  

### 4.5 Kết nối — `/connections`

- Danh sách request: pending / accepted / rejected  
- Rút lại request, mở contact khi accepted  
- Bridge sang **Sandbox** khi đối tác chấp nhận  

### 4.6 Danh bạ đối tác — `/partners`

- Thư viện corporates / funds / accelerators…  
- Lọc theo tên, market, loại tổ chức  

### 4.7 Phòng giả lập — `/sandbox`

- Mô phỏng vận hành vốn ảo (~100k USD), quyết định theo lượt  
- Chơi với partner đã accept **hoặc** demo partner an toàn  
- Mục tiêu: chứng minh tư duy founder trước meeting thật  
- Không đụng dữ liệu deal thật ở chế độ demo  

### 4.8 So khớp nhà đầu tư — `/investor-matches` (additive)

- Matching startup ↔ **investor seed profiles** (demo / local pipeline)  
- Trạng thái: suggested → interested → mutual → evaluation_started…  
- **Không thay thế** so khớp đối tác; tách UI/pipeline  

### 4.9 Kiểm chứng (Validation M5–9) — `/evaluations/*`

Pipeline **additive** (feature flags `ENABLE_INVESTOR_PIPELINE`, `VALIDATION_*`):

| Vòng | Route | Nội dung |
|------|-------|----------|
| Case hub | `/evaluations`, `/evaluations/[caseId]` | Trạng thái case, accept journey, consent ghi hình |
| Round 1 — Pitch | `.../pitch` | Ghi / nộp pitch video; camera preflight; AI Q&A |
| Round 2 — Simulation | `.../simulation` | Giả lập kinh doanh theo case |
| Round 3 — Proof | `.../proof` | Video / bằng chứng sản phẩm |
| Final | Case status | Ready for final review / completed / rejected / withdrawn |

Trạng thái case phong phú (`draft` → rounds → `completed` / terminal).  
Dữ liệu evaluation store client-side (localStorage) trong MVP; không phá matching core.

### 4.10 Thông báo — `/notifications`

- Theo dõi sự kiện validation / pipeline (khi flag notification bật)  

---

## 5. Intake Workspace (Program staff)

App Router dưới `(app)/` — shell sidebar + **user menu** (Org, Settings, Audit; không nhồi tab phụ trên header program).

### 5.1 Dual mode Intake

Lưu `localStorage` key `nf.intake.mode.v1`:

| Mode | Mục tiêu | Nav program |
|------|----------|-------------|
| **search** | Tìm / khám phá hồ sơ khớp thesis chương trình | Overview + Applications (nhẹ) |
| **select** | Shortlist / lọc best projects trong program | Overview + Applications + Ranking + Report (+ Compare) |

Flow cảm giác khác nhau theo mode (copy, CTA, độ ưu tiên ranking).

### 5.2 Chương trình

| Route | Chức năng |
|-------|-----------|
| `/programs` | Danh sách program; search; gợi ý program “nên làm việc” |
| `/programs/new` | Tạo chương trình (thesis, industries, stages, quota…) |
| `/programs/[id]/overview` | Tổng quan, link apply public, next steps |
| `.../applications` | Hàng đợi hồ sơ; filter; chi tiết application |
| `.../ranking` | Xếp hạng theo cross-match / rubric |
| `.../report` | Báo cáo / NIC brief |
| `.../compare` | So sánh hồ sơ side-by-side |
| `.../settings` | Cấu hình program (user menu / route) |
| `.../audit` | Nhật ký audit (user menu) |

### 5.3 Cross-match Intake ↔ Startup

- Engine client `cross-match` dùng **cùng trọng số** matching startup→partner  
- Thesis program vs profile application: score, reasons, risks, missing requirements  
- Tôn trọng `matchingOptIn` của ứng viên  

### 5.4 Tổ chức & cài đặt

| Route / UI | Chức năng |
|------------|-----------|
| Organization sheet (user menu) | Org profile nhanh |
| `/settings/organization` | Cài đặt tổ chức |
| `/settings/library-readiness` | Mức sẵn sàng thư viện / data |
| `/onboarding` | Onboarding workspace |
| `/matching`, `/dealflow` | View matching / dealflow phụ trợ |
| `/applications/[id]` | Chi tiết đơn (workspace) |

### 5.5 NIC report

- Sinh brief / báo cáo (`nic-report`, export docx) phục vụ vận hành chương trình  

---

## 6. Public Apply (nộp hồ sơ công khai)

### 6.1 Entry

- `/apply` — hướng dẫn cần token  
- `/apply/[token]` — wizard theo program  

### 6.2 Luồng chuẩn (Upload → AI → điền → duyệt → submit)

```
upload  →  analyzing  →  review  →  done
```

1. **Upload** pitch deck / file cho phép (`upload-types`)  
2. **Analyzing** — gọi extract (Gemini multimodal; PDF text rỗng vẫn xử lý được)  
3. **Review** — form auto-fill; user chỉnh; fit score vs thesis program  
4. **Submit** — confirm application; opt-in matching; đồng ý terms  
5. **Done** — access key local để theo dõi `/my-application/[id]`  

### 6.3 Fit & form

- Industries, stages, problem/solution, market…  
- `scoreFitAgainstProgram` — gợi ý độ khớp trước khi nộp  
- Không hard-fail chỉ vì PDF không extract text  

---

## 7. AI & dịch vụ backend (deal-flow)

### 7.1 API

| Endpoint pattern | Vai trò |
|------------------|---------|
| `/api/v1/[[...path]]` | Proxy / mount deal-flow API (auth, profile, match, connections, sandbox…) |
| `/api/public/extract` | Extract công khai phục vụ apply |
| `/api/auth/google`, `.../callback` | OAuth Google |

Intake production có thể trỏ remote `api.nexora-flow.cloud` (rewrite `/intake-api`).

### 7.2 AI extract (Gemini)

- `aiService` + `domPolyfill` (DOMMatrix) cho môi trường server  
- Multimodal PDF / image / deck  
- Env: `GEMINI_API_KEY` (server only — **không** commit secret)  

### 7.3 Matching service

- `matchingService` + partner provider  
- Clamp score 0–100, weights 7 chiều, stage order  
- Output: total, breakdown, reasons  

### 7.4 Data store local

- `data_store.json` runtime (users, profiles, matches, connections…)  
- **Đã gitignore** — không đẩy PII/password lên GitHub  
- Dev có thể seed demo partners  

---

## 8. Quyền camera / media (Pitch & Proof)

- `mediaPermissions` preflight: hỏi quyền rõ ràng, không silent deny  
- Permissions-Policy camera/mic trong `next.config`  
- Message lỗi hữu ích khi user từ chối; video element luôn mount đúng lúc  

---

## 9. Bản đồ route chính

### Public / marketing

```
/                    Landing
/login  /register    Auth
/apply/[token]       Nộp hồ sơ
/privacy  /terms
```

### Startup portal

```
/dashboard
/setup
/matches
/connections
/partners
/sandbox
/investor-matches
/evaluations
/evaluations/[caseId]
/evaluations/[caseId]/pitch
/evaluations/[caseId]/simulation
/evaluations/[caseId]/proof
/notifications
/my-application/[applicationId]
```

### Intake workspace

```
/programs
/programs/new
/programs/[programId]/overview|applications|ranking|report|compare|settings|audit
/settings/organization
/settings/library-readiness
/matching  /dealflow  /onboarding
/applications/[applicationId]
/admin
```

---

## 10. Kiến trúc kỹ thuật (tóm tắt)

| Thành phần | Công nghệ |
|------------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Startup SPA | React Router trong `deal-flow/frontend` |
| UI | Tailwind CSS 4, shadcn/ui, Recharts |
| State | Zustand (auth/profile), localStorage modes |
| AI | Google Gemini (extract deck/PDF) |
| Auth | Email-password + Google OAuth |
| i18n | VI / EN custom dictionaries |
| Deploy | Vercel · domain `nexora-flow.cloud` |
| Brand | VAIC palette `#0059EE`, `#00A1F4`, `#00FBFC`, `#FAC515`, `#4153E6` |

### Cấu trúc thư mục then chốt

```
src/
  app/                 # Routes Next (landing, apply, intake, API)
  components/          # Landing + dashboard shell + charts
  deal-flow/
    backend/           # matching, AI, db
    frontend/          # Portal SPA pages & store
  investor/            # Validation M5–9 types, store, seed
  lib/                 # api client, cross-match, intake-mode, oauth, i18n
```

---

## 11. Feature flags (validation additive)

| Flag / env | Ý nghĩa |
|------------|---------|
| `ENABLE_INVESTOR_PIPELINE` | Master bật pipeline investor |
| `VALIDATION_STARTUP_ENABLED` | Module validation startup |
| `VALIDATION_INVESTOR_SETUP_ENABLED` | Setup phía investor |
| `VALIDATION_PITCH_ENABLED` | Vòng pitch |
| `VALIDATION_AI_QNA_ENABLED` | AI Q&A |
| `VALIDATION_SIM_ENABLED` | Vòng simulation |
| `VALIDATION_PROOF_ENABLED` | Vòng proof video |
| `VALIDATION_FINAL_ENABLED` | Final review |
| `VALIDATION_NOTIFICATION_ENABLED` | Notifications |

Khi master **OFF**: matching/portal đối tác **giữ nguyên**, ẩn pipeline validation.

---

## 12. Ranh giới MVP / không phải production-full

Đã có trong hackathon build:

- Portal startup end-to-end (profile → match → connect → sandbox)  
- Intake dual-mode + ranking/report  
- Apply Gemini flow  
- Investor validation **demo/local** (M5–9)  

Có thể còn mở rộng:

- Investor portal UI đầy đủ production  
- Matching intake real-time server-side thay toàn bộ client cross-match  
- Scheduling calendar thật, CRM sync  
- Hardening data store / DB production (thay file JSON local)  

---

## 13. Chạy local (tham chiếu)

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

Biến môi trường tham khảo (xem `.env.example`, **không** commit `.env`):

- `GEMINI_API_KEY`  
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`  
- `NEXT_PUBLIC_APP_URL`  
- các `NEXT_PUBLIC_VALIDATION_*` / `ENABLE_INVESTOR_PIPELINE`  

---

## 14. Một dòng định vị

> **Nexora Flow** chuẩn hóa hồ sơ khởi nghiệp, so khớp hai chiều có giải thích với mạng lưới đối tác & chương trình intake, soạn intro do người duyệt, và (tuỳ chọn) đưa startup qua hành trình kiểm chứng với nhà đầu tư — AI đề xuất, con người chốt.

---

*Tài liệu mô tả chức năng theo code hiện tại. Khi thêm module mới, cập nhật mục 4–6 và bản đồ route.*
