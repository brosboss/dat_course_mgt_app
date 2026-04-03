# Copyright (c) 2026, !! and contributors

import frappe
from frappe.core.doctype.page.page import Page

from dat_pm.nacstnew.desk_page_doctype_map import get_required_doctype_for_page


class CustomPage(Page):
	def is_permitted(self) -> bool:
		doctype = get_required_doctype_for_page(self.name)
		if doctype:
			if frappe.session.user == "Administrator":
				return True
			return bool(frappe.has_permission(doctype, ptype="read", user=frappe.session.user))
		return super().is_permitted()
