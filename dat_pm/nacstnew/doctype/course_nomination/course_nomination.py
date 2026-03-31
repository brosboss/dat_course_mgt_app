# Copyright (c) 2026, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

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
def create_course_nomination_from_page(course_name, nominated_personnel):
	"""
	Create a Course Nomination doc from the nomination page.
	nominated_personnel: list of dicts with service_number, personnel_name, current_rank, current_unit.
	Validates (only qualified personnel allowed); returns the new doc name.
	"""
	if not course_name:
		frappe.throw(frappe._("Course Name is required."))
	nominated = frappe.parse_json(nominated_personnel) if isinstance(nominated_personnel, str) else (nominated_personnel or [])
	doc = frappe.new_doc("Course Nomination")
	doc.course_name = course_name
	for p in nominated:
		if not p.get("service_number"):
			continue
		doc.append("nominated_personnel", {
			"service_number": p.get("service_number"),
			"personnel_name": p.get("personnel_name") or "",
			"rank": p.get("current_rank") or p.get("rank"),
			"unit": p.get("current_unit") or p.get("unit"),
		})
	doc.flags.ignore_permissions = False
	doc.insert()
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


class CourseNomination(Document):
	def validate(self):
		if not self.course_name or not self.nominated_personnel:
			return
		qualified = _get_qualified_service_numbers_for_course(self.course_name)
		not_qualified = []
		for row in self.nominated_personnel:
			if row.service_number and row.service_number not in qualified:
				not_qualified.append(row.service_number or row.personnel_name or "Unknown")
		if not_qualified:
			frappe.throw(
				frappe._("The following personnel are not qualified for the course '{0}' (rank, already attended, or missing prerequisite): {1}. Remove them or select a different course.").format(
					self.course_name, ", ".join(not_qualified)
				)
			)
