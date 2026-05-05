// Copyright (c) 2026, !! and contributors
// Personnel Course Details – select a personnel, view courses attended and courses eligible

frappe.pages["personnel-course-det"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Personnel Course Details"),
		single_column: true,
	});

	wrapper.pcd_page = page;
	wrapper.pcd_state = {
		service_number: null,
		personnel_name: null,
		courses_attended: [],
		courses_eligible: [],
	};

	var state = wrapper.pcd_state;

	page.add_inner_message(`
		<style>
			.pcd-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
			.pcd-two-col {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 24px;
				align-items: start;
			}
			@media (max-width: 768px) {
				.pcd-two-col { grid-template-columns: 1fr; }
			}
			.pcd-card {
				background: #fff;
				border-radius: 12px;
				box-shadow: 0 2px 12px rgba(0,0,0,0.06);
				border: 1px solid #e5e7eb;
				margin-bottom: 24px;
				overflow: hidden;
			}
			.pcd-card-header {
				background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
				padding: 14px 20px;
				border-bottom: 1px solid #e2e8f0;
				display: flex;
				align-items: center;
				justify-content: space-between;
				flex-wrap: wrap;
				gap: 12px;
			}
			.pcd-card-title {
				font-size: 15px;
				font-weight: 600;
				color: #0f172a;
				display: flex;
				align-items: center;
				gap: 8px;
			}
			.pcd-card-title .badge {
				font-size: 11px;
				font-weight: 500;
				padding: 3px 10px;
				border-radius: 999px;
				background: rgba(59, 130, 246, 0.12);
				color: #1d4ed8;
				border: 1px solid rgba(59, 130, 246, 0.3);
			}
			.pcd-card-body { padding: 20px; }
			.pcd-empty { text-align: center; padding: 32px 20px; color: #64748b; font-size: 13px; }
			.pcd-loading { text-align: center; padding: 40px 20px; color: #64748b; }
			.pcd-loading .fa-spinner { font-size: 24px; margin-bottom: 8px; opacity: 0.7; }
			.pcd-table-wrap { overflow-x: auto; }
			.pcd-table {
				width: 100%;
				border-collapse: collapse;
				font-size: 13px;
			}
			.pcd-table th {
				text-align: left;
				padding: 10px 12px;
				background: #f8fafc;
				color: #475569;
				font-weight: 600;
				border-bottom: 2px solid #e2e8f0;
			}
			.pcd-table td {
				padding: 10px 12px;
				border-bottom: 1px solid #f1f5f9;
			}
			.pcd-table tbody tr:hover { background: #f8fafc; }
			.pcd-select-wrap { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
			.pcd-personnel-link-wrap {
				flex: 1;
				min-width: 280px;
				max-width: 520px;
			}
			.pcd-personnel-link-wrap .frappe-control { margin-bottom: 0; }
			.pcd-personnel-link-wrap .control-input-wrapper { width: 100%; }
			.pcd-link {
				color: #2563eb;
				text-decoration: none;
				cursor: pointer;
			}
			.pcd-link:hover { text-decoration: underline; }
		</style>
	`);

	var html = `
		<div class="pcd-container">
			<div class="pcd-card">
				<div class="pcd-card-header">
					<div class="pcd-card-title">
						<i class="fa fa-user"></i> Select personnel
					</div>
				</div>
				<div class="pcd-card-body">
					<div class="pcd-select-wrap">
						<div class="pcd-personnel-link-wrap" id="pcd-personnel-link-wrap"></div>
						<button type="button" class="btn btn-default btn-sm" id="pcd-clear" style="margin-top: 4px;">Clear</button>
					</div>
					<p class="text-muted" style="margin: 12px 0 0 0; font-size: 12px;">Type to search personnel by name or service number (results load as you type). Then view courses attended and eligible courses (by rank, not yet taken, prerequisites completed).</p>
				</div>
			</div>

			<div class="pcd-two-col">
				<div class="pcd-card" id="pcd-card-attended">
					<div class="pcd-card-header">
						<div class="pcd-card-title">
							<i class="fa fa-check-circle"></i> Courses attended
							<span class="badge" id="pcd-attended-count">0</span>
						</div>
					</div>
					<div class="pcd-card-body">
						<div id="pcd-attended-content">
							<div class="pcd-empty" id="pcd-attended-empty">Select a personnel above.</div>
							<div class="pcd-loading" id="pcd-attended-loading" style="display: none;">
								<div><i class="fa fa-spinner fa-spin"></i></div>
								<div>Loading…</div>
							</div>
							<div class="pcd-table-wrap" id="pcd-attended-table-wrap" style="display: none;"></div>
						</div>
					</div>
				</div>

				<div class="pcd-card" id="pcd-card-eligible">
					<div class="pcd-card-header">
						<div class="pcd-card-title">
							<i class="fa fa-graduation-cap"></i> Courses eligible for
							<span class="badge" id="pcd-eligible-count">0</span>
						</div>
					</div>
					<div class="pcd-card-body">
						<div id="pcd-eligible-content">
							<div class="pcd-empty" id="pcd-eligible-empty">Select a personnel above.</div>
							<div class="pcd-loading" id="pcd-eligible-loading" style="display: none;">
								<div><i class="fa fa-spinner fa-spin"></i></div>
								<div>Loading…</div>
							</div>
							<div class="pcd-table-wrap" id="pcd-eligible-table-wrap" style="display: none;"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;

	page.main.html(html);

	function esc(s) {
		if (s == null || s === undefined) return "";
		var d = document.createElement("div");
		d.textContent = String(s);
		return d.innerHTML;
	}

	function get_personnel_link_value() {
		var c = wrapper.pcd_personnel_control;
		return c && typeof c.get_value === "function" ? (c.get_value() || "") : "";
	}

	function on_personnel_change() {
		var val = get_personnel_link_value();
		state.service_number = val || null;
		state.personnel_name = null;
		if (val) {
			frappe.db.get_value("Personnel", val, "personnel_name", function (message) {
				if (message && message.personnel_name) state.personnel_name = message.personnel_name;
			});
		}
		state.courses_attended = [];
		state.courses_eligible = [];

		document.getElementById("pcd-attended-empty").style.display = "block";
		document.getElementById("pcd-attended-loading").style.display = "none";
		document.getElementById("pcd-attended-table-wrap").style.display = "none";
		document.getElementById("pcd-attended-count").textContent = "0";
		document.getElementById("pcd-eligible-empty").style.display = "block";
		document.getElementById("pcd-eligible-loading").style.display = "none";
		document.getElementById("pcd-eligible-table-wrap").style.display = "none";
		document.getElementById("pcd-eligible-count").textContent = "0";

		if (!val) return;

		document.getElementById("pcd-attended-empty").style.display = "none";
		document.getElementById("pcd-attended-loading").style.display = "block";
		document.getElementById("pcd-eligible-empty").style.display = "none";
		document.getElementById("pcd-eligible-loading").style.display = "block";

		frappe.call({
			method: `dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_courses_attended_for_personnel`,
			args: { service_number: val },
			callback: function (r) {
				state.courses_attended = r.message || [];
				document.getElementById("pcd-attended-loading").style.display = "none";
				render_attended();
			},
		});

		frappe.call({
			method: `dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_courses_eligible_for_personnel`,
			args: { service_number: val },
			callback: function (r) {
				state.courses_eligible = r.message || [];
				document.getElementById("pcd-eligible-loading").style.display = "none";
				render_eligible();
			},
		});
	}

	function render_attended() {
		var wrap = document.getElementById("pcd-attended-table-wrap");
		var empty = document.getElementById("pcd-attended-empty");
		var countEl = document.getElementById("pcd-attended-count");
		var list = state.courses_attended;
		countEl.textContent = String(list.length);

		if (!list.length) {
			empty.style.display = "block";
			empty.textContent = __("No courses attended on record.");
			wrap.style.display = "none";
			return;
		}
		empty.style.display = "none";
		wrap.style.display = "block";

		var rows = list.map(function (row, idx) {
			var doctype = row.record_doctype || "Course Attended";
			var docLink =
				"<a class=\"pcd-link\" href=\"#Form/" +
				esc(doctype) +
				"/" +
				esc(row.name) +
				"\">" +
				esc(row.course_name) +
				"</a>";
			return (
				"<tr>" +
				"<td style=\"width: 36px; text-align: center;\">" + (idx + 1) + "</td>" +
				"<td>" + docLink + "</td>" +
				"<td>" + esc(row.course_start_date) + "</td>" +
				"<td>" + esc(row.course_end_date) + "</td>" +
				"<td>" + esc(row.grade) + "</td>" +
				"<td>" + esc(row.specialty) + "</td>" +
				"</tr>"
			);
		}).join("");

		wrap.innerHTML = (
			"<table class=\"pcd-table\">" +
			"<thead><tr><th style=\"width: 36px; text-align: center;\">#</th><th>Course</th><th>Start</th><th>End</th><th>Grade</th><th>Specialty</th></tr></thead>" +
			"<tbody>" + rows + "</tbody>" +
			"</table>"
		);
	}

	function render_eligible() {
		var wrap = document.getElementById("pcd-eligible-table-wrap");
		var empty = document.getElementById("pcd-eligible-empty");
		var countEl = document.getElementById("pcd-eligible-count");
		var list = state.courses_eligible;
		countEl.textContent = String(list.length);

		if (!list.length) {
			empty.style.display = "block";
			empty.textContent = __("No eligible courses (rank, already taken, or prerequisites not met).");
			wrap.style.display = "none";
			return;
		}
		empty.style.display = "none";
		wrap.style.display = "block";

		var rows = list.map(function (row, idx) {
			var courseName = row.course_name || "";
			var docLink = "<a class=\"pcd-link\" href=\"#Form/Course Name/" + esc(courseName) + "\">" + esc(courseName) + "</a>";
			return (
				"<tr>" +
				"<td style=\"width: 36px; text-align: center;\">" + (idx + 1) + "</td>" +
				"<td>" + docLink + "</td>" +
				"</tr>"
			);
		}).join("");

		wrap.innerHTML = (
			"<table class=\"pcd-table\">" +
			"<thead><tr><th style=\"width: 36px; text-align: center;\">#</th><th>Course name</th></tr></thead>" +
			"<tbody>" + rows + "</tbody>" +
			"</table>"
		);
	}

	wrapper.pcd_personnel_control = frappe.ui.form.make_control({
		df: {
			fieldtype: "Link",
			options: "Personnel",
			fieldname: "personnel",
			label: "",
			placeholder: __("Search name or service number…"),
			reqd: 0,
			change: function () {
				on_personnel_change();
			},
		},
		parent: page.main.find("#pcd-personnel-link-wrap"),
		render_input: true,
	});
	wrapper.pcd_personnel_control.toggle_label(false);
	wrapper.pcd_personnel_control.toggle_description(false);
	wrapper.pcd_personnel_control.refresh();

	document.getElementById("pcd-clear").addEventListener("click", function () {
		if (wrapper.pcd_personnel_control && wrapper.pcd_personnel_control.set_value) {
			wrapper.pcd_personnel_control.set_value("");
		}
		on_personnel_change();
	});
};
