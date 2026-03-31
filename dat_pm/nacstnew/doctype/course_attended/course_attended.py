# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


def get_ancestors(course_name):
	"""Return the ordered list of ancestor names for a course_name, from immediate parent to root.
	
	Uses the parent_course_name field on the Course Name tree doctype.
	Returns an empty list if the course has no parent.
	"""
	if not course_name:
		return []

	ancestors = []
	visited = set()
	current = course_name

	while True:
		parent = frappe.db.get_value("Course Name", current, "parent_course_name")
		if not parent or parent in visited:
			break
		visited.add(parent)
		ancestors.append(parent)
		current = parent

	return ancestors  # ordered: immediate parent first, root last


def get_topmost_attended(attended_set):
	"""Given a set of course names that a personnel actually attended, return the subset
	of courses that are the 'highest' in the hierarchy — i.e. no ancestor of theirs
	is also in the attended set.

	Example:
	  Tree:  Infantry → Infantry Sub-Course → Advanced Infantry
	  Attended: {Infantry Sub-Course, Advanced Infantry}
	  → Infantry Sub-Course is topmost (its parent "Infantry" is NOT in attended_set)
	  → Advanced Infantry is NOT topmost (its parent "Infantry Sub-Course" IS in attended_set)
	  Result: {"Infantry Sub-Course"}
	"""
	topmost = []
	for course in attended_set:
		ancestors = get_ancestors(course)
		# This course is topmost if none of its ancestors are also in the attended set
		if not any(anc in attended_set for anc in ancestors):
			topmost.append(course)
	return topmost


def update_personnel_specialties(service_number):
	"""Recalculate and save main_primary_specialty, main_secondary_specialty,
	and main_auxiliary_specialty on the Personnel record for the given service_number.

	For each specialty type, find the highest-level course(s) that the personnel
	actually attended — i.e. courses where no ancestor course was also attended.
	"""
	if not service_number:
		return

	# Map from Course Attended specialty values → Personnel fieldnames
	specialty_map = {
		"Primary Specialty": "main_primary_specialty",
		"Secondary Specialty": "main_secondary_specialty",
		"Auxiliary Specialty": "main_auxiliary_specialty",
	}

	updates = {}

	for specialty_value, personnel_field in specialty_map.items():
		# Fetch all submitted Course Attended records for this personnel + specialty type
		courses = frappe.db.get_all(
			"Course Attended",
			filters={
				"service_number": service_number,
				"specialty": specialty_value,
				"docstatus": 1,  # only submitted records
			},
			fields=["course_name"],
		)

		# Build set of attended course names for this specialty
		attended_set = {row.course_name for row in courses if row.course_name}

		# Find the topmost ones (highest in hierarchy that the personnel actually attended)
		topmost = get_topmost_attended(attended_set)

		updates[personnel_field] = ", ".join(sorted(topmost)) if topmost else ""

	# Write all 3 fields to the Personnel record
	if frappe.db.exists("Personnel", service_number):
		for field, value in updates.items():
			frappe.db.set_value("Personnel", service_number, field, value, update_modified=False)


class CourseAttended(Document):
	def validate(self):
		"""Validate that course_report is a PDF file and mandatory if not legacy record"""
		# Set operator to current user
		if frappe.session.user:
			self.operator = frappe.session.user
		
		# Validate course_report is mandatory if legacy_record is not checked
		if not self.legacy_record and not self.course_report:
			frappe.throw(
				_("Course Report is mandatory when Legacy Record is not checked. Please attach a course report."),
				title=_("Missing Required Field")
			)
		
		if self.course_report:
			self._validate_pdf_document('course_report')
	
	def _validate_pdf_document(self, fieldname):
		"""Validate that the specified attach field contains a PDF file"""
		document = self.get(fieldname)
		if not document:
			return
		
		# Get file extension
		file_extension = None
		if '.' in document:
			file_extension = document.split('.')[-1].lower()
		
		# Check if it's a PDF
		if file_extension != 'pdf':
			frappe.throw(
				_("Only PDF documents are allowed for {0}. The attached file '{1}' is not a PDF file.").format(
					_(self.meta.get_field(fieldname).label or fieldname),
					document
				),
				title=_("Invalid File Type")
			)
		
		# Additional validation: Check if file exists and verify MIME type if possible
		try:
			# Try to get file info from database
			file_doc = frappe.get_doc("File", {"file_url": document})
			if hasattr(file_doc, 'file_type') and file_doc.file_type:
				if file_doc.file_type.upper() != 'PDF':
					frappe.throw(
						_("Only PDF documents are allowed for {0}. The attached file '{1}' has file type '{2}'.").format(
							_(self.meta.get_field(fieldname).label or fieldname),
							document,
							file_doc.file_type
						),
						title=_("Invalid File Type")
					)
		except frappe.DoesNotExistError:
			# File might not be saved yet, just check extension
			pass
		except Exception:
			# If we can't check, just rely on extension validation
			pass
	
	def on_submit(self):
		"""Set auditor to current user when document is submitted, then update Personnel specialties"""
		if frappe.session.user:
			self.db_set('auditor', frappe.session.user, update_modified=False)
		# Recalculate the Personnel's main specialty fields based on submitted courses
		update_personnel_specialties(self.service_number)

	def on_cancel(self):
		"""Recalculate Personnel specialties when a course is cancelled (removed from active set)"""
		update_personnel_specialties(self.service_number)

	def on_update_after_submit(self):
		"""Recalculate Personnel specialties if an amended/updated submission changes specialty"""
		update_personnel_specialties(self.service_number)
