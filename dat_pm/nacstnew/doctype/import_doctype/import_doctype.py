# Copyright (c) 2026, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ImportDoctype(Document):
	pass


@frappe.whitelist()
def get_doctype_fields(doctype):
	"""Get all fields from a doctype"""
	if not doctype:
		return []
	
	try:
		meta = frappe.get_meta(doctype)
		fields = []
		for field in meta.fields:
			if (field.fieldname and 
				not field.hidden and 
				field.fieldtype not in ["Section Break", "Column Break", "Tab Break", "HTML", "Button"]):
				fields.append(field.fieldname)
		return sorted(fields)
	except Exception:
		return []
