# Copyright (c) 2024, Nacstnew and contributors
# License: MIT. See LICENSE

"""
Add view_changes.js to all doctype JS files
This ensures the View Changes button appears on all forms
"""

import frappe
import os
from frappe.modules import get_module_path, scrub


def add_view_changes_to_all_doctypes():
	"""Add view_changes code to all doctype JS files"""
	
	# Read the view_changes.js file
	view_changes_path = os.path.join(
		frappe.get_app_path("nacstnew"),
		"nacstnew",
		"public",
		"js",
		"view_changes.js"
	)
	
	if not os.path.exists(view_changes_path):
		frappe.throw(f"File not found: {view_changes_path}")
	
	with open(view_changes_path, 'r') as f:
		view_changes_code = f.read()
	
	# Get all doctypes in nacstnew module
	doctypes = frappe.get_all(
		"DocType",
		filters={
			"module": "Nacstnew",
			"istable": 0,
			"issingle": 0
		},
		fields=["name"]
	)
	
	updated = 0
	for doctype in doctypes:
		try:
			doctype_name = doctype.name
			module_path = get_module_path("Nacstnew")
			doctype_path = os.path.join(
				module_path,
				"doctype",
				scrub(doctype_name),
				scrub(doctype_name) + ".js"
			)
			
			if os.path.exists(doctype_path):
				# Read existing file
				with open(doctype_path, 'r') as f:
					existing_code = f.read()
				
				# Check if view_changes is already included
				if "add_view_changes_button" not in existing_code:
					# Append view_changes code
					with open(doctype_path, 'a') as f:
						f.write("\n\n// View Changes functionality\n")
						f.write(view_changes_code)
					updated += 1
					print(f"✓ Added to {doctype_name}")
				else:
					print(f"- {doctype_name} already has view_changes code")
			else:
				print(f"✗ {doctype_name} JS file not found")
				
		except Exception as e:
			print(f"✗ Error processing {doctype_name}: {str(e)}")
			frappe.log_error(f"Error adding view_changes to {doctype_name}: {str(e)}")
	
	print(f"\n{'='*50}")
	print(f"Updated {updated} doctype files")
	print(f"{'='*50}")


if __name__ == "__main__":
	add_view_changes_to_all_doctypes()

