# Copyright (c) 2024, Nacstnew and contributors
# License: MIT. See LICENSE

"""
Script to enable track_changes for all doctypes in nacstnew module
Run this via: bench --site [site] execute nacstnew.nacstnew.nacstnew.utils.enable_track_changes.enable_track_changes
"""

import frappe
import json
import os


def enable_track_changes():
	"""Enable track_changes for all doctypes in nacstnew module"""
	
	# Get all doctypes in nacstnew module
	doctypes = frappe.get_all(
		"DocType",
		filters={
			"module": "Nacstnew",
			"istable": 0,  # Skip child tables
			"issingle": 0   # Skip single doctypes
		},
		fields=["name", "track_changes"]
	)
	
	updated_count = 0
	already_enabled = 0
	
	for doctype in doctypes:
		if doctype.track_changes:
			already_enabled += 1
			print(f"✓ {doctype.name} - track_changes already enabled")
			continue
		
		try:
			# Update the doctype
			doc = frappe.get_doc("DocType", doctype.name)
			doc.track_changes = 1
			doc.save(ignore_permissions=True)
			frappe.db.commit()
			
			updated_count += 1
			print(f"✓ {doctype.name} - track_changes enabled")
			
		except Exception as e:
			print(f"✗ {doctype.name} - Error: {str(e)}")
			frappe.log_error(f"Error enabling track_changes for {doctype.name}: {str(e)}")
	
	print(f"\n{'='*50}")
	print(f"Summary:")
	print(f"  - Updated: {updated_count} doctypes")
	print(f"  - Already enabled: {already_enabled} doctypes")
	print(f"  - Total: {len(doctypes)} doctypes")
	print(f"{'='*50}")


if __name__ == "__main__":
	enable_track_changes()

