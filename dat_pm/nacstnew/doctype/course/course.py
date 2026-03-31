# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Course(Document):
	def validate(self):
		# Set operator to current user
		if frappe.session.user:
			self.operator = frappe.session.user
