# Copyright (c) 2026, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import getdate, nowdate, date_diff


def get_course_match_set(course_name):
	"""Return a set of Course Name values that should be considered a match
	when a personnel's specialty field is compared against a filter course.

	Because `main_primary/secondary/auxiliary_specialty` stores the *highest
	ancestor* (root) of the course actually attended, the match must work in
	both directions:

	  1. Filter course is an ancestor of what was attended → personnel's stored
	     root equals the filter course itself  (descendants direction).
	  2. Filter course is a child/grandchild of the stored root → personnel's
	     stored root is an ancestor of the filter course  (ancestors direction).

	Returns: the filter course + all its descendants + all its ancestors.
	Any personnel whose stored specialty value is in this set is a match.
	"""
	if not course_name:
		return set()

	# Get lft and rgt for the selected node
	node = frappe.db.get_value("Course Name", course_name, ["lft", "rgt"], as_dict=True)
	if not node:
		return {course_name}

	# 1. Self + descendants: nodes whose lft/rgt range is inside this node's range
	descendants = frappe.db.get_all(
		"Course Name",
		filters=[
			["lft", ">=", node.lft],
			["rgt", "<=", node.rgt],
		],
		fields=["name"],
	)

	# 2. Ancestors: nodes whose lft/rgt range *contains* this node's range
	ancestors = frappe.db.get_all(
		"Course Name",
		filters=[
			["lft", "<=", node.lft],
			["rgt", ">=", node.rgt],
		],
		fields=["name"],
	)

	return {row.name for row in descendants} | {row.name for row in ancestors}



def get_course_exact_set(course_name):
	"""Return a set containing only the exact course_name string.
	Used for exact-match mode where only personnel whose stored specialty
	literally equals the selected course are included.
	"""
	if not course_name:
		return set()
	return {course_name}


@frappe.whitelist()
def get_filtered_personnel_html(years_in_current_unit=None, primary_course=None,
								secondary_course=None, auxiliary_course=None,
								exact_match=False):
	"""Return an HTML table of Personnel records matching all provided filter criteria.

	All filters are optional and ANDed together.  Any filter whose value is
	not provided (None, empty string, or zero) is simply skipped — every
	Personnel record passes that particular criterion.

	  - years_in_current_unit: personnel whose DTOS is at least N years ago
	  - primary_course:   Personnel.main_primary_specialty is in the selected
	                      Course Name subtree (self + descendants)
	  - secondary_course: same for main_secondary_specialty
	  - auxiliary_course: same for main_auxiliary_specialty

	Returns an HTML string ready to be set in the personnel_list HTML field.
	"""
	# Normalise each filter value: strip whitespace and treat blank/falsy as None
	def _str(val):
		"""Return stripped string or None if the value is blank/falsy."""
		if val is None:
			return None
		s = str(val).strip()
		return s if s else None

	primary_course   = _str(primary_course)
	secondary_course = _str(secondary_course)
	auxiliary_course = _str(auxiliary_course)

	# Normalise years: must be a positive integer, otherwise skip this filter
	years_val = 0
	raw_years = _str(years_in_current_unit)
	if raw_years:
		try:
			years_val = int(float(raw_years))  # handles "2", "2.0", etc.
		except (ValueError, TypeError):
			years_val = 0
	if years_val < 1:
		years_val = 0  # treat 0 or negative as "not provided"

	# Select matching strategy: exact string equality vs. ancestor+self+descendant
	exact = str(exact_match).strip() in ("1", "true", "True", "yes")
	build_set = get_course_exact_set if exact else get_course_match_set

	# Resolve which course names count as matching each specialty filter.
	# None means "filter not active"; an empty set would exclude everyone,
	# so we only build the set when a valid course name is provided.
	primary_set   = build_set(primary_course)   if primary_course   else None
	secondary_set = build_set(secondary_course) if secondary_course else None
	auxiliary_set = build_set(auxiliary_course) if auxiliary_course else None

	# Compute the cutoff date for years_in_current_unit
	cutoff_date = None
	if years_val > 0:
		from datetime import date
		today = getdate(nowdate())
		# Personnel must have DTOS on or before (today minus N years)
		cutoff_date = date(today.year - years_val, today.month, today.day)

	# Fetch all Personnel with the base fields we need
	personnel_list = frappe.db.get_all(
		"Personnel",
		fields=[
			"name",
			"service_number",
			"personnel_name",
			"current_rank",
			"current_unit",
			"dtos",
			"main_primary_specialty",
			"main_secondary_specialty",
			"main_auxiliary_specialty",
		],
		order_by="personnel_name asc",
	)

	# Apply filters in Python (avoids complex SQL for tree-based specialty matching)
	filtered = []
	for p in personnel_list:
		# Filter 1: years in current unit via DTOS
		if cutoff_date:
			if not p.dtos:
				continue
			if getdate(p.dtos) > cutoff_date:
				continue  # joined unit more recently than required

		# Filter 2: primary specialty
		if primary_set is not None:
			# The Personnel field may be comma-separated if multiple roots
			personnel_primaries = {s.strip() for s in (p.main_primary_specialty or "").split(",") if s.strip()}
			if not personnel_primaries.intersection(primary_set):
				continue

		# Filter 3: secondary specialty
		if secondary_set is not None:
			personnel_secondaries = {s.strip() for s in (p.main_secondary_specialty or "").split(",") if s.strip()}
			if not personnel_secondaries.intersection(secondary_set):
				continue

		# Filter 4: auxiliary specialty
		if auxiliary_set is not None:
			personnel_auxiliaries = {s.strip() for s in (p.main_auxiliary_specialty or "").split(",") if s.strip()}
			if not personnel_auxiliaries.intersection(auxiliary_set):
				continue

		# Calculate years in current unit for display
		years_display = ""
		if p.dtos:
			days = date_diff(nowdate(), p.dtos)
			yrs = days // 365
			mths = (days % 365) // 30
			parts = []
			if yrs > 0:
				parts.append(f"{yrs} yr{'s' if yrs != 1 else ''}")
			if mths > 0:
				parts.append(f"{mths} mo")
			years_display = " ".join(parts) if parts else "< 1 mo"

		filtered.append({**p, "years_display": years_display})

	if not filtered:
		return {"total": 0, "rows": []}

	# Return plain data — JS handles rendering, pagination and Add buttons
	rows = []
	for p in filtered:
		yrs_int = (date_diff(nowdate(), p.get("dtos")) // 365) if p.get("dtos") else 0
		rows.append({
			"service_number":         p.get("service_number") or "",
			"personnel_name":         p.get("personnel_name") or "",
			"current_rank":           p.get("current_rank") or "",
			"current_unit":           str(p.get("current_unit") or ""),
			"years_display":          p.get("years_display") or "",
			"years_int":              int(yrs_int),
			"main_primary_specialty":   p.get("main_primary_specialty") or "",
			"main_secondary_specialty": p.get("main_secondary_specialty") or "",
			"main_auxiliary_specialty": p.get("main_auxiliary_specialty") or "",
		})

	return {"total": len(rows), "rows": rows}


class PostingProposalAnalysis(Document):
	pass
