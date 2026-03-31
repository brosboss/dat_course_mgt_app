# Copyright (c) 2026, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class PersonnelAttandDetsForm(Document):
	def on_submit(self):
		"""Update Personnel record with latest attachment/detachment information when submitted"""
		self._recalculate_personnel_from_all_attachments()
	
	def on_cancel(self):
		"""Recalculate Personnel records from remaining submitted records when cancelled"""
		self._recalculate_personnel_from_all_attachments(exclude_docname=self.name)
	
	def on_trash(self):
		"""Recalculate Personnel records from remaining submitted records before deletion"""
		if self.docstatus == 1:
			self._recalculate_personnel_from_all_attachments(exclude_docname=self.name)
	
	def _recalculate_personnel_from_all_attachments(self, exclude_docname=None):
		"""Recalculate Personnel records based on the latest submitted Personnel Att and Dets Form record"""
		# Query all submitted Personnel Att and Dets Form records
		query = """
			SELECT 
				personnel,
				personnel_attachment_reference,
				attsdets_type,
				to_unit,
				type,
				remarks,
				date,
				name
			FROM `tabPersonnel Att and Dets Form`
			WHERE docstatus = 1
				AND personnel IS NOT NULL
		"""
		
		query_params = []
		if exclude_docname:
			query += " AND name != %s"
			query_params.append(exclude_docname)
		
		# Order by date field only (not creation/entry date)
		query += " ORDER BY date DESC"
		
		all_records = frappe.db.sql(query, query_params, as_dict=True)
		
		# Group by personnel and find the latest record for each personnel based on date field only
		personnel_updates = {}
		
		for record in all_records:
			personnel_name = record.personnel
			
			if not personnel_name:
				continue
			
			# If this personnel hasn't been seen, or this record has a more recent date, update
			if personnel_name not in personnel_updates:
				personnel_updates[personnel_name] = record
			else:
				# Compare dates - use the most recent date field value
				current_date = frappe.utils.getdate(record.date) if record.date else None
				stored_date = frappe.utils.getdate(personnel_updates[personnel_name].date) if personnel_updates[personnel_name].date else None
				
				if current_date and stored_date:
					if current_date > stored_date:
						personnel_updates[personnel_name] = record
				elif current_date and not stored_date:
					personnel_updates[personnel_name] = record
		
		# Get all personnel that have ever been in any submitted Personnel Att and Dets Form
		# to clear those that no longer have any valid records or have RTU
		personnel_query = """
			SELECT DISTINCT personnel
			FROM `tabPersonnel Att and Dets Form`
			WHERE docstatus = 1
				AND personnel IS NOT NULL
		"""
		
		personnel_params = []
		if exclude_docname:
			personnel_query += " AND name != %s"
			personnel_params.append(exclude_docname)
		
		all_personnel_in_attachments = frappe.db.sql(personnel_query, personnel_params, as_dict=True)
		all_personnel_set = {row.personnel for row in all_personnel_in_attachments if row.personnel}
		
		# Get personnel from the excluded document (if cancelling/deleting) to ensure we clear them if needed
		excluded_doc_personnel = set()
		if exclude_docname:
			excluded_records = frappe.db.sql("""
				SELECT DISTINCT personnel
				FROM `tabPersonnel Att and Dets Form`
				WHERE name = %s
					AND personnel IS NOT NULL
			""", (exclude_docname,), as_dict=True)
			excluded_doc_personnel = {row.personnel for row in excluded_records if row.personnel}
		
		# Update each personnel record based on the latest (maximum by date) record
		# If the latest record is RTU (Return To Unit), clear all attachment fields
		# Otherwise, update with the latest attachment/detachment data
		updated_count = 0
		cleared_count = 0
		
		for personnel_name, record_data in personnel_updates.items():
			try:
				# Verify personnel exists
				if not frappe.db.exists("Personnel", personnel_name):
					frappe.log_error(
						f"Personnel {personnel_name} does not exist when updating from Personnel Att and Dets Form",
						"Personnel Att and Dets Form Update Error"
					)
					continue
				
				# Check if fields exist in Personnel doctype
				personnel_meta = frappe.get_meta("Personnel")
				if not personnel_meta.has_field("current_personnel_attachment"):
					frappe.log_error(
						"Field 'current_personnel_attachment' does not exist in Personnel doctype",
						"Personnel Att and Dets Form Update Error"
					)
					continue
				
				# Update with latest attachment/detachment/RTU data
				# All record types (Attachment, Detachment, RTU) will be displayed
				update_dict = {
					"current_personnel_attachment": record_data.name
				}
				
				# Update personnel_attachment_unit if field exists
				if personnel_meta.has_field("personnel_attachment_unit"):
					update_dict["personnel_attachment_unit"] = record_data.to_unit
				
				# Update personnel_attachment_type if field exists
				if personnel_meta.has_field("personnel_attachment_type"):
					update_dict["personnel_attachment_type"] = record_data.type
				
				# Update personnel_attachment_remarks if field exists
				if personnel_meta.has_field("personnel_attachment_remarks"):
					update_dict["personnel_attachment_remarks"] = record_data.remarks
				
				frappe.db.set_value(
					"Personnel",
					personnel_name,
					update_dict,
					update_modified=False
				)
				updated_count += 1
				
			except Exception as e:
				frappe.log_error(
					f"Error updating Personnel {personnel_name} from Personnel Att and Dets Form: {str(e)}\n{frappe.get_traceback()}",
					"Personnel Att and Dets Form Update Error"
				)
				continue
		
		# Clear fields for personnel that are in submitted records but don't have valid data
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
				
				if personnel_meta.has_field("current_personnel_attachment"):
					clear_dict["current_personnel_attachment"] = None
				if personnel_meta.has_field("personnel_attachment_unit"):
					clear_dict["personnel_attachment_unit"] = ""
				if personnel_meta.has_field("personnel_attachment_type"):
					clear_dict["personnel_attachment_type"] = ""
				if personnel_meta.has_field("personnel_attachment_remarks"):
					clear_dict["personnel_attachment_remarks"] = ""
				
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
					f"Error clearing Personnel {personnel_name} from Personnel Att and Dets Form: {str(e)}\n{frappe.get_traceback()}",
					"Personnel Att and Dets Form Update Error"
				)
				continue
		
		# Commit changes
		if updated_count > 0 or cleared_count > 0:
			frappe.db.commit()
