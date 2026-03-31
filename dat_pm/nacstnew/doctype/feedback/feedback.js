// Copyright (c) 2026, !! and contributors
// For license information, please see license.txt
// Server-side: feedback.py updates linked Course Attended on submit/cancel.

frappe.ui.form.on("Feedback", {
	after_submit(frm) {
		if (frm.doc.course_reference) {
			frappe.show_alert({
				message: __("Course Attendance updated: status Completed, Feedback Collected."),
				indicator: "green",
			});
		}
	},

	after_cancel(frm) {
		if (frm.doc.course_reference) {
			frappe.show_alert({
				message: __("Linked Course Attendance has been reverted."),
				indicator: "blue",
			});
		}
	},
});
