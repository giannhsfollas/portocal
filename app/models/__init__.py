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
    """An event on a specific date with description, classes, and teachers."""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
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
            "title": self.title,
            "event_date": self.event_date.isoformat(),
            "description": self.description or "",
            "color": getattr(self, "color", None) or "#3b82f6",
            "classes": [c.to_dict() for c in self.classes],
            "teachers": [t.to_dict() for t in self.teachers],
        }
