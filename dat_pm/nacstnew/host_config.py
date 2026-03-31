# Copyright (c) 2025, Dat Pm and contributors
# License: MIT. See LICENSE
"""
Host app for the embedded Nacstnew module.

Frappe resolves whitelisted methods as ``{installed_app}.{rest}``. The first
segment must be the app installed on the site (e.g. ``dat_pm``), not the legacy
standalone app name ``nacstnew``.

When you copy this module into another Frappe app, set ``HOST_APP`` to that
app's package name. Client-side JS uses the dotted API prefix ``dat_pm.nacstnew``
(``{HOST_APP}.nacstnew``) in ``frappe.call`` / ``/api/method/`` paths — match
``HOST_APP`` here if you rename the host app.
"""

# Installed app that contains this module (must match ``app_name`` in that app's hooks.py)
HOST_APP = "dat_pm"

# Python package path under HOST_APP where this module's code lives (import path after HOST_APP)
NACSTNEW_PACKAGE = "nacstnew.nacstnew"


def get_api_root() -> str:
	"""Dotted path prefix for frappe.call /api/method, e.g. ``dat_pm.nacstnew.nacstnew``."""
	return f"{HOST_APP}.{NACSTNEW_PACKAGE}"
