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
		mode: "new",
		course_name: null,
		qualified_set: null,
		qualification_details: {},
		personnel_due: [],
		nominated: [],
		editing_nomination_name: null,
		loaded_docstatus: null,
		course_ended: false,
		allow_past_end_edit: false,
		_suspend_course_change: false,
	};

	var state = wrapper.cna_state;

	function compress_nomination_remark_for_storage(raw) {
		if (!raw || !String(raw).trim()) {
			return "";
		}
		var s = String(raw);
		var low = s.toLowerCase();
		if (low.indexOf("not qualified") !== -1) {
			return __("Not qualified");
		}
		if (s.length > 55 || low.indexOf("qualified:") !== -1 || low.indexOf("rank is eligible") !== -1) {
			return __("Qualified");
		}
		return s;
	}

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
			.cna-table-wrap-nominated {
				overflow-x: auto;
				-webkit-overflow-scrolling: touch;
			}
			.cna-table-nominated {
				min-width: 0;
			}
			.cna-table-nominated .cna-col-actions {
				position: sticky;
				right: 0;
				z-index: 1;
				width: 1%;
				min-width: 5.75rem;
				white-space: nowrap;
				box-shadow: -8px 0 14px -8px rgba(15, 23, 42, 0.18);
				border-left: 1px solid #e2e8f0;
				text-align: center;
				vertical-align: middle;
			}
			.cna-table-nominated thead .cna-col-actions {
				background: #f8fafc;
				z-index: 2;
			}
			.cna-table-nominated tbody .cna-col-actions {
				background: #fff;
			}
			.cna-table-nominated tbody tr:hover .cna-col-actions {
				background: #f8fafc;
			}
			.cna-table-nominated tbody tr.cna-row-not-qualified .cna-col-actions {
				background: #fef2f2;
			}
			.cna-table-nominated tbody tr.cna-row-not-qualified:hover .cna-col-actions {
				background: #fee2e2 !important;
			}
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
			.cna-course-link-wrap {
				min-width: 280px;
				max-width: 420px;
				flex: 1;
			}
			.cna-course-link-wrap .frappe-control { margin-bottom: 0; }
			.cna-course-link-wrap .control-input-wrapper { width: 100%; }
			.cna-actions { display: flex; gap: 8px; flex-wrap: wrap; }
			.cna-summary { font-size: 12px; color: #64748b; }
			.cna-run-details { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
			.cna-run-details-title { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px; }
			.cna-run-details-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
				gap: 12px;
				align-items: end;
			}
			.cna-field-label {
				display: block;
				font-size: 11px;
				font-weight: 600;
				color: #64748b;
				margin-bottom: 4px;
				text-transform: uppercase;
				letter-spacing: 0.03em;
			}
			.cna-run-field .frappe-control { margin-bottom: 0; }
			.cna-run-field .control-input-wrapper { width: 100%; }
			.cna-mode-row {
				display: flex;
				align-items: center;
				flex-wrap: wrap;
				gap: 10px;
				margin-bottom: 14px;
				padding-bottom: 14px;
				border-bottom: 1px solid #e2e8f0;
			}
			.cna-mode-label { font-size: 12px; font-weight: 600; color: #475569; }
			.cna-mode-btn { border-radius: 8px !important; font-weight: 600; font-size: 12px !important; }
			.cna-mode-btn.active { background: #2563eb !important; color: #fff !important; border-color: #2563eb !important; }
			.cna-section-new-course { margin-bottom: 12px; }
			.cna-nomination-wide { min-width: 280px; max-width: 480px; flex: 1; }
			.cna-nomination-wide .frappe-control { margin-bottom: 0; }
			.cna-nomination-wide .control-input-wrapper { width: 100%; }
			.cna-nomination-alert {
				margin-top: 12px;
				padding: 12px 14px;
				border-radius: 8px;
				font-size: 13px;
				line-height: 1.45;
			}
			.cna-nomination-alert.cna-alert-warning {
				background: #fffbeb;
				border: 1px solid #fcd34d;
				color: #92400e;
			}
			.cna-nomination-alert.cna-alert-danger {
				background: #fef2f2;
				border: 1px solid #fecaca;
				color: #991b1b;
			}
			.cna-nomination-alert-inner {
				display: flex;
				flex-wrap: wrap;
				align-items: center;
				gap: 10px;
				justify-content: space-between;
			}
			.cna-nominated-qual-cell {
				display: flex;
				align-items: center;
				flex-wrap: wrap;
				gap: 8px;
				max-width: 320px;
			}
			.cna-table-nominated .cna-nominated-qual-cell {
				max-width: 220px;
			}
			.cna-qual-label-ok {
				font-size: 12px;
				font-weight: 600;
				color: #15803d;
			}
			.cna-qual-label-bad {
				font-size: 12px;
				font-weight: 600;
				color: #b91c1c;
			}
			.cna-btn-compact {
				padding: 4px 10px !important;
				font-size: 11px !important;
				gap: 4px !important;
			}
		</style>
	`);

	var html = `
		<div class="cna-container">
			<div class="cna-card">
				<div class="cna-card-header">
					<div class="cna-card-title">
						<i class="fa fa-book"></i> <span id="cna-main-title">Course nomination</span>
						<span class="badge" id="cna-badge-step">New</span>
					</div>
					<div class="cna-actions">
						<button type="button" class="cna-btn cna-btn-outline" id="cna-open-doctype-list" title="${__("Open Course Nomination list in Desk")}">
							<i class="fa fa-list-alt"></i> ${__("Course Nomination records")}
						</button>
					</div>
				</div>
				<div class="cna-card-body">
					<div class="cna-mode-row">
						<span class="cna-mode-label">Mode</span>
						<div class="btn-group" role="group">
							<button type="button" class="btn btn-default btn-sm cna-mode-btn active" data-cna-mode="new" id="cna-mode-new">
								<i class="fa fa-plus-circle"></i> New nomination
							</button>
							<button type="button" class="btn btn-default btn-sm cna-mode-btn" data-cna-mode="edit" id="cna-mode-edit">
								<i class="fa fa-edit"></i> Edit nomination
							</button>
						</div>
					</div>
					<div id="cna-section-new">
						<p class="text-muted" style="margin: 0 0 10px 0; font-size: 12px;">Search for a <strong>course</strong>, enter a <strong>course suffix</strong> for the document name, then add personnel.</p>
						<div class="cna-section-new-course" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start;">
							<div class="cna-course-link-wrap" id="cna-course-link-wrap"></div>
						</div>
					</div>
					<div id="cna-section-edit" style="display: none;">
						<p class="text-muted" style="margin: 0 0 10px 0; font-size: 12px;">Search and select any Course Nomination (draft or submitted). Course name and suffix come from that document.</p>
						<div class="cna-nomination-wide" id="cna-nomination-link-wrap"></div>
						<p id="cna-nomination-meta" class="text-muted" style="display: none; margin: 10px 0 0 0; font-size: 12px;"></p>
						<div id="cna-nomination-alert" class="cna-nomination-alert" style="display: none;"></div>
					</div>
					<div class="cna-run-details">
						<div class="cna-run-details-title">Course run details</div>
						<p id="cna-run-details-help" class="text-muted" style="margin: 0 0 12px 0; font-size: 11px;">Course suffix is combined with the course name to form the document ID (new nominations only). Enter organising body and dates before saving.</p>
						<div class="cna-run-details-grid">
							<div class="cna-run-field">
								<label class="cna-field-label">Organising body</label>
								<div id="cna-organising-body-wrap"></div>
							</div>
							<div class="cna-run-field" id="cna-course-suffix-field">
								<label class="cna-field-label">Course suffix</label>
								<div id="cna-course-suffix-wrap"></div>
							</div>
							<div class="cna-run-field">
								<label class="cna-field-label">Start date</label>
								<div id="cna-start-date-wrap"></div>
							</div>
							<div class="cna-run-field">
								<label class="cna-field-label">End date</label>
								<div id="cna-end-date-wrap"></div>
							</div>
						</div>
					</div>
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
							<div class="cna-table-wrap cna-table-wrap-nominated" id="cna-nominated-table-wrap" style="display: none;"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;

	page.main.html(html);

	page.main.on("click", "#cna-open-doctype-list", function () {
		frappe.set_route("List", "Course Nomination");
	});

	wrapper.cna_course_control = frappe.ui.form.make_control({
		df: {
			fieldtype: "Link",
			options: "Course Name",
			fieldname: "course_name",
			label: "",
			placeholder: __("Search course…"),
			reqd: 0,
			change: function () {
				on_course_change();
			},
		},
		parent: page.main.find("#cna-course-link-wrap"),
		render_input: true,
	});
	wrapper.cna_course_control.toggle_label(false);
	wrapper.cna_course_control.toggle_description(false);
	wrapper.cna_course_control.refresh();

	wrapper.cna_organising_control = frappe.ui.form.make_control({
		df: {
			fieldtype: "Data",
			fieldname: "organising_body",
			label: "",
			placeholder: __("Organising body"),
			reqd: 0,
		},
		parent: page.main.find("#cna-organising-body-wrap"),
		render_input: true,
	});
	wrapper.cna_organising_control.toggle_label(false);
	wrapper.cna_organising_control.toggle_description(false);
	wrapper.cna_organising_control.refresh();

	wrapper.cna_course_suffix_control = frappe.ui.form.make_control({
		df: {
			fieldtype: "Data",
			fieldname: "course_suffix",
			label: "",
			placeholder: __("e.g. 2026-Week-14 or Batch-A"),
			reqd: 0,
		},
		parent: page.main.find("#cna-course-suffix-wrap"),
		render_input: true,
	});
	wrapper.cna_course_suffix_control.toggle_label(false);
	wrapper.cna_course_suffix_control.toggle_description(false);
	wrapper.cna_course_suffix_control.refresh();

	wrapper.cna_start_control = frappe.ui.form.make_control({
		df: {
			fieldtype: "Date",
			fieldname: "start_date",
			label: "",
			placeholder: __("Start date"),
			reqd: 0,
		},
		parent: page.main.find("#cna-start-date-wrap"),
		render_input: true,
	});
	wrapper.cna_start_control.toggle_label(false);
	wrapper.cna_start_control.toggle_description(false);
	wrapper.cna_start_control.refresh();

	wrapper.cna_end_control = frappe.ui.form.make_control({
		df: {
			fieldtype: "Date",
			fieldname: "end_date",
			label: "",
			placeholder: __("End date"),
			reqd: 0,
		},
		parent: page.main.find("#cna-end-date-wrap"),
		render_input: true,
	});
	wrapper.cna_end_control.toggle_label(false);
	wrapper.cna_end_control.toggle_description(false);
	wrapper.cna_end_control.refresh();

	wrapper.cna_nomination_control = frappe.ui.form.make_control({
		df: {
			fieldtype: "Link",
			options: "Course Nomination",
			fieldname: "course_nomination_pick",
			label: "",
			placeholder: __("Search nomination…"),
			change: function () {
				on_nomination_change();
			},
		},
		parent: page.main.find("#cna-nomination-link-wrap"),
		render_input: true,
	});
	wrapper.cna_nomination_control.toggle_label(false);
	wrapper.cna_nomination_control.toggle_description(false);
	wrapper.cna_nomination_control.refresh();

	function is_past_end_locked() {
		return state.mode === "edit" && state.course_ended && !state.allow_past_end_edit;
	}
	function is_cancelled_nomination() {
		return state.mode === "edit" && state.loaded_docstatus === 2;
	}
	function interaction_fully_locked() {
		return state.mode === "edit" && (is_cancelled_nomination() || is_past_end_locked());
	}
	function headers_locked_submitted() {
		return state.mode === "edit" && state.loaded_docstatus === 1 && !interaction_fully_locked();
	}
	function set_control_ro(ctrl, ro) {
		if (!ctrl || !ctrl.df) return;
		ctrl.df.read_only = ro ? 1 : 0;
		if (typeof ctrl.refresh === "function") {
			ctrl.refresh();
		}
	}
	function apply_edit_interaction_state() {
		var alertEl = document.getElementById("cna-nomination-alert");
		if (state.mode !== "edit") {
			if (alertEl) {
				alertEl.style.display = "none";
				alertEl.innerHTML = "";
			}
			set_control_ro(wrapper.cna_nomination_control, false);
			set_control_ro(wrapper.cna_organising_control, false);
			set_control_ro(wrapper.cna_start_control, false);
			set_control_ro(wrapper.cna_end_control, false);
			var mn = document.getElementById("cna-mode-new");
			var me = document.getElementById("cna-mode-edit");
			if (mn) mn.disabled = false;
			if (me) me.disabled = false;
			return;
		}
		var fullLock = interaction_fully_locked();
		var subHdr = headers_locked_submitted();
		set_control_ro(wrapper.cna_nomination_control, fullLock);
		set_control_ro(wrapper.cna_organising_control, fullLock || subHdr);
		set_control_ro(wrapper.cna_start_control, fullLock || subHdr);
		set_control_ro(wrapper.cna_end_control, fullLock || subHdr);
		var mn0 = document.getElementById("cna-mode-new");
		var me0 = document.getElementById("cna-mode-edit");
		if (mn0) mn0.disabled = fullLock;
		if (me0) me0.disabled = fullLock;
		var addBtn = document.getElementById("cna-add-selected");
		if (addBtn) {
			addBtn.disabled = fullLock || !state.personnel_due || state.personnel_due.length === 0;
		}
		if (alertEl) {
			if (is_cancelled_nomination()) {
				alertEl.style.display = "block";
				alertEl.className = "cna-nomination-alert cna-alert-danger";
				alertEl.innerHTML =
					"<strong>" +
					__("Cancelled nomination") +
					"</strong> — " +
					__("This document is cancelled. Everything is read-only; you cannot save from this page.");
			} else if (state.course_ended && !state.allow_past_end_edit) {
				alertEl.style.display = "block";
				alertEl.className = "cna-nomination-alert cna-alert-warning";
				alertEl.innerHTML =
					'<div class="cna-nomination-alert-inner">' +
					"<span><strong>" +
					__("Course end date has passed") +
					"</strong> — " +
					__(
						"Fields are read-only until you choose to edit. Submitted nominations only update the nominated personnel list when you save."
					) +
					"</span>" +
					'<button type="button" class="btn btn-primary btn-sm" id="cna-edit-anyway-btn">' +
					__("Edit anyway") +
					"</button>" +
					"</div>";
				var anywayBtn = document.getElementById("cna-edit-anyway-btn");
				if (anywayBtn) {
					anywayBtn.onclick = function () {
						state.allow_past_end_edit = true;
						frappe.show_alert({
							message: __("Editing enabled despite the course end date."),
							indicator: "blue",
						});
						apply_edit_interaction_state();
						render_due();
						render_nominated();
					};
				}
			} else {
				alertEl.style.display = "none";
				alertEl.innerHTML = "";
			}
		}
		var saveBtn = document.getElementById("cna-save-nomination");
		if (saveBtn && state.nominated && state.nominated.length > 0) {
			saveBtn.disabled = fullLock;
		}
	}

	function update_save_button_label() {
		var btn = document.getElementById("cna-save-nomination");
		if (!btn) return;
		if (state.mode === "edit") {
			btn.innerHTML = '<i class="fa fa-save"></i> ' + __("Update nomination");
		} else {
			btn.innerHTML = '<i class="fa fa-save"></i> ' + __("Save as Course Nomination");
		}
	}

	function apply_mode_ui() {
		var isNew = state.mode === "new";
		document.getElementById("cna-section-new").style.display = isNew ? "block" : "none";
		document.getElementById("cna-section-edit").style.display = isNew ? "none" : "block";
		document.getElementById("cna-course-suffix-field").style.display = isNew ? "" : "none";
		document.getElementById("cna-run-details-help").textContent = isNew
			? "Course suffix is combined with the course name to form the document ID (new nominations only). Enter organising body and dates before saving."
			: "Draft: you can change run details and nominated personnel. Submitted: only nominated personnel can be changed from here; other fields stay on the document as filed.";
		document.getElementById("cna-main-title").textContent = isNew ? "New course nomination" : "Edit course nomination";
		document.getElementById("cna-badge-step").textContent = isNew ? __("New") : __("Edit");
		document.querySelectorAll(".cna-mode-btn").forEach(function (btn) {
			btn.classList.toggle("active", btn.getAttribute("data-cna-mode") === state.mode);
		});
		if (wrapper.cna_course_control && wrapper.cna_course_control.df) {
			wrapper.cna_course_control.df.read_only = isNew ? 0 : 1;
			wrapper.cna_course_control.refresh();
		}
		update_save_button_label();
		apply_edit_interaction_state();
	}

	function set_mode(mode) {
		if (state.mode === mode) return;
		state.mode = mode;
		if (mode === "new") {
			state.course_ended = false;
			state.allow_past_end_edit = false;
			var ale = document.getElementById("cna-nomination-alert");
			if (ale) {
				ale.style.display = "none";
				ale.innerHTML = "";
			}
			state.editing_nomination_name = null;
			state.loaded_docstatus = null;
			if (wrapper.cna_nomination_control && wrapper.cna_nomination_control.set_value) {
				wrapper.cna_nomination_control.set_value("");
			}
			document.getElementById("cna-nomination-meta").style.display = "none";
			state._suspend_course_change = true;
			if (wrapper.cna_course_control && wrapper.cna_course_control.set_value) {
				wrapper.cna_course_control.set_value("");
			}
			state._suspend_course_change = false;
			state.course_name = null;
			state.personnel_due = [];
			state.nominated = [];
			state.qualified_set = null;
			state.qualification_details = {};
			if (wrapper.cna_organising_control && wrapper.cna_organising_control.set_value) {
				wrapper.cna_organising_control.set_value("");
			}
			if (wrapper.cna_course_suffix_control && wrapper.cna_course_suffix_control.set_value) {
				wrapper.cna_course_suffix_control.set_value("");
			}
			if (wrapper.cna_start_control && wrapper.cna_start_control.set_value) {
				wrapper.cna_start_control.set_value("");
			}
			if (wrapper.cna_end_control && wrapper.cna_end_control.set_value) {
				wrapper.cna_end_control.set_value("");
			}
			render_due();
			render_nominated();
			document.getElementById("cna-due-empty").textContent = __("Select a course above.");
			document.getElementById("cna-due-empty").style.display = "block";
			document.getElementById("cna-due-loading").style.display = "none";
			document.getElementById("cna-due-table-wrap").style.display = "none";
			document.getElementById("cna-due-count").textContent = "0";
			document.getElementById("cna-add-selected").disabled = true;
		} else {
			state.course_ended = false;
			state.allow_past_end_edit = false;
			var ale2 = document.getElementById("cna-nomination-alert");
			if (ale2) {
				ale2.style.display = "none";
				ale2.innerHTML = "";
			}
			if (wrapper.cna_nomination_control && wrapper.cna_nomination_control.set_value) {
				wrapper.cna_nomination_control.set_value("");
			}
			document.getElementById("cna-nomination-meta").style.display = "none";
			state._suspend_course_change = true;
			if (wrapper.cna_course_control && wrapper.cna_course_control.set_value) {
				wrapper.cna_course_control.set_value("");
			}
			state._suspend_course_change = false;
			state.editing_nomination_name = null;
			state.loaded_docstatus = null;
			state.course_name = null;
			state.personnel_due = [];
			state.nominated = [];
			state.qualified_set = null;
			state.qualification_details = {};
			if (wrapper.cna_organising_control && wrapper.cna_organising_control.set_value) {
				wrapper.cna_organising_control.set_value("");
			}
			if (wrapper.cna_start_control && wrapper.cna_start_control.set_value) {
				wrapper.cna_start_control.set_value("");
			}
			if (wrapper.cna_end_control && wrapper.cna_end_control.set_value) {
				wrapper.cna_end_control.set_value("");
			}
			render_due();
			render_nominated();
			document.getElementById("cna-due-empty").textContent = __("Select a nomination above.");
			document.getElementById("cna-due-empty").style.display = "block";
			document.getElementById("cna-due-loading").style.display = "none";
			document.getElementById("cna-due-table-wrap").style.display = "none";
			document.getElementById("cna-due-count").textContent = "0";
			document.getElementById("cna-add-selected").disabled = true;
		}
		apply_mode_ui();
	}

	function on_nomination_change() {
		var name =
			wrapper.cna_nomination_control && wrapper.cna_nomination_control.get_value
				? wrapper.cna_nomination_control.get_value() || ""
				: "";
		state.editing_nomination_name = name || null;
		state.nominated = [];
		state.personnel_due = [];
		state.qualified_set = null;
		state.qualification_details = {};
		render_due();
		render_nominated();
		document.getElementById("cna-nomination-meta").style.display = "none";
		document.getElementById("cna-save-nomination").disabled = true;
		if (!name) {
			state.course_name = null;
			state.loaded_docstatus = null;
			state.course_ended = false;
			state.allow_past_end_edit = false;
			var al = document.getElementById("cna-nomination-alert");
			if (al) {
				al.style.display = "none";
				al.innerHTML = "";
			}
			state._suspend_course_change = true;
			if (wrapper.cna_course_control && wrapper.cna_course_control.set_value) {
				wrapper.cna_course_control.set_value("");
			}
			state._suspend_course_change = false;
			document.getElementById("cna-due-empty").style.display = "block";
			document.getElementById("cna-due-empty").textContent = __("Select a nomination above.");
			document.getElementById("cna-due-loading").style.display = "none";
			document.getElementById("cna-due-table-wrap").style.display = "none";
			apply_edit_interaction_state();
			return;
		}
		document.getElementById("cna-due-empty").style.display = "none";
		document.getElementById("cna-due-loading").style.display = "block";
		frappe.call({
			method: "dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_course_nomination_for_page",
			args: { name: name },
			callback: function (r) {
				var d = r.message;
				document.getElementById("cna-due-loading").style.display = "none";
				if (!d) return;
				state.loaded_docstatus = d.docstatus;
				state.course_ended = !!d.course_ended;
				state.allow_past_end_edit = false;
				state.course_name = d.course_name;
				state._suspend_course_change = true;
				if (wrapper.cna_course_control && wrapper.cna_course_control.set_value) {
					wrapper.cna_course_control.set_value(d.course_name || "");
				}
				state._suspend_course_change = false;
				if (wrapper.cna_organising_control && wrapper.cna_organising_control.set_value) {
					wrapper.cna_organising_control.set_value(d.organising_body || "");
				}
				if (wrapper.cna_start_control && wrapper.cna_start_control.set_value) {
					wrapper.cna_start_control.set_value(d.start_date || "");
				}
				if (wrapper.cna_end_control && wrapper.cna_end_control.set_value) {
					wrapper.cna_end_control.set_value(d.end_date || "");
				}
				state.nominated = (d.nominated_personnel || []).map(function (row) {
					var raw = (row.remarks || "").trim();
					var shortRem = compress_nomination_remark_for_storage(raw);
					var ck = d.course_name && row.service_number ? d.course_name + "::" + row.service_number : null;
					if (ck && raw.length > 0) {
						var low = raw.toLowerCase();
						state.qualification_details[ck] = {
							qualified: low.indexOf("not qualified") === -1 ? 1 : 0,
							remark: raw,
						};
					}
					return {
						service_number: row.service_number,
						personnel_name: row.personnel_name,
						current_rank: row.current_rank,
						current_unit: row.current_unit,
						remarks: shortRem,
					};
				});
				var meta = document.getElementById("cna-nomination-meta");
				meta.style.display = "block";
				var statusLabel =
					d.docstatus === 0 ? __("Draft") : d.docstatus === 1 ? __("Submitted") : __("Cancelled");
				meta.textContent =
					"Course: " +
					(d.course_name || "") +
					" · Suffix: " +
					(d.course_suffix || "") +
					" · ID: " +
					(d.name || "") +
					" · " +
					statusLabel;
				frappe.call({
					method: "dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_personnel_due_for_course",
					args: { course_name: d.course_name },
					callback: function (r2) {
						state.personnel_due = r2.message || [];
						var qual = new Set();
						state.personnel_due.forEach(function (p) {
							qual.add(p.service_number);
						});
						state.nominated.forEach(function (n) {
							qual.add(n.service_number);
						});
						state.qualified_set = qual;
						render_due();
						render_nominated();
						apply_edit_interaction_state();
					},
				});
			},
		});
	}

	apply_mode_ui();

	// Course change: clear and load personnel due
	function on_course_change() {
		if (state._suspend_course_change) return;
		if (state.mode === "edit") return;
		var val = wrapper.cna_course_control && wrapper.cna_course_control.get_value
			? (wrapper.cna_course_control.get_value() || "")
			: "";
		state.course_name = val || null;
		state.qualified_set = null;
		state.qualification_details = {};
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

		var fullLock = interaction_fully_locked();
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
				: fullLock
					? "<span class=\"text-muted\">—</span>"
					: "<input type=\"checkbox\" class=\"cna-due-check\" data-sn=\"" + escaped(p.service_number) + "\"" + checked + ">";
			var whyCell = fullLock
				? "<span class=\"text-muted\">—</span>"
				: "<button type=\"button\" class=\"cna-btn cna-btn-outline cna-why\" data-sn=\"" + escaped(p.service_number) + "\"><i class=\"fa fa-question-circle\"></i> Why?</button>";
			return (
				"<tr class=\"" + rowClass + "\" data-sn=\"" + escaped(p.service_number) + "\">" +
				"<td style=\"width: 36px; text-align: center;\">" + (idx + 1) + "</td>" +
				"<td style=\"width: 90px;\">" + addedCell + "</td>" +
				"<td>" + escaped(p.service_number) + "</td>" +
				"<td>" + escaped(p.personnel_name) + "</td>" +
				"<td>" + escaped(p.current_rank) + "</td>" +
				"<td>" + escaped(p.current_unit) + "</td>" +
				"<td style=\"width: 120px;\">" + whyCell + "</td>" +
				"</tr>"
			);
		}).join("");

		wrap.innerHTML = (
			"<table class=\"cna-table\">" +
			"<thead><tr><th style=\"width: 36px; text-align: center;\">#</th><th style=\"width: 90px;\">Status</th><th>Service No.</th><th>Name</th><th>Rank</th><th>Unit</th><th style=\"width: 120px;\">Qualification</th></tr></thead>" +
			"<tbody>" + rows + "</tbody>" +
			"</table>"
		);

		if (!fullLock) {
			wrap.querySelectorAll(".cna-why").forEach(function (btn) {
				btn.addEventListener("click", function () {
					var sn = btn.getAttribute("data-sn");
					show_qualification_why(sn);
				});
			});
		}
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
		document.getElementById("cna-save-nomination").disabled = interaction_fully_locked();

		var qualified = state.qualified_set || new Set();
		var escaped = function (s) {
			var d = document.createElement("div");
			d.textContent = s == null ? "" : s;
			return d.innerHTML;
		};

		var rowFullLock = interaction_fully_locked();
		var rows = state.nominated.map(function (p, idx) {
			var not_qualified = qualified && !qualified.has(p.service_number);
			var remarkLow = ((p.remarks || "") + "").toLowerCase();
			if (remarkLow.indexOf("not qualified") !== -1) {
				not_qualified = true;
			}
			var rowClass = not_qualified ? " cna-row-not-qualified" : "";
			var shortLabel = not_qualified ? __("Not qualified") : __("Qualified");
			var labelClass = not_qualified ? "cna-qual-label-bad" : "cna-qual-label-ok";
			var whyBtn =
				"<button type=\"button\" class=\"cna-btn cna-btn-outline cna-btn-compact cna-why-nominated\" data-sn=\"" +
				escaped(p.service_number) +
				"\"><i class=\"fa fa-question-circle\"></i> " +
				__("Why?") +
				"</button>";
			var qualCell =
				"<div class=\"cna-nominated-qual-cell\"><span class=\"" +
				labelClass +
				"\">" +
				escaped(shortLabel) +
				"</span>" +
				whyBtn +
				"</div>";
			var removeCell = rowFullLock
				? "<span class=\"text-muted\">—</span>"
				: "<button type=\"button\" class=\"cna-btn cna-btn-danger cna-btn-compact cna-remove\" data-idx=\"" +
				  idx +
				  "\"><i class=\"fa fa-times\"></i> " +
				  __("Remove") +
				  "</button>";
			return (
				"<tr class=\"" + rowClass + "\" data-idx=\"" + idx + "\">" +
				"<td style=\"width: 36px; text-align: center;\">" + (idx + 1) + "</td>" +
				"<td>" + escaped(p.service_number) + "</td>" +
				"<td>" + escaped(p.personnel_name) + "</td>" +
				"<td>" + escaped(p.current_rank) + "</td>" +
				"<td>" + escaped(p.current_unit) + "</td>" +
				"<td>" + qualCell + "</td>" +
				"<td class=\"cna-col-actions\">" + removeCell + "</td>" +
				"</tr>"
			);
		}).join("");

		wrap.innerHTML = (
			"<table class=\"cna-table cna-table-nominated\">" +
			"<thead><tr><th style=\"width: 36px; text-align: center;\">#</th><th>Service No.</th><th>Name</th><th>Rank</th><th>Unit</th><th style=\"min-width: 160px;\">Qualification</th><th class=\"cna-col-actions\">" +
			__("Remove") +
			"</th></tr></thead>" +
			"<tbody>" + rows + "</tbody>" +
			"</table>"
		);

		wrap.querySelectorAll(".cna-why-nominated").forEach(function (btn) {
			btn.addEventListener("click", function () {
				var sn = btn.getAttribute("data-sn");
				show_qualification_why(sn);
			});
		});

		if (!rowFullLock) {
			wrap.querySelectorAll(".cna-remove").forEach(function (btn) {
				btn.addEventListener("click", function () {
					var idx = parseInt(btn.getAttribute("data-idx"), 10);
					state.nominated.splice(idx, 1);
					render_nominated();
					render_due();
				});
			});
		}
	}

	function add_selected() {
		if (interaction_fully_locked()) return;
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
					remarks: "",
				});
				refresh_nomination_remark(sn);
				added++;
			}
		});
		render_nominated();
		render_due();
		if (added) {
			frappe.show_alert({ message: __("Added {0} personnel to nomination.", [added]), indicator: "blue" }, 3);
		}
	}

	function fetch_qualification_detail(service_number, callback) {
		if (!state.course_name || !service_number) {
			callback({ qualified: 0, remark: __("Course and personnel are required.") });
			return;
		}
		var cacheKey = state.course_name + "::" + service_number;
		if (state.qualification_details[cacheKey]) {
			callback(state.qualification_details[cacheKey]);
			return;
		}
		frappe.call({
			method: "dat_pm.nacstnew.doctype.course_nomination.course_nomination.get_personnel_course_qualification_remark",
			args: {
				course_name: state.course_name,
				service_number: service_number,
			},
			callback: function (r) {
				var detail = r.message || { qualified: 0, remark: __("Not qualified.") };
				state.qualification_details[cacheKey] = detail;
				callback(detail);
			},
		});
	}

	function show_qualification_why(service_number) {
		fetch_qualification_detail(service_number, function (detail) {
			var title = detail.qualified ? __("Qualified") : __("Not Qualified");
			frappe.msgprint({
				title: title,
				message: __("{0}: {1}", [frappe.utils.escape_html(service_number || ""), frappe.utils.escape_html(detail.remark || "")]),
				indicator: detail.qualified ? "green" : "red",
			});
		});
	}

	function refresh_nomination_remark(service_number) {
		fetch_qualification_detail(service_number, function (detail) {
			state.nominated.forEach(function (n) {
				if (n.service_number === service_number) {
					n.remarks = detail.qualified
						? __("Qualified")
						: __("Not qualified");
				}
			});
			render_nominated();
		});
	}

	function save_nomination() {
		if (!state.course_name || !state.nominated.length) return;
		var organising_body =
			wrapper.cna_organising_control && wrapper.cna_organising_control.get_value
				? (wrapper.cna_organising_control.get_value() || "")
				: "";
		var start_date =
			wrapper.cna_start_control && wrapper.cna_start_control.get_value
				? wrapper.cna_start_control.get_value()
				: null;
		var end_date =
			wrapper.cna_end_control && wrapper.cna_end_control.get_value
				? wrapper.cna_end_control.get_value()
				: null;
		if (!String(organising_body).trim()) {
			frappe.msgprint({
				title: __("Missing field"),
				message: __("Organising Body is required."),
				indicator: "red",
			});
			return;
		}
		if (!start_date) {
			frappe.msgprint({
				title: __("Missing field"),
				message: __("Start Date is required."),
				indicator: "red",
			});
			return;
		}
		if (!end_date) {
			frappe.msgprint({
				title: __("Missing field"),
				message: __("End Date is required."),
				indicator: "red",
			});
			return;
		}
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

		if (state.mode === "edit") {
			if (!state.editing_nomination_name) {
				frappe.msgprint({
					title: __("Select nomination"),
					message: __("Choose a Course Nomination to update."),
					indicator: "red",
				});
				return;
			}
			if (interaction_fully_locked()) {
				frappe.msgprint({
					title: __("Read-only"),
					message: __("This nomination cannot be saved from this page in the current state."),
					indicator: "red",
				});
				return;
			}
			if (state.loaded_docstatus === 2) {
				frappe.msgprint({
					title: __("Cancelled"),
					message: __("Cancelled nominations cannot be updated."),
					indicator: "red",
				});
				return;
			}
			frappe.call({
				method: "dat_pm.nacstnew.doctype.course_nomination.course_nomination.update_course_nomination_from_page",
				args: {
					nomination_name: state.editing_nomination_name,
					nominated_personnel: state.nominated,
					organising_body: String(organising_body).trim(),
					start_date: start_date,
					end_date: end_date,
				},
				callback: function (r) {
					if (r.exc) return;
					var name = r.message;
					frappe.show_alert({ message: __("Course Nomination updated: {0}", [name]), indicator: "green" }, 5);
					frappe.set_route("Form", "Course Nomination", name);
				},
			});
			return;
		}

		var course_suffix =
			wrapper.cna_course_suffix_control && wrapper.cna_course_suffix_control.get_value
				? (wrapper.cna_course_suffix_control.get_value() || "")
				: "";
		if (!String(course_suffix).trim()) {
			frappe.msgprint({
				title: __("Missing field"),
				message: __("Course Suffix is required. It is used with the course name to create the nomination name."),
				indicator: "red",
			});
			return;
		}
		frappe.call({
			method: `dat_pm.nacstnew.doctype.course_nomination.course_nomination.create_course_nomination_from_page`,
			args: {
				course_name: state.course_name,
				nominated_personnel: state.nominated,
				organising_body: String(organising_body).trim(),
				course_suffix: String(course_suffix).trim(),
				start_date: start_date,
				end_date: end_date,
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

	document.getElementById("cna-add-selected").addEventListener("click", add_selected);
	document.getElementById("cna-save-nomination").addEventListener("click", save_nomination);
	document.getElementById("cna-mode-new").addEventListener("click", function () {
		set_mode("new");
	});
	document.getElementById("cna-mode-edit").addEventListener("click", function () {
		set_mode("edit");
	});
};