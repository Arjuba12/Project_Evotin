"""
Migrasi kecil: nambah kolom `otp_attempts` ke tabel `users` di evoting.db (SQLite).

Perlu dijalanin sekali aja tiap kali ada kolom baru ditambahin ke models.py,
karena SQLAlchemy's Base.metadata.create_all() CUMA bikin tabel yang belum ada
— dia nggak otomatis nambahin kolom baru ke tabel yang udah eksis.

Cara pakai (dari folder backend/):
    python migrate_add_otp_attempts.py

Kalau file evoting.db kamu bukan di app/evoting.db, kasih path-nya manual:
    python migrate_add_otp_attempts.py "C:\\path\\ke\\evoting.db"

Aman dijalanin berkali-kali — kalau kolomnya udah ada, langsung dilewatin.
"""

import os
import sqlite3
import sys

def find_default_db_path():
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(here, "app", "evoting.db"),
        os.path.join(here, "evoting.db"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return candidates[0]  # default meski belum tentu ada, biar error-nya jelas

def main():
    db_path = sys.argv[1] if len(sys.argv) > 1 else find_default_db_path()

    if not os.path.exists(db_path):
        print(f"❌ File database tidak ditemukan di: {db_path}")
        print("   Kasih path yang benar sebagai argumen, contoh:")
        print('   python migrate_add_otp_attempts.py "C:\\Users\\kamu\\Project_Evotin\\backend\\app\\evoting.db"')
        sys.exit(1)

    print(f"📂 Menggunakan database: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cur.fetchall()]

    if "otp_attempts" in columns:
        print("✅ Kolom 'otp_attempts' sudah ada di tabel users, tidak ada yang perlu dilakukan.")
    else:
        print("🔧 Menambahkan kolom 'otp_attempts' ke tabel users...")
        cur.execute("ALTER TABLE users ADD COLUMN otp_attempts INTEGER NOT NULL DEFAULT 0")
        conn.commit()
        print("✅ Selesai! Kolom 'otp_attempts' berhasil ditambahkan (default 0 buat semua user yang udah ada).")

    conn.close()

if __name__ == "__main__":
    main()
