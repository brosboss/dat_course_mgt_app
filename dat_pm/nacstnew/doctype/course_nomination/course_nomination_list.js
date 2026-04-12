// Copyright (c) 2026, !! and contributors

frappe.listview_settings["Course Nomination"] = {
	add_fields: ["start_date", "end_date"],
	has_indicator_for_draft: true,

	get_indicator: function (doc) {
		if (doc.docstatus === 2) {
			return [__("Cancelled"), "red", "docstatus,=,2"];
		}

		const run = get_course_nomination_run_status(doc);
		let label = __(run.label_key);

		if (doc.docstatus === 0) {
			label = `${label} · ${__("Draft")}`;
		}

		return [label, run.color];
	},
};

function get_course_nomination_run_status(doc) {
	if (!doc.start_date || !doc.end_date) {
		return { label_key: "Pending", color: "orange" };
	}

	let today;
	let start;
	let end;
	try {
		today = frappe.datetime.str_to_obj(frappe.datetime.get_today());
		start = frappe.datetime.str_to_obj(doc.start_date);
		end = frappe.datetime.str_to_obj(doc.end_date);
	} catch (e) {
		return { label_key: "Pending", color: "orange" };
	}

	if (today < start) {
		return { label_key: "Pending", color: "orange" };
	}
	if (today > end) {
		return { label_key: "Completed", color: "green" };
	}
	return { label_key: "Ongoing", color: "blue" };
}
