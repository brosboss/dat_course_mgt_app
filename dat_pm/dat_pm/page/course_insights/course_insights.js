// Copyright (c) 2026, !! and contributors
// Course Insights — select a course, view stats, attendees, and personnel due (not yet attended)

frappe.pages["course-insights"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Course Insights"),
		single_column: true,
	});

	wrapper.ci_page = page;
	wrapper.ci_state = {
		course_name: null,
		payload: null,
		attended_paging: { page: 0, page_length: 50 },
		due_paging: { page: 0, page_length: 50 },
	};

	var state = wrapper.ci_state;
	var PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

	page.add_inner_message(`
		<style>
			.ci-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
			.ci-two-col {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 24px;
				align-items: start;
			}
			@media (max-width: 768px) {
				.ci-two-col { grid-template-columns: 1fr; }
			}
			.ci-card {
				background: #fff;
				border-radius: 12px;
				box-shadow: 0 2px 12px rgba(0,0,0,0.06);
				border: 1px solid #e5e7eb;
				margin-bottom: 24px;
				overflow: hidden;
			}
			.ci-card-header {
				background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
				padding: 14px 20px;
				border-bottom: 1px solid #e2e8f0;
				display: flex;
				align-items: center;
				justify-content: space-between;
				flex-wrap: wrap;
				gap: 12px;
			}
			.ci-card-title {
				font-size: 15px;
				font-weight: 600;
				color: #0f172a;
				display: flex;
				align-items: center;
				gap: 8px;
			}
			.ci-card-title .badge {
				font-size: 11px;
				font-weight: 500;
				padding: 3px 10px;
				border-radius: 999px;
				background: rgba(59, 130, 246, 0.12);
				color: #1d4ed8;
				border: 1px solid rgba(59, 130, 246, 0.3);
			}
			.ci-card-body { padding: 20px; }
			.ci-empty { text-align: center; padding: 32px 20px; color: #64748b; font-size: 13px; }
			.ci-loading { text-align: center; padding: 40px 20px; color: #64748b; }
			.ci-loading .fa-spinner { font-size: 24px; margin-bottom: 8px; opacity: 0.7; }
			.ci-table-wrap { overflow-x: auto; }
			.ci-table-wrap.ci-table-dimmed { opacity: 0.45; pointer-events: none; }
			.ci-table {
				width: 100%;
				border-collapse: collapse;
				font-size: 13px;
			}
			.ci-table th {
				text-align: left;
				padding: 10px 12px;
				background: #f8fafc;
				color: #475569;
				font-weight: 600;
				border-bottom: 2px solid #e2e8f0;
			}
			.ci-table td {
				padding: 10px 12px;
				border-bottom: 1px solid #f1f5f9;
			}
			.ci-table tbody tr:hover { background: #f8fafc; }
			.ci-select-wrap { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
			.ci-course-link-wrap {
				flex: 1;
				min-width: 280px;
				max-width: 520px;
			}
			.ci-course-link-wrap .frappe-control { margin-bottom: 0; }
			.ci-course-link-wrap .control-input-wrapper { width: 100%; }
			.ci-link {
				color: #2563eb;
				text-decoration: none;
				cursor: pointer;
			}
			.ci-link:hover { text-decoration: underline; }
			.ci-stats-grid {
				display: grid;
				grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
				gap: 12px;
				margin-bottom: 16px;
			}
			.ci-stat {
				background: #f8fafc;
				border: 1px solid #e2e8f0;
				border-radius: 10px;
				padding: 12px 14px;
			}
			.ci-stat-value {
				font-size: 22px;
				font-weight: 700;
				color: #0f172a;
				line-height: 1.2;
			}
			.ci-stat-label {
				font-size: 12px;
				color: #64748b;
				margin-top: 4px;
			}
			.ci-meta {
				font-size: 13px;
				color: #475569;
				line-height: 1.5;
			}
			.ci-meta dt { font-weight: 600; color: #334155; margin-top: 10px; }
			.ci-meta dt:first-child { margin-top: 0; }
			.ci-meta dd { margin: 4px 0 0 0; }
			.ci-pill-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
			.ci-pill {
				font-size: 11px;
				padding: 4px 10px;
				border-radius: 999px;
				background: #e0f2fe;
				color: #0369a1;
				border: 1px solid #bae6fd;
			}
			.ci-pager {
				display: flex;
				flex-wrap: wrap;
				align-items: center;
				justify-content: space-between;
				gap: 10px;
				margin-top: 14px;
				padding-top: 12px;
				border-top: 1px solid #e2e8f0;
				font-size: 12px;
				color: #64748b;
			}
			.ci-pager-nav {
				display: flex;
				flex-wrap: wrap;
				align-items: center;
				gap: 8px;
			}
			.ci-pager-nav .btn { margin: 0; }
			.ci-pager-nav select.form-control {
				width: auto;
				min-width: 72px;
				height: 28px;
				padding: 2px 8px;
				font-size: 12px;
			}
		</style>
	`);

	var html = `
		<div class="ci-container">
			<div class="ci-card">
				<div class="ci-card-header">
					<div class="ci-card-title">
						<i class="fa fa-graduation-cap"></i> ${__("Select course")}
					</div>
				</div>
				<div class="ci-card-body">
					<div class="ci-select-wrap">
						<div class="ci-course-link-wrap" id="ci-course-link-wrap"></div>
						<button type="button" class="btn btn-default btn-sm" id="ci-clear" style="margin-top: 4px;">${__("Clear")}</button>
					</div>
					<p class="text-muted" style="margin: 12px 0 0 0; font-size: 12px;">${__(
		"Search and pick a course. You will see reference details, how many personnel have completed it, status mix, who attended, and who is due but has not yet attended (rank eligible, prerequisites met). Lists load in pages."
	)}</p>
				</div>
			</div>

			<div class="ci-card" id="ci-card-summary" style="display: none;">
				<div class="ci-card-header">
					<div class="ci-card-title">
						<i class="fa fa-bar-chart"></i> ${__("Statistics & course details")}
					</div>
				</div>
				<div class="ci-card-body">
					<div class="ci-loading" id="ci-summary-loading" style="display: none;">
						<div><i class="fa fa-spinner fa-spin"></i></div>
						<div>${__("Loading…")}</div>
					</div>
					<div id="ci-summary-content"></div>
				</div>
			</div>

			<div class="ci-two-col">
				<div class="ci-card" id="ci-card-attended">
					<div class="ci-card-header">
						<div class="ci-card-title">
							<i class="fa fa-check-circle"></i> ${__("Personnel who attended")}
							<span class="badge" id="ci-attended-badge">0</span>
						</div>
					</div>
					<div class="ci-card-body">
						<div id="ci-attended-content">
							<div class="ci-empty" id="ci-attended-empty">${__("Select a course above.")}</div>
							<div class="ci-loading" id="ci-attended-loading" style="display: none;">
								<div><i class="fa fa-spinner fa-spin"></i></div>
								<div>${__("Loading…")}</div>
							</div>
							<div class="ci-table-wrap" id="ci-attended-table-wrap" style="display: none;"></div>
							<div class="ci-pager" id="ci-attended-pager" style="display: none;"></div>
						</div>
					</div>
				</div>

				<div class="ci-card" id="ci-card-due">
					<div class="ci-card-header">
						<div class="ci-card-title">
							<i class="fa fa-user-clock"></i> ${__("Due — not yet attended")}
							<span class="badge" id="ci-due-badge">0</span>
						</div>
					</div>
					<div class="ci-card-body">
						<div id="ci-due-content">
							<div class="ci-empty" id="ci-due-empty">${__("Select a course above.")}</div>
							<div class="ci-loading" id="ci-due-loading" style="display: none;">
								<div><i class="fa fa-spinner fa-spin"></i></div>
								<div>${__("Loading…")}</div>
							</div>
							<div class="ci-table-wrap" id="ci-due-table-wrap" style="display: none;"></div>
							<div class="ci-pager" id="ci-due-pager" style="display: none;"></div>
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

	function get_course_link_value() {
		var c = wrapper.ci_course_control;
		return c && typeof c.get_value === "function" ? (c.get_value() || "") : "";
	}

	function reset_paging() {
		state.attended_paging = { page: 0, page_length: state.attended_paging.page_length || 50 };
		state.due_paging = { page: 0, page_length: state.due_paging.page_length || 50 };
	}

	function set_visibility_loading(course_selected) {
		var summaryCard = document.getElementById("ci-card-summary");
		if (!course_selected) {
			summaryCard.style.display = "none";
			document.getElementById("ci-attended-empty").style.display = "block";
			document.getElementById("ci-attended-loading").style.display = "none";
			document.getElementById("ci-attended-table-wrap").style.display = "none";
			document.getElementById("ci-attended-pager").style.display = "none";
			document.getElementById("ci-due-empty").style.display = "block";
			document.getElementById("ci-due-loading").style.display = "none";
			document.getElementById("ci-due-table-wrap").style.display = "none";
			document.getElementById("ci-due-pager").style.display = "none";
			document.getElementById("ci-attended-badge").textContent = "0";
			document.getElementById("ci-due-badge").textContent = "0";
			return;
		}
		summaryCard.style.display = "block";
		document.getElementById("ci-summary-loading").style.display = "block";
		document.getElementById("ci-summary-content").innerHTML = "";
		document.getElementById("ci-attended-empty").style.display = "none";
		document.getElementById("ci-attended-loading").style.display = "block";
		document.getElementById("ci-attended-table-wrap").style.display = "none";
		document.getElementById("ci-attended-pager").style.display = "none";
		document.getElementById("ci-due-empty").style.display = "none";
		document.getElementById("ci-due-loading").style.display = "block";
		document.getElementById("ci-due-table-wrap").style.display = "none";
		document.getElementById("ci-due-pager").style.display = "none";
	}

	function render_summary(payload) {
		document.getElementById("ci-summary-loading").style.display = "none";
		var c = payload.course || {};
		var st = payload.stats || {};
		var breakdown = st.status_breakdown || {};
		var breakdownRows = Object.keys(breakdown)
			.map(function (k) {
				return "<tr><td>" + esc(k) + "</td><td style=\"text-align:right\">" + esc(breakdown[k]) + "</td></tr>";
			})
			.join("");

		var ranks = (c.qualified_ranks || []).map(function (r) {
			return "<span class=\"ci-pill\">" + esc(r) + "</span>";
		}).join("");
		var prereqs = (c.prerequisites || []).map(function (p) {
			return "<span class=\"ci-pill\">" + esc(p) + "</span>";
		}).join("");

		var statsHtml =
			"<div class=\"ci-stats-grid\">" +
			"<div class=\"ci-stat\"><div class=\"ci-stat-value\">" +
			esc(st.personnel_attended_count) +
			"</div><div class=\"ci-stat-label\">" +
			__("Persons attended (distinct)") +
			"</div></div>" +
			"<div class=\"ci-stat\"><div class=\"ci-stat-value\">" +
			esc(st.course_attended_records_count) +
			"</div><div class=\"ci-stat-label\">" +
			__("Submitted attendance records") +
			"</div></div>" +
			"<div class=\"ci-stat\"><div class=\"ci-stat-value\">" +
			esc(st.personnel_due_count) +
			"</div><div class=\"ci-stat-label\">" +
			__("Persons due (not yet attended)") +
			"</div></div>" +
			"<div class=\"ci-stat\"><div class=\"ci-stat-value\">" +
			esc(st.qualified_rank_count) +
			"</div><div class=\"ci-stat-label\">" +
			__("Qualified ranks on course") +
			"</div></div>" +
			"<div class=\"ci-stat\"><div class=\"ci-stat-value\">" +
			esc(st.prerequisite_count) +
			"</div><div class=\"ci-stat-label\">" +
			__("Mandatory prerequisites") +
			"</div></div>" +
			"</div>";

		var metaHtml =
			"<dl class=\"ci-meta\">" +
			"<dt>" +
			__("Abbreviation") +
			"</dt><dd>" +
			(c.course_abbreviation ? esc(c.course_abbreviation) : "—") +
			"</dd>" +
			"<dt>" +
			__("Frequency") +
			"</dt><dd>" +
			(c.course_frequency ? esc(c.course_frequency) : "—") +
			"</dd>" +
			"<dt>" +
			__("Qualified ranks") +
			"</dt><dd>" +
			(ranks || "<span class=\"text-muted\">" + __("None configured") + "</span>") +
			"</dd>" +
			"<dt>" +
			__("Prerequisites") +
			"</dt><dd>" +
			(prereqs || "<span class=\"text-muted\">" + __("None") + "</span>") +
			"</dd>" +
			"</dl>";

		var statusHtml = "";
		if (breakdownRows) {
			statusHtml =
				"<h4 style=\"font-size: 13px; margin: 16px 0 8px 0; color: #334155;\">" +
				__("Attendance records by status") +
				"</h4>" +
				"<div class=\"ci-table-wrap\"><table class=\"ci-table\"><thead><tr><th>" +
				__("Status") +
				"</th><th style=\"text-align:right\">" +
				__("Count") +
				"</th></tr></thead><tbody>" +
				breakdownRows +
				"</tbody></table></div>";
		}

		document.getElementById("ci-summary-content").innerHTML = statsHtml + metaHtml + statusHtml;

		document.getElementById("ci-attended-badge").textContent = String(
			st.personnel_attended_count != null ? st.personnel_attended_count : 0
		);
		document.getElementById("ci-due-badge").textContent = String(st.personnel_due_count != null ? st.personnel_due_count : 0);
	}

	function build_page_size_select(id, current) {
		var opts = PAGE_SIZE_OPTIONS.map(function (n) {
			return "<option value=\"" + n + "\"" + (n === current ? " selected" : "") + ">" + n + "</option>";
		}).join("");
		return "<select class=\"form-control input-xs\" id=\"" + id + "\" aria-label=\"" + esc(__("Rows per page")) + "\">" + opts + "</select>";
	}

	function render_attended_pager(msg, loading) {
		var pg = state.attended_paging;
		var total = msg.total || 0;
		var list = msg.data || [];
		var limit_start = msg.limit_start != null ? msg.limit_start : pg.page * pg.page_length;
		var pager = document.getElementById("ci-attended-pager");
		if (!total) {
			pager.style.display = "none";
			return;
		}
		pager.style.display = "flex";
		var fromIx = list.length ? limit_start + 1 : 0;
		var toIx = limit_start + list.length;
		var nPages = Math.max(1, Math.ceil(total / pg.page_length));
		var curPage = Math.min(pg.page + 1, nPages);
		if (pg.page >= nPages) {
			pg.page = Math.max(0, nPages - 1);
		}

		var rangeText =
			String(fromIx) +
			"–" +
			String(toIx) +
			" " +
			__("of") +
			" " +
			String(total) +
			" " +
			__("records") +
			(loading ? " · " + __("Loading…") : "");

		pager.innerHTML =
			"<span>" +
			rangeText +
			"</span>" +
			"<div class=\"ci-pager-nav\">" +
			build_page_size_select("ci-attended-page-size", pg.page_length) +
			"<button type=\"button\" class=\"btn btn-default btn-xs\" id=\"ci-attended-prev\"" +
			(pg.page <= 0 ? " disabled" : "") +
			">" +
			__("Previous") +
			"</button>" +
			"<span>" + __("Page") + " " + String(curPage) + " " + __("of") + " " + String(nPages) + "</span>" +
			"<button type=\"button\" class=\"btn btn-default btn-xs\" id=\"ci-attended-next\"" +
			(limit_start + list.length >= total ? " disabled" : "") +
			">" +
			__("Next") +
			"</button>" +
			"</div>";

		document.getElementById("ci-attended-page-size").addEventListener("change", function () {
			var v = parseInt(this.value, 10) || 50;
			state.attended_paging.page_length = v;
			state.attended_paging.page = 0;
			fetch_attended_page();
		});
		document.getElementById("ci-attended-prev").addEventListener("click", function () {
			if (state.attended_paging.page > 0) {
				state.attended_paging.page -= 1;
				fetch_attended_page();
			}
		});
		document.getElementById("ci-attended-next").addEventListener("click", function () {
			var pl = state.attended_paging.page_length;
			var ls = (state.attended_paging.page + 1) * pl;
			if (ls < total) {
				state.attended_paging.page += 1;
				fetch_attended_page();
			}
		});
	}

	function render_due_pager(msg, loading) {
		var pg = state.due_paging;
		var total = msg.total || 0;
		var list = msg.data || [];
		var limit_start = msg.limit_start != null ? msg.limit_start : pg.page * pg.page_length;
		var pager = document.getElementById("ci-due-pager");
		if (!total) {
			pager.style.display = "none";
			return;
		}
		pager.style.display = "flex";
		var fromIx = list.length ? limit_start + 1 : 0;
		var toIx = limit_start + list.length;
		var nPages = Math.max(1, Math.ceil(total / pg.page_length));
		var curPage = Math.min(pg.page + 1, nPages);
		if (pg.page >= nPages) {
			pg.page = Math.max(0, nPages - 1);
		}

		var rangeText =
			String(fromIx) +
			"–" +
			String(toIx) +
			" " +
			__("of") +
			" " +
			String(total) +
			" " +
			__("personnel") +
			(loading ? " · " + __("Loading…") : "");

		pager.innerHTML =
			"<span>" +
			rangeText +
			"</span>" +
			"<div class=\"ci-pager-nav\">" +
			build_page_size_select("ci-due-page-size", pg.page_length) +
			"<button type=\"button\" class=\"btn btn-default btn-xs\" id=\"ci-due-prev\"" +
			(pg.page <= 0 ? " disabled" : "") +
			">" +
			__("Previous") +
			"</button>" +
			"<span>" + __("Page") + " " + String(curPage) + " " + __("of") + " " + String(nPages) + "</span>" +
			"<button type=\"button\" class=\"btn btn-default btn-xs\" id=\"ci-due-next\"" +
			(limit_start + list.length >= total ? " disabled" : "") +
			">" +
			__("Next") +
			"</button>" +
			"</div>";

		document.getElementById("ci-due-page-size").addEventListener("change", function () {
			var v = parseInt(this.value, 10) || 50;
			state.due_paging.page_length = v;
			state.due_paging.page = 0;
			fetch_due_page();
		});
		document.getElementById("ci-due-prev").addEventListener("click", function () {
			if (state.due_paging.page > 0) {
				state.due_paging.page -= 1;
				fetch_due_page();
			}
		});
		document.getElementById("ci-due-next").addEventListener("click", function () {
			var pl = state.due_paging.page_length;
			var ls = (state.due_paging.page + 1) * pl;
			if (ls < total) {
				state.due_paging.page += 1;
				fetch_due_page();
			}
		});
	}

	function render_attended_table(msg) {
		document.getElementById("ci-attended-loading").style.display = "none";
		var wrap = document.getElementById("ci-attended-table-wrap");
		var empty = document.getElementById("ci-attended-empty");
		var list = msg.data || [];
		var limit_start = msg.limit_start != null ? msg.limit_start : 0;

		if (!list.length && (msg.total || 0) === 0) {
			empty.style.display = "block";
			empty.textContent = __("No submitted attendance for this course.");
			wrap.style.display = "none";
			return;
		}
		empty.style.display = "none";
		wrap.style.display = "block";

		var rows = list
			.map(function (row, idx) {
				var docLink =
					"<a class=\"ci-link\" href=\"#Form/Course Attended/" + esc(row.name) + "\">" + esc(row.personnel_name || row.service_number) + "</a>";
				var rowNum = limit_start + idx + 1;
				return (
					"<tr>" +
					"<td style=\"width: 36px; text-align: center;\">" +
					rowNum +
					"</td>" +
					"<td>" +
					docLink +
					"</td>" +
					"<td>" +
					esc(row.service_number) +
					"</td>" +
					"<td>" +
					esc(row.course_start_date) +
					"</td>" +
					"<td>" +
					esc(row.course_end_date) +
					"</td>" +
					"<td>" +
					esc(row.grade) +
					"</td>" +
					"<td>" +
					esc(row.course_status) +
					"</td>" +
					"</tr>"
				);
			})
			.join("");

		wrap.innerHTML =
			"<table class=\"ci-table\">" +
			"<thead><tr><th style=\"width: 36px; text-align: center;\">#</th><th>" +
			__("Personnel") +
			"</th><th>" +
			__("Service number") +
			"</th><th>" +
			__("Start") +
			"</th><th>" +
			__("End") +
			"</th><th>" +
			__("Grade") +
			"</th><th>" +
			__("Status") +
			"</th></tr></thead>" +
			"<tbody>" +
			rows +
			"</tbody>" +
			"</table>";
	}

	function render_due_table(msg) {
		document.getElementById("ci-due-loading").style.display = "none";
		var wrap = document.getElementById("ci-due-table-wrap");
		var empty = document.getElementById("ci-due-empty");
		var list = msg.data || [];
		var limit_start = msg.limit_start != null ? msg.limit_start : 0;

		if (!list.length && (msg.total || 0) === 0) {
			empty.style.display = "block";
			empty.textContent = __(
				"No personnel are currently due (check qualified ranks on the course, or all eligible personnel may have already attended)."
			);
			wrap.style.display = "none";
			return;
		}
		empty.style.display = "none";
		wrap.style.display = "block";

		var rows = list
			.map(function (row, idx) {
				var pLink =
					"<a class=\"ci-link\" href=\"#Form/Personnel/" + esc(row.service_number) + "\">" + esc(row.personnel_name || row.service_number) + "</a>";
				var rowNum = limit_start + idx + 1;
				return (
					"<tr>" +
					"<td style=\"width: 36px; text-align: center;\">" +
					rowNum +
					"</td>" +
					"<td>" +
					pLink +
					"</td>" +
					"<td>" +
					esc(row.service_number) +
					"</td>" +
					"<td>" +
					esc(row.current_rank) +
					"</td>" +
					"<td>" +
					esc(row.current_unit) +
					"</td>" +
					"</tr>"
				);
			})
			.join("");

		wrap.innerHTML =
			"<table class=\"ci-table\">" +
			"<thead><tr><th style=\"width: 36px; text-align: center;\">#</th><th>" +
			__("Personnel") +
			"</th><th>" +
			__("Service number") +
			"</th><th>" +
			__("Rank") +
			"</th><th>" +
			__("Unit") +
			"</th></tr></thead>" +
			"<tbody>" +
			rows +
			"</tbody>" +
			"</table>";
	}

	function fetch_attended_page() {
		var course = state.course_name;
		if (!course) return;
		var pg = state.attended_paging;
		var limit_start = pg.page * pg.page_length;
		var wrap = document.getElementById("ci-attended-table-wrap");
		if (wrap.style.display === "block") {
			wrap.classList.add("ci-table-dimmed");
		}
		frappe.call({
			method: "dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_course_insights_attended_page",
			args: {
				course_name: course,
				limit_start: limit_start,
				limit_page_length: pg.page_length,
			},
			callback: function (r) {
				wrap.classList.remove("ci-table-dimmed");
				if (r.exc) {
					frappe.msgprint({ title: __("Error"), message: __("Could not load attendance page."), indicator: "red" });
					return;
				}
				var msg = r.message || {};
				var total = msg.total || 0;
				if (!(msg.data || []).length && total > 0 && state.attended_paging.page > 0) {
					state.attended_paging.page = 0;
					fetch_attended_page();
					return;
				}
				render_attended_table(msg);
				render_attended_pager(msg, false);
			},
		});
	}

	function fetch_due_page() {
		var course = state.course_name;
		if (!course) return;
		var pg = state.due_paging;
		var limit_start = pg.page * pg.page_length;
		var wrap = document.getElementById("ci-due-table-wrap");
		if (wrap.style.display === "block") {
			wrap.classList.add("ci-table-dimmed");
		}
		frappe.call({
			method: "dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_course_insights_due_page",
			args: {
				course_name: course,
				limit_start: limit_start,
				limit_page_length: pg.page_length,
			},
			callback: function (r) {
				wrap.classList.remove("ci-table-dimmed");
				if (r.exc) {
					frappe.msgprint({ title: __("Error"), message: __("Could not load due personnel page."), indicator: "red" });
					return;
				}
				var msg = r.message || {};
				var total = msg.total || 0;
				if (!(msg.data || []).length && total > 0 && state.due_paging.page > 0) {
					state.due_paging.page = 0;
					fetch_due_page();
					return;
				}
				render_due_table(msg);
				render_due_pager(msg, false);
			},
		});
	}

	function load_initial_lists() {
		var pgA = state.attended_paging;
		var pgD = state.due_paging;
		var course = state.course_name;
		var lsA = pgA.page * pgA.page_length;
		var lsD = pgD.page * pgD.page_length;

		frappe.call({
			method: "dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_course_insights_attended_page",
			args: { course_name: course, limit_start: lsA, limit_page_length: pgA.page_length },
			callback: function (r) {
				document.getElementById("ci-attended-loading").style.display = "none";
				if (r.exc) {
					document.getElementById("ci-attended-empty").style.display = "block";
					document.getElementById("ci-attended-empty").textContent = __("Could not load attendance list.");
					return;
				}
				var msg = r.message || {};
				render_attended_table(msg);
				render_attended_pager(msg, false);
			},
		});

		frappe.call({
			method: "dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_course_insights_due_page",
			args: { course_name: course, limit_start: lsD, limit_page_length: pgD.page_length },
			callback: function (r) {
				document.getElementById("ci-due-loading").style.display = "none";
				if (r.exc) {
					document.getElementById("ci-due-empty").style.display = "block";
					document.getElementById("ci-due-empty").textContent = __("Could not load due personnel list.");
					return;
				}
				var msg = r.message || {};
				render_due_table(msg);
				render_due_pager(msg, false);
			},
		});
	}

	function on_course_change() {
		var val = get_course_link_value();
		state.course_name = val || null;
		state.payload = null;

		if (!val) {
			set_visibility_loading(false);
			reset_paging();
			return;
		}

		reset_paging();
		set_visibility_loading(true);

		frappe.call({
			method: "dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_course_insights_data",
			args: { course_name: val },
			callback: function (r) {
				if (r.exc) {
					document.getElementById("ci-summary-loading").style.display = "none";
					document.getElementById("ci-attended-loading").style.display = "none";
					document.getElementById("ci-due-loading").style.display = "none";
					document.getElementById("ci-summary-content").innerHTML = "";
					document.getElementById("ci-attended-empty").style.display = "block";
					document.getElementById("ci-attended-empty").textContent = __("Could not load data. Check permissions or try again.");
					document.getElementById("ci-attended-table-wrap").style.display = "none";
					document.getElementById("ci-attended-pager").style.display = "none";
					document.getElementById("ci-due-empty").style.display = "block";
					document.getElementById("ci-due-empty").textContent = __("Could not load data. Check permissions or try again.");
					document.getElementById("ci-due-table-wrap").style.display = "none";
					document.getElementById("ci-due-pager").style.display = "none";
					document.getElementById("ci-attended-badge").textContent = "0";
					document.getElementById("ci-due-badge").textContent = "0";
					return;
				}
				state.payload = r.message || {};
				render_summary(state.payload);
				load_initial_lists();
			},
		});
	}

	wrapper.ci_course_control = frappe.ui.form.make_control({
		df: {
			fieldtype: "Link",
			options: "Course Name",
			fieldname: "course_name",
			label: "",
			placeholder: __("Search course name…"),
			reqd: 0,
			change: function () {
				on_course_change();
			},
		},
		parent: page.main.find("#ci-course-link-wrap"),
		render_input: true,
	});
	wrapper.ci_course_control.toggle_label(false);
	wrapper.ci_course_control.toggle_description(false);
	wrapper.ci_course_control.refresh();

	document.getElementById("ci-clear").addEventListener("click", function () {
		if (wrapper.ci_course_control && wrapper.ci_course_control.set_value) {
			wrapper.ci_course_control.set_value("");
		}
		on_course_change();
	});
};
