"""
Migration script: Add new workflow columns to the applications table.
Run this once: python migrate_db.py
"""

import sqlite3

DB_PATH = "egov.db"

NEW_COLUMNS = [
    ("risk_score", "INTEGER DEFAULT 0"),
    ("confidence_level", "TEXT DEFAULT 'HIGH'"),
    ("clerk_decision", "TEXT"),
    ("clerk_remark", "TEXT"),
    ("manager_decision", "TEXT"),
    ("manager_remark", "TEXT"),
    ("final_report", "TEXT"),
    ("updated_at", "DATETIME"),
]

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get existing columns
    cursor.execute("PRAGMA table_info(applications)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    added = []
    skipped = []

    for col_name, col_def in NEW_COLUMNS:
        if col_name not in existing_columns:
            cursor.execute(f"ALTER TABLE applications ADD COLUMN {col_name} {col_def}")
            added.append(col_name)
        else:
            skipped.append(col_name)

    # Also update any old 'Pending' status rows to 'UNDER_CLERK_REVIEW'
    cursor.execute(
        "UPDATE applications SET status = 'UNDER_CLERK_REVIEW' WHERE status = 'Pending'"
    )
    updated_rows = cursor.rowcount

    conn.commit()
    conn.close()

    print(f"Migration complete.")
    print(f"  Columns added   : {added if added else 'None (all already exist)'}")
    print(f"  Columns skipped : {skipped}")
    print(f"  Rows updated (Pending → UNDER_CLERK_REVIEW): {updated_rows}")

if __name__ == "__main__":
    migrate()
