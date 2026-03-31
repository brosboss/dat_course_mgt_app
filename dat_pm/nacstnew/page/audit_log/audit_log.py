# Copyright (c) 2024, Nacstnew and contributors
# License: MIT. See LICENSE

import frappe
from frappe import _
from frappe.utils import get_datetime
from datetime import datetime


def _format_value(value):
	"""Format a value for display"""
	if value is None:
		return _("(empty)")
	if isinstance(value, bool):
		return _("Yes") if value else _("No")
	if isinstance(value, (list, dict)):
		return str(value)
	return str(value)


@frappe.whitelist()
def get_document_changes(doctype, docname):
	"""Get all changes for a specific document"""
	if not doctype or not docname:
		return []
	
	# Get Version records for this specific document
	versions = frappe.get_all(
		"Version",
		filters={
			"ref_doctype": doctype,
			"docname": docname
		},
		fields=[
			"name",
			"ref_doctype as reference_doctype",
			"docname as reference_name",
			"creation",
			"owner as user",
			"data"
		],
		order_by="creation desc",
		limit=100
	)
	
	# Format version records
	formatted_versions = []
	for version in versions:
		version.activity_type = "Version"
		version.communication_date = version.creation
		
		# Get full name for user
		try:
			user_doc = frappe.get_doc("User", version.user)
			version.full_name = user_doc.full_name or version.user
		except:
			version.full_name = version.user
		
		# Parse version data to get detailed changes
		change_details = []
		if version.data:
			try:
				import json
				data = json.loads(version.data) if isinstance(version.data, str) else version.data
				
				# Get doctype meta to get field labels
				meta = frappe.get_meta(version.reference_doctype)
				
				# Handle field changes
				if data.get("changed"):
					for change in data["changed"]:
						if len(change) >= 3:
							fieldname = change[0]
							old_value = change[1]
							new_value = change[2]
							
							# Get field label
							field_label = meta.get_field(fieldname)
							field_label = field_label.label if field_label else fieldname
							
							# Format values
							old_val_str = _format_value(old_value)
							new_val_str = _format_value(new_value)
							
							change_details.append(_("{0}: {1} → {2}").format(
								field_label, old_val_str, new_val_str
							))
				
				# Handle added rows
				if data.get("added"):
					for added in data["added"]:
						if len(added) >= 2:
							fieldname = added[0]
							field_label = meta.get_field(fieldname)
							field_label = field_label.label if field_label else fieldname
							change_details.append(_("Added row in {0}").format(field_label))
				
				# Handle removed rows
				if data.get("removed"):
					for removed in data["removed"]:
						if len(removed) >= 2:
							fieldname = removed[0]
							field_label = meta.get_field(fieldname)
							field_label = field_label.label if field_label else fieldname
							change_details.append(_("Removed row from {0}").format(field_label))
				
				# Handle row changes
				if data.get("row_changed"):
					for row_change in data["row_changed"]:
						if len(row_change) >= 4:
							fieldname = row_change[0]
							row_index = row_change[1]
							row_changes = row_change[3] if len(row_change) > 3 else []
							
							field_label = meta.get_field(fieldname)
							field_label = field_label.label if field_label else fieldname
							
							if row_changes:
								for rc in row_changes:
									if len(rc) >= 3:
										rc_fieldname = rc[0]
										rc_old = _format_value(rc[1])
										rc_new = _format_value(rc[2])
										change_details.append(_("{0} (row {1}): {2} → {3}").format(
											field_label, row_index + 1, rc_old, rc_new
										))
				
				# Handle comments
				if data.get("comment"):
					change_details.append(_("Comment: {0}").format(data["comment"]))
				
			except Exception as e:
				# If parsing fails, just show generic message
				frappe.log_error(f"Error parsing version data: {str(e)}")
				change_details = [_("Document was modified")]
				data = None
		
		# Set subject and content
		if change_details:
			version.subject = _("Document changed")
			version.content = "\n".join(change_details)
		else:
			# Check if this is a new document (no old version) or if data indicates creation
			if not data and version.data:
				try:
					import json
					data = json.loads(version.data) if isinstance(version.data, str) else version.data
				except:
					data = None
			
			if data and (data.get("for_insert") or (not data.get("changed") and not data.get("added") and not data.get("removed"))):
				version.subject = _("Document created")
				version.content = _("New document was created")
			else:
				version.subject = _("Document changed")
				version.content = _("Document was modified")
		
		formatted_versions.append(version)
	
	return formatted_versions


def test():
	activities = get_activities_by_doctype("Promotion")
	# activities = frappe.get_all("Activity Log", filters={"reference_doctype": "Promotion"})
	print(activities)
	for activity in activities:
		print(activity.subject)
		print(activity.content)
		print(activity.reference_doctype)
		print(activity.reference_name)
		print(activity.timeline_doctype)
		print(activity.timeline_name)


@frappe.whitelist()
def get_activities_by_doctype(doctype, limit=50):
	"""Get activity log entries, communications, and versions filtered by doctype"""
	if not doctype:
		return []
	
	# Convert limit to integer (it might come as string from API)
	try:
		limit = int(limit) if limit else 50
	except (ValueError, TypeError):
		limit = 50
	
	all_activities = []
	
	# 1. Get Activity Log entries
	activities = frappe.get_all(
		"Activity Log",
		filters={
			"reference_doctype": doctype
		},
		fields=[
			"name",
			"subject",
			"content",
			"reference_doctype",
			"reference_name",
			"timeline_doctype",
			"timeline_name",
			"user",
			"full_name",
			"communication_date",
			"status",
			"operation"
		],
		order_by="communication_date desc",
		limit=limit
	)
	
	# Also get activities where timeline_doctype matches
	timeline_activities = frappe.get_all(
		"Activity Log",
		filters={
			"timeline_doctype": doctype,
			"reference_doctype": ["!=", doctype]
		},
		fields=[
			"name",
			"subject",
			"content",
			"reference_doctype",
			"reference_name",
			"timeline_doctype",
			"timeline_name",
			"user",
			"full_name",
			"communication_date",
			"status",
			"operation"
		],
		order_by="communication_date desc",
		limit=limit
	)
	
	
	# 2. Get Communications (comments, emails, etc.) - this is what shows in sidebar
	communications = frappe.db.sql("""
		SELECT 
			C.name,
			C.subject,
			C.content,
			C.reference_doctype,
			C.reference_name,
			C.communication_date,
			C.sender_full_name as full_name,
			C.sender as user,
			C.communication_type,
			C.comment_type,
			'Communication' as activity_type
		FROM `tabCommunication` as C
		WHERE C.reference_doctype = %(doctype)s
		AND C.communication_type IN ('Communication', 'Feedback', 'Automated Message', 'Comment')
		ORDER BY C.communication_date DESC
		LIMIT %(limit)s
	""", {"doctype": doctype, "limit": limit}, as_dict=True)
	
	# Also get communications linked via Communication Link
	linked_communications = frappe.db.sql("""
		SELECT 
			C.name,
			C.subject,
			C.content,
			CL.link_doctype as reference_doctype,
			CL.link_name as reference_name,
			C.communication_date,
			C.sender_full_name as full_name,
			C.sender as user,
			C.communication_type,
			C.comment_type,
			'Communication' as activity_type
		FROM `tabCommunication` as C
		INNER JOIN `tabCommunication Link` as CL ON C.name = CL.parent
		WHERE CL.link_doctype = %(doctype)s
		AND C.communication_type IN ('Communication', 'Feedback', 'Automated Message', 'Comment')
		ORDER BY C.communication_date DESC
		LIMIT %(limit)s
	""", {"doctype": doctype, "limit": limit}, as_dict=True)
	
	# 3. Get Version records (document changes) with data field
	versions = frappe.get_all(
		"Version",
		filters={
			"ref_doctype": doctype
		},
		fields=[
			"name",
			"ref_doctype as reference_doctype",
			"docname as reference_name",
			"creation",
			"owner as user",
			"data"
		],
		order_by="creation desc",
		limit=limit
	)
	
	# Format version records to match activity structure and parse changes
	for version in versions:
		version.activity_type = "Version"
		version.communication_date = version.creation
		# Get full name for user
		try:
			user_doc = frappe.get_doc("User", version.user)
			version.full_name = user_doc.full_name or version.user
		except:
			version.full_name = version.user
		
		# Parse version data to get detailed changes
		change_details = []
		if version.data:
			try:
				import json
				data = json.loads(version.data) if isinstance(version.data, str) else version.data
				
				# Get doctype meta to get field labels
				meta = frappe.get_meta(version.reference_doctype)
				
				# Handle field changes
				if data.get("changed"):
					for change in data["changed"]:
						if len(change) >= 3:
							fieldname = change[0]
							old_value = change[1]
							new_value = change[2]
							
							# Get field label
							field_label = meta.get_field(fieldname)
							field_label = field_label.label if field_label else fieldname
							
							# Format values
							old_val_str = _format_value(old_value)
							new_val_str = _format_value(new_value)
							
							change_details.append(_("{0}: {1} → {2}").format(
								field_label, old_val_str, new_val_str
							))
				
				# Handle added rows
				if data.get("added"):
					for added in data["added"]:
						if len(added) >= 2:
							fieldname = added[0]
							field_label = meta.get_field(fieldname)
							field_label = field_label.label if field_label else fieldname
							change_details.append(_("Added row in {0}").format(field_label))
				
				# Handle removed rows
				if data.get("removed"):
					for removed in data["removed"]:
						if len(removed) >= 2:
							fieldname = removed[0]
							field_label = meta.get_field(fieldname)
							field_label = field_label.label if field_label else fieldname
							change_details.append(_("Removed row from {0}").format(field_label))
				
				# Handle row changes
				if data.get("row_changed"):
					for row_change in data["row_changed"]:
						if len(row_change) >= 4:
							fieldname = row_change[0]
							row_index = row_change[1]
							row_changes = row_change[3] if len(row_change) > 3 else []
							
							field_label = meta.get_field(fieldname)
							field_label = field_label.label if field_label else fieldname
							
							if row_changes:
								for rc in row_changes:
									if len(rc) >= 3:
										rc_fieldname = rc[0]
										rc_old = _format_value(rc[1])
										rc_new = _format_value(rc[2])
										change_details.append(_("{0} (row {1}): {2} → {3}").format(
											field_label, row_index + 1, rc_old, rc_new
										))
				
				# Handle comments
				if data.get("comment"):
					change_details.append(_("Comment: {0}").format(data["comment"]))
				
			except Exception as e:
				# If parsing fails, just show generic message
				frappe.log_error(f"Error parsing version data: {str(e)}")
				change_details = [_("Document was modified")]
		
		# Set subject and content
		if change_details:
			version.subject = _("Document changed")
			version.content = "\n".join(change_details)
		else:
			# Check if this is a new document (no old version) or if data indicates creation
			if data and (data.get("for_insert") or (not data.get("changed") and not data.get("added") and not data.get("removed"))):
				version.subject = _("Document created")
				version.content = _("New document was created")
			else:
				version.subject = _("Document changed")
				version.content = _("Document was modified")
	
	# Combine all activities
	all_activities = list(activities) + list(timeline_activities) + list(communications) + list(linked_communications) + list(versions)
	
	# Sort by communication_date/creation descending (handle None values)
	# Normalize date field - use communication_date if available, otherwise creation
	for activity in all_activities:
		if not hasattr(activity, 'communication_date') or not activity.communication_date:
			if hasattr(activity, 'creation') and activity.creation:
				activity.communication_date = activity.creation
	
	all_activities.sort(
		key=lambda x: get_datetime(x.communication_date) if x.communication_date else datetime.min,
		reverse=True
	)
	
	# Remove duplicates based on name
	seen = set()
	unique_activities = []
	for activity in all_activities:
		if activity.name not in seen:
			seen.add(activity.name)
			unique_activities.append(activity)
	
	# Ensure limit is an integer before slicing
	return unique_activities[:int(limit)]

