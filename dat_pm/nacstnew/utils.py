# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import frappe

def create_personnel_view_page():
	"""Create Personnel Record and Personnel List pages if they don't exist"""
	pages = [
		{
			"page_name": "personnel-record",
			"title": "Personnel Record"
		},
		{
			"page_name": "personnel-list",
			"title": "Personnel List"
		}
	]
	
	for page_info in pages:
		if not frappe.db.exists("Page", page_info["page_name"]):
			page = frappe.get_doc({
				"doctype": "Page",
				"page_name": page_info["page_name"],
				"title": page_info["title"],
				"module": "Nacstnew",
				"standard": "Yes",
				"content": ""
			})
			page.insert(ignore_permissions=True)
	
	frappe.db.commit()

