# JB Learn App — JLPT N3 Grammar & Anki Hub 🎌

Dự án tích hợp học tập ngữ pháp tiếng Nhật Shinkanzen Master N3 và xuất thẻ nhớ Anki tự động. Hệ thống bao gồm Backend Django REST Framework, Frontend React (Vite), và Module xử lý dữ liệu PDF/Anki (`module_pdf_to_csv_fit_anki`).

---

## 📁 Cấu trúc thư mục

```text
JB_learn_app/
├── .venv/                      # Môi trường ảo Python dùng chung cho backend & parser module
├── requirements.txt            # Danh sách thư viện Python (Django, DRF, pypdf,...)
├── .gitignore
├── backend/                    # Máy chủ Django REST Framework
│   ├── manage.py
│   ├── core/                   # Cấu hình dự án (settings.py, urls.py,...)
│   └── api/                    # Ứng dụng API (views, urls, tests,...)
├── frontend/                   # Giao diện người dùng React (Vite)
│   ├── package.json
│   ├── vite.config.js          # Cấu hình proxy /api -> http://127.0.0.1:8000
│   ├── src/
│   │   ├── components/         # Header, FlashcardView, TableView, DetailModal, ConvertModal
│   │   ├── services/api.js     # Kết nối API Backend
│   │   ├── App.jsx             # Giao diện chính
│   │   └── index.css           # Design system (Glassmorphism, 3D Flashcard, Theme)
│   └── public/
└── module_pdf_to_csv_fit_anki/ # Module đọc PDF và tạo file CSV chuẩn Anki
    ├── src/
    │   ├── pdf_parser.py       # ShinkanzenN3PdfParser
    │   └── anki_exporter.py    # AnkiExporter
    ├── upload/                 # 2 file PDF gốc Shinkanzen N3
    └── output/                 # Các file CSV đã chuẩn hóa
```

---

## 🚀 Hướng dẫn khởi chạy

### 1. Khởi động Backend (Django)

Mở một tab Terminal:
```bash
cd /Users/hhh/workspace/jlpt/JB_learn_app
source .venv/bin/activate
cd backend
python manage.py runserver 8000
```
- API sẽ chạy tại: `http://127.0.0.1:8000/api/`
- Kiểm tra trạng thái: `http://127.0.0.1:8000/api/health/`

### 2. Khởi động Frontend (React + Vite)

Mở một tab Terminal khác:
```bash
cd /Users/hhh/workspace/jlpt/JB_learn_app/frontend
npm run dev
```
- Truy cập ứng dụng tại: `http://localhost:5173`

---

## 🛠️ Tính năng chính

1. **Thẻ học Flashcard 3D**:
   - Mặt trước: Cấu trúc ngữ pháp, cách chia / nối thể, số bài học.
   - Mặt sau: Ý nghĩa tiếng Việt, chú ý cách sử dụng, câu ví dụ song ngữ Nhật - Việt.
   - Hỗ trợ phím tắt: `Space` để lật thẻ, `Phím mũi tên Trái / Phải` để chuyển thẻ, `Xáo trộn` ngẫu nhiên.
2. **Bảng tra cứu nhanh**:
   - Lọc theo từng bài (Bài 1 -> Bài 12).
   - Tìm kiếm tức thời theo cấu trúc, ý nghĩa tiếng Việt hoặc từ vựng trong ví dụ.
   - Xem chi tiết toàn diện trong modal.
3. **Đồng bộ / Xuất Anki trực tiếp từ giao diện**:
   - Nút **Sync Anki** kết nối thẳng với `module_pdf_to_csv_fit_anki` để trích xuất lại từ 2 file PDF và cập nhật ngay vào bảng dữ liệu.
4. **Kiểm tra trạng thái thời gian thực**:
   - Huy hiệu `Django Online` / `Django Offline` giúp nhận biết kết nối ngay lập tức.
5. **Giao diện hiện đại**:
   - Hỗ trợ Dark Mode & Light Mode, font chữ Inter và Noto Sans JP sắc nét.
