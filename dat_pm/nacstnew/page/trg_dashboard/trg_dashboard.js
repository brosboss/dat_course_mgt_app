// Copyright (c) 2026, !! and contributors
// TRG Command — high-density neon desk dashboard

frappe.pages["trg-dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("TRG Dashboard"),
		single_column: true,
	});

	var ACCENTS = ["#00f5ff", "#ff2ea6", "#c4f542", "#ffe600", "#ff6b35", "#9d7bff"];
	var DOCSTATUS_LABEL = { 0: __("Draft"), 1: __("Submitted"), 2: __("Cancelled") };
	var pendingState = { start: 0, pageLength: 15, total: 0 };
	var activityNomState = { start: 0, pageLength: 5, total: 0 };
	var activityFbState = { start: 0, pageLength: 5, total: 0 };
	var trgNomControl = null;

	page.add_inner_message(`
		<style>
			@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Exo+2:wght@400;500;600&display=swap');
			.trg-dash {
				--trg-bg: #0b0b28;
				--trg-panel: rgba(18, 18, 58, 0.92);
				--trg-panel2: rgba(28, 28, 72, 0.75);
				--trg-line: rgba(0, 245, 255, 0.15);
				--trg-text: #e8ecff;
				--trg-muted: #8b92c9;
				--trg-radius: 14px;
				font-family: "Exo 2", ui-sans-serif, system-ui, sans-serif;
				color: var(--trg-text);
				background: var(--trg-bg);
				min-height: calc(100vh - 120px);
				margin: -10px -15px 0;
				padding: 18px 18px 32px;
				position: relative;
				overflow-x: hidden;
			}
			.trg-dash::before {
				content: "";
				position: absolute;
				inset: 0;
				background:
					radial-gradient(ellipse 80% 50% at 10% -20%, rgba(0, 245, 255, 0.12), transparent 50%),
					radial-gradient(ellipse 60% 40% at 100% 0%, rgba(255, 46, 166, 0.1), transparent 45%),
					linear-gradient(180deg, rgba(12, 12, 40, 0.3) 0%, transparent 40%);
				pointer-events: none;
				z-index: 0;
			}
			.trg-dash-inner { position: relative; z-index: 1; max-width: 1600px; margin: 0 auto; }
			.trg-head {
				display: flex;
				flex-wrap: wrap;
				align-items: flex-end;
				justify-content: space-between;
				gap: 16px;
				margin-bottom: 22px;
			}
			.trg-head h1 {
				font-family: "Orbitron", sans-serif;
				font-weight: 700;
				font-size: 1.65rem;
				letter-spacing: 0.06em;
				margin: 0 0 4px 0;
				text-shadow: 0 0 24px rgba(0, 245, 255, 0.45);
				color: #fff;
			}
			.trg-head p { margin: 0; color: var(--trg-muted); font-size: 0.9rem; }
			.trg-head-meta {
				text-align: right;
				font-size: 0.8rem;
				color: var(--trg-muted);
			}
			.trg-head-meta .trg-clock {
				font-family: "Orbitron", monospace;
				font-size: 1rem;
				color: #00f5ff;
				filter: drop-shadow(0 0 8px rgba(0, 245, 255, 0.5));
			}
			.trg-bento {
				display: grid;
				grid-template-columns: repeat(12, 1fr);
				gap: 14px;
			}
			.trg-kpi-row {
				grid-column: 1 / -1;
				display: grid;
				grid-template-columns: repeat(4, 1fr);
				gap: 14px;
			}
			@media (max-width: 1100px) {
				.trg-kpi-row { grid-template-columns: repeat(2, 1fr); }
			}
			@media (max-width: 600px) {
				.trg-kpi-row { grid-template-columns: 1fr; }
			}
			.trg-card {
				background: var(--trg-panel);
				border: 1px solid var(--trg-line);
				border-radius: var(--trg-radius);
				padding: 16px;
				box-shadow:
					0 0 0 1px rgba(0, 245, 255, 0.06),
					0 12px 40px rgba(0, 0, 0, 0.35);
				backdrop-filter: blur(8px);
			}
			.trg-card-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 10px;
				margin-bottom: 12px;
			}
			.trg-card-title {
				font-family: "Orbitron", sans-serif;
				font-size: 0.72rem;
				letter-spacing: 0.12em;
				text-transform: uppercase;
				color: var(--trg-muted);
			}
			.trg-chip {
				font-size: 0.65rem;
				padding: 3px 8px;
				border-radius: 999px;
				border: 1px solid rgba(0, 245, 255, 0.35);
				color: #00f5ff;
				background: rgba(0, 245, 255, 0.08);
			}
			.trg-kpi {
				position: relative;
				overflow: hidden;
			}
			.trg-kpi::after {
				content: "";
				position: absolute;
				top: -40%;
				right: -20%;
				width: 120px;
				height: 120px;
				border-radius: 50%;
				background: radial-gradient(circle, currentColor 0%, transparent 70%);
				opacity: 0.12;
				pointer-events: none;
			}
			.trg-kpi-val {
				font-family: "Orbitron", sans-serif;
				font-size: 2rem;
				font-weight: 700;
				line-height: 1.1;
				filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.15));
			}
			.trg-kpi-lbl { font-size: 0.85rem; color: var(--trg-muted); margin-top: 6px; }
			.trg-activity { grid-column: span 4; min-height: 380px; display: flex; flex-direction: column; }
			.trg-activity-stack {
				display: flex;
				flex-direction: column;
				gap: 0;
				flex: 1;
				min-height: 0;
			}
			.trg-activity-block {
				padding-bottom: 14px;
				margin-bottom: 14px;
				border-bottom: 1px solid rgba(255, 255, 255, 0.08);
			}
			.trg-activity-block:last-child {
				border-bottom: none;
				margin-bottom: 0;
				padding-bottom: 0;
			}
			.trg-activity-subtitle {
				font-size: 0.72rem;
				color: #8b92c9;
				text-transform: uppercase;
				letter-spacing: 0.1em;
				margin-bottom: 8px;
			}
			.trg-activity-scroll {
				max-height: 180px;
				overflow-y: auto;
				overflow-x: hidden;
				margin: 0 -4px;
				padding: 0 4px;
				-webkit-overflow-scrolling: touch;
			}
			.trg-activity-scroll::-webkit-scrollbar { width: 8px; }
			.trg-activity-scroll::-webkit-scrollbar-thumb {
				background: rgba(0, 245, 255, 0.25);
				border-radius: 4px;
			}
			.trg-activity-pager {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 6px;
				margin-top: 6px;
				padding-top: 6px;
				border-top: 1px solid rgba(255, 255, 255, 0.06);
			}
			.trg-pending-card { grid-column: span 4; min-height: 320px; display: flex; flex-direction: column; }
			.trg-pending-scroll {
				max-height: 220px;
				overflow-y: auto;
				overflow-x: hidden;
				margin: 0 -4px;
				padding: 0 4px;
				-webkit-overflow-scrolling: touch;
			}
			.trg-pending-scroll::-webkit-scrollbar { width: 8px; }
			.trg-pending-scroll::-webkit-scrollbar-thumb {
				background: rgba(0, 245, 255, 0.25);
				border-radius: 4px;
			}
			.trg-pending-pager {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 6px;
				margin-top: 6px;
				padding-top: 6px;
				border-top: 1px solid rgba(255, 255, 255, 0.08);
			}
			.trg-pager-btn {
				font-family: "Orbitron", sans-serif;
				font-size: 0.65rem;
				letter-spacing: 0.06em;
				text-transform: uppercase;
				padding: 8px 12px;
				border-radius: 8px;
				border: 1px solid rgba(255, 46, 166, 0.45);
				background: rgba(255, 46, 166, 0.12);
				color: #ff6eb3;
				cursor: pointer;
			}
			.trg-pager-btn--compact {
				padding: 2px 0;
				min-width: 1.75rem;
				font-size: 1rem;
				line-height: 1.2;
				letter-spacing: 0;
				text-transform: none;
				border-radius: 6px;
			}
			.trg-pager-btn:hover:not(:disabled) {
				background: rgba(255, 46, 166, 0.22);
				box-shadow: 0 0 12px rgba(255, 46, 166, 0.25);
			}
			.trg-pager-btn:disabled {
				opacity: 0.35;
				cursor: not-allowed;
			}
			.trg-pending-meta {
				font-size: 0.65rem;
				color: var(--trg-muted);
				text-align: center;
				flex: 1;
				min-width: 0;
			}
			.trg-upcoming-block {
				margin-top: 14px;
				padding-top: 14px;
				border-top: 1px solid rgba(255, 255, 255, 0.08);
			}
			.trg-upcoming-title {
				font-size: 0.72rem;
				color: #8b92c9;
				text-transform: uppercase;
				letter-spacing: 0.1em;
				margin-bottom: 8px;
			}
			.trg-days-badge {
				font-size: 0.65rem;
				padding: 3px 10px;
				border-radius: 8px;
				background: rgba(196, 245, 66, 0.15);
				color: #c4f542;
				border: 1px solid rgba(196, 245, 66, 0.35);
				flex-shrink: 0;
			}
			.trg-donut-card { grid-column: span 4; min-height: 320px; }
			.trg-trend { grid-column: span 7; min-height: 280px; }
			.trg-cat { grid-column: span 5; min-height: 280px; }
			.trg-links { grid-column: 1 / -1; }
			@media (max-width: 1100px) {
				.trg-activity, .trg-pending-card, .trg-donut-card, .trg-trend, .trg-cat {
					grid-column: 1 / -1;
				}
			}
			.trg-list { list-style: none; margin: 0; padding: 0; font-size: 0.82rem; }
			.trg-list li {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 10px;
				padding: 9px 0;
				border-bottom: 1px solid rgba(255, 255, 255, 0.06);
			}
			.trg-list li:last-child { border-bottom: none; }
			.trg-list a {
				color: #7df9ff;
				text-decoration: none;
				flex: 1;
				min-width: 0;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			.trg-list a:hover { text-decoration: underline; }
			.trg-pill {
				font-size: 0.65rem;
				padding: 2px 8px;
				border-radius: 6px;
				background: var(--trg-panel2);
				color: var(--trg-muted);
				flex-shrink: 0;
			}
			.trg-bar-track {
				height: 8px;
				border-radius: 4px;
				background: rgba(255, 255, 255, 0.06);
				overflow: hidden;
				margin-top: 4px;
			}
			.trg-bar-fill {
				height: 100%;
				border-radius: 4px;
				box-shadow: 0 0 12px currentColor;
			}
			.trg-cat-row { margin-bottom: 12px; }
			.trg-cat-row:last-child { margin-bottom: 0; }
			.trg-cat-hdr {
				display: flex;
				justify-content: space-between;
				font-size: 0.78rem;
				color: var(--trg-muted);
			}
			.trg-svg-chart { width: 100%; height: 200px; display: block; }
			.trg-svg-chart--tall { height: 220px; }
			.trg-gauge-wrap {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 20px;
				flex-wrap: wrap;
				margin-top: 8px;
			}
			.trg-gauge {
				width: 140px;
				height: 70px;
				position: relative;
			}
			.trg-gauge svg { width: 100%; height: 100%; filter: drop-shadow(0 0 10px rgba(196, 245, 66, 0.35)); }
			.trg-gauge-val {
				position: absolute;
				left: 50%;
				bottom: 6px;
				transform: translateX(-50%);
				font-family: "Orbitron", sans-serif;
				font-size: 1.25rem;
				color: #c4f542;
			}
			.trg-link-row { display: flex; flex-wrap: wrap; gap: 10px; }
			.trg-link-btn {
				font-family: "Orbitron", sans-serif;
				font-size: 0.68rem;
				letter-spacing: 0.08em;
				text-transform: uppercase;
				padding: 10px 16px;
				border-radius: 10px;
				border: 1px solid rgba(0, 245, 255, 0.4);
				background: rgba(0, 245, 255, 0.1);
				color: #00f5ff;
				cursor: pointer;
				transition: background 0.15s, box-shadow 0.15s;
			}
			.trg-link-btn:hover {
				background: rgba(0, 245, 255, 0.2);
				box-shadow: 0 0 20px rgba(0, 245, 255, 0.25);
			}
			.trg-loading, .trg-err {
				grid-column: 1 / -1;
				text-align: center;
				padding: 48px;
				color: var(--trg-muted);
			}
			.trg-err { color: #ff6b6b; }
			.trg-dash .trg-muted { color: var(--trg-muted); font-size: 0.82rem; }
			.trg-fb-analysis { grid-column: 1 / -1; }
			.trg-fb-analysis-picker {
				display: flex;
				flex-wrap: wrap;
				align-items: flex-end;
				gap: 12px;
				margin-bottom: 12px;
			}
			.trg-fb-nom-field { flex: 1; min-width: 240px; max-width: 440px; }
			.trg-fb-analysis-picker .trg-link-btn { flex-shrink: 0; }
			.trg-fb-analysis-meta {
				font-size: 0.8rem;
				color: var(--trg-muted);
				line-height: 1.5;
				margin-bottom: 14px;
			}
			.trg-fb-stat-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
				gap: 12px;
				margin-top: 4px;
			}
			.trg-fb-stat {
				background: var(--trg-panel2);
				border-radius: 10px;
				padding: 12px 14px;
				border: 1px solid rgba(255, 255, 255, 0.06);
			}
			.trg-fb-stat-val {
				font-family: "Orbitron", sans-serif;
				font-size: 1.35rem;
				color: #ffe600;
				filter: drop-shadow(0 0 8px rgba(255, 230, 0, 0.25));
			}
			.trg-fb-stat-lbl {
				font-size: 0.65rem;
				color: var(--trg-muted);
				margin-top: 6px;
				text-transform: uppercase;
				letter-spacing: 0.06em;
			}
		</style>
	`);

	var shell = `
		<div class="trg-dash">
			<div class="trg-dash-inner">
				<div class="trg-head">
					<div>
						<h1>${__("DAT DASHBOARD")}</h1>
						<p>${__("live data picture")}</p>
					</div>
					<div class="trg-head-meta">
						<div class="trg-clock" id="trg-clock">—</div>
						<div id="trg-user-line"></div>
					</div>
				</div>
				<div class="trg-bento" id="trg-bento">
					<div class="trg-loading"><i class="fa fa-spinner fa-spin"></i> ${__("Loading intelligence…")}</div>
				</div>
			</div>
		</div>
	`;
	page.main.html(shell);

	function trgDashRoot() {
		return document.getElementById("trg-bento");
	}

	function escapeHtml(s) {
		var d = document.createElement("div");
		d.textContent = s == null ? "" : String(s);
		return d.innerHTML;
	}

	function fmtNum(n) {
		if (n === null || n === undefined) return "—";
		return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	function docstatusPill(ds) {
		var t = DOCSTATUS_LABEL[ds] != null ? DOCSTATUS_LABEL[ds] : __("Status ") + ds;
		var col = ds === 1 ? "#c4f542" : ds === 0 ? "#ffe600" : "#ff6b35";
		return '<span class="trg-pill" style="color:' + col + '">' + escapeHtml(t) + "</span>";
	}

	function trgDaysLeftFromStartDate(raw) {
		if (raw == null || raw === "") return null;
		var s = String(raw).trim();
		var y, mo, day;
		if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
			y = parseInt(s.slice(0, 4), 10);
			mo = parseInt(s.slice(5, 7), 10) - 1;
			day = parseInt(s.slice(8, 10), 10);
		} else if (frappe.datetime && frappe.datetime.str_to_obj) {
			try {
				var o = frappe.datetime.str_to_obj(s);
				if (o && !isNaN(o.getTime())) {
					y = o.getFullYear();
					mo = o.getMonth();
					day = o.getDate();
				}
			} catch (ignore) {}
		}
		if (y == null || isNaN(y)) return null;
		var startMid = new Date(y, mo, day);
		var now = new Date();
		var todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		return Math.round((startMid - todayMid) / 86400000);
	}

	function formatDaysLeft(d) {
		if (d === null || d === undefined || d === "") return "—";
		var n = typeof d === "number" ? d : parseInt(d, 10);
		if (isNaN(n)) return "—";
		if (n < 0) return __("Started");
		if (n === 0) return __("Today");
		if (n === 1) return __("1 day left");
		return n + " " + __("days left");
	}

	function upcomingDaysLeftLabel(r) {
		var dl = r.days_left;
		if (dl === undefined || dl === null) dl = r.daysLeft;
		if (dl === undefined || dl === null || dl === "") dl = trgDaysLeftFromStartDate(r.start_date);
		return formatDaysLeft(dl);
	}

	function renderPendingFeedbackBlock(pf) {
		if (!pf) pf = { items: [], total: 0, start: 0, page_length: pendingState.pageLength };
		pendingState.start = pf.start || 0;
		pendingState.pageLength = pf.page_length || pendingState.pageLength || 15;
		pendingState.total = pf.total || 0;
		var root = trgDashRoot();
		if (!root) return;
		var ul = root.querySelector("#trg-pending-feedback-list");
		if (!ul) return;
		var items = pf.items || [];
		ul.innerHTML = items.length
			? items
					.map(function (r) {
						return (
							'<li><a href="#" class="trg-doc-link" data-doctype="Feedback" data-name="' +
							escapeHtml(r.name) +
							'">' +
							escapeHtml(r.personnel_name || r.name) +
							'</a><span class="trg-pill" style="color:#ffe600">' +
							escapeHtml(__("Draft")) +
							'</span><span class="trg-pill">' +
							escapeHtml(r.course_name || "") +
							"</span></li>"
						);
					})
					.join("")
			: '<li class="trg-muted">' + __("No draft feedback pending submission.") + "</li>";
		var meta = root.querySelector("#trg-pending-meta");
		if (meta) {
			var t = pendingState.total;
			var s = pendingState.start;
			if (t === 0) meta.textContent = "0 / 0";
			else meta.textContent = s + 1 + "–" + Math.min(s + items.length, t) + " / " + t;
		}
		var prev = root.querySelector(".trg-pending-prev");
		var next = root.querySelector(".trg-pending-next");
		if (prev) prev.disabled = pendingState.start <= 0;
		if (next)
			next.disabled =
				pendingState.total <= 0 ||
				pendingState.start + pendingState.pageLength >= pendingState.total;
	}

	function loadPendingPage(start) {
		frappe.call({
			method: "dat_pm.nacstnew.page.trg_dashboard.trg_dashboard.get_pending_feedback_page",
			args: { start: start, page_length: pendingState.pageLength },
			callback: function (r) {
				if (r.message) renderPendingFeedbackBlock(r.message);
			},
		});
	}

	function renderActivityNominationsPage(p) {
		if (!p)
			p = {
				items: [],
				total: 0,
				start: 0,
				page_length: activityNomState.pageLength,
			};
		activityNomState.start = p.start || 0;
		activityNomState.pageLength = p.page_length || activityNomState.pageLength || 5;
		activityNomState.total = p.total || 0;
		var root = trgDashRoot();
		if (!root) return;
		var ul = root.querySelector("#trg-activity-nom-list");
		if (!ul) return;
		var items = p.items || [];
		ul.innerHTML = items.length
			? items
					.map(function (r) {
						return (
							'<li><a href="#" class="trg-doc-link" data-doctype="Course Nomination" data-name="' +
							escapeHtml(r.name) +
							'">' +
							escapeHtml(r.course_name || r.name) +
							"</a>" +
							docstatusPill(r.docstatus) +
							"</li>"
						);
					})
					.join("")
			: '<li class="trg-muted">' + __("None") + "</li>";
		var meta = root.querySelector("#trg-activity-nom-meta");
		if (meta) {
			var t = activityNomState.total;
			var s = activityNomState.start;
			if (t === 0) meta.textContent = "0 / 0";
			else meta.textContent = s + 1 + "–" + Math.min(s + items.length, t) + " / " + t;
		}
		var prev = root.querySelector("#trg-activity-nom-prev");
		var next = root.querySelector("#trg-activity-nom-next");
		if (prev) prev.disabled = activityNomState.start <= 0;
		if (next)
			next.disabled =
				activityNomState.total <= 0 ||
				activityNomState.start + activityNomState.pageLength >= activityNomState.total;
	}

	function renderActivityFeedbackPage(p) {
		if (!p)
			p = {
				items: [],
				total: 0,
				start: 0,
				page_length: activityFbState.pageLength,
			};
		activityFbState.start = p.start || 0;
		activityFbState.pageLength = p.page_length || activityFbState.pageLength || 5;
		activityFbState.total = p.total || 0;
		var root = trgDashRoot();
		if (!root) return;
		var ul = root.querySelector("#trg-activity-fb-list");
		if (!ul) return;
		var items = p.items || [];
		ul.innerHTML = items.length
			? items
					.map(function (r) {
						return (
							'<li><a href="#" class="trg-doc-link" data-doctype="Feedback" data-name="' +
							escapeHtml(r.name) +
							'">' +
							escapeHtml(r.personnel_name || r.name) +
							"</a>" +
							docstatusPill(r.docstatus) +
							'<span class="trg-pill">' +
							escapeHtml(r.course_name || "") +
							"</span></li>"
						);
					})
					.join("")
			: '<li class="trg-muted">' + __("None") + "</li>";
		var meta = root.querySelector("#trg-activity-fb-meta");
		if (meta) {
			var t2 = activityFbState.total;
			var s2 = activityFbState.start;
			if (t2 === 0) meta.textContent = "0 / 0";
			else meta.textContent = s2 + 1 + "–" + Math.min(s2 + items.length, t2) + " / " + t2;
		}
		var prev = root.querySelector("#trg-activity-fb-prev");
		var next = root.querySelector("#trg-activity-fb-next");
		if (prev) prev.disabled = activityFbState.start <= 0;
		if (next)
			next.disabled =
				activityFbState.total <= 0 ||
				activityFbState.start + activityFbState.pageLength >= activityFbState.total;
	}

	function loadActivityNominationsPage(start) {
		frappe.call({
			method: "dat_pm.nacstnew.page.trg_dashboard.trg_dashboard.get_activity_nominations_page",
			args: { start: start, page_length: activityNomState.pageLength },
			callback: function (r) {
				if (r.message) renderActivityNominationsPage(r.message);
			},
		});
	}

	function loadActivityFeedbackPage(start) {
		frappe.call({
			method: "dat_pm.nacstnew.page.trg_dashboard.trg_dashboard.get_activity_feedback_page",
			args: { start: start, page_length: activityFbState.pageLength },
			callback: function (r) {
				if (r.message) renderActivityFeedbackPage(r.message);
			},
		});
	}

	function updateClock() {
		var el = document.getElementById("trg-clock");
		if (!el) return;
		var now = new Date();
		el.textContent = now.toLocaleString(undefined, {
			weekday: "short",
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	}
	updateClock();
	setInterval(updateClock, 1000);

	function renderDonut(svgEl, segments) {
		if (!svgEl) return;
		if (!segments || !segments.length) {
			svgEl.innerHTML =
				'<text x="90" y="95" fill="#8b92c9" font-size="12" text-anchor="middle">' + __("No data") + "</text>";
			return;
		}
		var total = segments.reduce(function (a, s) {
			return a + s.value;
		}, 0);
		if (!total) {
			svgEl.innerHTML = '<text x="90" y="95" fill="#8b92c9" font-size="12" text-anchor="middle">' + __("No data") + "</text>";
			return;
		}
		var cx = 90,
			cy = 90,
			rOut = 72,
			rIn = 46;
		var start = -Math.PI / 2;
		var parts = [];
		for (var i = 0; i < segments.length; i++) {
			var frac = segments[i].value / total;
			var end = start + frac * 2 * Math.PI;
			var x1 = cx + rOut * Math.cos(start),
				y1 = cy + rOut * Math.sin(start);
			var x2 = cx + rOut * Math.cos(end),
				y2 = cy + rOut * Math.sin(end);
			var x3 = cx + rIn * Math.cos(end),
				y3 = cy + rIn * Math.sin(end);
			var x4 = cx + rIn * Math.cos(start),
				y4 = cy + rIn * Math.sin(start);
			var large = end - start > Math.PI ? 1 : 0;
			var d =
				"M " +
				x1.toFixed(2) +
				" " +
				y1.toFixed(2) +
				" A " +
				rOut +
				" " +
				rOut +
				" 0 " +
				large +
				" 1 " +
				x2.toFixed(2) +
				" " +
				y2.toFixed(2) +
				" L " +
				x3.toFixed(2) +
				" " +
				y3.toFixed(2) +
				" A " +
				rIn +
				" " +
				rIn +
				" 0 " +
				large +
				" 0 " +
				x4.toFixed(2) +
				" " +
				y4.toFixed(2) +
				" Z";
			parts.push(
				'<path d="' +
					d +
					'" fill="' +
					segments[i].color +
					'" stroke="#0b0b28" stroke-width="1" style="filter:drop-shadow(0 0 6px ' +
					segments[i].color +
					')"/>'
			);
			start = end;
		}
		svgEl.innerHTML =
			parts.join("") +
			'<text x="' +
			cx +
			'" y="' +
			(cy + 5) +
			'" text-anchor="middle" fill="#fff" font-family="Orbitron,sans-serif" font-size="14">' +
			fmtNum(total) +
			"</text>" +
			'<text x="' +
			cx +
			'" y="' +
			(cy + 22) +
			'" text-anchor="middle" fill="#8b92c9" font-size="9">' +
			escapeHtml(__("Nominations")) +
			"</text>";
	}

	function renderLineChart(svgEl, keys, values) {
		if (!svgEl) return;
		if (!values || !values.length) return;
		var w = 520,
			h = 200,
			pad = { t: 14, r: 16, b: 28, l: 36 };
		var maxV = Math.max.apply(null, values.concat([1]));
		var innerW = w - pad.l - pad.r;
		var innerH = h - pad.t - pad.b;
		var pts = [];
		for (var i = 0; i < values.length; i++) {
			var x = pad.l + (innerW * i) / Math.max(values.length - 1, 1);
			var y = pad.t + innerH - (innerH * values[i]) / maxV;
			pts.push([x, y]);
		}
		var path =
			"M " +
			pts
				.map(function (p) {
					return p[0].toFixed(1) + " " + p[1].toFixed(1);
				})
				.join(" L ");
		var area =
			path +
			" L " +
			pts[pts.length - 1][0].toFixed(1) +
			" " +
			(pad.t + innerH) +
			" L " +
			pts[0][0].toFixed(1) +
			" " +
			(pad.t + innerH) +
			" Z";
		var grid = "";
		for (var g = 0; g <= 4; g++) {
			var gy = pad.t + (innerH * g) / 4;
			grid +=
				'<line x1="' +
				pad.l +
				'" y1="' +
				gy.toFixed(1) +
				'" x2="' +
				(w - pad.r) +
				'" y2="' +
				gy.toFixed(1) +
				'" stroke="rgba(255,255,255,0.06)"/>';
		}
		var labels = "";
		for (var k = 0; k < keys.length; k += 2) {
			var xi = pad.l + (innerW * k) / Math.max(keys.length - 1, 1);
			labels +=
				'<text x="' +
				xi.toFixed(0) +
				'" y="' +
				(h - 6) +
				'" fill="#6c749e" font-size="9" text-anchor="middle">' +
				escapeHtml(keys[k].slice(5)) +
				"</text>";
		}
		svgEl.setAttribute("viewBox", "0 0 " + w + " " + h);
		svgEl.innerHTML =
			'<defs><linearGradient id="trgArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00f5ff" stop-opacity="0.35"/><stop offset="100%" stop-color="#00f5ff" stop-opacity="0"/></linearGradient></defs>' +
			grid +
			'<path d="' +
			area +
			'" fill="url(#trgArea)"/>' +
			'<path d="' +
			path +
			'" fill="none" stroke="#00f5ff" stroke-width="2" style="filter:drop-shadow(0 0 6px #00f5ff)"/>' +
			pts
				.map(function (p) {
					return (
						'<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" fill="#ff2ea6" style="filter:drop-shadow(0 0 4px #ff2ea6)"/>'
					);
				})
				.join("") +
			labels;
	}

	function renderGauge(el, pct) {
		if (!el) return;
		var p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
		var angle = (p / 100) * 180;
		var rad = ((180 - angle) * Math.PI) / 180;
		var x = 60 + 50 * Math.cos(rad);
		var y = 60 - 50 * Math.sin(rad);
		el.innerHTML =
			'<svg viewBox="0 0 120 70"><path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10" stroke-linecap="round"/><path d="M 10 60 A 50 50 0 0 1 ' +
			x.toFixed(1) +
			" " +
			y.toFixed(1) +
			'" fill="none" stroke="#c4f542" stroke-width="10" stroke-linecap="round"/></svg><div class="trg-gauge-val">' +
			(pct == null ? "—" : p + "%") +
			"</div>";
	}

	function mountNominationPicker() {
		var wrap = document.getElementById("trg-fb-nom-wrap");
		if (!wrap) return;
		$(wrap).empty();
		trgNomControl = frappe.ui.form.make_control({
			df: {
				fieldtype: "Link",
				options: "Course Nomination",
				fieldname: "trg_fb_nom",
				label: __("Course nomination"),
				placeholder: __("Search by name or ID…"),
			},
			parent: $(wrap),
			render_input: true,
		});
		trgNomControl.refresh();
	}

	function runFeedbackAnalysis() {
		var body = document.getElementById("trg-fb-analysis-body");
		if (!trgNomControl || typeof trgNomControl.get_value !== "function") {
			if (body)
				body.innerHTML =
					'<p class="trg-muted">' + escapeHtml(__("Picker not ready. Refresh the page.")) + "</p>";
			return;
		}
		var nom = String(trgNomControl.get_value() || "").trim();
		if (!nom) {
			frappe.msgprint({
				title: __("Missing"),
				message: __("Please select a course nomination."),
				indicator: "orange",
			});
			return;
		}
		if (body)
			body.innerHTML =
				'<p class="trg-muted"><i class="fa fa-spinner fa-spin"></i> ' +
				escapeHtml(__("Loading…")) +
				"</p>";
		frappe.call({
			method:
				"dat_pm.nacstnew.page.trg_dashboard.trg_dashboard.get_nomination_feedback_rating_analysis",
			args: { course_nomination_name: nom },
			callback: function (r) {
				if (r.exc) {
					if (body)
						body.innerHTML =
							'<p class="trg-muted">' + escapeHtml(__("Could not load analysis.")) + "</p>";
					return;
				}
				renderFeedbackAnalysis(r.message, body);
			},
			error: function () {
				if (body)
					body.innerHTML =
						'<p class="trg-muted">' + escapeHtml(__("Could not load analysis.")) + "</p>";
			},
		});
	}

	function renderFeedbackAnalysis(data, bodyEl) {
		var body = bodyEl || document.getElementById("trg-fb-analysis-body");
		if (!body) return;
		if (!data || !data.nomination) {
			body.innerHTML = '<p class="trg-muted">' + escapeHtml(__("No data.")) + "</p>";
			return;
		}
		var dist = data.distribution || {};
		var counts = [1, 2, 3, 4, 5].map(function (s) {
			return dist[s] || 0;
		});
		var maxD = Math.max.apply(null, [1].concat(counts));
		var bars = [1, 2, 3, 4, 5]
			.map(function (star) {
				var c = dist[star] || 0;
				var pct = Math.round((100 * c) / maxD);
				var col = ACCENTS[(star - 1) % ACCENTS.length];
				return (
					'<div class="trg-cat-row"><div class="trg-cat-hdr"><span>' +
					escapeHtml(String(star) + " " + __("stars")) +
					'</span><span>' +
					fmtNum(c) +
					'</span></div><div class="trg-bar-track"><div class="trg-bar-fill" style="width:' +
					pct +
					"%;background:" +
					col +
					";color:" +
					col +
					'"></div></div></div>'
				);
			})
			.join("");

		var avg5 =
			data.average_out_of_5 != null && data.average_out_of_5 !== ""
				? String(data.average_out_of_5)
				: "—";
		var stats =
			'<div class="trg-fb-stat-grid">' +
			'<div class="trg-fb-stat"><div class="trg-fb-stat-val">' +
			escapeHtml(avg5) +
			'</div><div class="trg-fb-stat-lbl">' +
			escapeHtml(__("Avg / 5")) +
			"</div></div>" +
			'<div class="trg-fb-stat"><div class="trg-fb-stat-val">' +
			fmtNum(data.responses_with_rating) +
			'</div><div class="trg-fb-stat-lbl">' +
			escapeHtml(__("With rating")) +
			"</div></div>" +
			'<div class="trg-fb-stat"><div class="trg-fb-stat-val">' +
			fmtNum(data.feedback_submitted_count) +
			'</div><div class="trg-fb-stat-lbl">' +
			escapeHtml(__("Feedback submitted")) +
			"</div></div>" +
			'<div class="trg-fb-stat"><div class="trg-fb-stat-val">' +
			fmtNum(data.attendees_count) +
			'</div><div class="trg-fb-stat-lbl">' +
			escapeHtml(__("Nominated (attendance)")) +
			"</div></div>" +
			"</div>";

		var ds = data.nomination_docstatus;
		var meta =
			'<div class="trg-fb-analysis-meta"><strong style="color:#e8ecff">' +
			escapeHtml(data.course_name || data.nomination || "") +
			"</strong> · " +
			escapeHtml(data.nomination || "") +
			"<br/>" +
			escapeHtml(data.start_date || "") +
			" — " +
			escapeHtml(data.end_date || "") +
			" " +
			docstatusPill(ds) +
			"</div>";

		var sample = data.sample || [];
		var listU = sample
			.map(function (s) {
				return (
					'<li><a href="#" class="trg-doc-link" data-doctype="Feedback" data-name="' +
					escapeHtml(s.name) +
					'">' +
					escapeHtml(s.personnel_name || s.name) +
					'</a><span class="trg-pill" style="color:#ffe600">' +
					escapeHtml(String(s.stars)) +
					" " +
					escapeHtml(__("stars")) +
					"</span></li>"
				);
			})
			.join("");

		body.innerHTML =
			meta +
			stats +
			'<div style="margin-top:14px"><div class="trg-activity-subtitle">' +
			escapeHtml(__("Rating distribution")) +
			"</div>" +
			bars +
			'</div><div style="margin-top:14px"><div class="trg-activity-subtitle">' +
			escapeHtml(__("Responses")) +
			'</div><ul class="trg-list" style="max-height:180px;overflow-y:auto">' +
			(listU ||
				'<li class="trg-muted">' + escapeHtml(__("None with ratings yet")) + "</li>") +
			"</ul></div>";
	}

	function buildDashboard(data) {
		var c = data.counts || {};
		var kpis = [
			{ key: "personnel", label: __("Personnel"), val: c.personnel, color: "#00f5ff" },
			{ key: "nom", label: __("Course nominations"), val: c.course_nomination, color: "#ff2ea6" },
			{ key: "att", label: __("Courses attended"), val: c.course_attended, color: "#c4f542" },
			{ key: "fb", label: __("Feedback forms"), val: c.feedback, color: "#ffe600" },
		];
		var kpiHtml = kpis
			.map(function (k) {
				return (
					'<div class="trg-card trg-kpi" style="color:' +
					k.color +
					'"><div class="trg-kpi-val">' +
					fmtNum(k.val) +
					'</div><div class="trg-kpi-lbl">' +
					escapeHtml(k.label) +
					"</div></div>"
				);
			})
			.join("");

		var segs = (data.nomination_docstatus || []).map(function (row, idx) {
			return {
				value: row.c,
				color: ACCENTS[idx % ACCENTS.length],
				label: DOCSTATUS_LABEL[row.docstatus] != null ? DOCSTATUS_LABEL[row.docstatus] : String(row.docstatus),
			};
		});

		var up = (data.recent && data.recent.upcoming) || [];
		var upcomingUnderPendingHtml = up
			.map(function (r) {
				var sd =
					r.start_date && frappe.datetime && frappe.datetime.str_to_user
						? frappe.datetime.str_to_user(r.start_date)
						: r.start_date || "";
				return (
					'<li><a href="#" class="trg-doc-link" data-doctype="Course Nomination" data-name="' +
					escapeHtml(r.name) +
					'">' +
					escapeHtml(r.course_name || r.name) +
					'</a><span class="trg-days-badge">' +
					escapeHtml(upcomingDaysLeftLabel(r)) +
					'</span><span class="trg-pill">' +
					escapeHtml(sd) +
					"</span></li>"
				);
			})
			.join("");

		var cats = data.personnel_by_category || [];
		var maxCat = cats.length ? Math.max.apply(null, cats.map(function (x) { return x.c; })) : 1;
		var catHtml = cats
			.map(function (row, idx) {
				var pct = Math.round((100 * row.c) / maxCat);
				var col = ACCENTS[idx % ACCENTS.length];
				var lab = row.category ? row.category : __("Unspecified");
				return (
					'<div class="trg-cat-row"><div class="trg-cat-hdr"><span>' +
					escapeHtml(lab) +
					'</span><span>' +
					fmtNum(row.c) +
					'</span></div><div class="trg-bar-track"><div class="trg-bar-fill" style="width:' +
					pct +
					"%; background:" +
					col +
					"; color:" +
					col +
					'"></div></div></div>'
				);
			})
			.join("");

		var links = data.quick_links || [];
		var linkHtml = links
			.map(function (l) {
				return (
					'<button type="button" class="trg-link-btn" data-route=\'' +
					JSON.stringify(l.route || []) +
					"'>" +
					escapeHtml(l.label) +
					"</button>"
				);
			})
			.join("");

		var extraCounts =
			'<div style="margin-top:12px;font-size:0.78rem;color:#8b92c9;line-height:1.7;">' +
			'<div>' +
			__("Course definitions") +
			": <strong style=\"color:#e8ecff\">" +
			fmtNum(c.course_master) +
			"</strong></div>" +
			'<div>' +
			__("Units") +
			": <strong style=\"color:#e8ecff\">" +
			fmtNum(c.unit) +
			"</strong> · " +
			__("Missions") +
			": <strong style=\"color:#e8ecff\">" +
			fmtNum(c.mission) +
			"</strong> · " +
			__("Tasks") +
			": <strong style=\"color:#e8ecff\">" +
			fmtNum(c.task) +
			"</strong></div>" +
			'<div>' +
			__("Posting authorities") +
			": <strong style=\"color:#e8ecff\">" +
			fmtNum(c.posting_authority) +
			"</strong></div></div>";

		var html =
			'<div class="trg-kpi-row">' +
			kpiHtml +
			"</div>" +
			'<div class="trg-card trg-fb-analysis">' +
			'<div class="trg-card-header"><span class="trg-card-title">' +
			__("Course feedback analysis") +
			'</span><span class="trg-chip">' +
			__("Ratings") +
			'</span></div>' +
			'<div class="trg-fb-analysis-picker">' +
			'<div class="trg-fb-nom-field" id="trg-fb-nom-wrap"></div>' +
			'<button type="button" class="trg-link-btn" id="trg-fb-analysis-btn">' +
			escapeHtml(__("Load analysis")) +
			"</button></div>" +
			'<div id="trg-fb-analysis-body" class="trg-muted">' +
			escapeHtml(__("Choose a course nomination, then load analysis.")) +
			"</div></div>" +
			'<div class="trg-card trg-activity">' +
			'<div class="trg-card-header"><span class="trg-card-title">' +
			__("Activity & pipeline") +
			'</span><span class="trg-chip">' +
			__("Live") +
			'</span></div>' +
			'<div class="trg-activity-stack">' +
			'<div class="trg-activity-block">' +
			'<div class="trg-activity-subtitle">' +
			__("Recently updated nominations") +
			'</div>' +
			'<div class="trg-activity-scroll"><ul class="trg-list" id="trg-activity-nom-list"></ul></div>' +
			'<div class="trg-activity-pager">' +
			'<button type="button" class="trg-pager-btn trg-pager-btn--compact" id="trg-activity-nom-prev" title="' +
			escapeHtml(__("Previous")) +
			'" aria-label="' +
			escapeHtml(__("Previous")) +
			'">‹</button><span class="trg-pending-meta" id="trg-activity-nom-meta"></span>' +
			'<button type="button" class="trg-pager-btn trg-pager-btn--compact" id="trg-activity-nom-next" title="' +
			escapeHtml(__("Next")) +
			'" aria-label="' +
			escapeHtml(__("Next")) +
			'">›</button></div></div>' +
			'<div class="trg-activity-block">' +
			'<div class="trg-activity-subtitle">' +
			__("Latest feedback") +
			'</div>' +
			'<div class="trg-activity-scroll"><ul class="trg-list" id="trg-activity-fb-list"></ul></div>' +
			'<div class="trg-activity-pager">' +
			'<button type="button" class="trg-pager-btn trg-pager-btn--compact" id="trg-activity-fb-prev" title="' +
			escapeHtml(__("Previous")) +
			'" aria-label="' +
			escapeHtml(__("Previous")) +
			'">‹</button><span class="trg-pending-meta" id="trg-activity-fb-meta"></span>' +
			'<button type="button" class="trg-pager-btn trg-pager-btn--compact" id="trg-activity-fb-next" title="' +
			escapeHtml(__("Next")) +
			'" aria-label="' +
			escapeHtml(__("Next")) +
			'">›</button></div></div></div></div>' +
			'<div class="trg-card trg-pending-card">' +
			'<div class="trg-card-header"><span class="trg-card-title">' +
			__("Feedback not yet submitted") +
			'</span><span class="trg-chip">' +
			__("Drafts") +
			'</span></div>' +
			'<div class="trg-pending-scroll"><ul class="trg-list" id="trg-pending-feedback-list"></ul></div>' +
			'<div class="trg-pending-pager">' +
			'<button type="button" class="trg-pager-btn trg-pager-btn--compact trg-pending-prev" title="' +
			escapeHtml(__("Previous")) +
			'" aria-label="' +
			escapeHtml(__("Previous")) +
			'">‹</button><span class="trg-pending-meta" id="trg-pending-meta"> </span>' +
			'<button type="button" class="trg-pager-btn trg-pager-btn--compact trg-pending-next" title="' +
			escapeHtml(__("Next")) +
			'" aria-label="' +
			escapeHtml(__("Next")) +
			'">›</button></div>' +
			'<div class="trg-upcoming-block">' +
			'<div class="trg-upcoming-title">' +
			__("Upcoming course start dates") +
			'</div><ul class="trg-list">' +
			(upcomingUnderPendingHtml || '<li class="trg-muted">' + __("None scheduled") + "</li>") +
			"</ul></div></div>" +
			'<div class="trg-card trg-donut-card"><div class="trg-card-header"><span class="trg-card-title">' +
			__("Nomination workflow") +
			'</span><span class="trg-chip">' +
			__("Docstatus") +
			'</span></div><div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:16px;">' +
			'<svg width="180" height="180" id="trg-donut-svg"></svg>' +
			'<div class="trg-gauge-wrap"><div style="font-size:0.72rem;color:#8b92c9;max-width:140px;">' +
			__("Submitted course records with feedback captured (gauge).") +
			'</div><div class="trg-gauge" id="trg-gauge"></div></div></div></div>' +
			'<div class="trg-card trg-trend"><div class="trg-card-header"><span class="trg-card-title">' +
			__("Nominations created (12 months)") +
			'</span><span class="trg-chip">' +
			__("Trend") +
			'</span></div><svg class="trg-svg-chart" id="trg-line-svg" preserveAspectRatio="xMidYMid meet"></svg></div>' +
			'<div class="trg-card trg-cat"><div class="trg-card-header"><span class="trg-card-title">' +
			__("Personnel by category") +
			'</span><span class="trg-chip">' +
			__("Top 10") +
			'</span></div><div id="trg-cat-body">' +
			(catHtml || '<div class="trg-muted">' + __("No breakdown") + "</div>") +
			extraCounts +
			"</div></div>" +
			'<div class="trg-card trg-links"><div class="trg-card-header"><span class="trg-card-title">' +
			__("Quick routes") +
			'</span></div><div class="trg-link-row" id="trg-link-row">' +
			(linkHtml || '<span class="trg-muted">' + __("No list access") + "</span>") +
			"</div></div>";

		var bento = document.getElementById("trg-bento");
		if (!bento) return;
		bento.innerHTML = html;

		mountNominationPicker();

		if (data.activity_nominations)
			activityNomState.pageLength =
				data.activity_nominations.page_length || activityNomState.pageLength;
		if (data.activity_feedback)
			activityFbState.pageLength = data.activity_feedback.page_length || activityFbState.pageLength;
		renderActivityNominationsPage(data.activity_nominations);
		renderActivityFeedbackPage(data.activity_feedback);

		if (data.pending_feedback) pendingState.pageLength = data.pending_feedback.page_length || pendingState.pageLength;
		renderPendingFeedbackBlock(data.pending_feedback);

		renderDonut(bento.querySelector("#trg-donut-svg"), segs);
		renderGauge(bento.querySelector("#trg-gauge"), data.feedback_gauge_pct);
		var m = data.monthly_nominations || { keys: [], values: [] };
		renderLineChart(bento.querySelector("#trg-line-svg"), m.keys || [], m.values || []);
		if (!bento._trgDashClickBound) {
			bento._trgDashClickBound = true;
			bento.addEventListener("click", function (e) {
				var docA = e.target.closest("a.trg-doc-link");
				if (docA) {
					e.preventDefault();
					var dt = docA.getAttribute("data-doctype");
					var dn = docA.getAttribute("data-name");
					if (dt && dn) frappe.set_route("Form", dt, dn);
					return;
				}
				var actBtn = e.target.closest("button");
				if (actBtn && actBtn.id === "trg-fb-analysis-btn") {
					e.preventDefault();
					runFeedbackAnalysis();
					return;
				}
				if (actBtn && actBtn.id === "trg-activity-nom-prev") {
					e.preventDefault();
					var np = activityNomState.start - activityNomState.pageLength;
					if (np < 0) np = 0;
					loadActivityNominationsPage(np);
					return;
				}
				if (actBtn && actBtn.id === "trg-activity-nom-next") {
					e.preventDefault();
					var nn = activityNomState.start + activityNomState.pageLength;
					if (nn < activityNomState.total) loadActivityNominationsPage(nn);
					return;
				}
				if (actBtn && actBtn.id === "trg-activity-fb-prev") {
					e.preventDefault();
					var fp = activityFbState.start - activityFbState.pageLength;
					if (fp < 0) fp = 0;
					loadActivityFeedbackPage(fp);
					return;
				}
				if (actBtn && actBtn.id === "trg-activity-fb-next") {
					e.preventDefault();
					var fn = activityFbState.start + activityFbState.pageLength;
					if (fn < activityFbState.total) loadActivityFeedbackPage(fn);
					return;
				}
				if (e.target.closest(".trg-pending-prev")) {
					e.preventDefault();
					var pprev = pendingState.start - pendingState.pageLength;
					if (pprev < 0) pprev = 0;
					loadPendingPage(pprev);
					return;
				}
				if (e.target.closest(".trg-pending-next")) {
					e.preventDefault();
					var pn = pendingState.start + pendingState.pageLength;
					if (pn < pendingState.total) loadPendingPage(pn);
					return;
				}
				var qb = e.target.closest(".trg-link-btn");
				if (qb) {
					var raw = qb.getAttribute("data-route");
					if (raw) {
						try {
							var route = JSON.parse(raw);
							frappe.set_route.apply(null, route);
						} catch (ignore) {}
					}
				}
			});
		}
	}

	frappe.call({
		method: "dat_pm.nacstnew.page.trg_dashboard.trg_dashboard.get_dashboard_data",
		callback: function (r) {
			if (r.message) {
				var el = document.getElementById("trg-user-line");
				if (el) {
					el.textContent = (r.message.user || "") + " · " + (r.message.server_now || "");
				}
				buildDashboard(r.message);
			} else {
				document.getElementById("trg-bento").innerHTML =
					'<div class="trg-err">' + __("Could not load dashboard.") + "</div>";
			}
		},
		error: function () {
			document.getElementById("trg-bento").innerHTML =
				'<div class="trg-err">' + __("Could not load dashboard.") + "</div>";
		},
	});
};
