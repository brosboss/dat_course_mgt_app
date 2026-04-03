# Copyright (c) 2026, !! and contributors
# License: MIT

import frappe
from frappe import _
from frappe.utils import add_months, cint, date_diff, format_datetime, getdate, now_datetime, today
from datetime import date


def _can_read(doctype: str) -> bool:
	try:
		return bool(frappe.has_permission(doctype, "read"))
	except Exception:
		return False


def _count(doctype: str):
	if not _can_read(doctype):
		return None
	try:
		return frappe.db.count(doctype)
	except Exception:
		return None


def _docstatus_breakdown(doctype: str):
	if not _can_read(doctype):
		return []
	try:
		return frappe.db.sql(
			f"""
			SELECT docstatus, COUNT(*) AS c
			FROM `tab{doctype}`
			GROUP BY docstatus
			ORDER BY docstatus
			""",
			as_dict=True,
		)
	except Exception:
		return []


def _month_keys_last_12():
	now = date.today()
	keys = []
	for i in range(11, -1, -1):
		d = add_months(date(now.year, now.month, 1), -i)
		keys.append(d.strftime("%Y-%m"))
	return keys


def _nomination_monthly_trend():
	if not _can_read("Course Nomination"):
		return {"keys": _month_keys_last_12(), "values": []}
	keys = _month_keys_last_12()
	if not keys:
		return {"keys": [], "values": []}
	try:
		rows = frappe.db.sql(
			"""
			SELECT DATE_FORMAT(creation, '%%Y-%%m') AS ym, COUNT(*) AS c
			FROM `tabCourse Nomination`
			WHERE creation >= DATE_SUB(NOW(), INTERVAL 13 MONTH)
			GROUP BY ym
			ORDER BY ym
			""",
			as_dict=True,
		)
	except Exception:
		rows = []
	by_ym = {r["ym"]: int(r["c"]) for r in rows}
	values = [by_ym.get(k, 0) for k in keys]
	return {"keys": keys, "values": values}


def _personnel_by_category():
	if not _can_read("Personnel"):
		return []
	try:
		return frappe.db.sql(
			"""
			SELECT COALESCE(category, '') AS category, COUNT(*) AS c
			FROM `tabPersonnel`
			GROUP BY category
			ORDER BY c DESC
			LIMIT 10
			""",
			as_dict=True,
		)
	except Exception:
		return []


def _activity_nominations_page(start=0, page_length=5):
	start = cint(start)
	page_length = cint(page_length) or 5
	if page_length < 1:
		page_length = 5
	if start < 0:
		start = 0
	if not _can_read("Course Nomination"):
		return {"items": [], "total": 0, "start": 0, "page_length": page_length}
	try:
		total = frappe.db.count("Course Nomination")
		items = frappe.get_list(
			"Course Nomination",
			fields=["name", "course_name", "modified", "docstatus", "start_date", "status"],
			order_by="modified desc",
			limit_start=start,
			limit_page_length=page_length,
		)
		return {"items": items, "total": cint(total), "start": start, "page_length": page_length}
	except Exception:
		return {"items": [], "total": 0, "start": start, "page_length": page_length}


def _activity_feedback_page(start=0, page_length=5):
	start = cint(start)
	page_length = cint(page_length) or 5
	if page_length < 1:
		page_length = 5
	if start < 0:
		start = 0
	if not _can_read("Feedback"):
		return {"items": [], "total": 0, "start": 0, "page_length": page_length}
	try:
		total = frappe.db.count("Feedback")
		items = frappe.get_list(
			"Feedback",
			fields=["name", "personnel_name", "course_name", "modified", "docstatus"],
			order_by="modified desc",
			limit_start=start,
			limit_page_length=page_length,
		)
		return {"items": items, "total": cint(total), "start": start, "page_length": page_length}
	except Exception:
		return {"items": [], "total": 0, "start": start, "page_length": page_length}


@frappe.whitelist()
def get_activity_nominations_page(start=0, page_length=5):
	"""Paginated recently updated Course Nominations for Activity card."""
	return _activity_nominations_page(start=start, page_length=page_length)


@frappe.whitelist()
def get_activity_feedback_page(start=0, page_length=5):
	"""Paginated latest Feedback for Activity card."""
	return _activity_feedback_page(start=start, page_length=page_length)


def _upcoming_nominations(limit=20):
	if not _can_read("Course Nomination"):
		return []
	td = getdate(today())
	try:
		rows = frappe.get_list(
			"Course Nomination",
			filters=[["start_date", ">=", today()]],
			fields=["name", "course_name", "start_date", "end_date", "docstatus"],
			order_by="start_date asc",
			limit_page_length=limit,
		)
	except Exception:
		return []
	out = []
	for row in rows:
		plain = dict(row)
		plain["days_left"] = None
		sd = plain.get("start_date")
		if sd:
			try:
				plain["days_left"] = cint(date_diff(getdate(sd), td))
			except Exception:
				plain["days_left"] = None
		out.append(plain)
	return out


def _pending_feedback_page(start=0, page_length=15):
	start = cint(start)
	page_length = cint(page_length) or 15
	if page_length < 1:
		page_length = 15
	if start < 0:
		start = 0
	if not _can_read("Feedback"):
		return {"items": [], "total": 0, "start": 0, "page_length": page_length}
	try:
		filters = {"docstatus": 0}
		total = frappe.db.count("Feedback", filters)
		items = frappe.get_list(
			"Feedback",
			filters=filters,
			fields=["name", "personnel_name", "course_name", "modified"],
			order_by="modified desc",
			limit_start=start,
			limit_page_length=page_length,
		)
		return {"items": items, "total": cint(total), "start": start, "page_length": page_length}
	except Exception:
		return {"items": [], "total": 0, "start": start, "page_length": page_length}


@frappe.whitelist()
def get_pending_feedback_page(start=0, page_length=15):
	"""Paginated draft (not submitted) Feedback documents for TRG dashboard."""
	return _pending_feedback_page(start=start, page_length=page_length)


def _course_attended_feedback_stats():
	if not _can_read("Course Attended"):
		return {"total": None, "with_feedback": None}
	try:
		total = frappe.db.count("Course Attended", {"docstatus": 1})
		with_feedback = frappe.db.count(
			"Course Attended", {"docstatus": 1, "feedback_collected": 1}
		)
		return {"total": total, "with_feedback": with_feedback}
	except Exception:
		return {"total": None, "with_feedback": None}


@frappe.whitelist()
def get_dashboard_data():
	"""Aggregate metrics for TRG Command desk dashboard."""
	user = frappe.session.user
	server_now = format_datetime(now_datetime(), "yyyy-MM-dd HH:mm:ss")

	counts = {
		"personnel": _count("Personnel"),
		"course_master": _count("Course"),
		"course_nomination": _count("Course Nomination"),
		"course_attended": _count("Course Attended"),
		"feedback": _count("Feedback"),
		"unit": _count("Unit"),
		"mission": _count("Mission"),
		"task": _count("Task"),
		"posting_authority": _count("Posting Authority"),
	}

	nomination_docstatus = _docstatus_breakdown("Course Nomination")
	monthly = _nomination_monthly_trend()
	personnel_categories = _personnel_by_category()
	fb_stats = _course_attended_feedback_stats()

	recent = {
		"upcoming": _upcoming_nominations(),
	}

	activity_page_len = 5
	activity_nominations = _activity_nominations_page(0, activity_page_len)
	activity_feedback = _activity_feedback_page(0, activity_page_len)

	pending_feedback = _pending_feedback_page(0, 15)

	quick_links = []
	if _can_read("Personnel"):
		quick_links.append({"label": _("Personnel"), "route": ["List", "Personnel"]})
	if _can_read("Course Nomination"):
		quick_links.append({"label": _("Course Nomination"), "route": ["List", "Course Nomination"]})
	if _can_read("Course Attended"):
		quick_links.append({"label": _("Course Attended"), "route": ["List", "Course Attended"]})
	if _can_read("Feedback"):
		quick_links.append({"label": _("Feedback"), "route": ["List", "Feedback"]})
	if _can_read("Unit"):
		quick_links.append({"label": _("Units"), "route": ["List", "Unit"]})

	gauge_pct = None
	if (
		fb_stats.get("total") is not None
		and fb_stats["total"]
		and fb_stats.get("with_feedback") is not None
	):
		gauge_pct = int(round(100 * fb_stats["with_feedback"] / fb_stats["total"]))

	return {
		"user": user,
		"server_now": server_now,
		"counts": counts,
		"nomination_docstatus": nomination_docstatus,
		"monthly_nominations": monthly,
		"personnel_by_category": personnel_categories,
		"course_attended_feedback": fb_stats,
		"feedback_gauge_pct": gauge_pct,
		"pending_feedback": pending_feedback,
		"activity_nominations": activity_nominations,
		"activity_feedback": activity_feedback,
		"recent": recent,
		"quick_links": quick_links,
	}
