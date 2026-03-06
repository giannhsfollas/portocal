"""Entry point: create DB tables, run migrations and seed, then start the server."""
from app import app, db
from app.seed import seed_sample_data, migrate_add_user_id


def main():
    with app.app_context():
        db.create_all()
        # Add color column to existing DBs that don't have it
        try:
            from sqlalchemy import text

            with db.engine.connect() as conn:
                r = conn.execute(text("PRAGMA table_info(event)"))
                cols = [row[1] for row in r]
            if "color" not in cols:
                with db.engine.connect() as conn:
                    conn.execute(
                        text(
                            "ALTER TABLE event ADD COLUMN color VARCHAR(7) DEFAULT '#3b82f6'"
                        )
                    )
                    conn.commit()
        except Exception:
            pass
        migrate_add_user_id()
        seed_sample_data()
    app.run(debug=True, port=5000)


if __name__ == "__main__":
    main()
