"""API routes: classes, teachers, events, calendars."""
from datetime import datetime, date
from flask import Blueprint, request, jsonify, session

from app import db
from app.auth import require_user
from app.models import SchoolClass, Teacher, Event, Calendar, CalendarMember, User
from app.utils import parse_hex_color

api_bp = Blueprint("api", __name__, url_prefix="/api")


def get_visible_calendar_ids(uid):
    """Return list of calendar IDs the user can access (owned or member)."""
    owned = [c.id for c in Calendar.query.filter_by(owner_id=uid).all()]
    member = [
        m.calendar_id
        for m in CalendarMember.query.filter_by(user_id=uid).all()
    ]
    return list(set(owned) | set(member))


def user_can_edit_event(uid, event):
    """True if user can edit/delete this event."""
    if not event.calendar_id:
        return event.user_id == uid
    cal = Calendar.query.get(event.calendar_id)
    if not cal:
        return False
    if cal.owner_id == uid:
        return True
    mem = CalendarMember.query.filter_by(
        calendar_id=event.calendar_id, user_id=uid
    ).first()
    if not mem:
        return False
    if not mem.can_edit_own_only:
        return True
    return (event.added_by or event.user_id) == uid


@api_bp.route("/me")
@require_user
def get_me():
    uid = session["user_id"]
    user = User.query.get(uid)
    if not user:
        return "", 404
    return jsonify(user.to_dict())


# ---------- Calendars ----------
@api_bp.route("/calendars", methods=["GET"])
@require_user
def list_calendars():
    uid = session["user_id"]
    cal_ids = get_visible_calendar_ids(uid)
    calendars = Calendar.query.filter(Calendar.id.in_(cal_ids)).all() if cal_ids else []
    out = []
    for c in calendars:
        d = c.to_dict()
        d["is_owner"] = c.owner_id == uid
        out.append(d)
    if not out:
        default = Calendar(owner_id=uid, name="My Calendar", color="#3b82f6")
        db.session.add(default)
        db.session.commit()
        out = [default.to_dict()]
        out[0]["is_owner"] = True
    return jsonify(out)


@api_bp.route("/calendars", methods=["POST"])
@require_user
def create_calendar():
    uid = session["user_id"]
    data = request.get_json() or {}
    name = (data.get("name") or "New Calendar").strip() or "New Calendar"
    color = parse_hex_color(data.get("color")) or "#3b82f6"
    cal = Calendar(owner_id=uid, name=name, color=color)
    db.session.add(cal)
    db.session.commit()
    d = cal.to_dict()
    d["is_owner"] = True
    return jsonify(d), 201


@api_bp.route("/calendars/<int:cal_id>", methods=["GET"])
@require_user
def get_calendar(cal_id):
    uid = session["user_id"]
    if cal_id not in get_visible_calendar_ids(uid):
        return "", 404
    cal = Calendar.query.get(cal_id)
    if not cal:
        return "", 404
    d = cal.to_dict()
    d["is_owner"] = cal.owner_id == uid
    return jsonify(d)


@api_bp.route("/calendars/<int:cal_id>", methods=["PUT"])
@require_user
def update_calendar(cal_id):
    uid = session["user_id"]
    cal = Calendar.query.get(cal_id)
    if not cal or cal.owner_id != uid:
        return "", 404
    data = request.get_json() or {}
    if "name" in data:
        name = (data.get("name") or "").strip() or cal.name
        cal.name = name
    if "color" in data:
        parsed = parse_hex_color(data.get("color"))
        if parsed:
            cal.color = parsed
    db.session.commit()
    d = cal.to_dict()
    d["is_owner"] = True
    return jsonify(d)


@api_bp.route("/calendars/<int:cal_id>", methods=["DELETE"])
@require_user
def delete_calendar(cal_id):
    uid = session["user_id"]
    cal = Calendar.query.get(cal_id)
    if not cal or cal.owner_id != uid:
        return "", 404
    db.session.delete(cal)
    db.session.commit()
    return "", 204


@api_bp.route("/calendars/<int:cal_id>/members", methods=["GET"])
@require_user
def list_calendar_members(cal_id):
    uid = session["user_id"]
    if cal_id not in get_visible_calendar_ids(uid):
        return "", 404
    cal = Calendar.query.get(cal_id)
    if not cal:
        return "", 404
    members = CalendarMember.query.filter_by(calendar_id=cal_id).all()
    return jsonify([m.to_dict() for m in members])


@api_bp.route("/calendars/<int:cal_id>/members", methods=["POST"])
@require_user
def invite_calendar_member(cal_id):
    uid = session["user_id"]
    cal = Calendar.query.get(cal_id)
    if not cal or cal.owner_id != uid:
        return "", 404
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    if not username:
        return jsonify({"error": "username is required"}), 400
    invitee = User.query.filter_by(username=username).first()
    if not invitee:
        return jsonify({"error": "User not found"}), 404
    if invitee.id == uid:
        return jsonify({"error": "Cannot add yourself"}), 400
    if CalendarMember.query.filter_by(calendar_id=cal_id, user_id=invitee.id).first():
        return jsonify({"error": "User already in calendar"}), 400
    can_edit_own_only = data.get("can_edit_own_only", True)
    m = CalendarMember(calendar_id=cal_id, user_id=invitee.id, can_edit_own_only=can_edit_own_only)
    db.session.add(m)
    db.session.commit()
    return jsonify(m.to_dict()), 201


@api_bp.route("/calendars/<int:cal_id>/members/<int:user_id>", methods=["DELETE"])
@require_user
def remove_calendar_member(cal_id, user_id):
    uid = session["user_id"]
    cal = Calendar.query.get(cal_id)
    if not cal:
        return "", 404
    if uid == user_id:
        CalendarMember.query.filter_by(calendar_id=cal_id, user_id=uid).delete()
        db.session.commit()
        return "", 204
    if cal.owner_id != uid:
        return "", 403
    CalendarMember.query.filter_by(calendar_id=cal_id, user_id=user_id).delete()
    db.session.commit()
    return "", 204


# ---------- Classes ----------
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
    calendar_id = request.args.get("calendar_id", type=int)
    if year is None or month is None:
        return jsonify({"error": "year and month required"}), 400
    cal_ids = get_visible_calendar_ids(uid)
    if not cal_ids:
        return jsonify([])
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    q = Event.query.filter(
        Event.event_date >= start,
        Event.event_date < end,
    )
    if calendar_id is not None:
        if calendar_id not in cal_ids:
            return jsonify({"error": "Access denied"}), 403
        q = q.filter(Event.calendar_id == calendar_id)
    else:
        from sqlalchemy import or_
        q = q.filter(
            or_(
                Event.calendar_id.in_(cal_ids),
                (Event.calendar_id.is_(None)) & (Event.user_id == uid),
            )
        )
    events = q.order_by(Event.event_date).all()
    out = []
    for e in events:
        d = e.to_dict()
        d["can_edit"] = user_can_edit_event(uid, e)
        out.append(d)
    return jsonify(out)


@api_bp.route("/events", methods=["POST"])
@require_user
def create_event():
    uid = session["user_id"]
    data = request.get_json() or {}
    calendar_id = data.get("calendar_id")
    if not calendar_id and "calendar_id" in data:
        return jsonify({"error": "calendar_id is required"}), 400
    cal_ids = get_visible_calendar_ids(uid)
    if calendar_id is not None and calendar_id not in cal_ids:
        return jsonify({"error": "Access denied to calendar"}), 403
    if not cal_ids:
        return jsonify({"error": "No calendar"}), 400
    use_cal_id = calendar_id if calendar_id in cal_ids else cal_ids[0]
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
        calendar_id=use_cal_id,
        added_by=uid,
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
    event = Event.query.get(event_id)
    if not event:
        return "", 404
    if event.calendar_id and event.calendar_id not in get_visible_calendar_ids(uid):
        return "", 404
    if not event.calendar_id and (event.user_id or event.added_by) != uid:
        return "", 404
    d = event.to_dict()
    d["can_edit"] = user_can_edit_event(uid, event)
    return jsonify(d)


@api_bp.route("/events/<int:event_id>", methods=["PUT"])
@require_user
def update_event(event_id):
    uid = session["user_id"]
    event = Event.query.get(event_id)
    if not event:
        return "", 404
    if not user_can_edit_event(uid, event):
        return "", 403
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
    event = Event.query.get(event_id)
    if not event:
        return "", 404
    if not user_can_edit_event(uid, event):
        return "", 403
    db.session.delete(event)
    db.session.commit()
    return "", 204
