# Copyright (c) 2026, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_table_name, getdate, today


def _docstatus_label(ds):
	ds = int(ds) if ds is not None else 0
	if ds == 0:
		return frappe._("Draft")
	if ds == 1:
		return frappe._("Submitted")
	if ds == 2:
		return frappe._("Cancelled")
	return str(ds)

def _get_qualified_service_numbers_for_course(course_name):
	"""Return set of service_numbers that are qualified for the course (rank, not taken, prereqs done)."""
	qualified_list = get_personnel_due_for_course(course_name)
	return {p["service_number"] for p in qualified_list}


@frappe.whitelist()
def is_personnel_qualified_for_course(service_number, course_name):
	"""Return 1 if personnel is qualified for the course, 0 otherwise."""
	if not service_number or not course_name:
		return 0
	qualified = _get_qualified_service_numbers_for_course(course_name)
	return 1 if service_number in qualified else 0


def _get_personnel_course_qualification_detail(service_number, course_name):
	"""Return qualification detail for a personnel/course pair."""
	if not service_number or not course_name:
		return {
			"qualified": 0,
			"remark": frappe._("Course and personnel are required."),
		}

	if not frappe.db.exists("Course Name", course_name):
		return {
			"qualified": 0,
			"remark": frappe._("Course '{0}' does not exist.").format(course_name),
		}

	if not frappe.db.exists("Personnel", service_number):
		return {
			"qualified": 0,
			"remark": frappe._("Personnel '{0}' does not exist.").format(service_number),
		}

	course_doc = frappe.get_doc("Course Name", course_name)
	qualified_ranks = [row.rank for row in (course_doc.qualified_rank or []) if row.rank]
	prerequisite_courses = [row.course_name for row in (course_doc.mandatory_prerequisite_course or []) if row.course_name]
	personnel_rank = frappe.db.get_value("Personnel", service_number, "current_rank")

	if not qualified_ranks:
		return {
			"qualified": 0,
			"remark": frappe._("Not qualified: no qualified rank has been set for this course."),
		}

	if not personnel_rank or personnel_rank not in qualified_ranks:
		return {
			"qualified": 0,
			"remark": frappe._(
				"Not qualified: personnel rank '{0}' is not among qualified ranks for this course."
			).format(personnel_rank or frappe._("Unknown")),
		}

	has_taken_this = frappe.db.exists(
		"Course Attended",
		{"service_number": service_number, "course_name": course_name, "docstatus": 1},
	)
	if has_taken_this:
		return {
			"qualified": 0,
			"remark": frappe._("Not qualified: personnel has already attended this course."),
		}

	missing_prereqs = []
	for prereq in prerequisite_courses:
		has_taken_prereq = frappe.db.exists(
			"Course Attended",
			{"service_number": service_number, "course_name": prereq, "docstatus": 1},
		)
		if not has_taken_prereq:
			missing_prereqs.append(prereq)

	if missing_prereqs:
		return {
			"qualified": 0,
			"remark": frappe._("Not qualified: missing prerequisite course(s): {0}.").format(", ".join(missing_prereqs)),
		}

	return {
		"qualified": 1,
		"remark": frappe._(
			"Qualified: rank is eligible, course has not been attended, and all prerequisites are completed."
		),
	}


@frappe.whitelist()
def get_personnel_course_qualification_remark(service_number, course_name):
	"""Return qualification status and human-readable remark."""
	return _get_personnel_course_qualification_detail(service_number, course_name)


@frappe.whitelist()
def get_personnel_due_for_course(course_name):
	"""
	Return list of personnel who are due for the given course.

	Criteria:
	1. Personnel's current_rank must be in the course's Qualified Rank list.
	2. Personnel must not have already taken this course (no submitted Course Attended).
	3. Personnel must have taken all Mandatory Prerequisite Courses (submitted Course Attended for each).
	"""
	if not course_name or not frappe.db.exists("Course Name", course_name):
		return []

	course_doc = frappe.get_doc("Course Name", course_name)
	qualified_ranks = [row.rank for row in (course_doc.qualified_rank or []) if row.rank]
	prerequisite_courses = [row.course_name for row in (course_doc.mandatory_prerequisite_course or []) if row.course_name]

	if not qualified_ranks:
		return []

	# All personnel whose rank is qualified for this course
	personnel_list = frappe.get_all(
		"Personnel",
		filters={"current_rank": ["in", qualified_ranks]},
		fields=["service_number", "personnel_name", "current_rank", "current_unit"],
	)

	result = []
	for p in personnel_list:
		service_number = p.service_number
		# Must not have taken this course (submitted Course Attended)
		has_taken_this = frappe.db.exists(
			"Course Attended",
			{"service_number": service_number, "course_name": course_name, "docstatus": 1},
		)
		if has_taken_this:
			continue

		# Must have taken all mandatory prerequisite courses
		all_prereqs_done = True
		for prereq in prerequisite_courses:
			has_taken_prereq = frappe.db.exists(
				"Course Attended",
				{"service_number": service_number, "course_name": prereq, "docstatus": 1},
			)
			if not has_taken_prereq:
				all_prereqs_done = False
				break

		if not all_prereqs_done:
			continue

		result.append({
			"service_number": p.service_number,
			"personnel_name": p.personnel_name or "",
			"current_rank": p.current_rank or "",
			"current_unit": p.current_unit or "",
		})

	return result


@frappe.whitelist()
def get_other_nomination_rows_for_same_course(course_name, exclude_nomination_name=None):
	"""
	For the same course, find service numbers that already appear on another Course Nomination
	(including draft, submitted, or cancelled). Excludes the parent named exclude_nomination_name
	so the current document does not flag its own rows.

	Returns: { "SERVICE_NO": [ {"nomination": "...", "docstatus": 0|1|2, "status_label": "..."}, ... ], ... }
	"""
	if not course_name or not frappe.db.exists("Course Name", course_name):
		return {}

	exclude = (exclude_nomination_name or "").strip() or None

	pt = get_table_name("Course Nomination", wrap_in_backticks=True)
	ct = get_table_name("Nominated Personnel", wrap_in_backticks=True)

	clauses = [
		"np.parenttype = %(parenttype)s",
		"np.parentfield = %(parentfield)s",
		"cn.course_name = %(course)s",
		"IFNULL(np.service_number, '') != ''",
	]
	params = {
		"parenttype": "Course Nomination",
		"parentfield": "nominated_personnel",
		"course": course_name,
	}
	if exclude:
		clauses.append("cn.name != %(exclude)s")
		params["exclude"] = exclude

	where_sql = " AND ".join(clauses)

	rows = frappe.db.sql(
		f"""
		SELECT np.service_number AS service_number,
			cn.name AS nomination,
			IFNULL(cn.docstatus, 0) AS docstatus
		FROM {ct} AS np
		INNER JOIN {pt} AS cn ON cn.name = np.parent
		WHERE {where_sql}
		ORDER BY cn.modified DESC
		""",
		params,
		as_dict=True,
	)

	out = {}
	for r in rows:
		sn = r.service_number
		if not sn:
			continue
		ds = int(r.docstatus or 0)
		out.setdefault(sn, []).append(
			{
				"nomination": r.nomination,
				"docstatus": ds,
				"status_label": str(_docstatus_label(ds)),
			}
		)

	return out


@frappe.whitelist()
def get_courses_attended_for_personnel(service_number):
	"""Return list of courses the personnel has attended (submitted Course Attended)."""
	if not service_number:
		return []
	return frappe.get_all(
		"Course Attended",
		filters={"service_number": service_number, "docstatus": 1},
		fields=["name", "course_name", "course_start_date", "course_end_date", "grade", "specialty"],
		order_by="course_end_date desc",
	)


@frappe.whitelist()
def get_courses_eligible_for_personnel(service_number):
	"""
	Return list of courses the personnel is eligible for (rank appropriate, not yet taken, prerequisites completed).
	"""
	if not service_number or not frappe.db.exists("Personnel", service_number):
		return []
	personnel_rank = frappe.db.get_value("Personnel", service_number, "current_rank")
	if not personnel_rank:
		return []
	course_names = frappe.get_all("Course Name", pluck="name")
	eligible = []
	for course_name in course_names:
		qualified_list = get_personnel_due_for_course(course_name)
		if any(p["service_number"] == service_number for p in qualified_list):
			eligible.append({"course_name": course_name})
	return eligible


@frappe.whitelist()
def create_course_nomination_from_page(
	course_name,
	nominated_personnel,
	organising_body=None,
	start_date=None,
	end_date=None,
	course_suffix=None,
):
	"""
	Create a Course Nomination doc from the nomination page.
	nominated_personnel: list of dicts with service_number, personnel_name, current_rank, current_unit.
	organising_body, start_date, end_date, course_suffix: same required fields as the Course Nomination doctype.
	Document name is built from format:{course_name}.{course_suffix}.
	Returns the new doc name.
	"""
	if not course_name:
		frappe.throw(frappe._("Course Name is required."))
	if not course_suffix or not str(course_suffix).strip():
		frappe.throw(frappe._("Course Suffix is required (used in the document name with the course)."))
	if not organising_body or not str(organising_body).strip():
		frappe.throw(frappe._("Organising Body is required."))
	if not start_date:
		frappe.throw(frappe._("Start Date is required."))
	if not end_date:
		frappe.throw(frappe._("End Date is required."))
	try:
		sd = getdate(start_date)
		ed = getdate(end_date)
	except Exception:
		frappe.throw(frappe._("Start Date and End Date must be valid dates."))
	if ed < sd:
		frappe.throw(frappe._("End Date cannot be before Start Date."))

	nominated = frappe.parse_json(nominated_personnel) if isinstance(nominated_personnel, str) else (nominated_personnel or [])
	if not nominated:
		frappe.throw(frappe._("Add at least one nominated personnel."))

	doc = frappe.new_doc("Course Nomination")
	doc.course_name = course_name
	doc.course_suffix = str(course_suffix).strip()
	doc.organising_body = str(organising_body).strip()
	doc.start_date = sd
	doc.end_date = ed
	for p in nominated:
		if not p.get("service_number"):
			continue
		doc.append("nominated_personnel", {
			"service_number": p.get("service_number"),
			"personnel_name": p.get("personnel_name") or "",
			"rank": p.get("current_rank") or p.get("rank"),
			"unit": p.get("current_unit") or p.get("unit"),
		})
	if not doc.nominated_personnel:
		frappe.throw(frappe._("Add at least one nominated personnel with a service number."))
	doc.flags.ignore_permissions = False
	doc.insert()
	return doc.name


@frappe.whitelist()
def get_course_nomination_for_page(name):
	"""Load a Course Nomination for the nomination page (edit mode)."""
	if not name or not frappe.db.exists("Course Nomination", name):
		frappe.throw(frappe._("Course Nomination not found."))
	doc = frappe.get_doc("Course Nomination", name)
	rows = []
	for row in doc.nominated_personnel or []:
		if not row.service_number:
			continue
		rows.append(
			{
				"service_number": row.service_number,
				"personnel_name": row.personnel_name or "",
				"current_rank": row.rank or "",
				"current_unit": row.unit or "",
				"remarks": row.remarks or "",
			}
		)
	course_ended = False
	if doc.end_date:
		course_ended = getdate(doc.end_date) < getdate(today())

	return {
		"name": doc.name,
		"course_name": doc.course_name,
		"course_suffix": doc.course_suffix,
		"organising_body": doc.organising_body,
		"start_date": doc.start_date,
		"end_date": doc.end_date,
		"docstatus": doc.docstatus,
		"course_ended": course_ended,
		"nominated_personnel": rows,
	}


@frappe.whitelist()
def update_course_nomination_from_page(
	nomination_name,
	nominated_personnel,
	organising_body=None,
	start_date=None,
	end_date=None,
):
	"""
	Update a Course Nomination from the page.

	- **Draft**: replace nominated personnel + update organising body and dates.
	- **Submitted**: replace **nominated personnel** only (child table has allow_on_submit);
	  header fields are not changed here (use the desk form if dates/body must change after submit).
	- **Cancelled**: not allowed.
	"""
	if not nomination_name or not frappe.db.exists("Course Nomination", nomination_name):
		frappe.throw(frappe._("Course Nomination not found."))
	doc = frappe.get_doc("Course Nomination", nomination_name)
	if doc.docstatus == 2:
		frappe.throw(frappe._("Cancelled nominations cannot be updated from this page."))

	nominated = frappe.parse_json(nominated_personnel) if isinstance(nominated_personnel, str) else (nominated_personnel or [])
	if not nominated:
		frappe.throw(frappe._("Add at least one nominated personnel."))

	if doc.docstatus == 0:
		if not organising_body or not str(organising_body).strip():
			frappe.throw(frappe._("Organising Body is required."))
		if not start_date:
			frappe.throw(frappe._("Start Date is required."))
		if not end_date:
			frappe.throw(frappe._("End Date is required."))
		try:
			sd = getdate(start_date)
			ed = getdate(end_date)
		except Exception:
			frappe.throw(frappe._("Start Date and End Date must be valid dates."))
		if ed < sd:
			frappe.throw(frappe._("End Date cannot be before Start Date."))
		doc.organising_body = str(organising_body).strip()
		doc.start_date = sd
		doc.end_date = ed

	for row in list(doc.nominated_personnel or []):
		doc.remove(row)

	for p in nominated:
		if not p.get("service_number"):
			continue
		doc.append(
			"nominated_personnel",
			{
				"service_number": p.get("service_number"),
				"personnel_name": p.get("personnel_name") or "",
				"rank": p.get("current_rank") or p.get("rank"),
				"unit": p.get("current_unit") or p.get("unit"),
			},
		)
	if not doc.nominated_personnel:
		frappe.throw(frappe._("Add at least one nominated personnel with a service number."))
	doc.flags.ignore_permissions = False
	doc.save()
	return doc.name


@frappe.whitelist()
def set_demo_data():
	"""Load demo data for presentation: courses (with prerequisites and ranks), personnel, and courses attended.
	Run: bench --site hqdat execute nacstnew.nacstnew.doctype.course_nomination.course_nomination.set_demo_data
	"""
	from frappe import _
	frappe.flags.in_install = True
	try:
		category = _demo_get_or_create_personnel_category()
		ranks = _demo_get_or_create_ranks(category)
		unit = _demo_get_or_create_unit()
		grade = _demo_get_or_create_grade()
		_get_or_create_course("Basic Training", qualified_ranks=[ranks["Corporal"], ranks["Sergeant"]], prerequisites=[])
		_get_or_create_course("Advanced Training", qualified_ranks=[ranks["Sergeant"], ranks["Captain"]], prerequisites=["Basic Training"])
		_get_or_create_course("Leadership Course", qualified_ranks=[ranks["Captain"]], prerequisites=["Advanced Training"])
		personnel_list = [
			{"service_number": "DEMO-P001", "personnel_name": "Adebayo Johnson", "rank": ranks["Corporal"]},
			{"service_number": "DEMO-P002", "personnel_name": "Chioma Okonkwo", "rank": ranks["Sergeant"]},
			{"service_number": "DEMO-P003", "personnel_name": "Emeka Nwosu", "rank": ranks["Corporal"]},
			{"service_number": "DEMO-P004", "personnel_name": "Fatima Bello", "rank": ranks["Sergeant"]},
			{"service_number": "DEMO-P005", "personnel_name": "Ibrahim Musa", "rank": ranks["Captain"]},
		]
		for p in personnel_list:
			_demo_get_or_create_personnel(p["service_number"], p["personnel_name"], category, p["rank"], unit)
		_demo_add_course_attended("DEMO-P001", "Basic Training", "2024-01-15", "2024-02-28", grade)
		_demo_add_course_attended("DEMO-P002", "Basic Training", "2023-06-01", "2023-07-15", grade)
		_demo_add_course_attended("DEMO-P002", "Advanced Training", "2024-03-01", "2024-04-30", grade)
		_demo_add_course_attended("DEMO-P004", "Basic Training", "2024-05-01", "2024-06-15", grade)
		_demo_add_course_attended("DEMO-P005", "Advanced Training", "2024-01-10", "2024-02-28", grade)
		frappe.db.commit()
		frappe.msgprint(_("Demo data created. Use Course Nomination and Personnel Course Details for your presentation."))
	finally:
		frappe.flags.in_install = False


def _demo_get_or_create_personnel_category():
	name = "Demo Category"
	if frappe.db.exists("Personnel Category", name):
		return name
	doc = frappe.new_doc("Personnel Category")
	doc.personnel_category = name
	doc.insert()
	return name


def _demo_get_or_create_ranks(category):
	ranks = {}
	for rank_name, rank_full in [("Corporal", "Corporal"), ("Sergeant", "Sergeant"), ("Captain", "Captain")]:
		if frappe.db.exists("Rank", rank_name):
			ranks[rank_name] = rank_name
			continue
		doc = frappe.new_doc("Rank")
		doc.rank = rank_name
		doc.rank_in_full = rank_full
		doc.personnel_category = category
		doc.insert()
		ranks[rank_name] = rank_name
	return ranks


def _demo_get_or_create_unit():
	existing = frappe.db.get_value("Unit", {}, "name")
	if existing:
		return existing
	try:
		zone_name = "Demo Zone"
		if not frappe.db.exists("Geopolitical Zone", zone_name):
			z = frappe.new_doc("Geopolitical Zone")
			z.geopolitical_zone = zone_name
			z.insert()
		state_name = "Demo State"
		if not frappe.db.exists("State", state_name):
			s = frappe.new_doc("State")
			s.state = state_name
			s.geopolitical_zone = zone_name
			s.insert()
		unit_name = "Demo Unit"
		if frappe.db.exists("Unit", unit_name):
			return unit_name
		u = frappe.new_doc("Unit")
		u.unit = unit_name
		u.unit_location = state_name
		u.insert()
		return unit_name
	except Exception:
		return None


def _demo_get_or_create_grade():
	name = "Pass"
	if frappe.db.exists("Grade", name):
		return name
	doc = frappe.new_doc("Grade")
	doc.grade = name
	doc.insert()
	return name


def _get_or_create_course(course_name, qualified_ranks=None, prerequisites=None):
	qualified_ranks = qualified_ranks or []
	prerequisites = prerequisites or []
	if frappe.db.exists("Course Name", course_name):
		doc = frappe.get_doc("Course Name", course_name)
	else:
		doc = frappe.new_doc("Course Name")
		doc.course_name = course_name
		doc.is_group = 0
	for r in qualified_ranks:
		if not any(row.rank == r for row in (doc.qualified_rank or [])):
			doc.append("qualified_rank", {"rank": r})
	for pr in prerequisites:
		if not frappe.db.exists("Course Name", pr):
			continue
		if not any(row.course_name == pr for row in (doc.mandatory_prerequisite_course or [])):
			doc.append("mandatory_prerequisite_course", {"course_name": pr})
	doc.save()
	return course_name


def _demo_get_or_create_personnel(service_number, personnel_name, category, current_rank, current_unit=None):
	if frappe.db.exists("Personnel", service_number):
		doc = frappe.get_doc("Personnel", service_number)
		doc.personnel_name = personnel_name
		doc.category = category
		doc.current_rank = current_rank
		if current_unit:
			doc.current_unit = current_unit
		doc.save()
		return
	doc = frappe.new_doc("Personnel")
	doc.service_number = service_number
	doc.personnel_name = personnel_name
	doc.category = category
	doc.current_rank = current_rank
	if current_unit:
		doc.current_unit = current_unit
	doc.insert()


def _demo_add_course_attended(service_number, course_name, start_date, end_date, grade):
	ref_suffix = service_number + "-" + course_name.replace(" ", "")[:20]
	course_reference = "DEMO-" + ref_suffix
	name = service_number + "-" + course_reference
	if frappe.db.exists("Course Attended", name):
		return
	doc = frappe.new_doc("Course Attended")
	doc.service_number = service_number
	doc.course_name = course_name
	doc.course_start_date = start_date
	doc.course_end_date = end_date
	doc.course_reference = course_reference
	doc.specialty = "Primary Specialty"
	doc.legacy_record = 1
	if grade:
		doc.grade = grade
	doc.insert()
	doc.submit()


def _get_linked_course_attended_name(nomination_name, service_number):
	"""Find Course Attended created from this nomination/personnel pair."""
	if not nomination_name or not service_number:
		return None
	return frappe.db.get_value(
		"Course Attended",
		{"course_reference": nomination_name, "service_number": service_number},
		"name",
	)


# Status values driven by dates + feedback; cron will not overwrite other values (e.g. Deferred).
_AUTO_MANAGED_COURSE_STATUSES = frozenset(
	{"Upcoming", "On Course", "Completed with no Feedback", "Completed", "", None}
)


def compute_course_attended_status(course_attended_name, course_start_date, course_end_date):
	"""
	Set Course Status from dates and Feedback (Feedback.course_reference → Course Attended).
	- Before start_date: Upcoming
	- From start_date through end_date (inclusive): On Course
	- After end_date: Completed if a Feedback exists, else Completed with no Feedback
	"""
	if not course_start_date or not course_end_date:
		return "Upcoming"

	start = getdate(course_start_date)
	end = getdate(course_end_date)
	now = getdate(today())

	if now < start:
		return "Upcoming"
	if now > end:
		has_feedback = frappe.db.exists(
			"Feedback", {"course_reference": course_attended_name, "docstatus": 1}
		)
		return "Completed" if has_feedback else "Completed with no Feedback"
	return "On Course"


@frappe.whitelist()
def update_course_attended_status_from_cron():
	"""
	Scheduled job: refresh course_status on Course Attended rows linked to a Course Nomination.
	"""
	names = frappe.get_all(
		"Course Attended",
		filters={"docstatus": 1, "course_reference": ["!=", ""]},
		pluck="name",
	)
	for name in names:
		ref = frappe.db.get_value("Course Attended", name, ["course_reference", "course_start_date", "course_end_date"], as_dict=True)
		if not ref or not ref.course_reference:
			continue
		if not frappe.db.exists("Course Nomination", ref.course_reference):
			continue
		current = frappe.db.get_value("Course Attended", name, "course_status")
		if current not in _AUTO_MANAGED_COURSE_STATUSES:
			continue
		new_status = compute_course_attended_status(name, ref.course_start_date, ref.course_end_date)
		if current != new_status:
			frappe.db.set_value("Course Attended", name, "course_status", new_status, update_modified=False)


class CourseNomination(Document):
	def _nominated_row_needs_live_qualification_check(self, row, prev_by_name, course_changed):
		"""
		Only new child rows or rows whose service number changed need a live eligibility check.
		Existing saved rows keep their nomination as-is (rank / Course Attended may have changed since).
		If the header course changed, all rows are checked again.
		"""
		if course_changed:
			return True
		if not row.name or str(row.name).startswith("new-"):
			return True
		prev = prev_by_name.get(row.name) if prev_by_name else None
		if not prev:
			return True
		if (prev.service_number or "") != (row.service_number or ""):
			return True
		return False

	def validate(self):
		if not self.course_name or not self.nominated_personnel:
			return
		qualified = _get_qualified_service_numbers_for_course(self.course_name)
		prev = self.get_doc_before_save()
		course_changed = not prev or (prev.course_name or "") != (self.course_name or "")
		prev_by_name = {}
		if prev:
			for pr in prev.nominated_personnel or []:
				if getattr(pr, "name", None):
					prev_by_name[pr.name] = pr
		not_qualified = []
		for row in self.nominated_personnel:
			if not row.service_number:
				continue
			if not self._nominated_row_needs_live_qualification_check(row, prev_by_name, course_changed):
				continue
			if row.service_number not in qualified:
				not_qualified.append(row.service_number or row.personnel_name or "Unknown")
		if not_qualified:
			frappe.throw(
				frappe._("The following personnel are not qualified for the course '{0}' (rank, already attended, or missing prerequisite): {1}. Remove them or select a different course.").format(
					self.course_name, ", ".join(not_qualified)
				)
			)

	def on_submit(self):
		"""Create one submitted Course Attended per nominated personnel; course_reference = this nomination."""
		ensure_course_attended_records_for_nomination(self)

	def on_update_after_submit(self):
		"""Keep linked Course Attended records in sync after amendments."""
		ensure_course_attended_records_for_nomination(self)

	def on_cancel(self):
		"""Cancel Course Attended records created for this nomination."""
		cancel_linked_course_attended_for_nomination(self)

	def on_trash(self):
		"""Delete linked Course Attended records when this nomination is deleted."""
		delete_linked_course_attended_for_nomination(self)

	def _create_or_update_course_attended_for_row(self, row):
		existing_name = _get_linked_course_attended_name(self.name, row.service_number)
		if existing_name:
			existing = frappe.get_doc("Course Attended", existing_name)
			if existing.docstatus == 1:
				frappe.db.set_value(
					"Course Attended",
					existing_name,
					{
						"course_name": self.course_name,
						"course_start_date": self.start_date,
						"course_end_date": self.end_date,
						"course_status": compute_course_attended_status(existing_name, self.start_date, self.end_date),
					},
					update_modified=True,
				)
				return
			if existing.docstatus == 2:
				frappe.delete_doc("Course Attended", existing_name, force=1, ignore_permissions=True)

		personnel_name = frappe.db.get_value("Personnel", row.service_number, "personnel_name") or row.personnel_name or ""
		doc = frappe.new_doc("Course Attended")
		doc.service_number = row.service_number
		doc.personnel_name = personnel_name
		doc.course_name = self.course_name
		doc.course_start_date = self.start_date
		doc.course_end_date = self.end_date
		doc.course_reference = self.name
		doc.legacy_record = 1
		# Set after name is generated (depends on autoname + course_reference)
		doc.flags.ignore_permissions = True
		doc.insert()
		doc.course_status = compute_course_attended_status(doc.name, self.start_date, self.end_date)
		doc.flags.ignore_permissions = True
		doc.save()
		doc.flags.ignore_permissions = True
		doc.submit()


def ensure_course_attended_records_for_nomination(doc, method=None):
	"""Hook-safe helper: ensure submitted Course Attended rows exist for a submitted Course Nomination."""
	if isinstance(doc, str):
		doc = frappe.get_doc("Course Nomination", doc)

	if not doc.course_name or not doc.nominated_personnel:
		return
	for row in doc.nominated_personnel:
		if not row.service_number:
			continue
		doc._create_or_update_course_attended_for_row(row)


def cancel_linked_course_attended_for_nomination(doc, method=None):
	"""Hook-safe helper: cancel linked Course Attended on Course Nomination cancel."""
	if isinstance(doc, str):
		doc = frappe.get_doc("Course Nomination", doc)
	for row in doc.nominated_personnel or []:
		if not row.service_number:
			continue
		ca_name = _get_linked_course_attended_name(doc.name, row.service_number)
		if not ca_name:
			continue
		ca = frappe.get_doc("Course Attended", ca_name)
		if ca.docstatus == 1:
			ca.flags.ignore_permissions = True
			ca.cancel()


def delete_linked_course_attended_for_nomination(doc, method=None):
	"""
	Hook-safe helper:
	- ensure linked Course Attended rows are cancelled where necessary
	- then delete them when Course Nomination is deleted
	"""
	if isinstance(doc, str):
		doc = frappe.get_doc("Course Nomination", doc)

	for row in doc.nominated_personnel or []:
		if not row.service_number:
			continue
		ca_name = _get_linked_course_attended_name(doc.name, row.service_number)
		if not ca_name:
			continue
		ca = frappe.get_doc("Course Attended", ca_name)
		if ca.docstatus == 1:
			ca.flags.ignore_permissions = True
			ca.cancel()
		frappe.delete_doc("Course Attended", ca_name, force=1, ignore_permissions=True)
