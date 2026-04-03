from . import __version__ as app_version

app_name = "dat_pm"
app_title = "Dat Pm"
app_publisher = "!!"
app_description = "!!"
app_email = "brossboss123@gmail.com"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/dat_pm/css/dat_pm.css"
# Shared helpers (hideDefaultSidebarCSS, getNavigationSidebar, etc.) for Nacstnew desk pages
app_include_js = [
	"/assets/dat_pm/js/navigation_sidebar.js", 
	"/assets/dat_pm/js/redirect.js"
]

# include js, css files in header of web template
# web_include_css = "/assets/dat_pm/css/dat_pm.css"
# web_include_js = "/assets/dat_pm/js/dat_pm.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "dat_pm/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
#	"methods": "dat_pm.utils.jinja_methods",
#	"filters": "dat_pm.utils.jinja_filters"
# }
required_apps = ["nxt_theme"]
# Installation
# ------------

# before_install = "dat_pm.install.before_install"
# after_install = "dat_pm.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "dat_pm.uninstall.before_uninstall"
# after_uninstall = "dat_pm.uninstall.after_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "dat_pm.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
#	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
#	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

override_doctype_class = {
	"Page": "dat_pm.nacstnew.overrides.page.CustomPage",
}

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"Course Nomination": {
		"on_submit": "dat_pm.nacstnew.doctype.course_nomination.course_nomination.ensure_course_attended_records_for_nomination",
		"on_cancel": "dat_pm.nacstnew.doctype.course_nomination.course_nomination.cancel_linked_course_attended_for_nomination",
		"on_trash": "dat_pm.nacstnew.doctype.course_nomination.course_nomination.delete_linked_course_attended_for_nomination",
	},
}

# Scheduled Tasks
# ---------------

scheduler_events = {
	# Daily at 00:00 — refresh Course Attended.course_status from dates + Feedback
	"cron": {
		"0 0 * * *": [
			"dat_pm.nacstnew.doctype.course_nomination.course_nomination.update_course_attended_status_from_cron",
		]
	},
}

# Testing
# -------

# before_tests = "dat_pm.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
#	"frappe.desk.doctype.event.event.get_events": "dat_pm.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
#	"Task": "dat_pm.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
before_request = ["dat_pm.utils.feedback_only_access.before_request_feedback_only_guard"]
# after_request = ["dat_pm.utils.after_request"]

# Job Events
# ----------
# before_job = ["dat_pm.utils.before_job"]
# after_job = ["dat_pm.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
#	{
#		"doctype": "{doctype_1}",
#		"filter_by": "{filter_by}",
#		"redact_fields": ["{field_1}", "{field_2}"],
#		"partial": 1,
#	},
#	{
#		"doctype": "{doctype_2}",
#		"filter_by": "{filter_by}",
#		"partial": 1,
#	},
#	{
#		"doctype": "{doctype_3}",
#		"strict": False,
#	},
#	{
#		"doctype": "{doctype_4}"
#	}
# ]

# Authentication and authorization
# --------------------------------

on_login = "dat_pm.utils.feedback_only_access.on_login_redirect"

boot_session = "dat_pm.utils.feedback_only_access.boot_session"

# auth_hooks = [
#	"dat_pm.auth.validate"
# ]
