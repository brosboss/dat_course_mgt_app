# Copyright (c) 2026, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class StrengthReturns(Document):
	def on_update(self):
		"""Recalculate Personnel records from all submitted Strength Returns on save"""
		# Only recalculate if this document is submitted
		if self.docstatus == 1:
			self._recalculate_personnel_from_all_returns()
	
	def on_submit(self):
		"""Recalculate Personnel records from all submitted Strength Returns when submitted"""
		self._recalculate_personnel_from_all_returns()
	
	def on_cancel(self):
		"""Recalculate Personnel records from remaining submitted Strength Returns when cancelled"""
		# Explicitly exclude this document from recalculation since it's being cancelled
		self._recalculate_personnel_from_all_returns(exclude_docname=self.name)
	
	def on_trash(self):
		"""Recalculate Personnel records from remaining submitted Strength Returns before deletion"""
		# Only recalculate if this document was submitted (has valid data that might have been used)
		if self.docstatus == 1:
			self._recalculate_personnel_from_all_returns(exclude_docname=self.name)
	
	def _recalculate_personnel_from_all_returns(self, exclude_docname=None):
		"""Recalculate Personnel records based on maximum DTOS across all submitted Strength Returns"""
		# Query all Strength Returns Details from all submitted Strength Returns documents
		# When on_cancel is called, the current document's docstatus is already 2 (CANCELLED), so it's automatically excluded
		# When on_trash is called, we need to explicitly exclude the document being deleted
		# However, we explicitly exclude in both cases to ensure reliability
		details_query = """
			SELECT 
				srd.personnel,
				srd.dtos,
				srd.current_depl,
				sr.name as strength_returns_doc
			FROM `tabStrength Returns Details` srd
			INNER JOIN `tabStrength Returns` sr ON srd.parent = sr.name
			WHERE sr.docstatus = 1
				AND srd.personnel IS NOT NULL
				AND srd.dtos IS NOT NULL
		"""
		
		query_params = []
		if exclude_docname:
			details_query += " AND sr.name != %s"
			query_params.append(exclude_docname)
		
		all_details = frappe.db.sql(details_query, query_params, as_dict=True)
		
		# Group by personnel and find the row with the maximum DTOS for each personnel
		personnel_updates = {}
		
		for detail in all_details:
			personnel_name = detail.personnel
			dtos = frappe.utils.getdate(detail.dtos) if detail.dtos else None
			current_depl = detail.current_depl
			strength_returns_doc = detail.strength_returns_doc
			
			if not dtos or not personnel_name:
				continue
			
			# If this personnel hasn't been seen, or this DTOS is more recent, update
			if personnel_name not in personnel_updates:
				personnel_updates[personnel_name] = {
					'dtos': dtos,
					'current_depl': current_depl,
					'strength_returns_doc': strength_returns_doc
				}
			else:
				# Compare DTOS dates - use the most recent one
				if dtos > personnel_updates[personnel_name]['dtos']:
					personnel_updates[personnel_name] = {
						'dtos': dtos,
						'current_depl': current_depl,
						'strength_returns_doc': strength_returns_doc
					}
		
		# Get all personnel that have ever been in any Strength Returns Details
		# to clear those that no longer have any valid records
		personnel_query = """
			SELECT DISTINCT srd.personnel
			FROM `tabStrength Returns Details` srd
			INNER JOIN `tabStrength Returns` sr ON srd.parent = sr.name
			WHERE sr.docstatus = 1
				AND srd.personnel IS NOT NULL
		"""
		
		personnel_params = []
		if exclude_docname:
			personnel_query += " AND sr.name != %s"
			personnel_params.append(exclude_docname)
		
		all_personnel_in_returns = frappe.db.sql(personnel_query, personnel_params, as_dict=True)
		
		all_personnel_set = {row.personnel for row in all_personnel_in_returns if row.personnel}
		
		# Get personnel from the excluded document (if cancelling/deleting) to ensure we clear them if no other records exist
		excluded_doc_personnel = set()
		if exclude_docname:
			excluded_details = frappe.db.sql("""
				SELECT DISTINCT personnel
				FROM `tabStrength Returns Details`
				WHERE parent = %s
					AND personnel IS NOT NULL
			""", (exclude_docname,), as_dict=True)
			excluded_doc_personnel = {row.personnel for row in excluded_details if row.personnel}
		
		# Update each personnel record that has a valid current_depl
		updated_count = 0
		cleared_count = 0
		
		for personnel_name, update_data in personnel_updates.items():
			if not update_data['current_depl']:
				continue
			
			try:
				# Verify personnel exists and field exists
				if not frappe.db.exists("Personnel", personnel_name):
					frappe.log_error(
						f"Personnel {personnel_name} does not exist when updating from Strength Returns",
						"Strength Returns Update Error"
					)
					continue
				
				# Check if fields exist in Personnel doctype
				personnel_meta = frappe.get_meta("Personnel")
				if not personnel_meta.has_field("personnel_unit_from_returns"):
					frappe.log_error(
						"Field 'personnel_unit_from_returns' does not exist in Personnel doctype",
						"Strength Returns Update Error"
					)
					continue
				
				# Update personnel_unit_from_returns, dtos, strength_returns, and current_deployment
				update_dict = {
					"personnel_unit_from_returns": update_data['current_depl']
				}
				
				# Update dtos field if it exists
				if personnel_meta.has_field("dtos"):
					update_dict["dtos"] = update_data['dtos']
				
				# Update strength_returns field if it exists
				if personnel_meta.has_field("strength_returns") and update_data.get('strength_returns_doc'):
					update_dict["strength_returns"] = update_data['strength_returns_doc']
				
				# Only update current_deployment if field exists
				if personnel_meta.has_field("current_deployment"):
					update_dict["current_deployment"] = update_data['current_depl']
				
				frappe.db.set_value(
					"Personnel",
					personnel_name,
					update_dict,
					update_modified=False
				)
				updated_count += 1
				
			except Exception as e:
				frappe.log_error(
					f"Error updating Personnel {personnel_name} from Strength Returns: {str(e)}\n{frappe.get_traceback()}",
					"Strength Returns Update Error"
				)
				continue
		
		# Clear fields for personnel that are in submitted Strength Returns but don't have valid current_depl
		personnel_to_clear = all_personnel_set - set(personnel_updates.keys())
		# Also include personnel from excluded document that have no remaining records
		if excluded_doc_personnel:
			personnel_to_clear.update(excluded_doc_personnel - all_personnel_set)
		
		for personnel_name in personnel_to_clear:
			try:
				if not frappe.db.exists("Personnel", personnel_name):
					continue
				
				# Check if fields exist in Personnel doctype
				personnel_meta = frappe.get_meta("Personnel")
				clear_dict = {}
				
				if personnel_meta.has_field("personnel_unit_from_returns"):
					clear_dict["personnel_unit_from_returns"] = None
				if personnel_meta.has_field("dtos"):
					clear_dict["dtos"] = None
				if personnel_meta.has_field("strength_returns"):
					clear_dict["strength_returns"] = None
				if personnel_meta.has_field("current_deployment"):
					clear_dict["current_deployment"] = None
				
				if clear_dict:
					frappe.db.set_value(
						"Personnel",
						personnel_name,
						clear_dict,
						update_modified=False
					)
					cleared_count += 1
				
			except Exception as e:
				frappe.log_error(
					f"Error clearing Personnel {personnel_name} from Strength Returns: {str(e)}\n{frappe.get_traceback()}",
					"Strength Returns Update Error"
				)
				continue
		
		# Commit changes
		if updated_count > 0 or cleared_count > 0:
			frappe.db.commit()


@frappe.whitelist()
def get_personnel_multiple_strength_returns(
	page=1,
	page_length=50,
	year=None,
	quarter=None,
	returns_originator_unit=None,
	personnel_category=None,
):
	"""Get personnel that appear in multiple submitted Strength Returns documents
	for the given filter context.

	Filters apply to `tabStrength Returns`:
	- year
	- quarter
	- returns_originator_unit
	- personnel_category
	"""
	page = int(page) if page else 1
	page_length = int(page_length) if page_length else 50
	if page < 1:
		page = 1
	if page_length < 1:
		page_length = 50
	limit_start = (page - 1) * page_length

	# Base filters on Strength Returns and Details
	where = ["sr.docstatus = 1", "srd.personnel IS NOT NULL"]
	params: list[object] = []

	if year:
		where.append("sr.year = %s")
		params.append(year)
	if quarter:
		where.append("sr.quarter = %s")
		params.append(quarter)
	if returns_originator_unit:
		where.append("sr.returns_originator_unit = %s")
		params.append(returns_originator_unit)
	if personnel_category:
		where.append("sr.personnel_category = %s")
		params.append(personnel_category)

	where_sql = " AND ".join(where)

	# Total duplicate personnel count
	total_row = frappe.db.sql(
		f"""
		SELECT COUNT(*) AS cnt
		FROM (
			SELECT srd.personnel
			FROM `tabStrength Returns Details` srd
			INNER JOIN `tabStrength Returns` sr ON srd.parent = sr.name
			WHERE {where_sql}
			GROUP BY srd.personnel
			HAVING COUNT(DISTINCT sr.name) > 1
		) t
		""",
		tuple(params),
		as_dict=True,
	)
	total_duplicates = total_row[0].cnt if total_row else 0

	# Paginated duplicate personnel list with counts
	dup_rows = frappe.db.sql(
		f"""
		SELECT
			srd.personnel AS service_number,
			COUNT(DISTINCT sr.name) AS returns_count
		FROM `tabStrength Returns Details` srd
		INNER JOIN `tabStrength Returns` sr ON srd.parent = sr.name
		WHERE {where_sql}
		GROUP BY srd.personnel
		HAVING COUNT(DISTINCT sr.name) > 1
		ORDER BY srd.personnel
		LIMIT %s OFFSET %s
		""",
		tuple(params + [page_length, limit_start]),
		as_dict=True,
	)

	if not dup_rows:
		return {
			"data": [],
			"total_duplicates": 0,
			"page": page,
			"page_length": page_length,
			"total_pages": 1,
		}

	service_numbers = [row.service_number for row in dup_rows if row.service_number]

	# Fetch details for Strength Returns each duplicate personnel appears in
	detail_rows = frappe.db.sql(
		f"""
		SELECT
			srd.personnel AS service_number,
			srd.personnel_name,
			srd.rank,
			sr.name AS strength_returns_doc,
			sr.returns_reference,
			sr.year,
			sr.quarter,
			sr.returns_originator_unit,
			sr.personnel_category
		FROM `tabStrength Returns Details` srd
		INNER JOIN `tabStrength Returns` sr ON srd.parent = sr.name
		WHERE {where_sql}
		  AND srd.personnel IN %s
		ORDER BY srd.personnel, sr.year, sr.quarter, sr.name
		""",
		tuple(params + [tuple(service_numbers)]),
		as_dict=True,
	)

	# Group details by personnel
	from collections import defaultdict

	grouped: dict[str, list] = defaultdict(list)
	for row in detail_rows:
		grouped[row.service_number].append(row)

	result = []
	for dup in dup_rows:
		svc = dup.service_number
		rows = grouped.get(svc, [])
		if not rows:
			continue

		first = rows[0]
		result.append(
			{
				"service_number": svc,
				"personnel_name": first.personnel_name,
				"rank": first.rank,
				"returns_count": dup.returns_count,
				"returns": [
					{
						"docname": r.strength_returns_doc,
						"returns_reference": r.returns_reference,
						"year": r.year,
						"quarter": r.quarter,
						"returns_originator_unit": r.returns_originator_unit,
						"personnel_category": r.personnel_category,
					}
					for r in rows
				],
			}
		)

	total_pages = (
		(total_duplicates + page_length - 1) // page_length
		if total_duplicates > 0
		else 1
	)

	return {
		"data": result,
		"total_duplicates": total_duplicates,
		"page": page,
		"page_length": page_length,
		"total_pages": total_pages,
	}
