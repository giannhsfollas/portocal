"""Entry point: create DB tables, run migrations and seed, then start the server."""
import socket

from app import app, db
from app.seed import seed_sample_data, migrate_add_user_id, migrate_calendars


def _local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


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
        migrate_calendars()
        seed_sample_data()

    port = 5000
    ip = _local_ip()
    if ip:
        print(f"\n  On this network: http://{ip}:{port}\n")

    app.run(debug=True, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
