# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import getdate


class Part2Order(Document):
	def validate(self):
		"""Auto-populate part_2_order_reference from reference and date, validate service numbers, and validate PDF document"""
		# Set operator to current user
		if frappe.session.user:
			self.operator = frappe.session.user
		
		# Validate attach is mandatory if legacy_record is not checked
		if not self.legacy_record and not self.attach:
			frappe.throw(
				_("Attach is mandatory when Legacy Record is not checked. Please attach a document."),
				title=_("Missing Required Field")
			)
		
		# Validate that attach is a PDF file
		if self.attach:
			self._validate_pdf_document('attach')
		
		# Auto-populate part_2_order_reference from reference and date
		if self.reference and self.date:
			# Format date as "5 Mar 25" (d MMM yy format)
			date_obj = getdate(self.date)
			# Handle Windows compatibility (Windows doesn't support %-d)
			try:
				formatted_date = date_obj.strftime("%-d %b %y")
			except ValueError:
				# Windows doesn't support %-d, use %d and strip leading zero
				formatted_date = date_obj.strftime("%d %b %y").lstrip("0")
			# Convert reference to string (in case it's stored as date)
			reference_str = str(self.reference).strip() if self.reference else ""
			# Construct part 2 order reference: "Reference Dated Date"
			self.part_2_order_reference = reference_str + " Dated " + formatted_date
		
		"""Validate that service numbers are not duplicated in Unit TOS Record"""
		if self.unit_tos_record:
			service_numbers = []
			for record in self.unit_tos_record:
				if record.service_number:
					if record.service_number in service_numbers:
						frappe.throw(
							_("Duplicate Service Number '{0}' found in Unit TOS Record. Each service number can only appear once.").format(
								record.service_number
							),
							title=_("Duplicate Entry")
						)
					service_numbers.append(record.service_number)
		
		# Check for duplicates across Part 2 Orders
		self._check_duplicates_across_part2_orders()
		
		# Check if any rows being deleted match Posting Authority Details
		self._prevent_deletion_if_matches_posting_authority_details()
	
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
		"""Update Posting Authority Details when Part 2 Order is submitted"""
		# Set auditor to current user and save to database
		if frappe.session.user:
			self.db_set('auditor', frappe.session.user, update_modified=False)
		
		self._update_posting_authority_details()
		# Update Personnel current_unit based on maximum Date TOS
		self._update_personnel_current_unit()
	
	def on_cancel(self):
		"""Clear Posting Authority Details when Part 2 Order is cancelled"""
		self._clear_all_updates()
		# Update Personnel current_unit after cancellation
		self._update_personnel_current_unit()
	
	def on_update_after_submit(self):
		"""Update Posting Authority Details when rows are added or deleted after submission"""
		# Update existing rows and clear deleted rows
		self._update_posting_authority_details()
		self._clear_deleted_rows()
		# Update Personnel current_unit after update
		self._update_personnel_current_unit()
	
	def _update_posting_authority_details(self):
		"""Common method to update Posting Authority Details"""
		if not self.unit_tos_record:
			return
		
		for tos_record in self.unit_tos_record:
			if not tos_record.posting_authority or not tos_record.service_number or not tos_record.date_tos:
				if self.docstatus == 1:  # Only throw error if submitted
					frappe.throw(
						_("Row {0}: Posting Authority, Service Number, and Date TOS are required.").format(
							tos_record.idx
						),
						title=_("Missing Required Fields")
					)
				continue
			
			# Find the matching child table record directly from database
			# This avoids loading the entire parent document and handles concurrency better
			detail_record = frappe.db.get_value(
				"Posting Authority Details",
				{
					"parent": tos_record.posting_authority,
					"parenttype": "Posting Authority",
					"parentfield": "posting_authority_details",
					"service_number": tos_record.service_number
				},
				["name", "wef_date", "part_2_order"],
				as_dict=True
			)
			
			if not detail_record:
				if self.docstatus == 1:  # Only throw error if submitted
					frappe.throw(
						_("Row {0}: No matching record found in Posting Authority '{1}' for Service Number '{2}'.").format(
							tos_record.idx,
							tos_record.posting_authority,
							tos_record.service_number
						),
						title=_("Record Not Found")
					)
				continue
			
			# Optional: Check if already updated by another Part 2 Order
			# Uncomment if you want to prevent overwriting existing updates
			# if detail_record.part_2_order and detail_record.part_2_order != self.name:
			# 	frappe.msgprint(
			# 		_("Row {0}: This record was already updated by Part 2 Order '{1}'. Skipping update.").format(
			# 			tos_record.idx,
			# 			detail_record.part_2_order
			# 		),
			# 		indicator="orange"
			# 	)
			# 	continue
			
			# Prepare update values
			update_values = {
				"part_2_order": self.name,
				"gaining_unit_date_tos": tos_record.date_tos,
				"posting_status": "TOS"  # Update status to TOS when Part 2 Order is created
			}
			
			# Calculate overstay in loosing unit (date_tos - wef_date)
			if detail_record.wef_date:
				date_tos = frappe.utils.getdate(tos_record.date_tos)
				wef_date = frappe.utils.getdate(detail_record.wef_date)
				date_diff = (date_tos - wef_date).days
				update_values["overstay_in_loosing_unit"] = date_diff if date_diff > 0 else 0
			else:
				update_values["overstay_in_loosing_unit"] = 0
			
			# Update directly in database - this works even if parent is submitted
			# and handles concurrency better than loading/saving entire documents
			frappe.db.set_value(
				"Posting Authority Details",
				detail_record.name,
				update_values,
				update_modified=False  # Don't update modified timestamp
			)
		
		# Commit changes
		frappe.db.commit()
	
	def _clear_deleted_rows(self):
		"""Clear Posting Authority Details for rows that were deleted from Part 2 Order"""
		if self.docstatus != 1:  # Only process if submitted
			return
		
		# Get all current rows' (posting_authority, service_number) combinations
		current_combinations = set()
		if self.unit_tos_record:
			for tos_record in self.unit_tos_record:
				if tos_record.posting_authority and tos_record.service_number:
					current_combinations.add(
						(tos_record.posting_authority, tos_record.service_number)
					)
		
		# Find all Posting Authority Details that were updated by this Part 2 Order
		updated_details = frappe.db.get_all(
			"Posting Authority Details",
			filters={
				"part_2_order": self.name
			},
			fields=["name", "parent", "service_number"]
		)
		
		# Clear fields for records that no longer have a corresponding row
		for detail in updated_details:
			combination = (detail.parent, detail.service_number)
			if combination not in current_combinations:
				# This record was updated by this Part 2 Order but the row was deleted
				# Clear the fields and revert status to Pending TOS
				frappe.db.set_value(
					"Posting Authority Details",
					detail.name,
					{
						"part_2_order": None,
						"gaining_unit_date_tos": None,
						"overstay_in_loosing_unit": 0,
						"posting_status": "Pending TOS"  # Revert to Pending TOS when fields are cleared
					},
					update_modified=False
				)
		
		if updated_details:
			frappe.db.commit()
	
	def _clear_all_updates(self):
		"""Clear all Posting Authority Details that were updated by this Part 2 Order"""
		# Find all Posting Authority Details that were updated by this Part 2 Order
		updated_details = frappe.db.get_all(
			"Posting Authority Details",
			filters={
				"part_2_order": self.name
			},
			fields=["name"]
		)
		
		# Clear the fields for all records and revert status to Pending TOS
		for detail in updated_details:
			frappe.db.set_value(
				"Posting Authority Details",
				detail.name,
				{
					"part_2_order": None,
					"gaining_unit_date_tos": None,
					"overstay_in_loosing_unit": 0,
					"posting_status": "Pending TOS"  # Revert to Pending TOS when Part 2 Order is cancelled
				},
				update_modified=False
			)
		
		if updated_details:
			frappe.db.commit()
	
	def _update_personnel_current_unit(self):
		"""Update Personnel current_unit based on maximum Date TOS from Part 2 Order"""
		# Get all unique service numbers from Unit TOS Records in this Part 2 Order
		service_numbers = set()
		if self.unit_tos_record:
			for record in self.unit_tos_record:
				if record.service_number:
					service_numbers.add(record.service_number)
		
		# For each service number, find the Unit TOS Record with maximum date_tos across all Part 2 Orders
		for service_number in service_numbers:
			# Find all Unit TOS Records for this service_number across all Part 2 Orders
			unit_tos_records = frappe.db.get_all(
				"Unit TOS Record",
				filters={
					"service_number": service_number
				},
				fields=["to_unit", "date_tos"],
				order_by="date_tos desc"
			)
			
			if unit_tos_records and unit_tos_records[0].date_tos:
				# Get the record with maximum date_tos (first one after ordering desc)
				max_date_tos_record = unit_tos_records[0]
				new_current_unit = max_date_tos_record.to_unit
				
				# Update Personnel's current_unit
				if new_current_unit:
					# Check if Personnel exists
					if frappe.db.exists("Personnel", service_number):
						current_unit = frappe.db.get_value("Personnel", service_number, "current_unit")
						if current_unit != new_current_unit:
							frappe.db.set_value(
								"Personnel",
								service_number,
								"current_unit",
								new_current_unit,
								update_modified=False
							)
		
		# Commit changes
		frappe.db.commit()
	
	def _check_duplicates_across_part2_orders(self):
		"""Check if posting_authority and service_number combinations already exist in other Part 2 Orders"""
		if not self.unit_tos_record:
			return
		
		for record in self.unit_tos_record:
			if not record.posting_authority or not record.service_number:
				continue
			
			# Build filters - exclude current Part 2 Order if it exists
			filters = {
				"posting_authority": record.posting_authority,
				"service_number": record.service_number,
				"parenttype": "Part 2 Order"
			}
			
			# Only exclude current document if it has a name (saved document)
			if self.name:
				filters["parent"] = ["!=", self.name]
			
			# Check if this combination exists in other Part 2 Orders
			existing_records = frappe.db.get_all(
				"Unit TOS Record",
				filters=filters,
				fields=["parent", "name"],
				distinct=True
			)
			
			if existing_records:
				# Get unique Part 2 Order names
				part_2_order_names = list(set([r.parent for r in existing_records if r.parent]))
				
				if part_2_order_names:
					error_message = _(
						"Row {0}: The combination of Posting Authority '<b>{1}</b>' and Service Number '<b>{2}</b>' already exists in the following Part 2 Order(s):<br><br>"
					).format(
						record.idx,
						record.posting_authority,
						record.service_number
					)
					
					for order_name in part_2_order_names:
						error_message += f"• <b>{order_name}</b><br>"
					
					error_message += _("<br>To prevent duplicate data, please remove this row or use a different combination.")
					
					frappe.throw(
						error_message,
						title=_("Duplicate Entry Across Part 2 Orders")
					)
	
	def _prevent_deletion_if_matches_posting_authority_details(self):
		"""Prevent deletion of Unit TOS Record rows if they match Posting Authority Details"""
		if not self.name:
			# New document, no existing rows to check
			return
		
		# Get current rows (those that will remain after save)
		current_row_names = set()
		if self.unit_tos_record:
			for record in self.unit_tos_record:
				if record.name:
					current_row_names.add(record.name)
		
		# Get rows from before save (if available) or from database
		rows_before_save = []
		doc_before_save = self.get_doc_before_save()
		
		if doc_before_save and doc_before_save.unit_tos_record:
			# Use _doc_before_save if available (more reliable)
			for record in doc_before_save.unit_tos_record:
				if record.name:
					rows_before_save.append({
						"name": record.name,
						"posting_authority": record.posting_authority,
						"service_number": record.service_number,
						"personnel_name": record.personnel_name,
						"from_unit": record.from_unit,
						"to_unit": record.to_unit
					})
		
		# If no rows from _doc_before_save, query database
		if not rows_before_save:
			rows_before_save = frappe.db.get_all(
				"Unit TOS Record",
				filters={
					"parent": self.name,
					"parenttype": "Part 2 Order",
					"parentfield": "unit_tos_record"
				},
				fields=["name", "posting_authority", "service_number", "personnel_name", "from_unit", "to_unit"]
			)
		
		# Find rows that are being deleted (exist before but not in current list)
		rows_being_deleted = [
			row for row in rows_before_save 
			if row.get("name") and row.get("name") not in current_row_names
		]
		
		# Check if any deleted row matches a Posting Authority Details record
		for deleted_row in rows_being_deleted:
			if not deleted_row.posting_authority or not deleted_row.service_number:
				continue
			
			# Check if this row matches a Posting Authority Details record
			# Match by: posting_authority, service_number, personnel_name, from_unit, to_unit
			matching_detail = frappe.db.get_value(
				"Posting Authority Details",
				{
					"parent": deleted_row.posting_authority,
					"parenttype": "Posting Authority",
					"parentfield": "posting_authority_details",
					"service_number": deleted_row.service_number,
					"from_unit": deleted_row.from_unit,
					"to_unit": deleted_row.to_unit,
					"personnel_name": deleted_row.personnel_name
				},
				["name"],
				as_dict=True
			)
			
			if matching_detail:
				# This row matches Posting Authority Details - prevent deletion
				frappe.throw(
					_("Cannot delete Unit TOS Record row for Service Number '<b>{0}</b>'.<br><br>"
					  "This record matches a Posting Authority Details record in Posting Authority '<b>{1}</b>'. "
					  "The matching fields are:<br>"
					  "- Posting Authority: {1}<br>"
					  "- Service Number: {0}<br>"
					  "- Personnel Name: {2}<br>"
					  "- From Unit: {3}<br>"
					  "- To Unit: {4}<br><br>"
					  "Deleting this record would break the data integrity link between Part 2 Order and Posting Authority Details.<br><br>"
					  "<b>To delete this record:</b><br>"
					  "1. First, ensure the corresponding Posting Authority Details record is updated or removed<br>"
					  "2. Or modify the Unit TOS Record values so they no longer match Posting Authority Details").format(
						deleted_row.service_number,
						deleted_row.posting_authority,
						deleted_row.personnel_name or "",
						deleted_row.from_unit or "",
						deleted_row.to_unit or ""
					),
					title=_("Cannot Delete - Matches Posting Authority Details")
				)


@frappe.whitelist()
def check_duplicate_posting_authority_service_number(posting_authority, service_number, current_part_2_order=None, current_row_name=None):
	"""Check if a posting_authority and service_number combination already exists in other Part 2 Orders"""
	if not posting_authority or not service_number:
		return {"duplicate_found": False}
	
	# Build filters
	filters = {
		"posting_authority": posting_authority,
		"service_number": service_number,
		"parenttype": "Part 2 Order"
	}
	
	# Exclude current Part 2 Order if provided
	if current_part_2_order:
		filters["parent"] = ["!=", current_part_2_order]
	
	# Find existing records
	existing_records = frappe.db.get_all(
		"Unit TOS Record",
		filters=filters,
		fields=["parent", "name"],
		distinct=True
	)
	
	if existing_records:
		# Get unique Part 2 Order names
		part_2_order_names = list(set([r.parent for r in existing_records if r.parent]))
		
		return {
			"duplicate_found": True,
			"existing_part_2_orders": part_2_order_names
		}
	
	return {"duplicate_found": False}

@frappe.whitelist()
def validate_unit_tos_records(unit_tos_records):
	"""Validate Unit TOS Record rows against Posting Authority Details"""
	import json
	
	if isinstance(unit_tos_records, str):
		unit_tos_records = json.loads(unit_tos_records)
	
	validation_results = []
	
	for row in unit_tos_records:
		if not row.get("posting_authority") or not row.get("service_number"):
			continue
		
		# Get the corresponding Posting Authority Details record
		detail_record = frappe.db.get_value(
			"Posting Authority Details",
			{
				"parent": row.get("posting_authority"),
				"parenttype": "Posting Authority",
				"parentfield": "posting_authority_details",
				"service_number": row.get("service_number")
			},
			["service_number", "from_unit", "to_unit", "personnel_name"],
			as_dict=True
		)
		
		if not detail_record:
			# Record not found in Posting Authority Details
			validation_results.append({
				"row_name": row.get("name"),
				"row_idx": row.get("idx"),
				"error": "not_found",
				"mismatches": {
					"service_number": True,
					"personnel_name": True,
					"from_unit": True,
					"to_unit": True
				},
				"message": f"Service Number '{row.get('service_number')}' not found in Posting Authority '{row.get('posting_authority')}'"
			})
			continue
		
		# Get personnel_name from Personnel doctype
		personnel_name = frappe.db.get_value(
			"Personnel",
			row.get("service_number"),
			"personnel_name"
		)
		
		# Compare fields
		mismatches = {}
		if row.get("service_number") != detail_record.service_number:
			mismatches["service_number"] = True
		if row.get("personnel_name") != personnel_name:
			mismatches["personnel_name"] = True
		if row.get("from_unit") != detail_record.from_unit:
			mismatches["from_unit"] = True
		if row.get("to_unit") != detail_record.to_unit:
			mismatches["to_unit"] = True
		
		if mismatches:
			validation_results.append({
				"row_name": row.get("name"),
				"row_idx": row.get("idx"),
				"error": "mismatch",
				"mismatches": mismatches,
				"expected": {
					"service_number": detail_record.service_number,
					"personnel_name": personnel_name,
					"from_unit": detail_record.from_unit,
					"to_unit": detail_record.to_unit
				},
				"actual": {
					"service_number": row.get("service_number"),
					"personnel_name": row.get("personnel_name"),
					"from_unit": row.get("from_unit"),
					"to_unit": row.get("to_unit")
				}
			})
	
	return validation_results
