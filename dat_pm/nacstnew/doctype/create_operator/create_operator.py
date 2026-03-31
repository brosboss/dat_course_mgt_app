# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class CreateOperator(Document):
	def validate(self):
		"""Validate before saving"""
		# Validate email format
		if self.email:
			frappe.utils.validate_email_address(self.email, throw=True)
		
		# Only check if user exists when creating a new document
		# If updating, the user might have been created by this document
		if self.is_new() and frappe.db.exists("User", self.email):
			frappe.throw(f"User with email {self.email} already exists")
		
		# Validate login restrictions
		if self.login_after is not None and (self.login_after < 0 or self.login_after > 24):
			frappe.throw(_("Login After must be between 0 and 24"), title=_("Invalid Value"))
		
		if self.login_before is not None and (self.login_before < 0 or self.login_before > 24):
			frappe.throw(_("Login Before must be between 0 and 24"), title=_("Invalid Value"))
		
		if self.login_after is not None and self.login_before is not None:
			if self.login_after >= self.login_before:
				frappe.throw(_("Login After must be less than Login Before"), title=_("Invalid Time Range"))
		
		# Set default enabled to 1 if not set
		if not hasattr(self, 'enabled') or self.enabled is None:
			self.enabled = 1
		
		# Validate enabled status - prevent disabling Administrator
		if frappe.utils.cint(self.enabled) == 0 and self.email == "Administrator":
			frappe.throw(_("Administrator user cannot be disabled"), title=_("Invalid Operation"))
		
		# Ensure "Can View Dashboard" role is always assigned
		self._ensure_can_view_dashboard_role()
		# Ensure "Personnel Reader" role is always assigned
		self._ensure_personnel_reader_role()
	
	def after_insert(self):
		"""Create user after document is inserted"""
		self.create_user()
	
	def on_update(self):
		"""Update user when Create Operator document is updated"""
		self.update_user()
	
	def create_user(self):
		"""Create a new User based on the Create Operator document"""
		try:
			# Check if user already exists
			if frappe.db.exists("User", self.email):
				frappe.msgprint(f"User with email {self.email} already exists. Skipping user creation.", indicator="orange")
				return
			
			# Create new user
			user = frappe.new_doc("User")
			# Set enabled status (default to 1 if not set)
			enabled_status = frappe.utils.cint(getattr(self, 'enabled', 1))
			user.update({
				"name": self.email,
				"email": self.email,
				"first_name": self.first_name,
				"enabled": enabled_status,
				"user_type": "System User",
				"send_welcome_email": 0,  # Don't send welcome email automatically
				"module_profile": "No Module",  # Always set to "No Module" module profile
				"desk_theme": "Light",  # Always set to Dark theme
			})
			
			# Set login restrictions if provided
			if self.login_after is not None:
				user.login_after = self.login_after
			if self.login_before is not None:
				user.login_before = self.login_before
			
			# Set password using new_password field (recommended approach)
			if self.password:
				user.new_password = self.password
				# Ignore password policy if needed (optional, remove if you want to enforce policy)
				user.flags.ignore_password_policy = True
			
			# Insert user
			user.insert(ignore_permissions=True)
			
			# Add roles from app_roles_assigned_list
			roles_to_add = []
			if self.app_roles_assigned_list:
				for role_row in self.app_roles_assigned_list:
					if role_row.app_role:
						# Get the actual role name from App Role List
						# role_row.app_role is the name of App Role List document
						# We need to get the app_role field from that document which links to Role
						role_name = frappe.db.get_value("App Role List", role_row.app_role, "app_role")
						if role_name:
							roles_to_add.append(role_name)
			
			# Add roles to user
			if roles_to_add:
				user.add_roles(*roles_to_add)
			
			# Ensure module profile is "No Module" - set on document and save to trigger block_modules update
			user.module_profile = "No Module"
			# Always ensure dark theme is set
			user.desk_theme = "Light"
			user.save(ignore_permissions=True)
			
			# Reload user to ensure all changes are committed
			user.reload()
			
			frappe.msgprint(f"User {self.email} created successfully", indicator="green")
			
		except Exception as e:
			frappe.log_error(f"Error creating user: {str(e)}", "Create Operator Error")
			frappe.throw(f"Failed to create user: {str(e)}")
	
	def update_user(self):
		"""Update existing User based on Create Operator document changes"""
		try:
			# Check if user exists
			if not frappe.db.exists("User", self.email):
				frappe.msgprint(f"User with email {self.email} does not exist. Cannot update.", indicator="orange")
				return
			
			# Get the user document
			user = frappe.get_doc("User", self.email)
			has_changes = False
			
			# Update basic fields if changed
			if self.has_value_changed("first_name"):
				user.first_name = self.first_name
				has_changes = True
			
			# Update enabled status if changed
			if self.has_value_changed("enabled"):
				enabled_status = frappe.utils.cint(getattr(self, 'enabled', 1))
				# Prevent disabling Administrator
				if enabled_status == 0 and user.name == "Administrator":
					frappe.throw(_("Administrator user cannot be disabled"), title=_("Invalid Operation"))
				user.enabled = enabled_status
				has_changes = True
			
			# Always ensure module profile is set to "No Module" for all users
			# Check current value on document
			if user.module_profile != "No Module":
				# Set on document and save to trigger block_modules update
				user.module_profile = "No Module"
				has_changes = True
			
			# Always ensure dark theme is set
			if user.desk_theme != "Light":
				user.desk_theme = "Light"
				has_changes = True
			
			# Update login restrictions if changed
			if self.has_value_changed("login_after"):
				user.login_after = self.login_after if self.login_after is not None else None
				has_changes = True
			
			if self.has_value_changed("login_before"):
				user.login_before = self.login_before if self.login_before is not None else None
				has_changes = True
			
			# Update password if changed
			if self.has_value_changed("password") and self.password:
				user.new_password = self.password
				user.flags.ignore_password_policy = True
				has_changes = True
			
			# Update roles if app_roles_assigned_list changed
			roles_updated = False
			if self.has_value_changed("app_roles_assigned_list"):
				# Get current roles from user
				current_roles = set([d.role for d in user.get("roles")])
				
				# Get new roles from app_roles_assigned_list
				new_roles = set()
				if self.app_roles_assigned_list:
					for role_row in self.app_roles_assigned_list:
						if role_row.app_role:
							role_name = frappe.db.get_value("App Role List", role_row.app_role, "app_role")
							if role_name:
								new_roles.add(role_name)
				
				# Find roles to add and remove
				roles_to_add = new_roles - current_roles
				roles_to_remove = current_roles - new_roles
				
				# Update roles manually without saving (to avoid multiple saves)
				# Remove old roles
				if roles_to_remove:
					existing_roles = {d.role: d for d in user.get("roles")}
					for role in roles_to_remove:
						if role in existing_roles:
							user.get("roles").remove(existing_roles[role])
					roles_updated = True
				
				# Add new roles using append_roles (doesn't save)
				if roles_to_add:
					user.append_roles(*roles_to_add)
					roles_updated = True
			
			# Save user if any changes were made (fields, password, or roles)
			if has_changes or roles_updated:
				user.save(ignore_permissions=True)
				frappe.msgprint(f"User {self.email} updated successfully", indicator="green")
			
		except Exception as e:
			frappe.log_error(f"Error updating user: {str(e)}", "Create Operator Error")
			frappe.throw(f"Failed to update user: {str(e)}")
	
	def _ensure_can_view_dashboard_role(self):
		"""Ensure 'Can View Dashboard' role is always in app_roles_assigned_list"""
		# Check if "Can View Dashboard" role exists in App Role List
		can_view_dashboard_app_role = frappe.db.get_value(
			"App Role List",
			{"app_role": "Can View Dashboard"},
			"name"
		)
		
		if not can_view_dashboard_app_role:
			frappe.throw(
				_("'Can View Dashboard' role must exist in App Role List. Please create it first."),
				title=_("Missing Role")
			)
		
		# Check if "Can View Dashboard" is already in the list
		has_can_view_dashboard = False
		if self.app_roles_assigned_list:
			for role_row in self.app_roles_assigned_list:
				if role_row.app_role == can_view_dashboard_app_role:
					has_can_view_dashboard = True
					break
		
		# Auto-add if missing
		if not has_can_view_dashboard:
			child_row = self.append("app_roles_assigned_list")
			child_row.app_role = can_view_dashboard_app_role
	
	def _ensure_personnel_reader_role(self):
		"""Ensure 'Personnel Reader' role is always in app_roles_assigned_list"""
		# Check if "Personnel Reader" role exists in App Role List
		personnel_reader_app_role = frappe.db.get_value(
			"App Role List",
			{"app_role": "Personnel Reader"},
			"name"
		)
		
		if not personnel_reader_app_role:
			frappe.throw(
				_("'Personnel Reader' role must exist in App Role List. Please create it first."),
				title=_("Missing Role")
			)
		
		# Check if "Personnel Reader" is already in the list
		has_personnel_reader = False
		if self.app_roles_assigned_list:
			for role_row in self.app_roles_assigned_list:
				if role_row.app_role == personnel_reader_app_role:
					has_personnel_reader = True
					break
		
		# Auto-add if missing
		if not has_personnel_reader:
			child_row = self.append("app_roles_assigned_list")
			child_row.app_role = personnel_reader_app_role
