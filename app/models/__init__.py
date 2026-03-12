"""Database models."""
from app import db

# Association table: event <-> school_class (many-to-many)
event_classes = db.Table(
    "event_classes",
    db.Column("event_id", db.Integer, db.ForeignKey("event.id"), primary_key=True),
    db.Column("class_id", db.Integer, db.ForeignKey("school_class.id"), primary_key=True),
)

# Association table: event <-> teacher (many-to-many)
event_teachers = db.Table(
    "event_teachers",
    db.Column("event_id", db.Integer, db.ForeignKey("event.id"), primary_key=True),
    db.Column("teacher_id", db.Integer, db.ForeignKey("teacher.id"), primary_key=True),
)


class User(db.Model):
    """A user (calendar account)."""
    __tablename__ = "user"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)

    def to_dict(self):
        return {"id": self.id, "username": self.username}


class Calendar(db.Model):
    """A calendar owned by a user; can be shared with members."""
    __tablename__ = "calendar"
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False, default="My Calendar")
    color = db.Column(db.String(7), nullable=False, default="#3b82f6")
    owner = db.relationship("User", backref=db.backref("owned_calendars", lazy="dynamic"))
    members = db.relationship(
        "CalendarMember",
        backref="calendar",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    events = db.relationship(
        "Event",
        backref="calendar",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color or "#3b82f6",
            "owner_id": self.owner_id,
            "is_owner": True,
        }


class CalendarMember(db.Model):
    """A user invited to a calendar; can_edit_own_only means they can only edit/delete events they added."""
    __tablename__ = "calendar_member"
    id = db.Column(db.Integer, primary_key=True)
    calendar_id = db.Column(db.Integer, db.ForeignKey("calendar.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    can_edit_own_only = db.Column(db.Boolean, nullable=False, default=True)
    user = db.relationship("User", backref=db.backref("calendar_memberships", lazy="dynamic"))
    __table_args__ = (db.UniqueConstraint("calendar_id", "user_id", name="uq_calendar_member"),)

    def to_dict(self):
        return {
            "id": self.id,
            "calendar_id": self.calendar_id,
            "user_id": self.user_id,
            "username": self.user.username if self.user else None,
            "can_edit_own_only": self.can_edit_own_only,
        }


class SchoolClass(db.Model):
    """A class (e.g. 5A, 6B)."""
    __tablename__ = "school_class"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    __table_args__ = (db.UniqueConstraint("user_id", "name", name="uq_school_class_user_name"),)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class Teacher(db.Model):
    """A teacher."""
    __tablename__ = "teacher"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class Event(db.Model):
    """An event on a specific date with description, classes, and teachers. Belongs to a calendar."""
    id = db.Column(db.Integer, primary_key=True)
    calendar_id = db.Column(db.Integer, db.ForeignKey("calendar.id"), nullable=True)  # nullable for migration
    added_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)  # user who created this event
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)  # legacy; prefer calendar_id + added_by
    title = db.Column(db.String(200), nullable=False, default="Event")
    event_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text, default="")
    color = db.Column(db.String(7), nullable=False, default="#3b82f6")
    classes = db.relationship(
        "SchoolClass",
        secondary=event_classes,
        backref=db.backref("events", lazy="dynamic"),
    )
    teachers = db.relationship(
        "Teacher",
        secondary=event_teachers,
        backref=db.backref("events", lazy="dynamic"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "calendar_id": getattr(self, "calendar_id", None),
            "added_by": getattr(self, "added_by", None),
            "title": self.title,
            "event_date": self.event_date.isoformat(),
            "description": self.description or "",
            "color": getattr(self, "color", None) or "#3b82f6",
            "classes": [c.to_dict() for c in self.classes],
            "teachers": [t.to_dict() for t in self.teachers],
        }
