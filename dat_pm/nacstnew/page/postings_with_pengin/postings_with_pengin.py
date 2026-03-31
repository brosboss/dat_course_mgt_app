import frappe
from frappe import _
from frappe.utils import cint, getdate


@frappe.whitelist()
def get_postings_without_part2(
	year=None,
	to_unit=None,
	from_date=None,
	to_date=None,
	page=1,
	page_length=50,
):
	"""Return personnel posting records that have a Posting Authority record
	but **no Part 2 Order recorded**.

	Filters:
	- year: filters by year of WEF Date on `Posting Authority Details`
	- to_unit: filters by `to_unit` (unit the personnel is posted to)
	- from_date, to_date: filter by WEF Date range (inclusive)
	"""

	page = cint(page) or 1
	page_length = cint(page_length) or 50
	if page < 1:
		page = 1
	if page_length < 1:
		page_length = 50

	limit_start = (page - 1) * page_length

	where_clauses = [
		"(pad.part_2_order IS NULL OR pad.part_2_order = '')"
	]
	params = []

	# Filter by year of WEF Date (posting effective date)
	if year:
		where_clauses.append("YEAR(pad.wef_date) = %s")
		params.append(cint(year))

	# Filter by from/to date on WEF Date
	if from_date:
		try:
			from_dt = getdate(from_date)
			where_clauses.append("pad.wef_date >= %s")
			params.append(from_dt)
		except Exception:
			pass

	if to_date:
		try:
			to_dt = getdate(to_date)
			where_clauses.append("pad.wef_date <= %s")
			params.append(to_dt)
		except Exception:
			pass

	# Filter by unit posted to
	if to_unit:
		where_clauses.append("pad.to_unit = %s")
		params.append(to_unit)

	where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

	# Total count (for pagination)
	total_row = frappe.db.sql(
		f"""
		SELECT COUNT(*)
		FROM `tabPosting Authority Details` pad
		LEFT JOIN `tabPersonnel` p ON p.service_number = pad.service_number
		WHERE {where_sql}
		""",
		tuple(params),
	)
	total_count = total_row[0][0] if total_row else 0

	# Actual data
	rows = frappe.db.sql(
		f"""
		SELECT
			pad.service_number,
			COALESCE(p.personnel_name, pad.personnel_name) AS personnel_name,
			p.current_rank,
			p.category,
			pad.parent               AS posting_authority,
			pad.from_unit,
			pad.to_unit,
			pad.appointment,
			pad.wef_date,
			pad.posting_status
		FROM `tabPosting Authority Details` pad
		LEFT JOIN `tabPersonnel` p ON p.service_number = pad.service_number
		WHERE {where_sql}
		ORDER BY pad.wef_date DESC, pad.creation DESC
		LIMIT %s OFFSET %s
		""",
		tuple(params + [page_length, limit_start]),
		as_dict=True,
	)

	# Format rows for UI
	formatted = []
	for row in rows:
		formatted.append(
			{
				"service_number": row.service_number,
				"personnel_name": row.personnel_name,
				"current_rank": row.current_rank,
				"category": row.category,
				"posting_authority": row.posting_authority,
				"from_unit": row.from_unit,
				"to_unit": row.to_unit,
				"appointment": row.appointment,
				"wef_date": frappe.format_value(row.wef_date, {"fieldtype": "Date"})
				if row.wef_date
				else "",
				"posting_status": row.posting_status,
			}
		)

	total_pages = (total_count + page_length - 1) // page_length if total_count > 0 else 1

	return {
		"data": formatted,
		"total_count": total_count,
		"page": page,
		"page_length": page_length,
		"total_pages": total_pages,
	}


@frappe.whitelist()
def get_distinct_posting_years():
	"""Return distinct years from WEF Date on Posting Authority Details."""
	years = frappe.db.sql(
		"""
		SELECT DISTINCT YEAR(wef_date) AS year
		FROM `tabPosting Authority Details`
		WHERE wef_date IS NOT NULL
		ORDER BY year DESC
		""",
		as_dict=True,
	)
	return [y.year for y in years if y.year]


@frappe.whitelist()
def get_distinct_posting_units():
	"""Return distinct units from `to_unit` on Posting Authority Details."""
	units = frappe.db.get_all(
		"Posting Authority Details",
		fields=["to_unit"],
		filters={"to_unit": ["!=", ""]},
		distinct=True,
		order_by="to_unit",
	)
	return [u["to_unit"] for u in units if u.get("to_unit")]


