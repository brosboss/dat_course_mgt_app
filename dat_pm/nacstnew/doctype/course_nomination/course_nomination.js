// Copyright (c) 2026, !! and contributors
// For license information, please see license.txt

frappe.ui.form.on("Course Nomination", {
	course_name(frm) {
		// Clear everything when course changes
		frm.set_value("personnel_due_for_course", "");
		frm.clear_table("nominated_personnel");
		frm.refresh_field("personnel_due_for_course");
		frm.refresh_field("nominated_personnel");
		frm._qualified_service_numbers = null;
		if (frm.doc.course_name) {
			update_personnel_due_for_course(frm);
		}
	},
	refresh(frm) {
		if (frm.doc.course_name) {
			update_personnel_due_for_course(frm);
		}
	},
	before_save(frm) {
		if (!frm.doc.course_name || !frm.doc.nominated_personnel || !frm.doc.nominated_personnel.length) {
			return;
		}
		let qualified = frm._qualified_service_numbers;
		if (!qualified) {
			return; // let server validate
		}
		let not_qualified = frm.doc.nominated_personnel.filter(function (row) {
			return row.service_number && !qualified.has(row.service_number);
		});
		if (not_qualified.length) {
			let names = not_qualified.map(function (r) { return r.service_number || r.personnel_name; }).join(", ");
			frappe.msgprint({
				title: __("Cannot Save"),
				message: __("The following personnel are not qualified for this course (rank, already attended, or missing prerequisite): {0}. Remove them before saving.", [names]),
				indicator: "red",
			});
			frappe.validated = false;
		}
	},
});

frappe.ui.form.on("Nominated Personnel", {
	form_render(frm, cdt, cdn) {
		if (frm.doctype !== "Course Nomination") return;
		setTimeout(function () {
			apply_nominated_personnel_row_styling(frm);
		}, 50);
	},
});

function update_personnel_due_for_course(frm) {
	if (!frm.doc.course_name) {
		frm.set_value("personnel_due_for_course", "");
		frm.refresh_field("personnel_due_for_course");
		return;
	}
	frappe.call({
		method: `dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_personnel_due_for_course`,
		args: { course_name: frm.doc.course_name },
		callback(r) {
			const list = r.message || [];
			frm._qualified_service_numbers = new Set((list || []).map(function (p) { return p.service_number; }));
			let html = "";
			if (list.length === 0) {
				html = "<p class='text-muted'>No personnel due for this course.</p>";
			} else {
				html = `
					<table class="table table-bordered table-condensed">
						<thead>
							<tr>
								<th>Service Number</th>
								<th>Personnel Name</th>
								<th>Rank</th>
								<th>Unit</th>
							</tr>
						</thead>
						<tbody>
							${list.map((p) => `
								<tr>
									<td>${frappe.utils.escape_html(p.service_number || "")}</td>
									<td>${frappe.utils.escape_html(p.personnel_name || "")}</td>
									<td>${frappe.utils.escape_html(p.current_rank || "")}</td>
									<td>${frappe.utils.escape_html(p.current_unit || "")}</td>
								</tr>
							`).join("")}
						</tbody>
					</table>
					<p class="text-muted">${list.length} personnel due for this course.</p>
				`;
			}
			frm.doc.personnel_due_for_course = html;
			frm.refresh_field("personnel_due_for_course");
			let html_field = frm.get_field("personnel_due_for_course");
			if (html_field) {
				html_field.df.options = html;
				html_field.set_value(html);
				if (html_field.$wrapper) {
					html_field.$wrapper.show();
				}
			}
			setTimeout(() => {
				let field_wrapper = $(frm.wrapper).find('[data-fieldname="personnel_due_for_course"]');
				if (field_wrapper.length) {
					let target = field_wrapper.find('.control-value-wrapper, .html-control');
					if (!target.length) {
						target = field_wrapper.find('.control-input-wrapper');
					}
					if (target.length) {
						target.html(html);
					}
				}
			}, 100);
			apply_nominated_personnel_row_styling(frm);
		},
	});
}

function apply_nominated_personnel_row_styling(frm) {
	let qualified = frm._qualified_service_numbers;
	if (!qualified || !frm.fields_dict.nominated_personnel || !frm.fields_dict.nominated_personnel.grid) {
		return;
	}
	let grid = frm.fields_dict.nominated_personnel.grid;
	let rows = grid.wrapper && grid.wrapper.find("tbody tr");
	if (!rows || !rows.length) return;
	rows.each(function (idx) {
		let row = frm.doc.nominated_personnel[idx];
		let $tr = $(this);
		$tr.removeClass("course-nomination-row-not-qualified");
		if (row && row.service_number && !qualified.has(row.service_number)) {
			$tr.addClass("course-nomination-row-not-qualified");
		}
	});
}

(function () {
	let style = document.getElementById("course-nomination-row-style");
	if (!style) {
		style = document.createElement("style");
		style.id = "course-nomination-row-style";
		style.textContent = ".course-nomination-row-not-qualified { background-color: #ffcccc !important; }";
		document.head.appendChild(style);
	}
})();
