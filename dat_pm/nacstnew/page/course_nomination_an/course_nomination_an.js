// Copyright (c) 2026, !! and contributors
// Course Nomination – professional dynamic page

frappe.pages["course-nomination-an"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Course Nomination"),
		single_column: true,
	});

	wrapper.cna_page = page;
	wrapper.cna_state = {
		course_name: null,
		qualified_set: null,
		personnel_due: [],
		nominated: [],
	};

	var state = wrapper.cna_state;

	// Styles
	page.add_inner_message(`
		<style>
			.cna-container { max-width: 1400px; margin: 0 auto; padding: 20px; }
			.cna-two-col {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 24px;
				align-items: start;
			}
			@media (max-width: 900px) {
				.cna-two-col { grid-template-columns: 1fr; }
			}
			.cna-card {
				background: #fff;
				border-radius: 12px;
				box-shadow: 0 2px 12px rgba(0,0,0,0.06);
				border: 1px solid #e5e7eb;
				margin-bottom: 24px;
				overflow: hidden;
			}
			.cna-card-header {
				background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
				padding: 14px 20px;
				border-bottom: 1px solid #e2e8f0;
				display: flex;
				align-items: center;
				justify-content: space-between;
				flex-wrap: wrap;
				gap: 12px;
			}
			.cna-card-title {
				font-size: 15px;
				font-weight: 600;
				color: #0f172a;
				display: flex;
				align-items: center;
				gap: 8px;
			}
			.cna-card-title .badge {
				font-size: 11px;
				font-weight: 500;
				padding: 3px 10px;
				border-radius: 999px;
				background: rgba(59, 130, 246, 0.12);
				color: #1d4ed8;
				border: 1px solid rgba(59, 130, 246, 0.3);
			}
			.cna-card-body { padding: 20px; }
			.cna-empty {
				text-align: center;
				padding: 32px 20px;
				color: #64748b;
				font-size: 13px;
			}
			.cna-loading {
				text-align: center;
				padding: 40px 20px;
				color: #64748b;
			}
			.cna-loading .fa-spinner { font-size: 24px; margin-bottom: 8px; opacity: 0.7; }
			.cna-table-wrap { overflow-x: auto; }
			.cna-table {
				width: 100%;
				border-collapse: collapse;
				font-size: 13px;
			}
			.cna-table th {
				text-align: left;
				padding: 10px 12px;
				background: #f8fafc;
				color: #475569;
				font-weight: 600;
				border-bottom: 2px solid #e2e8f0;
			}
			.cna-table td {
				padding: 10px 12px;
				border-bottom: 1px solid #f1f5f9;
			}
			.cna-table tbody tr:hover { background: #f8fafc; }
			.cna-table tbody tr.cna-row-not-qualified { background: #fef2f2 !important; }
			.cna-table tbody tr.cna-row-not-qualified:hover { background: #fee2e2 !important; }
			.cna-table tbody tr.cna-row-added { background: #f0fdf4 !important; opacity: 0.92; }
			.cna-table tbody tr.cna-row-added:hover { background: #dcfce7 !important; }
			.cna-added-badge {
				display: inline-block;
				font-size: 10px;
				font-weight: 600;
				padding: 2px 8px;
				border-radius: 999px;
				background: #22c55e;
				color: #fff;
				white-space: nowrap;
			}
			.cna-btn {
				display: inline-flex;
				align-items: center;
				gap: 6px;
				padding: 6px 12px;
				font-size: 12px;
				border-radius: 8px;
				border: 1px solid transparent;
				cursor: pointer;
				transition: all 0.15s ease;
			}
			.cna-btn-primary {
				background: #2563eb;
				color: #fff;
				border-color: #2563eb;
			}
			.cna-btn-primary:hover { background: #1d4ed8; }
			.cna-btn-outline {
				background: #fff;
				color: #475569;
				border-color: #cbd5e1;
			}
			.cna-btn-outline:hover { background: #f1f5f9; }
			.cna-btn-danger {
				background: #fff;
				color: #dc2626;
				border-color: #fecaca;
			}
			.cna-btn-danger:hover { background: #fef2f2; }
			.cna-select {
				min-width: 280px;
				padding: 8px 12px;
				border-radius: 8px;
				border: 1px solid #cbd5e1;
				font-size: 13px;
			}
			.cna-select:focus {
				outline: none;
				border-color: #3b82f6;
				box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
			}
			.cna-actions { display: flex; gap: 8px; flex-wrap: wrap; }
			.cna-summary { font-size: 12px; color: #64748b; }
		</style>
	`);

	var html = `
		<div class="cna-container">
			<div class="cna-card">
				<div class="cna-card-header">
					<div class="cna-card-title">
						<i class="fa fa-book"></i> Select course
						<span class="badge" id="cna-badge-step">Step 1</span>
					</div>
					<div>
						<select class="cna-select" id="cna-course-select">
							<option value="">— Select course —</option>
						</select>
					</div>
				</div>
				<div class="cna-card-body">
					<p class="text-muted" style="margin: 0; font-size: 12px;">Choose a course to see personnel who are due (correct rank, have not attended, prerequisites completed).</p>
				</div>
			</div>

			<div class="cna-two-col">
				<div class="cna-card" id="cna-card-due">
					<div class="cna-card-header">
						<div class="cna-card-title">
							<i class="fa fa-users"></i> Personnel due for this course
							<span class="badge" id="cna-due-count">0</span>
						</div>
						<div class="cna-actions">
							<button type="button" class="cna-btn cna-btn-primary" id="cna-add-selected" disabled>
								<i class="fa fa-plus"></i> Add selected to nomination
							</button>
						</div>
					</div>
					<div class="cna-card-body">
						<div id="cna-due-content">
							<div class="cna-empty" id="cna-due-empty">Select a course above.</div>
							<div class="cna-loading" id="cna-due-loading" style="display: none;">
								<div><i class="fa fa-spinner fa-spin"></i></div>
								<div>Loading personnel due…</div>
							</div>
							<div class="cna-table-wrap" id="cna-due-table-wrap" style="display: none;"></div>
						</div>
					</div>
				</div>

				<div class="cna-card" id="cna-card-nominated">
					<div class="cna-card-header">
						<div class="cna-card-title">
							<i class="fa fa-list-check"></i> Nominated personnel
							<span class="badge" id="cna-nominated-count">0</span>
						</div>
						<div class="cna-actions">
							<button type="button" class="cna-btn cna-btn-primary" id="cna-save-nomination" disabled>
								<i class="fa fa-save"></i> Save as Course Nomination
							</button>
						</div>
					</div>
					<div class="cna-card-body">
						<div id="cna-nominated-content">
							<div class="cna-empty" id="cna-nominated-empty">No personnel nominated yet. Add from the list above.</div>
							<div class="cna-table-wrap" id="cna-nominated-table-wrap" style="display: none;"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;

	page.main.html(html);

	// Populate course dropdown
	frappe.call({
		method: "frappe.client.get_list",
		args: {
			doctype: "Course Name",
			fields: ["name"],
			limit_page_length: 0,
			order_by: "name asc",
		},
		callback: function (r) {
			var select = document.getElementById("cna-course-select");
			if (!select || !r.message) return;
			r.message.forEach(function (row) {
				var opt = document.createElement("option");
				opt.value = row.name;
				opt.textContent = row.name;
				select.appendChild(opt);
			});
		},
	});

	// Course change: clear and load personnel due
	function on_course_change() {
		var val = document.getElementById("cna-course-select").value;
		state.course_name = val || null;
		state.qualified_set = null;
		state.personnel_due = [];
		state.nominated = [];
		render_due();
		render_nominated();
		document.getElementById("cna-add-selected").disabled = true;
		document.getElementById("cna-save-nomination").disabled = true;

		if (!val) {
			document.getElementById("cna-due-empty").style.display = "block";
			document.getElementById("cna-due-loading").style.display = "none";
			document.getElementById("cna-due-table-wrap").style.display = "none";
			document.getElementById("cna-due-count").textContent = "0";
			return;
		}

		document.getElementById("cna-due-empty").style.display = "none";
		document.getElementById("cna-due-loading").style.display = "block";
		document.getElementById("cna-due-table-wrap").style.display = "none";
			
		frappe.call({
			method: `dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_personnel_due_for_course`,
			args: { course_name: val },
			callback: function (r) {
				state.personnel_due = r.message || [];
				state.qualified_set = new Set(state.personnel_due.map(function (p) { return p.service_number; }));
				document.getElementById("cna-due-loading").style.display = "none";
				render_due();
				document.getElementById("cna-add-selected").disabled = state.personnel_due.length === 0;
			},
		});
	}

	function render_due() {
		var wrap = document.getElementById("cna-due-table-wrap");
		var empty = document.getElementById("cna-due-empty");
		var countEl = document.getElementById("cna-due-count");
		countEl.textContent = String(state.personnel_due.length);

		if (!state.personnel_due.length) {
			empty.style.display = "block";
			wrap.style.display = "none";
			return;
		}
		empty.style.display = "none";
		wrap.style.display = "block";

		var already_nominated = new Set(state.nominated.map(function (p) { return p.service_number; }));
		var escaped = function (s) {
			var d = document.createElement("div");
			d.textContent = s == null ? "" : s;
			return d.innerHTML;
		};

		var rows = state.personnel_due.map(function (p, idx) {
			var isAdded = already_nominated.has(p.service_number);
			var checked = isAdded ? "" : ' checked="checked"';
			var rowClass = isAdded ? " cna-row-added" : "";
			var addedCell = isAdded
				? "<span class=\"cna-added-badge\"><i class=\"fa fa-check\"></i> Added</span>"
				: "<input type=\"checkbox\" class=\"cna-due-check\" data-sn=\"" + escaped(p.service_number) + "\"" + checked + ">";
			return (
				"<tr class=\"" + rowClass + "\" data-sn=\"" + escaped(p.service_number) + "\">" +
				"<td style=\"width: 36px; text-align: center;\">" + (idx + 1) + "</td>" +
				"<td style=\"width: 90px;\">" + addedCell + "</td>" +
				"<td>" + escaped(p.service_number) + "</td>" +
				"<td>" + escaped(p.personnel_name) + "</td>" +
				"<td>" + escaped(p.current_rank) + "</td>" +
				"<td>" + escaped(p.current_unit) + "</td>" +
				"</tr>"
			);
		}).join("");

		wrap.innerHTML = (
			"<table class=\"cna-table\">" +
			"<thead><tr><th style=\"width: 36px; text-align: center;\">#</th><th style=\"width: 90px;\">Status</th><th>Service No.</th><th>Name</th><th>Rank</th><th>Unit</th></tr></thead>" +
			"<tbody>" + rows + "</tbody>" +
			"</table>"
		);
	}

	function render_nominated() {
		var wrap = document.getElementById("cna-nominated-table-wrap");
		var empty = document.getElementById("cna-nominated-empty");
		var countEl = document.getElementById("cna-nominated-count");
		countEl.textContent = String(state.nominated.length);

		if (!state.nominated.length) {
			empty.style.display = "block";
			wrap.style.display = "none";
			document.getElementById("cna-save-nomination").disabled = true;
			return;
		}
		empty.style.display = "none";
		wrap.style.display = "block";
		document.getElementById("cna-save-nomination").disabled = false;

		var qualified = state.qualified_set || new Set();
		var escaped = function (s) {
			var d = document.createElement("div");
			d.textContent = s == null ? "" : s;
			return d.innerHTML;
		};

		var rows = state.nominated.map(function (p, idx) {
			var not_qualified = qualified && !qualified.has(p.service_number);
			var rowClass = not_qualified ? " cna-row-not-qualified" : "";
			return (
				"<tr class=\"" + rowClass + "\" data-idx=\"" + idx + "\">" +
				"<td style=\"width: 36px; text-align: center;\">" + (idx + 1) + "</td>" +
				"<td>" + escaped(p.service_number) + "</td>" +
				"<td>" + escaped(p.personnel_name) + "</td>" +
				"<td>" + escaped(p.current_rank) + "</td>" +
				"<td>" + escaped(p.current_unit) + "</td>" +
				"<td><button type=\"button\" class=\"cna-btn cna-btn-danger cna-remove\" data-idx=\"" + idx + "\"><i class=\"fa fa-times\"></i> Remove</button></td>" +
				"</tr>"
			);
		}).join("");

		wrap.innerHTML = (
			"<table class=\"cna-table\">" +
			"<thead><tr><th style=\"width: 36px; text-align: center;\">#</th><th>Service No.</th><th>Name</th><th>Rank</th><th>Unit</th><th style=\"width: 100px;\"></th></tr></thead>" +
			"<tbody>" + rows + "</tbody>" +
			"</table>"
		);

		wrap.querySelectorAll(".cna-remove").forEach(function (btn) {
			btn.addEventListener("click", function () {
				var idx = parseInt(btn.getAttribute("data-idx"), 10);
				state.nominated.splice(idx, 1);
				render_nominated();
				render_due();
			});
		});
	}

	function add_selected() {
		var checks = document.querySelectorAll("#cna-due-table-wrap .cna-due-check:checked");
		var added = 0;
		var dueBySn = {};
		state.personnel_due.forEach(function (p) { dueBySn[p.service_number] = p; });
		checks.forEach(function (cb) {
			var sn = cb.getAttribute("data-sn");
			if (sn && dueBySn[sn] && !state.nominated.some(function (n) { return n.service_number === sn; })) {
				state.nominated.push({
					service_number: dueBySn[sn].service_number,
					personnel_name: dueBySn[sn].personnel_name,
					current_rank: dueBySn[sn].current_rank,
					current_unit: dueBySn[sn].current_unit,
				});
				added++;
			}
		});
		render_nominated();
		render_due();
		if (added) {
			frappe.show_alert({ message: __("Added {0} personnel to nomination.", [added]), indicator: "blue" }, 3);
		}
	}

	function save_nomination() {
		if (!state.course_name || !state.nominated.length) return;
		var not_qualified = state.qualified_set
			? state.nominated.filter(function (n) { return !state.qualified_set.has(n.service_number); })
			: [];
		if (not_qualified.length) {
			frappe.msgprint({
				title: __("Cannot save"),
				message: __("Remove personnel who are not qualified (red rows) before saving."),
				indicator: "red",
			});
			return;
		}
		frappe.call({
			method: `dat_pm.nacstnew.doctype.course_nomination.course_nomination.create_course_nomination_from_page`,
			args: {
				course_name: state.course_name,
				nominated_personnel: state.nominated,
			},
			callback: function (r) {
				if (r.exc) return;
				var name = r.message;
				frappe.show_alert({ message: __("Course Nomination saved: {0}", [name]), indicator: "green" }, 5);
				state.nominated = [];
				render_nominated();
				render_due();
				document.getElementById("cna-save-nomination").disabled = true;
				frappe.set_route("Form", "Course Nomination", name);
			},
		});
	}

	document.getElementById("cna-course-select").addEventListener("change", on_course_change);
	document.getElementById("cna-add-selected").addEventListener("click", add_selected);
	document.getElementById("cna-save-nomination").addEventListener("click", save_nomination);
};