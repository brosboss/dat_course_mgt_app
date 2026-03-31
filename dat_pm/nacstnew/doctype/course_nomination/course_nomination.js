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
		frm._qualification_details = {};
		if (frm.doc.course_name) {
			update_personnel_due_for_course(frm);
		}
	},
	refresh(frm) {
		add_check_qualification_button(frm);
		if (frm.doc.course_name) {
			update_personnel_due_for_course(frm);
		}
		update_nominated_personnel_remarks(frm);
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
	service_number(frm, cdt, cdn) {
		update_row_qualification_remark(frm, cdt, cdn);
	},
	form_render(frm, cdt, cdn) {
		if (frm.doctype !== "Course Nomination") return;
		update_row_qualification_remark(frm, cdt, cdn);
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
			update_nominated_personnel_remarks(frm);
			apply_nominated_personnel_row_styling(frm);
		},
	});
}

function add_check_qualification_button(frm) {
	frm.add_custom_button(__("Why Qualified?"), function () {
		if (!frm.doc.course_name) {
			frappe.msgprint(__("Select a course first."));
			return;
		}
		if (!frm.doc.nominated_personnel || !frm.doc.nominated_personnel.length) {
			frappe.msgprint(__("Add at least one nominated personnel first."));
			return;
		}
		let candidates = frm.doc.nominated_personnel.filter(function (row) {
			return !!row.service_number;
		});
		if (!candidates.length) {
			frappe.msgprint(__("Select a service number in nominated personnel first."));
			return;
		}
		let latest = candidates[candidates.length - 1];
		fetch_qualification_detail(frm, latest.service_number).then(function (detail) {
			if (!detail) return;
			let title = detail.qualified ? __("Qualified") : __("Not Qualified");
			frappe.msgprint({
				title: title,
				message: __("{0}: {1}", [frappe.utils.escape_html(latest.service_number), frappe.utils.escape_html(detail.remark || "")]),
				indicator: detail.qualified ? "green" : "red",
			});
		});
	});
}

function fetch_qualification_detail(frm, service_number) {
	if (!frm.doc.course_name || !service_number) {
		return Promise.resolve(null);
	}
	frm._qualification_details = frm._qualification_details || {};
	let cache_key = `${frm.doc.course_name}::${service_number}`;
	if (frm._qualification_details[cache_key]) {
		return Promise.resolve(frm._qualification_details[cache_key]);
	}
	return new Promise(function (resolve) {
		frappe.call({
			method: "dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_personnel_course_qualification_remark",
			args: {
				course_name: frm.doc.course_name,
				service_number: service_number,
			},
			callback: function (r) {
				let detail = r.message || { qualified: 0, remark: __("Not qualified.") };
				frm._qualification_details[cache_key] = detail;
				resolve(detail);
			},
		});
	});
}

function update_row_qualification_remark(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	if (!row) return;
	if (!frm.doc.course_name || !row.service_number) {
		frappe.model.set_value(cdt, cdn, "remarks", "");
		setTimeout(function () {
			apply_nominated_personnel_row_styling(frm);
		}, 20);
		return;
	}
	fetch_qualification_detail(frm, row.service_number).then(function (detail) {
		if (!detail) return;
		let remark = detail.remark || "";
		frappe.model.set_value(cdt, cdn, "remarks", remark);
		setTimeout(function () {
			apply_nominated_personnel_row_styling(frm);
		}, 20);
	});
}

function update_nominated_personnel_remarks(frm) {
	if (!frm.doc.course_name || !frm.doc.nominated_personnel || !frm.doc.nominated_personnel.length) {
		return;
	}
	(frm.doc.nominated_personnel || []).forEach(function (row) {
		if (!row.service_number) return;
		update_row_qualification_remark(frm, row.doctype, row.name);
	});
}

function apply_nominated_personnel_row_styling(frm) {
	if (!frm.fields_dict.nominated_personnel || !frm.fields_dict.nominated_personnel.grid) {
		return;
	}
	let grid = frm.fields_dict.nominated_personnel.grid;
	if (!grid.wrapper) return;

	// Reset existing styling on both editable-grid rows and rendered table rows.
	grid.wrapper
		.find(".grid-row, tbody tr")
		.removeClass("course-nomination-row-not-qualified");

	(grid.grid_rows || []).forEach(function (grid_row) {
		let row_doc = grid_row.doc || {};
		let remark_text = (row_doc.remarks || "").toString().toLowerCase();
		let has_not_qualified_remark = remark_text.indexOf("not qualified") !== -1;
		let $row = grid_row.row ? $(grid_row.row) : $();
		if (has_not_qualified_remark && $row.length) {
			$row.addClass("course-nomination-row-not-qualified");
			$row.closest(".grid-row").addClass("course-nomination-row-not-qualified");
		}
	});
}

(function () {
	let style = document.getElementById("course-nomination-row-style");
	if (!style) {
		style = document.createElement("style");
		style.id = "course-nomination-row-style";
		style.textContent = ".course-nomination-row-not-qualified { background-color: #ffcccc !important; color: #b91c1c !important; } .course-nomination-row-not-qualified td, .course-nomination-row-not-qualified td div, .course-nomination-row-not-qualified .static-area, .course-nomination-row-not-qualified input, .course-nomination-row-not-qualified .control-value { color: #b91c1c !important; }";
		document.head.appendChild(style);
	}
})();
