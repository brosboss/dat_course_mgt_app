# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import getdate


class PostingAuthority(Document):
	def validate(self):
		"""Auto-populate posting_authority from reference and date, validate service numbers, and validate PDF document"""
		# Set operator to current user
		if frappe.session.user:
			self.operator = frappe.session.user
		
		# Validate posting_document is mandatory if legacy_record is not checked
		if not self.legacy_record and not self.posting_document:
			frappe.throw(
				_("Posting Document is mandatory when Legacy Record is not checked. Please attach a document."),
				title=_("Missing Required Field")
			)
		
		# Validate that posting_document is a PDF file
		if self.posting_document:
			self._validate_pdf_document()
		
		# Auto-populate posting_authority from reference and date
		if self.reference and self.date:
			# Format date as "5 Mar 25" (d MMM yy format)
			date_obj = getdate(self.date)
			# Handle Windows compatibility (Windows doesn't support %-d)
			try:
				formatted_date = date_obj.strftime("%-d %b %y")
			except ValueError:
				# Windows doesn't support %-d, use %d and strip leading zero
				formatted_date = date_obj.strftime("%d %b %y").lstrip("0")
			# Construct posting authority: "Reference Dated Date"
			self.posting_authority = self.reference.strip() + " Dated " + formatted_date
		
		"""Validate that service numbers are not duplicated in Posting Authority Details"""
		if self.posting_authority_details:
			service_numbers = []
			for record in self.posting_authority_details:
				if record.service_number:
					if record.service_number in service_numbers:
						frappe.throw(
							_("Duplicate Service Number '{0}' found in Posting Authority Details. Each service number can only appear once.").format(
								record.service_number
							),
							title=_("Duplicate Entry")
						)
					service_numbers.append(record.service_number)
		
		# Check if any rows being deleted are referenced in Unit TOS Record
		self._prevent_deletion_if_referenced()
	
	def _validate_pdf_document(self):
		"""Validate that posting_document is a PDF file"""
		if not self.posting_document:
			return
		
		# Get file extension
		file_extension = None
		if '.' in self.posting_document:
			file_extension = self.posting_document.split('.')[-1].lower()
		
		# Check if it's a PDF
		if file_extension != 'pdf':
			frappe.throw(
				_("Only PDF documents are allowed for Posting Document. The attached file '{0}' is not a PDF file.").format(
					self.posting_document
				),
				title=_("Invalid File Type")
			)
		
		# Additional validation: Check if file exists and verify MIME type if possible
		try:
			# Try to get file info from database
			file_doc = frappe.get_doc("File", {"file_url": self.posting_document})
			if hasattr(file_doc, 'file_type') and file_doc.file_type:
				if file_doc.file_type.upper() != 'PDF':
					frappe.throw(
						_("Only PDF documents are allowed for Posting Document. The attached file '{0}' has file type '{1}'.").format(
							self.posting_document,
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
	
	def _prevent_deletion_if_referenced(self):
		"""Prevent deletion of Posting Authority Details rows if they are used in Unit TOS Record"""
		if not self.name:
			# New document, no existing rows to check
			return
		
		# Get current rows (those that will remain after save)
		current_row_names = set()
		if self.posting_authority_details:
			for record in self.posting_authority_details:
				if record.name:
					current_row_names.add(record.name)
		
		# Get rows from before save (if available) or from database
		rows_before_save = []
		doc_before_save = self.get_doc_before_save()
		
		if doc_before_save and doc_before_save.posting_authority_details:
			# Use _doc_before_save if available (more reliable)
			for record in doc_before_save.posting_authority_details:
				if record.name:
					rows_before_save.append({
						"name": record.name,
						"service_number": record.service_number,
						"personnel_name": record.personnel_name,
						"from_unit": record.from_unit,
						"to_unit": record.to_unit
					})
		
		# If no rows from _doc_before_save, query database
		if not rows_before_save:
			rows_before_save = frappe.db.get_all(
				"Posting Authority Details",
				filters={
					"parent": self.name,
					"parenttype": "Posting Authority",
					"parentfield": "posting_authority_details"
				},
				fields=["name", "service_number", "personnel_name", "from_unit", "to_unit"]
			)
		
		# Find rows that are being deleted (exist before but not in current list)
		rows_being_deleted = [
			row for row in rows_before_save 
			if row.get("name") and row.get("name") not in current_row_names
		]
		
		# Check if any deleted row is referenced in Unit TOS Record
		for deleted_row in rows_being_deleted:
			if not deleted_row.get("service_number"):
				continue
			
			# Check if this row is referenced in any Unit TOS Record
			# Match by: posting_authority, service_number, personnel_name, from_unit, to_unit
			referenced_in = frappe.db.get_all(
				"Unit TOS Record",
				filters={
					"posting_authority": self.name,
					"service_number": deleted_row.get("service_number"),
					"personnel_name": deleted_row.get("personnel_name"),
					"from_unit": deleted_row.get("from_unit"),
					"to_unit": deleted_row.get("to_unit")
				},
				fields=["parent", "parenttype"],
				limit=1
			)
			
			if referenced_in:
				# Get the Part 2 Order name for better error message
				part_2_order_name = referenced_in[0].parent if referenced_in[0].parenttype == "Part 2 Order" else None
				
				if part_2_order_name:
					frappe.throw(
						_("Cannot delete Posting Authority Details row for Service Number '<b>{0}</b>'.<br><br>"
						  "This record is used in Part 2 Order '<b>{1}</b>' in the Unit TOS Record child table. "
						  "Deleting this record would create an orphaned record in the Part 2 Order.<br><br>"
						  "<b>To delete this record:</b><br>"
						  "1. Open Part 2 Order '{1}'<br>"
						  "2. Remove the corresponding row from the Unit TOS Record child table<br>"
						  "3. Save the Part 2 Order<br>"
						  "4. Then you can delete this Posting Authority Details row").format(
							deleted_row.get("service_number"),
							part_2_order_name
						),
						title=_("Cannot Delete - Used in Unit TOS Record")
					)
				else:
					# Get all Part 2 Orders that reference this record
					all_references = frappe.db.get_all(
						"Unit TOS Record",
						filters={
							"posting_authority": self.name,
							"service_number": deleted_row.get("service_number"),
							"personnel_name": deleted_row.get("personnel_name"),
							"from_unit": deleted_row.get("from_unit"),
							"to_unit": deleted_row.get("to_unit")
						},
						fields=["parent", "parenttype"],
						distinct=True
					)
					
					part_2_orders = [ref.parent for ref in all_references if ref.parenttype == "Part 2 Order"]
					
					if part_2_orders:
						orders_list = ", ".join([f"'{order}'" for order in part_2_orders])
						frappe.throw(
							_("Cannot delete Posting Authority Details row for Service Number '<b>{0}</b>'.<br><br>"
							  "This record is used in the following Part 2 Order(s) in the Unit TOS Record child table: <b>{1}</b>.<br><br>"
							  "Deleting this record would create orphaned records in the Part 2 Order(s).<br><br>"
							  "<b>To delete this record:</b><br>"
							  "1. Open each Part 2 Order listed above<br>"
							  "2. Remove the corresponding row(s) from the Unit TOS Record child table<br>"
							  "3. Save the Part 2 Order(s)<br>"
							  "4. Then you can delete this Posting Authority Details row").format(
								deleted_row.get("service_number"),
								orders_list
							),
							title=_("Cannot Delete - Used in Unit TOS Record")
						)
					else:
						frappe.throw(
							_("Cannot delete Posting Authority Details row for Service Number '<b>{0}</b>'.<br><br>"
							  "This record is used in a Unit TOS Record child table. "
							  "Deleting this record would create an orphaned record.<br><br>"
							  "<b>To delete this record:</b><br>"
							  "1. Remove the corresponding row from the Unit TOS Record in the Part 2 Order<br>"
							  "2. Save the Part 2 Order<br>"
							  "3. Then you can delete this Posting Authority Details row").format(
								deleted_row.get("service_number")
							),
					title=_("Cannot Delete - Used in Unit TOS Record")
				)
	
	def on_submit(self):
		"""Set auditor to current user when document is submitted"""
		if frappe.session.user:
			self.db_set('auditor', frappe.session.user, update_modified=False)

@frappe.whitelist()
def check_posting_authority_details_used_in_unit_tos(posting_authority, service_number, personnel_name, from_unit, to_unit):
	"""Check if a Posting Authority Details row is used in Unit TOS Record"""
	if not posting_authority or not service_number:
		return {"used": False}
	
	# Check if this row is referenced in any Unit TOS Record
	# Match by: posting_authority, service_number, personnel_name, from_unit, to_unit
	referenced_in = frappe.db.get_all(
		"Unit TOS Record",
		filters={
			"posting_authority": posting_authority,
			"service_number": service_number,
			"personnel_name": personnel_name,
			"from_unit": from_unit,
			"to_unit": to_unit
		},
		fields=["parent", "parenttype"],
		limit=1
	)
	print(referenced_in)
	if referenced_in:
		part_2_order_name = referenced_in[0].parent if referenced_in[0].parenttype == "Part 2 Order" else None
		return {
			"used": True,
			"part_2_order": part_2_order_name
		}
	
	return {"used": False}