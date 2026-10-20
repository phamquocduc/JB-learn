import os
import sys
from .pdf_parser import ShinkanzenN3PdfParser
from .anki_exporter import AnkiExporter

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_dir = os.path.join(base_dir, "upload")
    output_dir = os.path.join(base_dir, "output")
    
    file1 = os.path.join(upload_dir, "tổng hợp ngữ pháp Shin N3 (bản 1).pdf")
    file2 = os.path.join(upload_dir, "tổng hợp ngữ pháp Shin N3 (bản 2) .pdf")
    
    print("=" * 65)
    print("🚀 BẮT ĐẦU CHUYỂN ĐỔI NGỮ PHÁP SHINKANZEN N3 SANG CSV ANKI")
    print("=" * 65)
    print(f"📁 Thư mục nguồn: {upload_dir}")
    print(f"📁 Thư mục xuất : {output_dir}")
    
    parser = ShinkanzenN3PdfParser()
    all_records = []
    
    # 1. Parse Bản 1 (Bài 1 - 5)
    if os.path.exists(file1):
        print(f"\n[1/2] Đang đọc: {os.path.basename(file1)}...")
        r1 = parser.parse_pdf(file1, default_start_lesson="Bài 1")
        print(f"  -> Trích xuất thành công: {len(r1)} cấu trúc ngữ pháp")
        all_records.extend(r1)
    else:
        print(f"⚠️ Không tìm thấy file: {file1}")
        
    # 2. Parse Bản 2 (Bài 6 - 12 & Kính ngữ)
    if os.path.exists(file2):
        print(f"\n[2/2] Đang đọc: {os.path.basename(file2)}...")
        r2 = parser.parse_pdf(file2, default_start_lesson="Bài 6")
        print(f"  -> Trích xuất thành công: {len(r2)} cấu trúc ngữ pháp")
        all_records.extend(r2)
    else:
        print(f"⚠️ Không tìm thấy file: {file2}")
        
    if not all_records:
        print("❌ Không tìm thấy dữ liệu ngữ pháp nào!")
        sys.exit(1)
        
    print(f"\n✨ TỔNG CỘNG: {len(all_records)} thẻ ngữ pháp từ toàn bộ giáo trình")
    
    # Lesson summary
    lesson_counts = {}
    for r in all_records:
        l = r.get("lesson", "Khác")
        lesson_counts[l] = lesson_counts.get(l, 0) + 1
        
    print("\n📊 Phân bổ theo bài học:")
    for l, cnt in sorted(lesson_counts.items(), key=lambda x: (len(x[0]), x[0])):
        print(f"   • {l:<20}: {cnt:>2} thẻ")
        
    # 3. Export to output folder
    exporter = AnkiExporter(output_dir=output_dir)
    paths = exporter.export_all(all_records)
    
    print("\n💾 ĐÃ XUẤT THÀNH CÔNG 3 ĐỊNH DẠNG FILE CSV TẠI FOLDER OUTPUT:")
    print(f"   1. [Anki Thẻ Chuẩn 2 Mặt (Basic Front/Back)]:\n      -> {paths['basic_anki']}")
    print(f"   2. [Anki Nhiều Cột Chi Tiết (Multi-Field Note Type)]:\n      -> {paths['detailed_anki']}")
    print(f"   3. [Bảng Tra Cứu Excel / Google Sheets]:\n      -> {paths['table_csv']}")
    print("=" * 65)

if __name__ == "__main__":
    main()
