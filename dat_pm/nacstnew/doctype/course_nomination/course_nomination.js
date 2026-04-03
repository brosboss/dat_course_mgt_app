// Copyright (c) 2026, !! and contributors
// For license information, please see license.txt

const CN_QUALIFIED_VIEWER_PAGE_SIZE = 18;

frappe.ui.form.on("Course Nomination", {
	course_name(frm) {
		// Clear everything when course changes
		frm.set_value("personnel_due_for_course", "");
		frm.clear_table("nominated_personnel");
		frm.refresh_field("personnel_due_for_course");
		frm.refresh_field("nominated_personnel");
		frm._qualified_service_numbers = null;
		frm._qualification_details = {};
		frm._personnel_due_full_list = null;
		remove_qualified_personnel_fab(frm);
		if (frm.doc.course_name) {
			update_personnel_due_for_course(frm);
		} else {
			apply_personnel_due_html_to_field(frm, personnel_due_summary_html("no_course", 0));
		}
	},
	refresh(frm) {
		frm.add_custom_button(__("Course Nomination page"), function () {
			frappe.set_route("course-nomination-an");
		});

		add_check_qualification_button(frm);
		if (frm.doc.course_name) {
			update_personnel_due_for_course(frm);
		} else {
			apply_personnel_due_html_to_field(frm, personnel_due_summary_html("no_course", 0));
			remove_qualified_personnel_fab(frm);
		}
		update_nominated_personnel_remarks(frm);
	},
	before_save(frm) {
		if (!frm.doc.course_name || !frm.doc.nominated_personnel || !frm.doc.nominated_personnel.length) {
			return;
		}
		// Saved nominations: server validates only new/changed child rows (see CourseNomination.validate).
		if (!frm.is_new()) {
			return;
		}
		let qualified = frm._qualified_service_numbers;
		if (!qualified) {
			return;
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
		let row = locals[cdt][cdn];
		if (row && row.name && !row.name.startsWith("new-") && !frm.is_new()) {
			setTimeout(function () {
				apply_nominated_personnel_row_styling(frm);
			}, 50);
			return;
		}
		update_row_qualification_remark(frm, cdt, cdn);
		setTimeout(function () {
			apply_nominated_personnel_row_styling(frm);
		}, 50);
	},
});

function personnel_due_summary_html(mode, count) {
	if (mode === "no_course") {
		return "<p class='text-muted' style='margin:0'>" + __("Select a course to load qualified personnel.") + "</p>";
	}
	if (mode === "loading") {
		return (
			"<p class='text-muted' style='margin:0'><i class='fa fa-spinner fa-spin'></i> " +
			__("Loading qualified personnel…") +
			"</p>"
		);
	}
	if (mode === "empty") {
		return (
			"<p style='margin:0'><strong>0</strong> " +
			__("personnel are currently qualified for this course (rank, prerequisites, not yet attended).") +
			"</p>"
		);
	}
	return (
		"<p style='margin:0 0 6px 0'><strong>" +
		String(count) +
		"</strong> " +
		__("personnel meet qualification rules for this course.") +
		"</p>" +
		"<p class='text-muted' style='margin:0;font-size:12px'>" +
		__("Use the floating 'View qualified personnel' button (lower-right) for the full list, statistics, and nomination status.") +
		"</p>"
	);
}

function apply_personnel_due_html_to_field(frm, html) {
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
			let target = field_wrapper.find(".control-value-wrapper, .html-control");
			if (!target.length) {
				target = field_wrapper.find(".control-input-wrapper");
			}
			if (target.length) {
				target.html(html);
			}
		}
	}, 100);
}

function remove_qualified_personnel_fab(frm) {
	if (frm && frm.$wrapper) {
		frm.$wrapper.find(".cn-qualified-personnel-fab").remove();
	}
}

function ensure_qualified_personnel_fab(frm) {
	if (!frm.$wrapper || !frm.doc.course_name) {
		return;
	}
	remove_qualified_personnel_fab(frm);
	let list = frm._personnel_due_full_list;
	if (list === undefined || list === null) {
		return;
	}
	let n = list.length;
	let fab = $(
		"<button type='button' class='btn btn-primary btn-lg cn-qualified-personnel-fab' " +
			"style='position:fixed;bottom:1.75rem;right:1.75rem;z-index:2000;border-radius:999px;" +
			"padding:12px 20px;box-shadow:0 6px 24px rgba(37,99,235,0.35);display:flex;align-items:center;gap:8px;'>" +
			"<i class='fa fa-users'></i>" +
			"<span>" +
			frappe.utils.escape_html(__("View qualified personnel")) +
			"</span>" +
			(n
				? "<span class='badge' style='background:rgba(255,255,255,0.25);margin-left:4px'>" +
				  String(n) +
				  "</span>"
				: "") +
			"</button>"
	);
	fab.on("click", function () {
		open_qualified_personnel_viewer_dialog(frm);
	});
	frm.$wrapper.append(fab);
}

function get_nominated_service_number_set(frm) {
	let s = new Set();
	(frm.doc.nominated_personnel || []).forEach(function (row) {
		if (row.service_number) {
			s.add(row.service_number);
		}
	});
	return s;
}

function cn_qv_docstatus_label(docstatus) {
	let ds = parseInt(docstatus, 10);
	if (ds === 1) {
		return __("Submitted");
	}
	if (ds === 2) {
		return __("Cancelled");
	}
	return __("Draft");
}

function cn_format_other_nominations_cell(others) {
	if (!others || !others.length) {
		return "<span class='text-muted'>—</span>";
	}
	return others
		.map(function (o) {
			let lbl = cn_qv_docstatus_label(o.docstatus);
			return (
				"<div class='cn-qv-other-line'>" +
				frappe.utils.escape_html(o.nomination || "") +
				" <span class='cn-qv-other-status'>(" +
				frappe.utils.escape_html(lbl) +
				")</span></div>"
			);
		})
		.join("");
}

function open_qualified_personnel_viewer_dialog(frm) {
	if (!frm.doc.course_name) {
		frappe.msgprint(__("Select a course first."));
		return;
	}
	let list = frm._personnel_due_full_list;
	if (list === null || list === undefined) {
		frappe.msgprint(__("Personnel list is still loading. Please wait."));
		return;
	}

	if (!document.getElementById("cn-qualified-viewer-style")) {
		let st = document.createElement("style");
		st.id = "cn-qualified-viewer-style";
		st.textContent =
			".cn-qv-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(118px,1fr)); gap:12px; margin-bottom:16px; }" +
			".cn-qv-stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 10px; text-align:center; }" +
			".cn-qv-stat .cn-qv-num { font-size:22px; font-weight:700; color:#0f172a; line-height:1.2; }" +
			".cn-qv-stat .cn-qv-lbl { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; margin-top:4px; }" +
			".cn-qv-table-wrap { max-height:420px; overflow:auto; border:1px solid #e2e8f0; border-radius:8px; }" +
			".cn-qv-table { width:100%; border-collapse:collapse; font-size:13px; margin:0; }" +
			".cn-qv-table th { position:sticky; top:0; background:#f1f5f9; z-index:1; padding:10px 12px; text-align:left; font-weight:600; color:#475569; border-bottom:2px solid #e2e8f0; }" +
			".cn-qv-table td { padding:8px 12px; border-bottom:1px solid #f1f5f9; vertical-align:top; }" +
			".cn-qv-table tbody tr:hover { background:#f8fafc; }" +
			".cn-qv-table tr.cn-qv-row-nominated { background:#f0fdf4; }" +
			".cn-qv-table tr.cn-qv-row-other-nom { background:#fffbeb; }" +
			".cn-qv-table tr.cn-qv-row-nominated.cn-qv-row-other-nom { background:linear-gradient(90deg,#f0fdf4 0%,#fffbeb 100%); }" +
			".cn-qv-badge { display:inline-block; font-size:10px; font-weight:600; padding:2px 8px; border-radius:999px; white-space:nowrap; }" +
			".cn-qv-badge-nom { background:#22c55e; color:#fff; }" +
			".cn-qv-badge-open { background:#e2e8f0; color:#475569; }" +
			".cn-qv-other-line { font-size:12px; line-height:1.35; margin:2px 0; word-break:break-word; }" +
			".cn-qv-other-status { color:#92400e; font-weight:600; }" +
			".cn-qv-pager { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-top:14px; padding-top:12px; border-top:1px solid #e2e8f0; }" +
			".cn-qv-pager .cn-qv-page-info { font-size:13px; color:#64748b; }";
		document.head.appendChild(st);
	}

	let d = new frappe.ui.Dialog({
		title: __("Qualified personnel — {0}", [frappe.utils.escape_html(frm.doc.course_name)]),
		size: "extra-large",
		fields: [
			{ fieldname: "qv_stats", fieldtype: "HTML" },
			{ fieldname: "qv_table", fieldtype: "HTML" },
			{ fieldname: "qv_pager", fieldtype: "HTML" },
		],
		primary_action_label: __("Close"),
		primary_action: function () {
			d.hide();
		},
	});

	let pagerState = { page: 1 };
	let otherBySn = null;

	function render_viewer() {
		if (otherBySn === null) {
			d.fields_dict.qv_stats.$wrapper.html(
				"<p class='text-muted' style='text-align:center;margin:12px 0'><i class='fa fa-spinner fa-spin'></i> " +
					__("Checking other nominations for this course…") +
					"</p>"
			);
			d.fields_dict.qv_table.$wrapper.html("");
			d.fields_dict.qv_pager.$wrapper.html("");
			return;
		}

		let nominated = get_nominated_service_number_set(frm);
		let total = list.length;
		let already = 0;
		let elsewhere = 0;
		let units = new Set();
		let ranks = new Set();
		for (let i = 0; i < list.length; i++) {
			let p = list[i];
			let sn = p.service_number;
			if (nominated.has(sn)) {
				already++;
			}
			let oo = otherBySn[sn];
			if (oo && oo.length) {
				elsewhere++;
			}
			if (p.current_unit) {
				units.add(p.current_unit);
			}
			if (p.current_rank) {
				ranks.add(p.current_rank);
			}
		}
		let not_added = total - already;

		let statsHtml =
			"<div class='cn-qv-stats'>" +
			"<div class='cn-qv-stat'><div class='cn-qv-num'>" +
			total +
			"</div><div class='cn-qv-lbl'>" +
			__("Qualified total") +
			"</div></div>" +
			"<div class='cn-qv-stat'><div class='cn-qv-num' style='color:#15803d'>" +
			already +
			"</div><div class='cn-qv-lbl'>" +
			__("In this nomination") +
			"</div></div>" +
			"<div class='cn-qv-stat'><div class='cn-qv-num' style='color:#b45309'>" +
			not_added +
			"</div><div class='cn-qv-lbl'>" +
			__("Not yet added here") +
			"</div></div>" +
			"<div class='cn-qv-stat'><div class='cn-qv-num' style='color:#c2410c'>" +
			elsewhere +
			"</div><div class='cn-qv-lbl'>" +
			__("Listed on another run") +
			"</div></div>" +
			"<div class='cn-qv-stat'><div class='cn-qv-num'>" +
			units.size +
			"</div><div class='cn-qv-lbl'>" +
			__("Distinct units") +
			"</div></div>" +
			"<div class='cn-qv-stat'><div class='cn-qv-num'>" +
			ranks.size +
			"</div><div class='cn-qv-lbl'>" +
			__("Distinct ranks") +
			"</div></div>" +
			"</div>";

		let totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / CN_QUALIFIED_VIEWER_PAGE_SIZE));
		if (pagerState.page > totalPages) {
			pagerState.page = totalPages;
		}
		if (pagerState.page < 1) {
			pagerState.page = 1;
		}
		let start = (pagerState.page - 1) * CN_QUALIFIED_VIEWER_PAGE_SIZE;
		let slice = list.slice(start, start + CN_QUALIFIED_VIEWER_PAGE_SIZE);

		let tableRows = "";
		if (!slice.length) {
			tableRows =
				"<tr><td colspan='6' class='text-muted' style='padding:24px;text-align:center'>" +
				__("No personnel match the qualification rules for this course.") +
				"</td></tr>";
		} else {
			for (let j = 0; j < slice.length; j++) {
				let p = slice[j];
				let is_nom = nominated.has(p.service_number);
				let others = otherBySn[p.service_number] || [];
				let has_other = others.length > 0;
				let rowCls = (is_nom ? "cn-qv-row-nominated" : "") + (has_other ? " cn-qv-row-other-nom" : "");
				let badge = is_nom
					? "<span class='cn-qv-badge cn-qv-badge-nom'>" + __("In this doc") + "</span>"
					: "<span class='cn-qv-badge cn-qv-badge-open'>" + __("Not in this doc") + "</span>";
				tableRows +=
					"<tr class='" +
					rowCls.trim() +
					"'>" +
					"<td>" +
					frappe.utils.escape_html(p.service_number || "") +
					"</td>" +
					"<td>" +
					frappe.utils.escape_html(p.personnel_name || "") +
					"</td>" +
					"<td>" +
					frappe.utils.escape_html(p.current_rank || "") +
					"</td>" +
					"<td>" +
					frappe.utils.escape_html(p.current_unit || "") +
					"</td>" +
					"<td>" +
					badge +
					"</td>" +
					"<td class='cn-qv-col-other'>" +
					cn_format_other_nominations_cell(others) +
					"</td>" +
					"</tr>";
			}
		}

		let tableHtml =
			"<div class='cn-qv-table-wrap'><table class='cn-qv-table'><thead><tr>" +
			"<th>" +
			__("Service number") +
			"</th>" +
			"<th>" +
			__("Name") +
			"</th>" +
			"<th>" +
			__("Rank") +
			"</th>" +
			"<th>" +
			__("Unit") +
			"</th>" +
			"<th>" +
			__("This document") +
			"</th>" +
			"<th>" +
			__("Other nomination (same course)") +
			"</th>" +
			"</tr></thead><tbody>" +
			tableRows +
			"</tbody></table></div>";

		let pagerHtml =
			"<div class='cn-qv-pager'>" +
			"<button type='button' class='btn btn-default btn-sm cn-qv-prev' " +
			(pagerState.page <= 1 ? "disabled" : "") +
			"><i class='fa fa-chevron-left'></i> " +
			__("Previous") +
			"</button>" +
			"<span class='cn-qv-page-info'>" +
			__("Page {0} of {1} — showing {2}–{3} of {4}", [
				pagerState.page,
				totalPages,
				total ? start + 1 : 0,
				Math.min(start + slice.length, total),
				total,
			]) +
			"</span>" +
			"<button type='button' class='btn btn-default btn-sm cn-qv-next' " +
			(pagerState.page >= totalPages ? "disabled" : "") +
			">" +
			__("Next") +
			" <i class='fa fa-chevron-right'></i></button>" +
			"</div>";

		d.fields_dict.qv_stats.$wrapper.html(statsHtml);
		d.fields_dict.qv_table.$wrapper.html(tableHtml);
		d.fields_dict.qv_pager.$wrapper.html(pagerHtml);

		d.fields_dict.qv_pager.$wrapper.off("click.cnqv");
		d.fields_dict.qv_pager.$wrapper.on("click.cnqv", ".cn-qv-prev", function () {
			if (pagerState.page > 1) {
				pagerState.page--;
				render_viewer();
			}
		});
		d.fields_dict.qv_pager.$wrapper.on("click.cnqv", ".cn-qv-next", function () {
			if (pagerState.page < totalPages) {
				pagerState.page++;
				render_viewer();
			}
		});
	}

	d.show();
	render_viewer();

	let exclude_name = !frm.is_new() && frm.doc.name ? frm.doc.name : "";
	frappe.call({
		method: "dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_other_nomination_rows_for_same_course",
		args: {
			course_name: frm.doc.course_name,
			exclude_nomination_name: exclude_name || undefined,
		},
		callback: function (r) {
			otherBySn = r.message || {};
			pagerState.page = 1;
			render_viewer();
		},
		error: function () {
			otherBySn = {};
			pagerState.page = 1;
			render_viewer();
		},
	});
}

function update_personnel_due_for_course(frm) {
	if (!frm.doc.course_name) {
		frm.set_value("personnel_due_for_course", "");
		frm._personnel_due_full_list = null;
		frm.refresh_field("personnel_due_for_course");
		remove_qualified_personnel_fab(frm);
		return;
	}
	remove_qualified_personnel_fab(frm);
	apply_personnel_due_html_to_field(frm, personnel_due_summary_html("loading", 0));
	frappe.call({
		method: `dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_personnel_due_for_course`,
		args: { course_name: frm.doc.course_name },
		callback(r) {
			const list = r.message || [];
			frm._personnel_due_full_list = list;
			frm._qualified_service_numbers = new Set((list || []).map(function (p) { return p.service_number; }));
			if (list.length === 0) {
				apply_personnel_due_html_to_field(frm, personnel_due_summary_html("empty", 0));
			} else {
				apply_personnel_due_html_to_field(frm, personnel_due_summary_html("ok", list.length));
			}
			ensure_qualified_personnel_fab(frm);
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
		if (!frm.is_new() && row.name && !row.name.startsWith("new-")) {
			return;
		}
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
