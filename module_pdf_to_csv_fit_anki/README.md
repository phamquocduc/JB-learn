# Module Chuyển Đổi PDF Ngữ Pháp Shinkanzen N3 Sang CSV Anki

Dự án tự động bóc tách dữ liệu từ các file PDF bảng tổng hợp ngữ pháp Shinkanzen Master N3 và xuất ra các file CSV chuẩn định dạng để import trực tiếp vào Anki flashcard hoặc mở bằng Excel / Google Sheets.

---

## 📁 Cấu Trúc Dự Án

```
module_pdf_to_csv_fit_anki/
├── upload/                                          # Thư mục chứa file PDF gốc
│   ├── tổng hợp ngữ pháp Shin N3 (bản 1).pdf        # Bài 1 -> Bài 5
│   └── tổng hợp ngữ pháp Shin N3 (bản 2) .pdf       # Bài 6 -> Bài 12 + Kính ngữ
├── src/                                             # Mã nguồn xử lý
│   ├── __init__.py
│   ├── pdf_parser.py                               # Bóc tách ô bảng, tọa độ, lọc watermark
│   ├── text_cleaner.py                             # Chuẩn hóa khoảng trắng, dấu tiếng Việt, tạo HTML thẻ
│   ├── anki_exporter.py                            # Xuất CSV thẻ Basic, Detailed, Table
│   └── main.py                                     # Entrypoint chính
├── output/                                          # THƯ MỤC CHỨA FILE CSV ĐẦU RA
│   ├── shinkanzen_n3_anki_basic.csv                # File 1: Thẻ chuẩn 2 mặt (Front / Back / Tags)
│   ├── shinkanzen_n3_anki_detailed.csv             # File 2: Thẻ nhiều trường chi tiết (Multi-Field)
│   └── shinkanzen_n3_grammar_table.csv             # File 3: Bảng tra cứu Excel / Sheets
├── run.py                                           # Phím tắt chạy nhanh CLI
├── requirements.txt                                 # Thư viện phụ thuộc (pypdf)
└── README.md
```

---

## 🚀 Hướng Dẫn Chạy Script

### 1. Kích hoạt môi trường ảo:
```bash
source .venv/bin/activate
```

### 2. Chạy lệnh chuyển đổi:
```bash
python run.py
```
*(hoặc `python -m src.main`)*

---

## 📊 Dữ Liệu Được Trích Xuất (54 thẻ ngữ pháp)

- **Bài 1**: 6 cấu trúc (`~うちに`, `~あいだ`, `~てからでないと`, `~ところ`, ...)
- **Bài 2**: 5 cấu trúc (`~とおり`, `~によって`, `~たびに`, `~ほど`, `~ついでに`)
- **Bài 3**: 4 cấu trúc (`~くらい...はない`, `~くらいだ`, `~くらいなら`, `~に限る`)
- **Bài 4**: 5 cấu trúc (`~に対して`, `~反面`, `~一方`, `~というより`, `~かわりに`)
- **Bài 5**: 3 cấu trúc (`~ため`, `~によって [nguyên nhân]`, `~によって [phương thức]`)
- **Bài 6**: 5 cấu trúc (`~なら`, `~では`, `Thể điều kiện`, `~さえ~ば`, `たとえ~ても`)
- **Bài 7**: 5 cấu trúc (`~ということだ`, `~と言われている`, `~とか`, `~って`, `~という`)
- **Bài 8**: 5 cấu trúc (`~はずがない`, `~とは限らない`, `~わけではない`, `ないことはない`, `~ことは~が`)
- **Bài 9**: 4 cấu trúc (`~てもらいたい`, `~させてほしい`, `~いい [ước gì]`, `~いい [khuyên nhủ]`)
- **Bài 10**: 5 cấu trúc (`Thể mệnh lệnh`, `Thể cấm chỉ`, `~こと`, `~べきだ`, `~らどうか`)
- **Bài 11**: 2 cấu trúc (`~ことにする`, `~ようにする`)
- **Bài 12**: 2 cấu trúc (`~(よ)うとする`, `~つもりだ`)
- **Bài 12 - Kính ngữ**: 3 thẻ (`尊敬語 - Tôn kính ngữ`, `謙譲語 - Khiêm nhường ngữ`, `丁寧語 - Từ lịch sự`)

---

## 🗂️ Chi Tiết 3 Định Dạng File Trong Folder `output/`

### 1. `shinkanzen_n3_anki_basic.csv` (Khuyên dùng nhất cho Anki)
- **Định dạng thẻ**: Basic (Front / Back / Tags).
- **Mặt trước (Front)**: Tên cấu trúc ngữ pháp to rõ + huy hiệu Bài học.
- **Mặt sau (Back)**: Thiết kế HTML màu sắc trực quan (màu xanh dương cho Ý nghĩa, viền cam cho Chú ý, viền xanh lá cho Ví dụ minh họa).
- **Import vào Anki**: Tự động khớp với loại thẻ mặc định `Basic` trong Anki, không cần cấu hình thêm gì.

### 2. `shinkanzen_n3_anki_detailed.csv` (Dành cho Note Type tùy biến)
- **Các cột**: `Lesson`, `Grammar`, `Meaning`, `Conjugation`, `Usage_Notes`, `Examples`, `Tags`.
- Thích hợp khi bạn tự tạo một Note Type riêng trong Anki với các trường riêng biệt.

### 3. `shinkanzen_n3_grammar_table.csv`
- Bảng tổng hợp đầy đủ có cột STT, Bài, Cấu Trúc, Ý Nghĩa, Cách Chia, Chú Ý, Ví Dụ, Nguồn trang.
- Đã được mã hóa `UTF-8 with BOM` (`utf-8-sig`) giúp mở trực tiếp bằng Microsoft Excel mà không bị lỗi font tiếng Việt / tiếng Nhật.

---

## 📥 Cách Import Vào Anki

1. Mở phần mềm **Anki** trên máy tính.
2. Chọn menu **File** -> **Import...** (hoặc phím tắt `Ctrl + I` / `Cmd + I`).
3. Chọn file `output/shinkanzen_n3_anki_basic.csv`.
4. Trong cửa sổ Import hiện lên:
   - **Type**: Chọn `Basic`
   - **Deck**: Chọn bộ thẻ bạn muốn thêm vào (ví dụ: `JLPT N3 Grammar`).
   - Đảm bảo tùy chọn **Allow HTML in fields** đã được tích chọn (để hiển thị màu sắc và căn chỉnh đẹp mắt).
   - Field 1 mapped to `Front`, Field 2 mapped to `Back`, Field 3 mapped to `Tags`.
5. Nhấn **Import**. Hoàn tất!
