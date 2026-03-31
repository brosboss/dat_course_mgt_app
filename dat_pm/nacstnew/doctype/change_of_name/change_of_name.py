# Copyright (c) 2026, !! and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.model.document import Document
from frappe import _


class ChangeofName(Document):
	def on_submit(self):
		"""Update Personnel record with new name fields when Change of Name is submitted"""
		if not self.service_number:
			frappe.throw(_("Service Number is required to update Personnel record"))
		
		# Verify personnel exists
		if not frappe.db.exists("Personnel", self.service_number):
			frappe.throw(_(f"Personnel record {self.service_number} does not exist"))
		
		# Prepare update dictionary with new name fields
		update_dict = {}
		
		# Update first_name if new_name is provided
		if self.new_name:
			update_dict["first_name"] = self.new_name.upper()
		
		# Update middle_name if new_middle_name is provided
		if self.new_middle_name:
			update_dict["middle_name"] = self.new_middle_name.upper()
		
		# Update other_names if new_other_name is provided
		if self.new_other_name:
			update_dict["other_names"] = self.new_other_name.upper()
		
		# Update personnel_name if new_personnel_name is provided
		if self.new_personnel_name:
			update_dict["personnel_name"] = self.new_personnel_name.upper()
		
		# Update surname if new_surname is provided
		if self.new_surname:
			update_dict["surname"] = self.new_surname.upper()
		
		# Only update if there are fields to update
		if update_dict:
			try:
				# Update the Personnel record
				frappe.db.set_value(
					"Personnel",
					self.service_number,
					update_dict,
					update_modified=True
				)
				
				frappe.msgprint(
					_("Personnel record {0} has been updated with the new name information").format(
						frappe.bold(self.service_number)
					),
					indicator="green",
					alert=True
				)
			except Exception as e:
				frappe.log_error(
					f"Error updating Personnel {self.service_number} from Change of Name: {str(e)}\n{frappe.get_traceback()}",
					"Change of Name Update Error"
				)
				frappe.throw(
					_(f"Error updating Personnel record: {str(e)}"),
					title=_("Update Error")
				)


@frappe.whitelist(allow_guest=False, methods=["POST"])
def create_and_submit_change_of_name(data=None):
	"""
	API endpoint to create and submit a Change of Name document.
	This will automatically update the Personnel record with the new name information.
	
	Args:
		data: JSON string or dict containing:
			- service_number (required): Service number of the Personnel record
			- new_name (optional): New first name
			- new_middle_name (optional): New middle name
			- new_other_name (optional): New other name
			- new_personnel_name (optional): New personnel name
			- new_surname (optional): New surname
			- authority (optional): Authority document attachment path
	
	Returns:
		dict: Response with status, message, and document details
	"""
	try:
		# Handle data parameter - can be dict, JSON string, or None
		if isinstance(data, str):
			try:
				data = json.loads(data)
			except json.JSONDecodeError:
				# If it's not JSON, treat as empty and use form_dict
				data = None
		
		# If data is None, get from form_dict (for direct POST requests)
		if data is None or not isinstance(data, dict):
			# Get from form_dict, excluding Frappe framework keys
			form_data = {}
			for key, value in frappe.form_dict.items():
				if key not in ['cmd', '_']:
					form_data[key] = value
			
			# If form_dict has a 'data' key with JSON string, parse it
			if 'data' in frappe.form_dict:
				if isinstance(frappe.form_dict.get('data'), str):
					try:
						data = json.loads(frappe.form_dict.get('data'))
					except json.JSONDecodeError:
						data = form_data
				elif isinstance(frappe.form_dict.get('data'), dict):
					data = frappe.form_dict.get('data')
				else:
					data = form_data
			else:
				data = form_data
		
		# Validate required fields
		if not data.get("service_number"):
			return {
				"success": False,
				"error": "service_number is required"
			}
		
		# Verify personnel exists
		if not frappe.db.exists("Personnel", data.get("service_number")):
			return {
				"success": False,
				"error": f"Personnel record {data.get('service_number')} does not exist"
			}
		
		# Check if at least one new name field is provided
		new_name_fields = [
			"new_name", "new_middle_name", "new_other_name", 
			"new_personnel_name", "new_surname"
		]
		has_new_name = any(data.get(field) for field in new_name_fields)
		
		if not has_new_name:
			return {
				"success": False,
				"error": "At least one new name field must be provided"
			}
		
		# Create Change of Name document
		change_of_name_doc = frappe.new_doc("Change of Name")
		change_of_name_doc.service_number = data.get("service_number")
		
		# Set new name fields (convert to uppercase)
		if data.get("new_name"):
			change_of_name_doc.new_name = str(data.get("new_name")).upper()
		if data.get("new_middle_name"):
			change_of_name_doc.new_middle_name = str(data.get("new_middle_name")).upper()
		if data.get("new_other_name"):
			change_of_name_doc.new_other_name = str(data.get("new_other_name")).upper()
		if data.get("new_personnel_name"):
			change_of_name_doc.new_personnel_name = str(data.get("new_personnel_name")).upper()
		if data.get("new_surname"):
			change_of_name_doc.new_surname = str(data.get("new_surname")).upper()
		if data.get("authority"):
			change_of_name_doc.authority = data.get("authority")
		
		# Insert the document
		change_of_name_doc.insert(ignore_permissions=True)
		
		# Submit the document (this will trigger on_submit and update Personnel)
		change_of_name_doc.submit()
		
		# Commit the transaction
		frappe.db.commit()
		
		return {
			"success": True,
			"message": f"Change of Name document created and submitted successfully. Personnel record {data.get('service_number')} has been updated.",
			"document": {
				"name": change_of_name_doc.name,
				"service_number": change_of_name_doc.service_number,
				"docstatus": change_of_name_doc.docstatus
			}
		}
		
	except json.JSONDecodeError as e:
		return {
			"success": False,
			"error": f"Invalid JSON format: {str(e)}"
		}
	except frappe.ValidationError as e:
		frappe.db.rollback()
		return {
			"success": False,
			"error": f"Validation error: {str(e)}"
		}
	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(
			f"Error in create_and_submit_change_of_name API: {str(e)}\n{frappe.get_traceback()}",
			"Change of Name API Error"
		)
		return {
			"success": False,
			"error": f"An error occurred: {str(e)}"
		}
