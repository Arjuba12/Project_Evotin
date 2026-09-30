"""
Migrasi: bikin tabel `votes` beneran anonim.

Sebelumnya: votes.user_id nunjuk langsung ke users.id -> siapapun yang akses DB bisa
tau persis siapa milih siapa.

Sesudahnya:
  - users dapet kolom baru `has_voted` (boolean) -> ini yang jadi penanda "sudah voting",
    bukan lagi dicari dari tabel votes.
  - votes.user_id DIHAPUS TOTAL dari database -> secara struktur, gak ada cara nelusurin
    balik baris vote ke user manapun.

URUTAN PENTING (jangan diubah):
  1. Tambah kolom users.has_voted
  2. Backfill has_voted = True untuk user yang beneran udah punya baris di votes
     (dicek dari votes.user_id) -- ini DILAKUKAN SEBELUM user_id dihapus, karena kalau
     kebalik data "siapa aja yang udah voting" bakal hilang dan gak bisa dipulihin.
  3. Baru setelah itu, kolom votes.user_id di-drop.

Jalanin SEKALI aja, sebelum deploy kode main.py/models.py yang baru:
  - Lokal (SQLite):  python migrate_anon_vote.py
  - Railway (Postgres): jalanin lewat psql / query console, pakai query yang sama
    (skrip ini otomatis deteksi dialect dari DATABASE_URL kalau dikasih)

Aman dijalanin berkali-kali (idempotent) — langkah yang udah kelar otomatis dilewatin.
SELALU backup/export database dulu sebelum jalanin migrasi di production.
"""

import os
import sys


def run_sqlite(db_path: str):
    import sqlite3

    if not os.path.exists(db_path):
        print(f"❌ File database tidak ditemukan: {db_path}")
        sys.exit(1)

    print(f"📂 Menggunakan database SQLite: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1) users.has_voted
    cur.execute("PRAGMA table_info(users)")
    user_cols = [row[1] for row in cur.fetchall()]
    if "has_voted" not in user_cols:
        print("🔧 Menambah kolom users.has_voted...")
        cur.execute("ALTER TABLE users ADD COLUMN has_voted BOOLEAN NOT NULL DEFAULT 0")
    else:
        print("✅ Kolom users.has_voted sudah ada, dilewati.")

    # 2) Backfill dari votes.user_id (kalau kolomnya masih ada)
    cur.execute("PRAGMA table_info(votes)")
    vote_cols = [row[1] for row in cur.fetchall()]
    if "user_id" in vote_cols:
        print("🔧 Backfill users.has_voted dari data votes.user_id yang lama...")
        cur.execute(
            """
            UPDATE users SET has_voted = 1
            WHERE id IN (SELECT DISTINCT user_id FROM votes WHERE user_id IS NOT NULL)
            """
        )
        print(f"   -> {cur.rowcount} user ditandai sudah voting.")

        # 3) Drop votes.user_id (SQLite 3.35+ support DROP COLUMN langsung)
        print("🔧 Menghapus kolom votes.user_id (biar vote beneran anonim)...")
        try:
            cur.execute("ALTER TABLE votes DROP COLUMN user_id")
        except sqlite3.OperationalError as e:
            print(f"⚠️  Gagal DROP COLUMN langsung ({e}); build tabel ulang sebagai fallback...")
            cur.execute("ALTER TABLE votes RENAME TO votes_old")
            cur.execute(
                """
                CREATE TABLE votes (
                    id INTEGER PRIMARY KEY,
                    candidate_id INTEGER,
                    created_at DATETIME,
                    FOREIGN KEY(candidate_id) REFERENCES candidates(id)
                )
                """
            )
            cur.execute(
                "INSERT INTO votes (id, candidate_id) SELECT id, candidate_id FROM votes_old"
            )
            cur.execute("DROP TABLE votes_old")
    else:
        print("✅ Kolom votes.user_id sudah gak ada (migrasi sebelumnya udah kelar), dilewati.")

    conn.commit()
    conn.close()
    print("\n✅ Migrasi selesai (SQLite).")


def run_postgres(database_url: str):
    import psycopg2

    print("📂 Menggunakan database Postgres (Railway)")
    conn = psycopg2.connect(database_url)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # 1) users.has_voted
        cur.execute(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_name='users' AND column_name='has_voted'
            """
        )
        if not cur.fetchone():
            print("🔧 Menambah kolom users.has_voted...")
            cur.execute("ALTER TABLE users ADD COLUMN has_voted BOOLEAN NOT NULL DEFAULT FALSE")
        else:
            print("✅ Kolom users.has_voted sudah ada, dilewati.")

        # 2) Backfill + 3) drop votes.user_id
        cur.execute(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_name='votes' AND column_name='user_id'
            """
        )
        if cur.fetchone():
            print("🔧 Backfill users.has_voted dari data votes.user_id yang lama...")
            cur.execute(
                """
                UPDATE users SET has_voted = TRUE
                WHERE id IN (SELECT DISTINCT user_id FROM votes WHERE user_id IS NOT NULL)
                """
            )
            print(f"   -> {cur.rowcount} user ditandai sudah voting.")

            print("🔧 Menghapus kolom votes.user_id (biar vote beneran anonim)...")
            cur.execute("ALTER TABLE votes DROP COLUMN user_id")
        else:
            print("✅ Kolom votes.user_id sudah gak ada (migrasi sebelumnya udah kelar), dilewati.")

        conn.commit()
        print("\n✅ Migrasi selesai (Postgres).")
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def main():
    database_url = os.getenv("DATABASE_URL")

    if database_url and database_url.startswith(("postgres://", "postgresql://")):
        run_postgres(database_url)
        return

    here = os.path.dirname(os.path.abspath(__file__))
    default_sqlite = os.path.join(here, "app", "evoting.db")
    db_path = sys.argv[1] if len(sys.argv) > 1 else default_sqlite
    run_sqlite(db_path)


if __name__ == "__main__":
    main()
