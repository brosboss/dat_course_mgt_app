# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import getdate


class Promotion(Document):
	def validate(self):
		"""Auto-populate promotion_authority from reference and date, and validate PDF document"""
		# Set operator to current user
		if frappe.session.user:
			self.operator = frappe.session.user
		
		# Auto-populate promotion_authority from reference and date
		if self.reference and self.date:
			# Format date as "5 Mar 25" (d MMM yy format)
			date_obj = getdate(self.date)
			# Handle Windows compatibility (Windows doesn't support %-d)
			try:
				formatted_date = date_obj.strftime("%-d %b %y")
			except ValueError:
				# Windows doesn't support %-d, use %d and strip leading zero
				formatted_date = date_obj.strftime("%d %b %y").lstrip("0")
			# Construct promotion authority: "Reference Dated Date"
			self.promotion_authority = self.reference.strip() + " Dated " + formatted_date
		
		# Validate attach is mandatory if legacy_record is not checked
		if not self.legacy_record and not self.attach:
			frappe.throw(
				_("Attach is mandatory when Legacy Record is not checked. Please attach a document."),
				title=_("Missing Required Field")
			)
		
		# Validate that attach is a PDF file
		if self.attach:
			self._validate_pdf_document('attach')
	
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
		"""Update Personnel records with latest promotion information"""
		# Set auditor to current user and save to database
		if frappe.session.user:
			self.db_set('auditor', frappe.session.user, update_modified=False)
		
		# Get all unique service numbers from this promotion's promotion list
		service_numbers = set()
		for row in self.promotion_list:
			if row.service_number:
				service_numbers.add(row.service_number)
		
		# For each personnel, find their max seniority date from all submitted promotions
		# and update their current rank to the to_rank from that record
		for service_number in service_numbers:
			self.update_personnel_rank(service_number)
	
	def update_personnel_rank(self, service_number):
		"""Update personnel's current rank based on max seniority date from all submitted promotions"""
		# Get the promotion record with max seniority_date for this personnel
		# Only consider submitted promotion records (docstatus = 1)
		# Filter out NULL seniority dates and use parent creation DESC as tiebreaker
		max_promotion = frappe.db.sql("""
			SELECT 
				pl.service_number,
				pl.to_rank,
				pl.seniority_date
			FROM `tabPromotion List` pl
			INNER JOIN `tabPromotion` p ON pl.parent = p.name
			WHERE pl.service_number = %s
				AND p.docstatus = 1
				AND pl.seniority_date IS NOT NULL
				AND pl.to_rank IS NOT NULL
			ORDER BY pl.seniority_date DESC, p.creation DESC
			LIMIT 1
		""", (service_number,), as_dict=True)
		
		if max_promotion and len(max_promotion) > 0:
			promotion_data = max_promotion[0]
			to_rank = promotion_data.get('to_rank')
			seniority_date = promotion_data.get('seniority_date')
			
			if to_rank and seniority_date:
				# Update the Personnel record
				try:
					personnel = frappe.get_doc("Personnel", service_number)
					personnel.current_rank = to_rank
					personnel.date_of_last_promotion = seniority_date
					personnel.save(ignore_permissions=True)
					frappe.db.commit()
					
					frappe.msgprint(
						f"Updated {personnel.personnel_name or service_number}: "
						f"Current Rank = {to_rank}, Date of Last Promotion = {frappe.format_value(seniority_date, {'fieldtype': 'Date'})}",
						indicator="green"
					)
				except frappe.DoesNotExistError:
					frappe.log_error(f"Personnel {service_number} not found", "Promotion Update Error")
				except Exception as e:
					frappe.log_error(f"Error updating Personnel {service_number}: {str(e)}", "Promotion Update Error")
