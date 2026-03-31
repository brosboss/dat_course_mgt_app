# Copyright (c) 2024, Nacstnew and contributors
# License: MIT. See LICENSE

import frappe
from frappe import _
from frappe.utils import get_datetime
from datetime import datetime, timedelta


@frappe.whitelist()
def get_accessible_modules():
	"""Get list of modules the current user has access to based on module profile"""
	if frappe.session.user == "Administrator":
		# Administrator can see all modules
		all_modules = frappe.get_all("Module Def", fields=["name"], order_by="name asc", pluck="name")
		return all_modules
	
	# Check if user has a module profile assigned
	user_doc = frappe.get_doc("User", frappe.session.user)
	has_module_profile = bool(user_doc.get("module_profile"))
	
	# If user has no module profile, return empty list
	if not has_module_profile:
		return []
	
	# Get user's blocked modules from module profile
	blocked_modules = user_doc.get_blocked_modules()
	
	# Get all modules
	all_modules = frappe.get_all("Module Def", fields=["name"], order_by="name asc", pluck="name")
	
	# Calculate allowed modules: all modules minus blocked modules
	allowed_modules = [m for m in all_modules if m not in blocked_modules]
	
	# If no allowed modules, return empty
	if not allowed_modules:
		return []
	
	# User has module profile - only show modules in allowed_modules
	# But also verify user can read at least one doctype in each allowed module
	accessible_modules = []
	
	for module_name in allowed_modules:
		# Get all doctypes in this module
		doctypes_in_module = frappe.get_all(
			"DocType",
			filters={"module": module_name, "istable": 0, "issingle": 0},
			fields=["name"],
			pluck="name"
		)
		
		# Check if user can read any doctype in this module
		has_accessible_doctype = False
		for dt in doctypes_in_module:
			try:
				if frappe.has_permission(dt, "read", user=frappe.session.user):
					has_accessible_doctype = True
					break
			except:
				pass
		
		# Only add module if user can read at least one doctype in it
		if has_accessible_doctype:
			accessible_modules.append(module_name)
	
	return sorted(accessible_modules)


@frappe.whitelist()
def get_accessible_doctypes(module=None):
	"""Get list of doctypes the current user has access to, optionally filtered by module"""
	if frappe.session.user == "Administrator":
		# Administrator can see all doctypes
		filters = {
			"istable": 0,
			"issingle": 0
		}
		if module:
			filters["module"] = module
		
		all_doctypes = frappe.get_all(
			"DocType",
			filters=filters,
			fields=["name"],
			pluck="name"
		)
		return all_doctypes
	
	# Check if user has a module profile assigned
	user_doc = frappe.get_doc("User", frappe.session.user)
	has_module_profile = bool(user_doc.get("module_profile"))
	
	# If user has no module profile, return empty list
	if not has_module_profile:
		return []
	
	# Get user's blocked modules from module profile
	blocked_modules = user_doc.get_blocked_modules()
	
	# Get all modules
	all_modules = frappe.get_all("Module Def", fields=["name"], order_by="name asc", pluck="name")
	
	# Calculate allowed modules: all modules minus blocked modules
	allowed_modules = [m for m in all_modules if m not in blocked_modules]
	
	# If no allowed modules, return empty
	if not allowed_modules:
		return []
	
	# Build base filters
	filters = {
		"istable": 0,
		"issingle": 0
	}
	
	# If module is specified, ensure it's in the user's allowed modules
	if module:
		if module not in allowed_modules:
			# User doesn't have access to this module
			return []
		filters["module"] = module
	else:
		# No module specified, filter by allowed modules only
		filters["module"] = ["in", allowed_modules]
	
	# Get all doctypes matching filters
	all_doctypes = frappe.get_all(
		"DocType",
		filters=filters,
		fields=["name"],
		pluck="name"
	)
	
	# Check permission for each doctype
	accessible_doctypes = []
	for dt in all_doctypes:
		try:
			if frappe.has_permission(dt, "read", user=frappe.session.user):
				accessible_doctypes.append(dt)
		except:
			# If permission check fails, skip this doctype
			pass
	
	return accessible_doctypes


@frappe.whitelist()
def get_realtime_activities(limit=50, since=None, doctype=None, module=None, from_date=None, to_date=None):
	"""Get all recent activities across all doctypes for real-time monitoring"""
	
	# Convert limit to integer (reduced default from 100 to 50 for better performance)
	try:
		limit = int(limit) if limit else 50
	except (ValueError, TypeError):
		limit = 50
	
	# Check user permissions if not administrator
	is_admin = frappe.session.user == "Administrator"
	
	# For non-administrator users, check if they have a module profile
	allowed_modules = []
	if not is_admin:
		user_doc = frappe.get_doc("User", frappe.session.user)
		has_module_profile = bool(user_doc.get("module_profile"))
		
		# If user has no module profile, return empty
		if not has_module_profile:
			return []
		
		# Get user's blocked modules from module profile
		blocked_modules = user_doc.get_blocked_modules()
		
		# Get all modules
		all_modules = frappe.get_all("Module Def", fields=["name"], order_by="name asc", pluck="name")
		
		# Calculate allowed modules: all modules minus blocked modules
		allowed_modules = [m for m in all_modules if m not in blocked_modules]
		
		# If no allowed modules, return empty
		if not allowed_modules:
			return []
	
	# Build date/time filters
	filters = {}
	
	# Date range filtering (takes priority over 'since' if provided)
	if from_date or to_date:
		if from_date and to_date:
			# Use "between" operator when both dates are provided
			try:
				from_dt = get_datetime(from_date)
				to_dt = get_datetime(to_date)
				# Add one day and subtract one second to include the entire end date
				to_dt = to_dt + timedelta(days=1) - timedelta(seconds=1)
				filters["creation"] = ["between", [from_dt, to_dt]]
				frappe.logger().debug(f"RTAL: Date filter BETWEEN {from_dt} and {to_dt}")
			except Exception as e:
				frappe.log_error(f"Error parsing date range: {e}. from_date={from_date}, to_date={to_date}", "RTAL Date Filter Error")
		elif from_date:
			# Only from_date provided
			try:
				from_dt = get_datetime(from_date)
				filters["creation"] = [">=", from_dt]
				frappe.logger().debug(f"RTAL: Date filter >= {from_dt}")
			except Exception as e:
				frappe.log_error(f"Error parsing from_date: {e}. from_date={from_date}", "RTAL Date Filter Error")
		elif to_date:
			# Only to_date provided
			try:
				to_dt = get_datetime(to_date)
				# Add one day and subtract one second to include the entire end date
				to_dt = to_dt + timedelta(days=1) - timedelta(seconds=1)
				filters["creation"] = ["<=", to_dt]
				frappe.logger().debug(f"RTAL: Date filter <= {to_dt}")
			except Exception as e:
				frappe.log_error(f"Error parsing to_date: {e}. to_date={to_date}", "RTAL Date Filter Error")
	elif since:
		# If since is provided and no date range, filter by that datetime
		try:
			since_dt = get_datetime(since)
			filters["creation"] = [">", since_dt]
		except:
			pass
	
	# Filter by doctype if provided (takes priority over module)
	if doctype:
		filters["ref_doctype"] = doctype
	
	# For non-admin users, get allowed modules for validation
	allowed_modules = []
	if not is_admin:
		user = frappe.get_user()
		allowed_modules = user.allow_modules or []
	
	# Filter by module if provided (only if doctype is not specified)
	doctype_list = None
	if module and not doctype:
		# For non-admin, verify module is in allowed modules
		if not is_admin:
			if module not in allowed_modules:
				# User doesn't have access to this module
				return []
		
		doctypes_in_module = frappe.get_all(
			"DocType",
			filters={"module": module, "istable": 0, "issingle": 0},
			fields=["name"],
			pluck="name"
		)
		if doctypes_in_module:
			# Filter by user permissions
			if not is_admin:
				doctype_list = []
				for dt in doctypes_in_module:
					try:
						if frappe.has_permission(dt, "read", user=frappe.session.user):
							doctype_list.append(dt)
					except:
						pass
			else:
				doctype_list = doctypes_in_module
			
			if not doctype_list:
				# No accessible doctypes in this module, return empty
				return []
		else:
			# No doctypes in this module, return empty
			return []
	
	# If doctype is specified, check if user has access
	if doctype and not is_admin:
		# First check if doctype is in an allowed module
		if allowed_modules:
			doctype_module = frappe.db.get_value("DocType", doctype, "module")
			if doctype_module and doctype_module not in allowed_modules:
				# Doctype is not in an allowed module
				return []
		
		# Then check read permission
		try:
			if not frappe.has_permission(doctype, "read", user=frappe.session.user):
				# User doesn't have access to this doctype
				return []
		except:
			# Permission check failed, deny access
			return []
	
	all_activities = []
	
	# 1. Get recent Version records (document changes)
	version_filters = filters.copy()
	# Only use doctype_list if doctype is not directly specified
	if doctype_list and not doctype:
		version_filters["ref_doctype"] = ["in", doctype_list]

	# For non-admin users, hide activities performed by Administrator
	if not is_admin:
		version_filters["owner"] = ["!=", "Administrator"]
	
	# Debug: Log the filters being used
	if from_date or to_date:
		frappe.logger().debug(f"RTAL: version_filters = {version_filters}")
	
	# Get versions - permissions already checked above for doctype/doctype_list
	versions = frappe.get_all(
		"Version",
		filters=version_filters,
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
	
	# Filter versions by permissions if not admin and no specific filter
	if not is_admin and not doctype and not doctype_list:
		# Need to filter by accessible doctypes in allowed modules
		filtered_versions = []
		for version in versions:
			try:
				# Check if doctype is in an allowed module
				doctype_module = frappe.db.get_value("DocType", version.reference_doctype, "module")
				if doctype_module and doctype_module in allowed_modules:
					# Check read permission
					if frappe.has_permission(version.reference_doctype, "read", user=frappe.session.user):
						filtered_versions.append(version)
			except:
				pass
		versions = filtered_versions
	
	# Batch fetch all user names at once (performance optimization)
	user_list = list(set([v.user for v in versions if v.user]))
	user_cache = {}
	if user_list:
		user_data = frappe.db.sql("""
			SELECT name, full_name 
			FROM `tabUser` 
			WHERE name IN %(users)s
		""", {"users": user_list}, as_dict=True)
		
		# Build user cache
		for u in user_data:
			user_cache[u.name] = u.full_name or u.name
	
	# Cache for doctype metadata
	meta_cache = {}
	
	# Format version records
	for version in versions:
		version.activity_type = "Version"
		version.communication_date = version.creation
		version.change_type = "update"  # Default to update
		
		# Get full name from cache (much faster than get_doc)
		version.full_name = user_cache.get(version.user, version.user)
		
		# Parse version data to determine change type and get details
		change_details = []
		if version.data:
			try:
				import json
				data = json.loads(version.data) if isinstance(version.data, str) else version.data
				
				# Check if this is a new document (has updater_reference or created_by in data)
				if data.get("updater_reference") or data.get("created_by"):
					version.change_type = "create"
					version.subject = _("New document created")
					version.content = _("Document was created")
				else:
					version.change_type = "update"
					# Get doctype meta from cache (performance optimization)
					if version.reference_doctype not in meta_cache:
						meta_cache[version.reference_doctype] = frappe.get_meta(version.reference_doctype)
					meta = meta_cache[version.reference_doctype]
					
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
											rc_old = _format_value(rc[1])
											rc_new = _format_value(rc[2])
											change_details.append(_("{0} (row {1}): {2} → {3}").format(
												field_label, row_index + 1, rc_old, rc_new
											))
					
					# Set subject and content
					if change_details:
						version.subject = _("Document changed")
						version.content = "\n".join(change_details)
					else:
						version.subject = _("Document changed")
						version.content = _("Document was modified")
			except Exception as e:
				frappe.log_error(f"Error parsing version data: {str(e)}")
				version.subject = _("Document changed")
				version.content = _("Document was modified")
		else:
			version.subject = _("Document changed")
			version.content = _("Document was modified")
		
		all_activities.append(version)
	
	# 2. Get recent Communications (comments, etc.)
	comm_filters = {"communication_type": ["in", ['Communication', 'Feedback', 'Automated Message', 'Comment']]}
	if doctype:
		comm_filters["reference_doctype"] = doctype
	elif doctype_list:
		comm_filters["reference_doctype"] = ["in", doctype_list]
	
	# Build SQL query with filters (using proper parameterization)
	where_conditions = ["C.communication_type IN ('Communication', 'Feedback', 'Automated Message', 'Comment')"]
	params = {"limit": limit}
	
	# Add date filters for communications
	if from_date or to_date:
		if from_date:
			try:
				from_dt = get_datetime(from_date)
				where_conditions.append("C.communication_date >= %(from_date)s")
				params["from_date"] = from_dt
			except:
				pass
		if to_date:
			try:
				to_dt = get_datetime(to_date)
				# Add one day and subtract one second to include the entire end date
				to_dt = to_dt + timedelta(days=1) - timedelta(seconds=1)
				where_conditions.append("C.communication_date <= %(to_date)s")
				params["to_date"] = to_dt
			except:
				pass
	
	# Apply user permission filtering for communications
	if doctype:
		# Single doctype - permission already checked above
		where_conditions.append("C.reference_doctype = %(doctype)s")
		params["doctype"] = doctype
	elif doctype_list:
		# Filter doctype_list by user permissions (already done above)
		where_conditions.append("C.reference_doctype IN %(doctypes)s")
		params["doctypes"] = doctype_list
	elif not is_admin:
		# No specific filter, need to get all accessible doctypes from allowed modules
		if allowed_modules:
			# Get doctypes from allowed modules only
			all_doctypes = frappe.get_all(
				"DocType",
				filters={"module": ["in", allowed_modules], "istable": 0, "issingle": 0},
				fields=["name"],
				pluck="name"
			)
		else:
			all_doctypes = []
		
		accessible_doctypes = []
		for dt in all_doctypes:
			try:
				if frappe.has_permission(dt, "read", user=frappe.session.user):
					accessible_doctypes.append(dt)
			except:
				pass
		
		if accessible_doctypes:
			where_conditions.append("C.reference_doctype IN %(doctypes)s")
			params["doctypes"] = accessible_doctypes
		else:
			# No accessible doctypes, skip communications
			pass  # Will be handled below

	# For non-admin users, hide communications sent by Administrator
	if not is_admin:
		where_conditions.append("C.sender != 'Administrator'")
	
	# Build where clause and execute communications query
	# Initialize communications list
	communications = []
	
	# Only execute if we have valid conditions (not skipped due to no accessible doctypes)
	if where_conditions and len(where_conditions) > 1:  # More than just the base condition
		where_clause = " AND ".join(where_conditions)
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
				'Communication' as activity_type,
				'comment' as change_type
			FROM `tabCommunication` as C
			WHERE {where_clause}
			ORDER BY C.communication_date DESC
			LIMIT %(limit)s
		""".format(where_clause=where_clause), params, as_dict=True)
	
	for comm in communications:
		comm.communication_date = comm.communication_date or comm.creation
		all_activities.append(comm)
	
	# Sort all activities by date
	all_activities.sort(
		key=lambda x: get_datetime(x.communication_date or x.creation) if (x.communication_date or x.creation) else datetime.min,
		reverse=True
	)
	
	return all_activities[:limit]


def _format_value(value):
	"""Format a value for display"""
	if value is None:
		return _("(empty)")
	if isinstance(value, bool):
		return _("Yes") if value else _("No")
	if isinstance(value, (list, dict)):
		return str(value)
	return str(value)

