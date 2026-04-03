# Copyright (c) 2026, !! and contributors
# Restrict desk navigation for users who may only use the Course Feedback page.

import frappe
from frappe import _
from werkzeug.routing.exceptions import RequestRedirect

FEEDBACK_ONLY_ROLE = "Can Only Access Feedback"
COURSE_FEEDBACK_DESK_PATH = "/app/course-feedback"


def _feedback_only_user(user: str | None = None) -> bool:
	if not user:
		user = frappe.session.user
	if not user or user in frappe.STANDARD_USERS:
		return False
	return FEEDBACK_ONLY_ROLE in frappe.get_roles(user)


def get_course_feedback_operator_service_number(user: str | None = None) -> str:
	"""
	Course Feedback: only personnel linked via Create Operator may submit, and only for their
	own service number. The logged-in User's email must match the Create Operator email field,
	and that document must define service_number (Personnel link).

	Raises if there is no matching Create Operator row or no service number.
	"""
	if not user:
		user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("You must be logged in to submit course feedback."))

	user_email = (frappe.db.get_value("User", user, "email") or "").strip()
	if not user_email:
		frappe.throw(_("Your user account has no email address. Contact an administrator."))

	co_name = None
	if frappe.db.exists("Create Operator", user):
		co_name = user
	elif frappe.db.exists("Create Operator", user_email):
		co_name = user_email
	else:
		co_name = frappe.db.get_value("Create Operator", {"email": user_email}, "name")

	if not co_name:
		frappe.throw(_("No Create Operator record exists for your email. Contact an administrator."))

	row = frappe.db.get_value(
		"Create Operator",
		co_name,
		["email", "service_number"],
		as_dict=True,
	)
	if not row:
		frappe.throw(_("No Create Operator record exists for your email. Contact an administrator."))

	co_email = (row.get("email") or "").strip().lower()
	if co_email != user_email.lower():
		frappe.throw(_("Your login does not match the Create Operator record for your email. Contact an administrator."))

	sn = (row.get("service_number") or "").strip()
	if not sn:
		frappe.throw(_("Your Create Operator record has no service number. Contact an administrator."))

	return sn


def on_login_redirect(login_manager=None):
	user = getattr(login_manager, "user", None) if login_manager else None
	if not user or user in frappe.STANDARD_USERS:
		return
	if FEEDBACK_ONLY_ROLE not in frappe.get_roles(user):
		return
	frappe.cache.hset("redirect_after_login", user, COURSE_FEEDBACK_DESK_PATH)


def boot_session(bootinfo):
	if _feedback_only_user():
		bootinfo.feedback_only_desk_lock = True


def before_request_feedback_only_guard():
	if not _feedback_only_user():
		return

	path = frappe.request.path

	if path.startswith(("/api/", "/assets/", "/files/", "/private/files/")):
		return

	if path.startswith(("/login", "/logout", "/update-password", "/update_password")):
		return

	if not path.startswith("/app"):
		return

	norm = path.rstrip("/")
	if norm in ("/app/course-feedback",) or norm.startswith("/app/course-feedback/"):
		return

	# frappe.redirect() raises frappe.Redirect, which is not handled when raised from
	# before_request (only during website get_response). RequestRedirect is an
	# HTTPException and is returned correctly by app.application().
	raise RequestRedirect(COURSE_FEEDBACK_DESK_PATH)
