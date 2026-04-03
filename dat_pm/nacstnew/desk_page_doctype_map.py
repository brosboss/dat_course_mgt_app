# Map desk Page.name -> DocType used to gate access via frappe.has_permission(doctype, "read").
# Pages listed here ignore the Page "Roles" child table for permission checks so roles like "All"
# cannot bypass DocType permissions.

DESK_PAGE_DOCTYPE: dict[str, str] = {
	"course-feedback": "Feedback",
	"personnel-list": "Personnel",
	"course-nomination-an": "Course Nomination",
	"personnel-course-det": "Course Attended",
	"trg-dashboard": "Course Nomination",
	"units-view2": "Unit",
	"audit-log": "Activity Log",
	"personnel_import": "Import Doctype",
	"personnel-record": "Personnel",
	"postings-with-pengin": "Part 2 Order",
	"personnel-unit-stati": "Personnel",
	"no-strength-returns-": "Personnel",
	"forecast-of-events": "Focast of Event",
	"multiple-strength-re": "Strength Returns",
}


def get_required_doctype_for_page(page_name: str | None) -> str | None:
	if not page_name:
		return None
	return DESK_PAGE_DOCTYPE.get(page_name)
