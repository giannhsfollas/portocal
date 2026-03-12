"""Database seeding and one-off migrations."""
from werkzeug.security import generate_password_hash

from app import db
from app.models import User, SchoolClass, Teacher, Event, Calendar, CalendarMember


def seed_sample_data():
    """Create dev/dev2 users and sample classes/teachers for dev if DB is empty."""
    dev = User.query.filter_by(username="dev").first()
    if dev is None:
        dev = User(username="dev", password_hash=generate_password_hash("dev"))
        db.session.add(dev)
        db.session.commit()
    dev2 = User.query.filter_by(username="dev2").first()
    if dev2 is None:
        dev2 = User(username="dev2", password_hash=generate_password_hash("dev2"))
        db.session.add(dev2)
        db.session.commit()
    if SchoolClass.query.filter_by(user_id=dev.id).first() is not None:
        return
    for name in ["5A", "5B", "6A", "6B", "7A"]:
        db.session.add(SchoolClass(user_id=dev.id, name=name))
    for name in ["Ms. Smith", "Mr. Jones", "Dr. Brown", "Mrs. Wilson"]:
        db.session.add(Teacher(user_id=dev.id, name=name))
    db.session.commit()


def migrate_add_user_id():
    """Add user_id to existing tables if missing; create dev user and assign existing rows."""
    from sqlalchemy import text

    with db.engine.connect() as conn:
        r = conn.execute(text("PRAGMA table_info(school_class)"))
        cols = [row[1] for row in r]
    if "user_id" in cols:
        return
    dev = User.query.filter_by(username="dev").first()
    if dev is None:
        dev = User(username="dev", password_hash=generate_password_hash("dev"))
        db.session.add(dev)
        db.session.commit()
    for table, model in [
        ("school_class", SchoolClass),
        ("teacher", Teacher),
        ("event", Event),
    ]:
        with db.engine.connect() as conn:
            r = conn.execute(text(f"PRAGMA table_info({table})"))
            cols = [row[1] for row in r]
        if "user_id" not in cols:
            with db.engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER"))
                conn.commit()
        for row in db.session.query(model).all():
            if getattr(row, "user_id", None) is None:
                row.user_id = dev.id
        db.session.commit()


def migrate_calendars():
    """Add calendar_id and added_by to event if missing; create default calendar per user and assign events."""
    from sqlalchemy import text

    with db.engine.connect() as conn:
        r = conn.execute(text("PRAGMA table_info(event)"))
        cols = [row[1] for row in r]
    if "calendar_id" not in cols:
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE event ADD COLUMN calendar_id INTEGER REFERENCES calendar(id)"))
            conn.commit()
    if "added_by" not in cols:
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE event ADD COLUMN added_by INTEGER REFERENCES user(id)"))
            conn.commit()

    for user in User.query.all():
        default_cal = Calendar.query.filter_by(owner_id=user.id).first()
        if default_cal is None:
            default_cal = Calendar(owner_id=user.id, name="My Calendar", color="#3b82f6")
            db.session.add(default_cal)
            db.session.flush()

    db.session.commit()

    events_without_calendar = Event.query.filter(Event.calendar_id.is_(None)).all()
    for ev in events_without_calendar:
        uid = ev.user_id
        if not uid:
            continue
        default_cal = Calendar.query.filter_by(owner_id=uid).first()
        if default_cal:
            ev.calendar_id = default_cal.id
            ev.added_by = ev.added_by or uid
    db.session.commit()
