# Copyright (c) 2026, !! and contributors
# For license information, please see license.txt

import html

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils.data import strip_html

from dat_pm.nacstnew.doctype.course_nomination.course_nomination import compute_course_attended_status
from dat_pm.utils.feedback_only_access import get_course_feedback_operator_service_number


def _plain_text_to_feedback_html(text):
	"""Store plain text from the Course Feedback page as HTML for the Text Editor field."""
	text = (text or "").strip()
	if not text:
		return ""
	# Preserve line breaks inside paragraphs
	escaped = html.escape(text)
	return "<p>" + escaped.replace("\n", "<br>\n") + "</p>"


def _feedback_html_to_plain(text):
	if not text:
		return ""
	return (strip_html(text) or "").strip()


def _course_attended_open_for_feedback(ca_name):
	"""True if Course Attended is submitted and has no submitted Feedback yet."""
	if not ca_name or not frappe.db.exists("Course Attended", ca_name):
		return False
	if frappe.db.get_value("Course Attended", ca_name, "docstatus") != 1:
		return False
	if frappe.db.exists("Feedback", {"course_reference": ca_name, "docstatus": 1}):
		return False
	return True


def _enforce_course_feedback_operator_service_match(course_attended_name):
	"""Course Attended must belong to the current user's service number from Create Operator."""
	allowed_sn = get_course_feedback_operator_service_number()
	ca_sn = frappe.db.get_value("Course Attended", course_attended_name, "service_number")
	if ca_sn != allowed_sn:
		frappe.throw(_("You are not allowed to access feedback for this course."))


def _course_attended_row_context(ca_name):
	ca = frappe.db.get_value(
		"Course Attended",
		ca_name,
		[
			"name",
			"service_number",
			"personnel_name",
			"course_name",
			"course_start_date",
			"course_end_date",
		],
		as_dict=True,
	)
	if not ca:
		return None
	draft_name = frappe.db.get_value(
		"Feedback",
		{"course_reference": ca_name, "docstatus": 0},
		"name",
	)
	draft_feedback = ""
	course_report = None
	grade = ""
	if draft_name:
		draft_feedback = _feedback_html_to_plain(
			frappe.db.get_value("Feedback", draft_name, "course_feedback") or ""
		)
		course_report = frappe.db.get_value("Feedback", draft_name, "course_report")
		grade = frappe.db.get_value("Feedback", draft_name, "grade") or ""
	return {
		"course_attended": ca.name,
		"service_number": ca.service_number,
		"personnel_name": ca.personnel_name or "",
		"course_name": ca.course_name or "",
		"course_start_date": str(ca.course_start_date or ""),
		"course_end_date": str(ca.course_end_date or ""),
		"feedback_draft_name": draft_name,
		"course_feedback_plain": draft_feedback,
		"grade": grade,
		"course_report": course_report or "",
		"has_submitted_feedback": frappe.db.exists(
			"Feedback", {"course_reference": ca_name, "docstatus": 1}
		),
	}


@frappe.whitelist()
def resolve_course_feedback_access(access_code):
	"""
	Resolve an access code for the Course Feedback page:
	- Course Attended document name (exact), or
	- Personnel service number (lists courses still open for feedback).
	"""
	access_code = (access_code or "").strip()
	if not access_code:
		frappe.throw(_("Please enter your access code."))

	allowed_sn = get_course_feedback_operator_service_number()

	if frappe.db.exists("Course Attended", access_code):
		ca_sn = frappe.db.get_value("Course Attended", access_code, "service_number")
		if ca_sn != allowed_sn:
			frappe.throw(_("You are not allowed to access feedback for this course attendance record."))
		if not _course_attended_open_for_feedback(access_code):
			frappe.throw(
				_("This course is not open for feedback (not submitted, or feedback already submitted).")
			)
		return {
			"match_type": "single",
			"context": _course_attended_row_context(access_code),
		}

	if frappe.db.exists("Personnel", access_code):
		if access_code != allowed_sn:
			frappe.throw(_("Invalid access code. Use your assigned service number."))
		rows = frappe.get_all(
			"Course Attended",
			filters={"service_number": access_code, "docstatus": 1},
			fields=["name", "course_name", "course_start_date", "course_end_date", "personnel_name"],
			order_by="course_end_date desc",
		)
		open_courses = []
		for row in rows:
			if not _course_attended_open_for_feedback(row.name):
				continue
			draft = frappe.db.get_value(
				"Feedback",
				{"course_reference": row.name, "docstatus": 0},
				"name",
			)
			open_courses.append(
				{
					"course_attended": row.name,
					"course_name": row.course_name or "",
					"course_start_date": str(row.course_start_date or ""),
					"course_end_date": str(row.course_end_date or ""),
					"personnel_name": row.personnel_name or "",
					"has_draft": bool(draft),
				}
			)
		return {
			"match_type": "personnel",
			"service_number": access_code,
			"personnel_name": frappe.db.get_value("Personnel", access_code, "personnel_name") or "",
			"courses": open_courses,
		}

	frappe.throw(_("Invalid access code. Use your Course Attendance reference or service number."))


@frappe.whitelist()
def get_feedback_grade_options():
	"""Return selectable Grade options for Course Feedback page."""
	get_course_feedback_operator_service_number()
	return frappe.get_all("Grade", pluck="name", order_by="name asc")


@frappe.whitelist()
def get_course_feedback_form_data(course_attended_name):
	"""Return form data for a Course Attended row (after user picked a course from a list)."""
	course_attended_name = (course_attended_name or "").strip()
	if not course_attended_name:
		frappe.throw(_("Course reference is required."))
	if not _course_attended_open_for_feedback(course_attended_name):
		frappe.throw(_("This course is not open for feedback."))
	_enforce_course_feedback_operator_service_match(course_attended_name)
	return {"context": _course_attended_row_context(course_attended_name)}


@frappe.whitelist()
def save_course_feedback_draft(course_attended_name, course_feedback, grade=None):
	"""
	Save Feedback as draft (docstatus 0). Uses ignore_permissions so personnel do not need Feedback doctype access.
	"""
	course_attended_name = (course_attended_name or "").strip()
	if not course_attended_name:
		frappe.throw(_("Course reference is required."))
	if not _course_attended_open_for_feedback(course_attended_name):
		frappe.throw(_("This course is not open for feedback."))
	_enforce_course_feedback_operator_service_match(course_attended_name)

	course_feedback = (course_feedback or "").strip()
	if not course_feedback:
		frappe.throw(_("Please enter your feedback."))
	grade = (grade or "").strip()
	if grade and not frappe.db.exists("Grade", grade):
		frappe.throw(_("Selected grade is invalid."))

	ca = frappe.get_doc("Course Attended", course_attended_name)
	html_feedback = _plain_text_to_feedback_html(course_feedback)

	draft_name = frappe.db.get_value(
		"Feedback",
		{"course_reference": course_attended_name, "docstatus": 0},
		"name",
	)

	if draft_name:
		doc = frappe.get_doc("Feedback", draft_name)
		doc.course_feedback = html_feedback
		doc.grade = grade
		doc.flags.ignore_permissions = True
		doc.save()
		return {
			"name": doc.name,
			"message": _("Draft saved."),
			"grade": doc.grade or "",
			"course_report": doc.course_report or "",
		}

	doc = frappe.new_doc("Feedback")
	doc.course_reference = course_attended_name
	doc.service_number = ca.service_number
	doc.personnel_name = ca.personnel_name or ""
	doc.course_name = ca.course_name or ""
	doc.course_start_date = str(ca.course_start_date or "")
	doc.course_end_date = str(ca.course_end_date or "")
	doc.course_feedback = html_feedback
	doc.grade = grade
	doc.flags.ignore_permissions = True
	doc.insert()
	return {
		"name": doc.name,
		"message": _("Draft saved."),
		"grade": doc.grade or "",
		"course_report": doc.course_report or "",
	}


@frappe.whitelist()
def upload_feedback_course_report_for_page():
	"""
	Attach a file to Feedback.course_report from the Course Feedback page (multipart).
	Validates draft + open course; uses ignore_permissions on File insert.
	"""
	feedback_name = (frappe.form_dict.get("feedback_name") or "").strip()
	if not feedback_name or not frappe.db.exists("Feedback", feedback_name):
		frappe.throw(_("Invalid feedback document."))

	fb = frappe.get_doc("Feedback", feedback_name)
	if fb.docstatus != 0:
		frappe.throw(_("Only draft feedback can be updated from this page."))
	if not _course_attended_open_for_feedback(fb.course_reference):
		frappe.throw(_("This course is not open for feedback."))
	_enforce_course_feedback_operator_service_match(fb.course_reference)

	files = frappe.request.files
	if "file" not in files:
		frappe.throw(_("Please choose a file to upload."))

	up = files["file"]
	content = up.stream.read()
	filename = up.filename
	if not filename:
		frappe.throw(_("Invalid file name."))
	ctype = getattr(up, "content_type", None) or getattr(up, "mimetype", None)
	if not (filename.lower().endswith(".pdf") or (ctype and "pdf" in ctype.lower())):
		frappe.throw(_("Only PDF files are allowed for the course report."))

	for existing in frappe.get_all(
		"File",
		filters={
			"attached_to_doctype": "Feedback",
			"attached_to_name": feedback_name,
			"attached_to_field": "course_report",
		},
		pluck="name",
	):
		frappe.delete_doc("File", existing, ignore_permissions=True)

	from frappe.utils.file_manager import save_file

	file_doc = save_file(filename, content, "Feedback", feedback_name, df="course_report")
	file_url = file_doc.file_url if file_doc else None
	if file_url:
		frappe.db.set_value(
			"Feedback",
			feedback_name,
			"course_report",
			file_url,
			update_modified=True,
		)

	fb.reload()
	return {
		"message": _("File attached."),
		"course_report": fb.course_report or file_url or "",
	}


def _other_submitted_feedback_count(course_attended_name, exclude_feedback_name):
	"""Count submitted Feedback rows for this Course Attended, excluding one document."""
	return frappe.db.count(
		"Feedback",
		{
			"course_reference": course_attended_name,
			"docstatus": 1,
			"name": ["!=", exclude_feedback_name],
		},
	)


def _course_attended_name_from_feedback(feedback_doc):
	"""Course Attended row linked to this Feedback (name may equal course_reference; use both)."""
	return (getattr(feedback_doc, "course_reference", None) or "").strip() or (
		getattr(feedback_doc, "name", None) or ""
	).strip()


def _grade_value_for_course_attended_link(feedback_doc):
	"""
	Grade to store on Course Attended: read from DB so submit hook sees the value that was just saved.
	Returns None when empty (correct for Link columns).
	"""
	fb_name = (getattr(feedback_doc, "name", None) or "").strip()
	if not fb_name:
		return None
	grade = frappe.db.get_value("Feedback", fb_name, "grade")
	if grade is None:
		grade = getattr(feedback_doc, "grade", None)
	grade = (grade or "").strip()
	if not grade:
		return None
	if frappe.db.exists("Grade", grade):
		return grade
	return None


def _course_report_value_for_course_attended_link(feedback_doc):
	"""
	Course report URL to store on Course Attended.
	Read from DB so submit/update hooks always use persisted value.
	"""
	fb_name = (getattr(feedback_doc, "name", None) or "").strip()
	if not fb_name:
		return (getattr(feedback_doc, "course_report", None) or "").strip() or None

	course_report = frappe.db.get_value("Feedback", fb_name, "course_report")
	if course_report is None:
		course_report = getattr(feedback_doc, "course_report", None)
	course_report = (course_report or "").strip()
	return course_report or None


def _update_course_attended_after_feedback_change(feedback_doc, submitted):
	"""
	Update linked Course Attended when Feedback is submitted or cancelled.
	submitted=True: mark Completed + feedback_collected.
	submitted=False: revert using dates + remaining submitted Feedback rows.
	"""
	ca_name = _course_attended_name_from_feedback(feedback_doc)
	if not ca_name or not frappe.db.exists("Course Attended", ca_name):
		return

	if submitted:
		grade = _grade_value_for_course_attended_link(feedback_doc)
		course_report = _course_report_value_for_course_attended_link(feedback_doc)
		frappe.db.set_value(
			"Course Attended",
			ca_name,
			{
				"course_status": "Completed",
				"feedback_collected": 1,
				"grade": grade,
				"course_report": course_report,
			},
			update_modified=True,
		)
		return

	others = _other_submitted_feedback_count(ca_name, feedback_doc.name)
	if others:
		remaining_grade = frappe.db.get_value(
			"Feedback",
			{
				"course_reference": ca_name,
				"docstatus": 1,
				"name": ["!=", feedback_doc.name],
			},
			"grade",
			order_by="modified desc",
		)
		remaining_grade = (remaining_grade or "").strip() or None
		frappe.db.set_value(
			"Course Attended",
			ca_name,
			{
				"course_status": "Completed",
				"feedback_collected": 1,
				"grade": remaining_grade,
			},
			update_modified=True,
		)
		return

	ca = frappe.db.get_value(
		"Course Attended",
		ca_name,
		["course_start_date", "course_end_date"],
		as_dict=True,
	)
	if not ca:
		return
	new_status = compute_course_attended_status(ca_name, ca.course_start_date, ca.course_end_date)
	frappe.db.set_value(
		"Course Attended",
		ca_name,
		{"course_status": new_status, "feedback_collected": 0, "grade": None},
		update_modified=True,
	)


class Feedback(Document):
	def on_submit(self):
		_update_course_attended_after_feedback_change(self, submitted=True)

	def on_update_after_submit(self):
		"""If a submitted Feedback row is amended, keep Course Attended grade/status aligned."""
		_update_course_attended_after_feedback_change(self, submitted=True)

	def on_cancel(self):
		_update_course_attended_after_feedback_change(self, submitted=False)
