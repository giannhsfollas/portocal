"""API routes: classes, teachers, events."""
from datetime import datetime, date
from flask import Blueprint, request, jsonify, session

from app import db
from app.auth import require_user
from app.models import SchoolClass, Teacher, Event
from app.utils import parse_hex_color

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/classes", methods=["GET"])
@require_user
def list_classes():
    uid = session["user_id"]
    classes = SchoolClass.query.filter_by(user_id=uid).order_by(SchoolClass.name).all()
    return jsonify([c.to_dict() for c in classes])


@api_bp.route("/classes", methods=["POST"])
@require_user
def create_class():
    uid = session["user_id"]
    data = request.get_json()
    name = (data or {}).get("name", "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400
    if SchoolClass.query.filter_by(user_id=uid, name=name).first():
        return jsonify({"error": "Class already exists"}), 400
    c = SchoolClass(user_id=uid, name=name)
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@api_bp.route("/classes/<int:class_id>", methods=["DELETE"])
@require_user
def delete_class(class_id):
    uid = session["user_id"]
    c = SchoolClass.query.filter_by(id=class_id, user_id=uid).first()
    if not c:
        return "", 404
    for event in c.events:
        event.classes.remove(c)
    db.session.delete(c)
    db.session.commit()
    return "", 204


@api_bp.route("/teachers", methods=["GET"])
@require_user
def list_teachers():
    uid = session["user_id"]
    teachers = Teacher.query.filter_by(user_id=uid).order_by(Teacher.name).all()
    return jsonify([t.to_dict() for t in teachers])


@api_bp.route("/teachers", methods=["POST"])
@require_user
def create_teacher():
    uid = session["user_id"]
    data = request.get_json()
    name = (data or {}).get("name", "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400
    t = Teacher(user_id=uid, name=name)
    db.session.add(t)
    db.session.commit()
    return jsonify(t.to_dict()), 201


@api_bp.route("/teachers/<int:teacher_id>", methods=["DELETE"])
@require_user
def delete_teacher(teacher_id):
    uid = session["user_id"]
    t = Teacher.query.filter_by(id=teacher_id, user_id=uid).first()
    if not t:
        return "", 404
    for event in t.events:
        event.teachers.remove(t)
    db.session.delete(t)
    db.session.commit()
    return "", 204


@api_bp.route("/events")
@require_user
def list_events():
    uid = session["user_id"]
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)
    if year is None or month is None:
        return jsonify({"error": "year and month required"}), 400
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    events = Event.query.filter(
        Event.user_id == uid,
        Event.event_date >= start,
        Event.event_date < end,
    ).order_by(Event.event_date).all()
    return jsonify([e.to_dict() for e in events])


@api_bp.route("/events", methods=["POST"])
@require_user
def create_event():
    uid = session["user_id"]
    data = request.get_json() or {}
    title = (data.get("title") or "Event").strip() or "Event"
    date_str = data.get("event_date")
    if not date_str:
        return jsonify({"error": "event_date is required"}), 400
    try:
        event_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format (use YYYY-MM-DD)"}), 400
    description = (data.get("description") or "").strip()
    class_ids = data.get("class_ids") or []
    teacher_ids = data.get("teacher_ids") or []
    color = parse_hex_color(data.get("color")) or "#3b82f6"

    event = Event(
        user_id=uid,
        title=title,
        event_date=event_date,
        description=description,
        color=color,
    )
    for cid in class_ids:
        c = SchoolClass.query.filter_by(id=cid, user_id=uid).first()
        if c:
            event.classes.append(c)
    for tid in teacher_ids:
        t = Teacher.query.filter_by(id=tid, user_id=uid).first()
        if t:
            event.teachers.append(t)
    db.session.add(event)
    db.session.commit()
    return jsonify(event.to_dict()), 201


@api_bp.route("/events/<int:event_id>", methods=["GET"])
@require_user
def get_event(event_id):
    uid = session["user_id"]
    event = Event.query.filter_by(id=event_id, user_id=uid).first()
    if not event:
        return "", 404
    return jsonify(event.to_dict())


@api_bp.route("/events/<int:event_id>", methods=["PUT"])
@require_user
def update_event(event_id):
    uid = session["user_id"]
    event = Event.query.filter_by(id=event_id, user_id=uid).first()
    if not event:
        return "", 404
    data = request.get_json() or {}
    event.title = (data.get("title") or event.title or "Event").strip() or "Event"
    if "event_date" in data:
        try:
            event.event_date = datetime.strptime(data["event_date"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid date format"}), 400
    if "description" in data:
        event.description = (data.get("description") or "").strip()
    if "color" in data:
        parsed = parse_hex_color(data.get("color"))
        if parsed:
            event.color = parsed
    event.classes = []
    event.teachers = []
    for cid in data.get("class_ids") or []:
        c = SchoolClass.query.filter_by(id=cid, user_id=uid).first()
        if c:
            event.classes.append(c)
    for tid in data.get("teacher_ids") or []:
        t = Teacher.query.filter_by(id=tid, user_id=uid).first()
        if t:
            event.teachers.append(t)
    db.session.commit()
    return jsonify(event.to_dict())


@api_bp.route("/events/<int:event_id>", methods=["DELETE"])
@require_user
def delete_event(event_id):
    uid = session["user_id"]
    event = Event.query.filter_by(id=event_id, user_id=uid).first()
    if not event:
        return "", 404
    db.session.delete(event)
    db.session.commit()
    return "", 204
