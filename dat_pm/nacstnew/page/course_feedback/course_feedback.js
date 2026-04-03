// Copyright (c) 2026, !! and contributors
// Course Feedback — desk page for personnel (no Feedback doctype permission required).

frappe.pages["course-feedback"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Course Feedback"),
		single_column: true,
	});

	var state = {
		context: null,
		grade_options: [],
	};

	page.add_inner_message(`
		<style>
			.cfb-wrap { max-width: 720px; margin: 0 auto; padding: 20px; }
			.cfb-card {
				background: #fff;
				border-radius: 12px;
				box-shadow: 0 2px 12px rgba(0,0,0,0.06);
				border: 1px solid #e5e7eb;
				margin-bottom: 20px;
				overflow: hidden;
			}
			.cfb-card-header {
				background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
				padding: 14px 20px;
				border-bottom: 1px solid #bae6fd;
				font-weight: 600;
				color: #0c4a6e;
				font-size: 15px;
			}
			.cfb-card-header-row {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 12px;
			}
			.cfb-card-header-title {
				display: inline-flex;
				align-items: center;
				gap: 8px;
				min-width: 0;
			}
			.cfb-btn-back-header {
				display: inline-flex;
				align-items: center;
				gap: 6px;
				padding: 6px 12px;
				font-size: 13px;
				border-radius: 8px;
				border: 1px solid #bae6fd;
				background: rgba(255, 255, 255, 0.75);
				color: #0c4a6e;
				cursor: pointer;
				font-weight: 500;
				flex-shrink: 0;
			}
			.cfb-btn-back-header:hover {
				background: #fff;
				border-color: #7dd3fc;
				color: #0369a1;
			}
			.cfb-card-body { padding: 20px; }
			.cfb-label { font-size: 12px; color: #64748b; margin-bottom: 6px; font-weight: 500; }
			.cfb-input {
				width: 100%;
				padding: 10px 12px;
				border-radius: 8px;
				border: 1px solid #cbd5e1;
				font-size: 13px;
				font-family: ui-monospace, monospace;
			}
			.cfb-input:focus { outline: none; border-color: #0284c7; box-shadow: 0 0 0 2px rgba(2,132,199,0.2); }
			.cfb-textarea {
				width: 100%;
				min-height: 180px;
				padding: 12px;
				border-radius: 8px;
				border: 1px solid #cbd5e1;
				font-size: 13px;
				resize: vertical;
			}
			.cfb-file { padding: 8px 0; font-size: 13px; }
			.cfb-btn {
				display: inline-flex;
				align-items: center;
				gap: 8px;
				padding: 8px 16px;
				font-size: 13px;
				border-radius: 8px;
				border: none;
				cursor: pointer;
				font-weight: 500;
			}
			.cfb-btn-primary { background: #0284c7; color: #fff; }
			.cfb-btn-primary:hover { background: #0369a1; }
			.cfb-btn-outline { background: #fff; color: #475569; border: 1px solid #cbd5e1; }
			.cfb-muted { font-size: 12px; color: #64748b; margin-top: 8px; line-height: 1.5; }
			.cfb-dl { display: grid; grid-template-columns: 140px 1fr; gap: 8px 16px; font-size: 13px; }
			.cfb-dl dt { color: #64748b; }
			.cfb-dl dd { margin: 0; color: #0f172a; }
			.cfb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
			.cfb-table th, .cfb-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
			.cfb-table th { background: #f8fafc; color: #475569; font-weight: 600; }
			.cfb-badge { font-size: 10px; padding: 2px 8px; border-radius: 999px; background: #fef3c7; color: #92400e; }
			.cfb-hidden { display: none !important; }
		</style>
	`);

	var html = `
		<div class="cfb-wrap">
			<div class="cfb-card" id="cfb-step-access">
				<div class="cfb-card-header cfb-card-header-row">
					<span class="cfb-card-header-title"><i class="fa fa-key"></i> ${__("Access code")}</span>
				</div>
				<div class="cfb-card-body">
					<p class="cfb-muted">${__(
						"Enter your Course Attendance reference (e.g. full document name) or your service number."
					)}</p>
					<div class="cfb-label">${__("Reference / service number")}</div>
					<input type="text" class="cfb-input" id="cfb-access-code" placeholder="N/1111-058b758d68" autocomplete="off" />
					<p class="cfb-muted">${__(
						"If you use your service number and have several courses, you will choose which one to rate."
					)}</p>
					<div style="margin-top: 16px;">
						<button type="button" class="cfb-btn cfb-btn-primary" id="cfb-btn-resolve">
							<i class="fa fa-arrow-right"></i> ${__("Continue")}
						</button>
					</div>
				</div>
			</div>

			<div class="cfb-card cfb-hidden" id="cfb-step-pick">
				<div class="cfb-card-header cfb-card-header-row">
					<span class="cfb-card-header-title"><i class="fa fa-list"></i> ${__("Select course")}</span>
					<button type="button" class="cfb-btn-back-header" id="cfb-btn-pick-back" title="${__("Back")}">
						<i class="fa fa-arrow-left"></i> ${__("Back")}
					</button>
				</div>
				<div class="cfb-card-body">
					<div id="cfb-pick-body"></div>
				</div>
			</div>

			<div class="cfb-card cfb-hidden" id="cfb-step-form">
				<div class="cfb-card-header cfb-card-header-row">
					<span class="cfb-card-header-title"><i class="fa fa-comment"></i> ${__("Your feedback")}</span>
					<button type="button" class="cfb-btn-back-header" id="cfb-btn-back" title="${__("Back")}">
						<i class="fa fa-arrow-left"></i> ${__("Back")}
					</button>
				</div>
				<div class="cfb-card-body">
					<div id="cfb-context-summary"></div>
					<div class="cfb-label" style="margin-top: 16px;">${__("Feedback")} <span style="color:#dc2626">*</span></div>
					<textarea class="cfb-textarea" id="cfb-feedback-text" placeholder="${__("Write your feedback here…")}"></textarea>
					<div class="cfb-label" style="margin-top: 16px;">${__("Grade")}</div>
					<select class="cfb-input" id="cfb-grade-select">
						<option value="">${__("Select grade (optional)")}</option>
					</select>
					<div class="cfb-label" style="margin-top: 16px;">${__("Course report")}</div>
					<p class="cfb-muted" style="margin-top: 0;">${__(
						"Optional PDF attachment. Upload is applied after you save draft (same as the Feedback form)."
					)}</p>
					<div id="cfb-report-current-wrap" class="cfb-muted" style="margin-bottom: 8px;"></div>
					<input type="file" class="cfb-input cfb-file" id="cfb-report-file" accept=".pdf,application/pdf" />
					<div style="margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap;">
						<button type="button" class="cfb-btn cfb-btn-primary" id="cfb-btn-save">
							<i class="fa fa-save"></i> ${__("Save draft")}
						</button>
					</div>
					<p class="cfb-muted" id="cfb-after-save"></p>
				</div>
			</div>
		</div>
	`;

	page.main.html(html);

	function showStep(step) {
		document.getElementById("cfb-step-access").classList.toggle("cfb-hidden", step !== "access");
		document.getElementById("cfb-step-pick").classList.toggle("cfb-hidden", step !== "pick");
		document.getElementById("cfb-step-form").classList.toggle("cfb-hidden", step !== "form");
	}

	function escapeHtml(s) {
		var d = document.createElement("div");
		d.textContent = s == null ? "" : s;
		return d.innerHTML;
	}

	function updateReportDisplay() {
		var wrap = document.getElementById("cfb-report-current-wrap");
		if (!wrap || !state.context) return;
		var url = state.context.course_report;
		if (url) {
			var href = url.indexOf("http") === 0 ? url : url;
			wrap.innerHTML =
				'<i class="fa fa-paperclip"></i> <a href="' +
				escapeHtml(href) +
				'" target="_blank" rel="noopener noreferrer">' +
				escapeHtml(__("View current attachment")) +
				"</a>";
		} else {
			wrap.innerHTML = "";
		}
	}

	function renderGradeOptions() {
		var select = document.getElementById("cfb-grade-select");
		if (!select) return;
		var selected = (state.context && state.context.grade) || "";
		select.innerHTML = "";
		var first = document.createElement("option");
		first.value = "";
		first.textContent = __("Select grade (optional)");
		select.appendChild(first);
		(state.grade_options || []).forEach(function (g) {
			var opt = document.createElement("option");
			opt.value = g;
			opt.textContent = g;
			if (g === selected) opt.selected = true;
			select.appendChild(opt);
		});
	}

	function uploadCourseReport(feedbackName, onDone) {
		var input = document.getElementById("cfb-report-file");
		if (!input || !input.files || !input.files.length) {
			if (onDone) onDone();
			return;
		}
		var fd = new FormData();
		fd.append("file", input.files[0]);
		fd.append("feedback_name", feedbackName);
		fetch(
			"/api/method/dat_pm.nacstnew.doctype.feedback.feedback.upload_feedback_course_report_for_page",
			{
				method: "POST",
				headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
				body: fd,
			}
		)
			.then(function (res) {
				return res.json();
			})
			.then(function (body) {
				if (body.exc) {
					frappe.msgprint({
						title: __("Upload error"),
						message: __("Could not attach the file. Check that it is a PDF."),
						indicator: "red",
					});
				} else if (body.message && body.message.course_report) {
					state.context.course_report = body.message.course_report;
					updateReportDisplay();
					input.value = "";
					frappe.show_alert({ message: __("Course report attached."), indicator: "green" }, 4);
				}
				if (onDone) onDone();
			})
			.catch(function () {
				frappe.msgprint({
					title: __("Upload error"),
					message: __("Network error while uploading."),
					indicator: "red",
				});
				if (onDone) onDone();
			});
	}

	function renderForm(ctx) {
		state.context = ctx;
		var el = document.getElementById("cfb-context-summary");
		el.innerHTML =
			'<dl class="cfb-dl">' +
			"<dt>" +
			escapeHtml(__("Course attendance")) +
			"</dt><dd>" +
			escapeHtml(ctx.course_attended) +
			"</dd>" +
			"<dt>" +
			escapeHtml(__("Personnel")) +
			"</dt><dd>" +
			escapeHtml(ctx.personnel_name || "") +
			" (" +
			escapeHtml(ctx.service_number || "") +
			")</dd>" +
			"<dt>" +
			escapeHtml(__("Course")) +
			"</dt><dd>" +
			escapeHtml(ctx.course_name || "") +
			"</dd>" +
			"<dt>" +
			escapeHtml(__("Dates")) +
			"</dt><dd>" +
			escapeHtml((ctx.course_start_date || "") + " — " + (ctx.course_end_date || "")) +
			"</dd>" +
			"</dl>";
		document.getElementById("cfb-feedback-text").value = ctx.course_feedback_plain || "";
		renderGradeOptions();
		var fileInput = document.getElementById("cfb-report-file");
		if (fileInput) fileInput.value = "";
		updateReportDisplay();
		document.getElementById("cfb-after-save").textContent = "";
		showStep("form");
	}

	function resolve() {
		var code = (document.getElementById("cfb-access-code").value || "").trim();
		if (!code) {
			frappe.msgprint(__("Please enter your access code."));
			return;
		}
		frappe.call({
			method: "dat_pm.nacstnew.doctype.feedback.feedback.resolve_course_feedback_access",
			args: { access_code: code },
			callback: function (r) {
				if (r.exc) return;
				var msg = r.message || {};
				if (msg.match_type === "single" && msg.context) {
					renderForm(msg.context);
					return;
				}
				if (msg.match_type === "personnel") {
					var courses = msg.courses || [];
					if (!courses.length) {
						frappe.msgprint({
							title: __("No open courses"),
							message: __(
								"There are no submitted courses pending feedback for this service number, or feedback was already submitted."
							),
							indicator: "orange",
						});
						return;
					}
					var pickBody = document.getElementById("cfb-pick-body");
					pickBody.innerHTML =
						"<p class='cfb-muted'>" +
						escapeHtml(msg.personnel_name || "") +
						" — " +
						escapeHtml(msg.service_number || "") +
						"</p>";
					var wrap = document.createElement("div");
					wrap.style.overflowX = "auto";
					var table = document.createElement("table");
					table.className = "cfb-table";
					var thead = document.createElement("thead");
					thead.innerHTML =
						"<tr><th>#</th><th>" +
						escapeHtml(__("Course")) +
						"</th><th>" +
						escapeHtml(__("Dates")) +
						"</th><th></th></tr>";
					table.appendChild(thead);
					var tbody = document.createElement("tbody");
					courses.forEach(function (c, i) {
						var tr = document.createElement("tr");
						var td0 = document.createElement("td");
						td0.textContent = String(i + 1);
						var td1 = document.createElement("td");
						td1.appendChild(document.createTextNode(c.course_name || ""));
						if (c.has_draft) {
							var badge = document.createElement("span");
							badge.className = "cfb-badge";
							badge.style.marginLeft = "6px";
							badge.textContent = __("Draft");
							td1.appendChild(badge);
						}
						var td2 = document.createElement("td");
						td2.textContent =
							(c.course_start_date || "") + " — " + (c.course_end_date || "");
						var td3 = document.createElement("td");
						var btn = document.createElement("button");
						btn.type = "button";
						btn.className = "btn btn-xs btn-primary";
						btn.textContent = __("Select");
						(function (caName) {
							btn.addEventListener("click", function () {
								frappe.call({
									method: "dat_pm.nacstnew.doctype.feedback.feedback.get_course_feedback_form_data",
									args: { course_attended_name: caName },
									callback: function (r2) {
										if (r2.exc) return;
										if (r2.message && r2.message.context) {
											renderForm(r2.message.context);
										}
									},
								});
							});
						})(c.course_attended);
						td3.appendChild(btn);
						tr.appendChild(td0);
						tr.appendChild(td1);
						tr.appendChild(td2);
						tr.appendChild(td3);
						tbody.appendChild(tr);
					});
					table.appendChild(tbody);
					wrap.appendChild(table);
					pickBody.appendChild(wrap);
					showStep("pick");
				}
			},
		});
	}

	function saveDraft() {
		if (!state.context || !state.context.course_attended) {
			frappe.msgprint(__("No course selected."));
			return;
		}
		var text = document.getElementById("cfb-feedback-text").value || "";
		var grade = (document.getElementById("cfb-grade-select").value || "").trim();
		frappe.call({
			method: "dat_pm.nacstnew.doctype.feedback.feedback.save_course_feedback_draft",
			args: {
				course_attended_name: state.context.course_attended,
				course_feedback: text,
				grade: grade,
			},
			callback: function (r) {
				if (r.exc) return;
				var m = r.message || {};
				if (m.name) {
					state.context.feedback_draft_name = m.name;
				}
				if (m.course_report) {
					state.context.course_report = m.course_report;
					updateReportDisplay();
				}
				state.context.grade = m.grade || grade;
				renderGradeOptions();
				var finalizeUi = function () {
					document.getElementById("cfb-after-save").textContent =
						(m.message || __("Draft saved.")) +
						(m.name ? " " + __("Document") + ": " + m.name : "");
					frappe.show_alert({ message: __("Draft saved."), indicator: "green" }, 4);
				};
				if (m.name) {
					uploadCourseReport(m.name, finalizeUi);
				} else {
					finalizeUi();
				}
			},
		});
	}

	function backToAccess() {
		showStep("access");
		state.context = null;
		var accessInput = document.getElementById("cfb-access-code");
		if (accessInput) {
			accessInput.focus();
			accessInput.select();
		}
	}

	document.getElementById("cfb-btn-resolve").addEventListener("click", resolve);
	document.getElementById("cfb-btn-save").addEventListener("click", saveDraft);
	document.getElementById("cfb-btn-pick-back").addEventListener("click", backToAccess);
	document.getElementById("cfb-btn-back").addEventListener("click", backToAccess);

	document.getElementById("cfb-access-code").addEventListener("keydown", function (e) {
		if (e.key === "Enter") resolve();
	});

	frappe.call({
		method: "dat_pm.nacstnew.doctype.feedback.feedback.get_feedback_grade_options",
		callback: function (r) {
			if (r.exc) return;
			state.grade_options = r.message || [];
			renderGradeOptions();
		},
	});
};
