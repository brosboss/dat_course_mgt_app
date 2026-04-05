# Copyright (c) 2026, !! and contributors
# Web page context for /docs

import frappe


def get_context(context):
	context.no_cache = 1
	context.title = "Dat PM — User Guide"
	context.show_sidebar = False
	context.full_width = 1
