# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

"""
Script to create granular roles for multiple doctypes:
- Personnel
- Course Attended
- Posting Authority
- Part 2 Order
- Promotion
- Mission
- Reference Data (State, Unit, Rank, Commander Appointment, Type of Commission, Course, Appointment, Course Name)

Each doctype gets 4 roles: Creator, Reader, Editor, Deleter
Submittable doctypes also get a Submitter role
Reference Data doctypes share 4 general roles: Reference Data Creator, Reader, Editor, Deleter

To run this script, use one of these methods:

Method 1: Using bench console (Recommended)
    bench --site [site-name] console
    Then in the console:
    >>> from nacstnew.nacstnew.nacstnew.utils.create_personnel_roles import create_all_roles
    >>> create_all_roles()

Method 2: Using bench execute with full path
    bench --site [site-name] execute nacstnew.nacstnew.nacstnew.utils.create_personnel_roles.create_all_roles

Method 3: From Frappe UI Console
    Open browser console and run:
    frappe.call({
        method: 'nacstnew.nacstnew.nacstnew.utils.create_personnel_roles.create_all_roles',
        callback: function(r) { console.log(r.message); }
    });
"""

import frappe

def tt():
    print("Hello World")

@frappe.whitelist()
def create_personnel_roles():
	"""Create granular roles for Personnel doctype"""
	
	roles_to_create = [
		{
			"role_name": "Personnel Creator",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Personnel Reader",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Personnel Editor",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Personnel Deleter",
			"desk_access": 1,
			"is_custom": 1
		}
	]
	
	created_roles = []
	existing_roles = []
	
	for role_data in roles_to_create:
		role_name = role_data["role_name"]
		
		# Check if role already exists
		if frappe.db.exists("Role", role_name):
			existing_roles.append(role_name)
			frappe.logger().info(f"Role '{role_name}' already exists. Skipping creation.")
			continue
		
		try:
			# Create the role
			role = frappe.new_doc("Role")
			role.role_name = role_name
			role.desk_access = role_data.get("desk_access", 1)
			role.is_custom = role_data.get("is_custom", 1)
			role.flags.ignore_permissions = True
			role.flags.ignore_mandatory = True
			role.insert()
			
			created_roles.append(role_name)
			frappe.logger().info(f"Created role: {role_name}")
			
		except Exception as e:
			frappe.logger().error(f"Error creating role '{role_name}': {str(e)}")
			frappe.throw(f"Failed to create role '{role_name}': {str(e)}")
	
	# Commit the changes
	frappe.db.commit()
	
	# Print summary
	if created_roles:
		print(f"\n✓ Successfully created {len(created_roles)} role(s):")
		for role in created_roles:
			print(f"  - {role}")
	
	if existing_roles:
		print(f"\n⚠ {len(existing_roles)} role(s) already exist:")
		for role in existing_roles:
			print(f"  - {role}")
	
	if not created_roles and not existing_roles:
		print("\nNo roles were created.")
	
	print("\n✓ Personnel roles setup complete!")
	print("\nRoles created:")
	print("  - Personnel Creator: Can create and read Personnel records")
	print("  - Personnel Reader: Can only read Personnel records")
	print("  - Personnel Editor: Can read and edit Personnel records")
	print("  - Personnel Deleter: Can read and delete Personnel records")
	
	return {
		"created": created_roles,
		"existing": existing_roles
	}


@frappe.whitelist()
def create_course_attended_roles():
	"""Create granular roles for Course Attended doctype"""
	
	roles_to_create = [
		{
			"role_name": "Course Attended Creator",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Course Attended Reader",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Course Attended Editor",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Course Attended Deleter",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Course Attended Submitter",
			"desk_access": 1,
			"is_custom": 1
		}
	]
	
	created_roles = []
	existing_roles = []
	
	for role_data in roles_to_create:
		role_name = role_data["role_name"]
		
		# Check if role already exists
		if frappe.db.exists("Role", role_name):
			existing_roles.append(role_name)
			frappe.logger().info(f"Role '{role_name}' already exists. Skipping creation.")
			continue
		
		try:
			# Create the role
			role = frappe.new_doc("Role")
			role.role_name = role_name
			role.desk_access = role_data.get("desk_access", 1)
			role.is_custom = role_data.get("is_custom", 1)
			role.flags.ignore_permissions = True
			role.flags.ignore_mandatory = True
			role.insert()
			
			created_roles.append(role_name)
			frappe.logger().info(f"Created role: {role_name}")
			
		except Exception as e:
			frappe.logger().error(f"Error creating role '{role_name}': {str(e)}")
			frappe.throw(f"Failed to create role '{role_name}': {str(e)}")
	
	# Commit the changes
	frappe.db.commit()
	
	# Print summary
	if created_roles:
		print(f"\n✓ Successfully created {len(created_roles)} role(s):")
		for role in created_roles:
			print(f"  - {role}")
	
	if existing_roles:
		print(f"\n⚠ {len(existing_roles)} role(s) already exist:")
		for role in existing_roles:
			print(f"  - {role}")
	
	if not created_roles and not existing_roles:
		print("\nNo roles were created.")
	
	print("\n✓ Course Attended roles setup complete!")
	print("\nRoles created:")
	print("  - Course Attended Creator: Can create and read Course Attended records")
	print("  - Course Attended Reader: Can only read Course Attended records")
	print("  - Course Attended Editor: Can read and edit Course Attended records")
	print("  - Course Attended Deleter: Can read and delete Course Attended records")
	print("  - Course Attended Submitter: Can read and submit Course Attended records")
	
	return {
		"created": created_roles,
		"existing": existing_roles
	}


@frappe.whitelist()
def create_posting_authority_roles():
	"""Create granular roles for Posting Authority doctype"""
	
	roles_to_create = [
		{
			"role_name": "Posting Authority Creator",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Posting Authority Reader",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Posting Authority Editor",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Posting Authority Deleter",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Posting Authority Submitter",
			"desk_access": 1,
			"is_custom": 1
		}
	]
	
	created_roles = []
	existing_roles = []
	
	for role_data in roles_to_create:
		role_name = role_data["role_name"]
		
		# Check if role already exists
		if frappe.db.exists("Role", role_name):
			existing_roles.append(role_name)
			frappe.logger().info(f"Role '{role_name}' already exists. Skipping creation.")
			continue
		
		try:
			# Create the role
			role = frappe.new_doc("Role")
			role.role_name = role_name
			role.desk_access = role_data.get("desk_access", 1)
			role.is_custom = role_data.get("is_custom", 1)
			role.flags.ignore_permissions = True
			role.flags.ignore_mandatory = True
			role.insert()
			
			created_roles.append(role_name)
			frappe.logger().info(f"Created role: {role_name}")
			
		except Exception as e:
			frappe.logger().error(f"Error creating role '{role_name}': {str(e)}")
			frappe.throw(f"Failed to create role '{role_name}': {str(e)}")
	
	# Commit the changes
	frappe.db.commit()
	
	# Print summary
	if created_roles:
		print(f"\n✓ Successfully created {len(created_roles)} role(s):")
		for role in created_roles:
			print(f"  - {role}")
	
	if existing_roles:
		print(f"\n⚠ {len(existing_roles)} role(s) already exist:")
		for role in existing_roles:
			print(f"  - {role}")
	
	if not created_roles and not existing_roles:
		print("\nNo roles were created.")
	
	print("\n✓ Posting Authority roles setup complete!")
	print("\nRoles created:")
	print("  - Posting Authority Creator: Can create and read Posting Authority records")
	print("  - Posting Authority Reader: Can only read Posting Authority records")
	print("  - Posting Authority Editor: Can read and edit Posting Authority records")
	print("  - Posting Authority Deleter: Can read and delete Posting Authority records")
	print("  - Posting Authority Submitter: Can read and submit Posting Authority records")
	
	return {
		"created": created_roles,
		"existing": existing_roles
	}


@frappe.whitelist()
def create_part_2_order_roles():
	"""Create granular roles for Part 2 Order doctype"""
	
	roles_to_create = [
		{
			"role_name": "Part 2 Order Creator",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Part 2 Order Reader",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Part 2 Order Editor",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Part 2 Order Deleter",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Part 2 Order Submitter",
			"desk_access": 1,
			"is_custom": 1
		}
	]
	
	created_roles = []
	existing_roles = []
	
	for role_data in roles_to_create:
		role_name = role_data["role_name"]
		
		# Check if role already exists
		if frappe.db.exists("Role", role_name):
			existing_roles.append(role_name)
			frappe.logger().info(f"Role '{role_name}' already exists. Skipping creation.")
			continue
		
		try:
			# Create the role
			role = frappe.new_doc("Role")
			role.role_name = role_name
			role.desk_access = role_data.get("desk_access", 1)
			role.is_custom = role_data.get("is_custom", 1)
			role.flags.ignore_permissions = True
			role.flags.ignore_mandatory = True
			role.insert()
			
			created_roles.append(role_name)
			frappe.logger().info(f"Created role: {role_name}")
			
		except Exception as e:
			frappe.logger().error(f"Error creating role '{role_name}': {str(e)}")
			frappe.throw(f"Failed to create role '{role_name}': {str(e)}")
	
	# Commit the changes
	frappe.db.commit()
	
	# Print summary
	if created_roles:
		print(f"\n✓ Successfully created {len(created_roles)} role(s):")
		for role in created_roles:
			print(f"  - {role}")
	
	if existing_roles:
		print(f"\n⚠ {len(existing_roles)} role(s) already exist:")
		for role in existing_roles:
			print(f"  - {role}")
	
	if not created_roles and not existing_roles:
		print("\nNo roles were created.")
	
	print("\n✓ Part 2 Order roles setup complete!")
	print("\nRoles created:")
	print("  - Part 2 Order Creator: Can create and read Part 2 Order records")
	print("  - Part 2 Order Reader: Can only read Part 2 Order records")
	print("  - Part 2 Order Editor: Can read and edit Part 2 Order records")
	print("  - Part 2 Order Deleter: Can read and delete Part 2 Order records")
	print("  - Part 2 Order Submitter: Can read and submit Part 2 Order records")
	
	return {
		"created": created_roles,
		"existing": existing_roles
	}


@frappe.whitelist()
def create_promotion_roles():
	"""Create granular roles for Promotion doctype"""
	
	roles_to_create = [
		{
			"role_name": "Promotion Creator",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Promotion Reader",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Promotion Editor",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Promotion Deleter",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Promotion Submitter",
			"desk_access": 1,
			"is_custom": 1
		}
	]
	
	created_roles = []
	existing_roles = []
	
	for role_data in roles_to_create:
		role_name = role_data["role_name"]
		
		# Check if role already exists
		if frappe.db.exists("Role", role_name):
			existing_roles.append(role_name)
			frappe.logger().info(f"Role '{role_name}' already exists. Skipping creation.")
			continue
		
		try:
			# Create the role
			role = frappe.new_doc("Role")
			role.role_name = role_name
			role.desk_access = role_data.get("desk_access", 1)
			role.is_custom = role_data.get("is_custom", 1)
			role.flags.ignore_permissions = True
			role.flags.ignore_mandatory = True
			role.insert()
			
			created_roles.append(role_name)
			frappe.logger().info(f"Created role: {role_name}")
			
		except Exception as e:
			frappe.logger().error(f"Error creating role '{role_name}': {str(e)}")
			frappe.throw(f"Failed to create role '{role_name}': {str(e)}")
	
	# Commit the changes
	frappe.db.commit()
	
	# Print summary
	if created_roles:
		print(f"\n✓ Successfully created {len(created_roles)} role(s):")
		for role in created_roles:
			print(f"  - {role}")
	
	if existing_roles:
		print(f"\n⚠ {len(existing_roles)} role(s) already exist:")
		for role in existing_roles:
			print(f"  - {role}")
	
	if not created_roles and not existing_roles:
		print("\nNo roles were created.")
	
	print("\n✓ Promotion roles setup complete!")
	print("\nRoles created:")
	print("  - Promotion Creator: Can create and read Promotion records")
	print("  - Promotion Reader: Can only read Promotion records")
	print("  - Promotion Editor: Can read and edit Promotion records")
	print("  - Promotion Deleter: Can read and delete Promotion records")
	print("  - Promotion Submitter: Can read and submit Promotion records")
	
	return {
		"created": created_roles,
		"existing": existing_roles
	}


@frappe.whitelist()
def create_mission_roles():
	"""Create granular roles for Mission doctype"""
	
	roles_to_create = [
		{
			"role_name": "Mission Creator",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Mission Reader",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Mission Editor",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Mission Deleter",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Mission Submitter",
			"desk_access": 1,
			"is_custom": 1
		}
	]
	
	created_roles = []
	existing_roles = []
	
	for role_data in roles_to_create:
		role_name = role_data["role_name"]
		
		# Check if role already exists
		if frappe.db.exists("Role", role_name):
			existing_roles.append(role_name)
			frappe.logger().info(f"Role '{role_name}' already exists. Skipping creation.")
			continue
		
		try:
			# Create the role
			role = frappe.new_doc("Role")
			role.role_name = role_name
			role.desk_access = role_data.get("desk_access", 1)
			role.is_custom = role_data.get("is_custom", 1)
			role.flags.ignore_permissions = True
			role.flags.ignore_mandatory = True
			role.insert()
			
			created_roles.append(role_name)
			frappe.logger().info(f"Created role: {role_name}")
			
		except Exception as e:
			frappe.logger().error(f"Error creating role '{role_name}': {str(e)}")
			frappe.throw(f"Failed to create role '{role_name}': {str(e)}")
	
	# Commit the changes
	frappe.db.commit()
	
	# Print summary
	if created_roles:
		print(f"\n✓ Successfully created {len(created_roles)} role(s):")
		for role in created_roles:
			print(f"  - {role}")
	
	if existing_roles:
		print(f"\n⚠ {len(existing_roles)} role(s) already exist:")
		for role in existing_roles:
			print(f"  - {role}")
	
	if not created_roles and not existing_roles:
		print("\nNo roles were created.")
	
	print("\n✓ Mission roles setup complete!")
	print("\nRoles created:")
	print("  - Mission Creator: Can create and read Mission records")
	print("  - Mission Reader: Can only read Mission records")
	print("  - Mission Editor: Can read and edit Mission records")
	print("  - Mission Deleter: Can read and delete Mission records")
	print("  - Mission Submitter: Can read and submit Mission records")
	
	return {
		"created": created_roles,
		"existing": existing_roles
	}


@frappe.whitelist()
def create_reference_data_roles():
	"""Create general roles for reference/master data doctypes (State, Unit, Rank, Commander Appointment, Type of Commission, Course, Appointment, Course Name)"""
	
	roles_to_create = [
		{
			"role_name": "Reference Data Creator",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Reference Data Reader",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Reference Data Editor",
			"desk_access": 1,
			"is_custom": 1
		},
		{
			"role_name": "Reference Data Deleter",
			"desk_access": 1,
			"is_custom": 1
		}
	]
	
	created_roles = []
	existing_roles = []
	
	for role_data in roles_to_create:
		role_name = role_data["role_name"]
		
		# Check if role already exists
		if frappe.db.exists("Role", role_name):
			existing_roles.append(role_name)
			frappe.logger().info(f"Role '{role_name}' already exists. Skipping creation.")
			continue
		
		try:
			# Create the role
			role = frappe.new_doc("Role")
			role.role_name = role_name
			role.desk_access = role_data.get("desk_access", 1)
			role.is_custom = role_data.get("is_custom", 1)
			role.flags.ignore_permissions = True
			role.flags.ignore_mandatory = True
			role.insert()
			
			created_roles.append(role_name)
			frappe.logger().info(f"Created role: {role_name}")
			
		except Exception as e:
			frappe.logger().error(f"Error creating role '{role_name}': {str(e)}")
			frappe.throw(f"Failed to create role '{role_name}': {str(e)}")
	
	# Commit the changes
	frappe.db.commit()
	
	# Print summary
	if created_roles:
		print(f"\n✓ Successfully created {len(created_roles)} role(s):")
		for role in created_roles:
			print(f"  - {role}")
	
	if existing_roles:
		print(f"\n⚠ {len(existing_roles)} role(s) already exist:")
		for role in existing_roles:
			print(f"  - {role}")
	
	if not created_roles and not existing_roles:
		print("\nNo roles were created.")
	
	print("\n✓ Reference Data roles setup complete!")
	print("\nRoles created:")
	print("  - Reference Data Creator: Can create and read reference data (State, Unit, Rank, etc.)")
	print("  - Reference Data Reader: Can only read reference data")
	print("  - Reference Data Editor: Can read and edit reference data")
	print("  - Reference Data Deleter: Can read and delete reference data")
	print("\nThese roles apply to the following doctypes:")
	print("  - State, Unit, Rank, Commander Appointment, Type of Commission")
	print("  - Course, Appointment, Course Name")
	
	return {
		"created": created_roles,
		"existing": existing_roles
	}


@frappe.whitelist()
def add_reference_data_roles_to_app_role_list():
	"""Add Reference Data roles to App Role List with Unit as owner doctype"""
	
	reference_data_roles = [
		"Reference Data Creator",
		"Reference Data Reader",
		"Reference Data Editor",
		"Reference Data Deleter"
	]
	
	owner_doctype = "Unit"
	
	created_entries = []
	existing_entries = []
	errors = []
	
	for role_name in reference_data_roles:
		# Check if role exists
		if not frappe.db.exists("Role", role_name):
			errors.append(f"Role '{role_name}' does not exist. Please create it first.")
			continue
		
		# Check if App Role List entry already exists
		# The autoname is based on app_role field, so we check by app_role
		existing_entry = frappe.db.get_value("App Role List", {"app_role": role_name}, "name")
		
		if existing_entry:
			# Update owner_doctype if it's different
			existing_doc = frappe.get_doc("App Role List", existing_entry)
			if existing_doc.owner_doctype != owner_doctype:
				existing_doc.owner_doctype = owner_doctype
				existing_doc.save(ignore_permissions=True)
				frappe.logger().info(f"Updated owner_doctype for '{role_name}' to '{owner_doctype}'")
			existing_entries.append(role_name)
			continue
		
		try:
			# Create new App Role List entry
			app_role_list = frappe.new_doc("App Role List")
			app_role_list.app_role = role_name
			app_role_list.owner_doctype = owner_doctype
			app_role_list.flags.ignore_permissions = True
			app_role_list.flags.ignore_mandatory = True
			app_role_list.insert()
			
			created_entries.append(role_name)
			frappe.logger().info(f"Created App Role List entry for '{role_name}' with owner doctype '{owner_doctype}'")
			
		except Exception as e:
			error_msg = f"Error creating App Role List entry for '{role_name}': {str(e)}"
			errors.append(error_msg)
			frappe.logger().error(error_msg)
	
	# Commit the changes
	frappe.db.commit()
	
	# Print summary
	if created_entries:
		print(f"\n✓ Successfully created {len(created_entries)} App Role List entry/entries:")
		for entry in created_entries:
			print(f"  - {entry} (Owner: {owner_doctype})")
	
	if existing_entries:
		print(f"\n⚠ {len(existing_entries)} App Role List entry/entries already exist:")
		for entry in existing_entries:
			print(f"  - {entry} (Owner: {owner_doctype})")
	
	if errors:
		print(f"\n✗ {len(errors)} error(s):")
		for error in errors:
			print(f"  - {error}")
	
	if not created_entries and not existing_entries and not errors:
		print("\nNo App Role List entries were created.")
	
	print(f"\n✓ Reference Data roles added to App Role List with '{owner_doctype}' as owner doctype!")
	
	return {
		"created": created_entries,
		"existing": existing_entries,
		"errors": errors
	}


@frappe.whitelist()
def add_all_roles_to_app_role_list():
	"""Add all granular roles to App Role List with their respective owner doctypes"""
	
	# Define roles and their owner doctypes
	roles_config = {
		"Personnel": [
			"Personnel Creator",
			"Personnel Reader",
			"Personnel Editor",
			"Personnel Deleter"
		],
		"Course Attended": [
			"Course Attended Creator",
			"Course Attended Reader",
			"Course Attended Editor",
			"Course Attended Deleter",
			"Course Attended Submitter"
		],
		"Posting Authority": [
			"Posting Authority Creator",
			"Posting Authority Reader",
			"Posting Authority Editor",
			"Posting Authority Deleter",
			"Posting Authority Submitter"
		],
		"Part 2 Order": [
			"Part 2 Order Creator",
			"Part 2 Order Reader",
			"Part 2 Order Editor",
			"Part 2 Order Deleter",
			"Part 2 Order Submitter"
		],
		"Promotion": [
			"Promotion Creator",
			"Promotion Reader",
			"Promotion Editor",
			"Promotion Deleter",
			"Promotion Submitter"
		],
		"Mission": [
			"Mission Creator",
			"Mission Reader",
			"Mission Editor",
			"Mission Deleter",
			"Mission Submitter"
		]
	}
	
	all_created = []
	all_existing = []
	all_errors = []
	
	for owner_doctype, roles in roles_config.items():
		print(f"\n--- Processing {owner_doctype} roles ---")
		
		for role_name in roles:
			# Check if role exists
			if not frappe.db.exists("Role", role_name):
				error_msg = f"Role '{role_name}' does not exist. Please create it first."
				all_errors.append(error_msg)
				frappe.logger().warning(error_msg)
				continue
			
			# Check if App Role List entry already exists
			existing_entry = frappe.db.get_value("App Role List", {"app_role": role_name}, "name")
			
			if existing_entry:
				# Update owner_doctype if it's different
				existing_doc = frappe.get_doc("App Role List", existing_entry)
				if existing_doc.owner_doctype != owner_doctype:
					existing_doc.owner_doctype = owner_doctype
					existing_doc.save(ignore_permissions=True)
					frappe.logger().info(f"Updated owner_doctype for '{role_name}' to '{owner_doctype}'")
					print(f"  ✓ Updated: {role_name} (Owner: {owner_doctype})")
				else:
					print(f"  ⚠ Already exists: {role_name} (Owner: {owner_doctype})")
				all_existing.append({"role": role_name, "owner": owner_doctype})
				continue
			
			try:
				# Create new App Role List entry
				app_role_list = frappe.new_doc("App Role List")
				app_role_list.app_role = role_name
				app_role_list.owner_doctype = owner_doctype
				app_role_list.flags.ignore_permissions = True
				app_role_list.flags.ignore_mandatory = True
				app_role_list.insert()
				
				all_created.append({"role": role_name, "owner": owner_doctype})
				frappe.logger().info(f"Created App Role List entry for '{role_name}' with owner doctype '{owner_doctype}'")
				print(f"  ✓ Created: {role_name} (Owner: {owner_doctype})")
				
			except Exception as e:
				error_msg = f"Error creating App Role List entry for '{role_name}': {str(e)}"
				all_errors.append(error_msg)
				frappe.logger().error(error_msg)
				print(f"  ✗ Error: {role_name} - {str(e)}")
	
	# Commit the changes
	frappe.db.commit()
	
	# Print summary
	print("\n" + "="*60)
	print("SUMMARY")
	print("="*60)
	
	if all_created:
		print(f"\n✓ Successfully created {len(all_created)} App Role List entry/entries:")
		for entry in all_created:
			print(f"  - {entry['role']} (Owner: {entry['owner']})")
	
	if all_existing:
		print(f"\n⚠ {len(all_existing)} App Role List entry/entries already exist:")
		for entry in all_existing:
			print(f"  - {entry['role']} (Owner: {entry['owner']})")
	
	if all_errors:
		print(f"\n✗ {len(all_errors)} error(s):")
		for error in all_errors:
			print(f"  - {error}")
	
	if not all_created and not all_existing and not all_errors:
		print("\nNo App Role List entries were created.")
	
	print("\n✓ All roles added to App Role List with their respective owner doctypes!")
	
	return {
		"created": all_created,
		"existing": all_existing,
		"errors": all_errors
	}


@frappe.whitelist()
def create_all_roles():
	"""Create all granular roles for Personnel, Course Attended, Posting Authority, Part 2 Order, Promotion, Mission, and Reference Data doctypes"""
	
	personnel_result = create_personnel_roles()
	course_attended_result = create_course_attended_roles()
	posting_authority_result = create_posting_authority_roles()
	part_2_order_result = create_part_2_order_roles()
	promotion_result = create_promotion_roles()
	mission_result = create_mission_roles()
	reference_data_result = create_reference_data_roles()
	
	# Add all roles to App Role List
	app_role_list_result = add_all_roles_to_app_role_list()
	reference_data_app_role_list_result = add_reference_data_roles_to_app_role_list()
	
	return {
		"personnel": personnel_result,
		"course_attended": course_attended_result,
		"posting_authority": posting_authority_result,
		"part_2_order": part_2_order_result,
		"promotion": promotion_result,
		"mission": mission_result,
		"reference_data": reference_data_result,
		"app_role_list": app_role_list_result,
		"reference_data_app_role_list": reference_data_app_role_list_result
	}


if __name__ == "__main__":
	create_all_roles()

