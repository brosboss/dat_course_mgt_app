# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class PostingAuthorityDetails(Document):
	def validate(self):
		"""Automatically update posting_status based on part_2_order and gaining_unit_date_tos fields"""
		# Check if both part_2_order and gaining_unit_date_tos are set
		if self.part_2_order and self.gaining_unit_date_tos:
			# Both fields are present, set status to TOS
			if self.posting_status != "TOS":
				self.posting_status = "TOS"
		else:
			# Either field is missing, revert to Pending TOS (unless status is Cancelled)
			# Don't change status if it's already Cancelled
			if self.posting_status != "Cancelled":
				if self.posting_status != "Pending TOS":
					self.posting_status = "Pending TOS"
