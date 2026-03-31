frappe.pages["multiple-strength-re"].on_page_load = function (wrapper) {
	// Ensure navigation sidebar helpers are loaded before building the page
	frappe.require("assets/dat_pm/js/navigation_sidebar.js", () => {
		localStorage.container_fullwidth = "true";
		frappe.ui.toolbar.set_fullwidth_if_enabled();

		const page = frappe.ui.make_app_page({
			parent: wrapper,
			title: "Personnel with Multiple Strength Returns",
			single_column: true,
		});

		wrapper.page = page;
		build_multiple_strength_re_page(page);
	});
};

frappe.pages["multiple-strength-re"].on_page_show = function (wrapper) {
	localStorage.container_fullwidth = "true";
	frappe.ui.toolbar.set_fullwidth_if_enabled();

	if (typeof window.loadMultipleStrengthRe === "function") {
		window.currentMSRPage = 1;
		window.loadMultipleStrengthRe(window.currentMSRPage);
	}
};

function build_multiple_strength_re_page(page) {
	// Add styles and sidebar CSS once
	if (!page._msr_css_added) {
		const sidebarCSS =
			typeof hideDefaultSidebarCSS !== "undefined"
				? hideDefaultSidebarCSS("multiple-strength-re")
				: "";
		const navCSS =
			typeof getNavigationSidebarCSS !== "undefined"
				? getNavigationSidebarCSS("msr")
				: "";

		page.add_inner_message(`
		${sidebarCSS}
		${navCSS}
		<style>
			body[data-page-name="multiple-strength-re"] .page-wrapper {
				width: 100% !important;
			}

			.msr-layout {
				display: flex;
				gap: 20px;
				padding: 20px;
				min-height: calc(100vh - 120px);
				width: 100%;
				margin: 0;
			}

			.msr-main {
				flex: 1;
				overflow-y: auto;
				padding-right: 10px;
			}

			.msr-container {
				width: 100%;
			}

			.msr-header {
				background: linear-gradient(135deg, #4c6ef5 0%, #15aabf 100%);
				padding: 12px 15px;
				border-radius: 8px;
				margin-bottom: 12px;
				box-shadow: 0 2px 8px rgba(76, 110, 245, 0.3);
				display: flex;
				justify-content: space-between;
				align-items: center;
				color: #fff;
			}

			.msr-header h2 {
				margin: 0;
				font-size: 18px;
				font-weight: 700;
			}

			.msr-filter-section {
				background: #fff;
				border-radius: 8px;
				padding: 10px 12px;
				margin-bottom: 12px;
				box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
				display: flex;
				flex-wrap: wrap;
				gap: 10px;
				align-items: flex-end;
			}

			.msr-filter-group {
				display: flex;
				flex-direction: column;
				min-width: 160px;
			}

			.msr-filter-label {
				font-size: 10px;
				font-weight: 600;
				color: #495057;
				margin-bottom: 3px;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}

			.msr-filter-input,
			.msr-filter-select {
				padding: 6px 8px;
				border-radius: 4px;
				border: 1px solid #ced4da;
				font-size: 12px;
			}

			.msr-filter-input:focus,
			.msr-filter-select:focus {
				outline: none;
				border-color: #4c6ef5;
				box-shadow: 0 0 0 2px rgba(76, 110, 245, 0.2);
			}

			.msr-filter-actions {
				display: flex;
				gap: 8px;
				margin-left: auto;
			}

			.msr-filter-btn {
				padding: 7px 14px;
				border-radius: 4px;
				border: none;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				transition: all 0.15s ease;
			}

			.msr-filter-btn-primary {
				background-color: #4c6ef5;
				color: #fff;
			}

			.msr-filter-btn-primary:hover {
				background-color: #364fc7;
			}

			.msr-filter-btn-secondary {
				background-color: #e9ecef;
				color: #343a40;
			}

			.msr-filter-btn-secondary:hover {
				background-color: #dee2e6;
			}

			.msr-stats {
				display: flex;
				gap: 12px;
				margin-bottom: 15px;
				flex-wrap: wrap;
			}

			.msr-stat-card {
				background: #fff;
				border-radius: 8px;
				padding: 10px 12px;
				box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
				min-width: 150px;
			}

			.msr-stat-label {
				font-size: 11px;
				text-transform: uppercase;
				color: #6c757d;
				margin-bottom: 4px;
			}

			.msr-stat-value {
				font-size: 18px;
				font-weight: 700;
				color: #343a40;
			}

			.msr-table-wrapper {
				background: #fff;
				border-radius: 8px;
				box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
				overflow: hidden;
			}

			.msr-table {
				width: 100%;
				border-collapse: collapse;
			}

			.msr-table thead {
				background: #343a40;
				color: #fff;
			}

			.msr-table th {
				padding: 8px 10px;
				font-size: 11px;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				border-bottom: 1px solid #444;
			}

			.msr-table td {
				padding: 8px 10px;
				font-size: 12px;
				border-bottom: 1px solid #e9ecef;
				vertical-align: top;
			}

			.msr-table tbody tr:hover {
				background-color: #f8f9fa;
			}

			.msr-name-cell {
				font-weight: 600;
				color: #212529;
			}

			.msr-service-number {
				font-size: 10px;
				color: #868e96;
				margin-top: 2px;
			}

			.msr-returns-badge {
				display: inline-block;
				padding: 3px 8px;
				border-radius: 999px;
				background: #e7f5ff;
				color: #1971c2;
				font-size: 10px;
				font-weight: 600;
				margin: 2px 4px 2px 0;
				cursor: pointer;
			}

			.msr-returns-badge:hover {
				background: #d0ebff;
			}

			.msr-pagination {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 10px 12px;
				background: #fff;
				border-radius: 0 0 8px 8px;
				border-top: 1px solid #e9ecef;
				margin-top: 8px;
			}

			.msr-pagination-info {
				font-size: 12px;
				color: #6c757d;
			}

			.msr-pagination-controls {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.msr-page-btn {
				padding: 5px 10px;
				border-radius: 4px;
				border: 1px solid #ced4da;
				background: #fff;
				font-size: 12px;
				cursor: pointer;
				transition: all 0.15s ease;
			}

			.msr-page-btn:hover:not(:disabled) {
				background: #495057;
				color: #fff;
				border-color: #495057;
			}

			.msr-page-btn:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			.msr-page-input {
				width: 48px;
				padding: 5px;
				border-radius: 4px;
				border: 1px solid #ced4da;
				font-size: 12px;
				text-align: center;
			}

			.msr-loading,
			.msr-empty {
				padding: 30px;
				text-align: center;
				color: #868e96;
			}

			.msr-loading i,
			.msr-empty i {
				font-size: 32px;
				margin-bottom: 8px;
				display: block;
			}
		</style>
		`);
		page._msr_css_added = true;
	}

	const sidebarHTML =
		typeof getNavigationSidebar !== "undefined"
			? getNavigationSidebar("multiple-strength-re", "msr")
			: "<div></div>";

	const html = `
		<div class="msr-layout">
			${sidebarHTML}

			<div class="msr-main">
				<div class="msr-container">
					<div class="msr-header">
						<h2><i class="fa fa-clone"></i> Personnel with Multiple Strength Returns</h2>
						<div style="font-size: 12px; opacity: 0.85;">
							Shows personnel reported in more than one submitted Strength Returns for the selected criteria.
						</div>
					</div>

					<div class="msr-filter-section">
						<div class="msr-filter-group">
							<label class="msr-filter-label">Year</label>
							<input type="text" id="msr_filter_year" class="msr-filter-input" placeholder="e.g. 2025">
						</div>
						<div class="msr-filter-group">
							<label class="msr-filter-label">Quarter</label>
							<select id="msr_filter_quarter" class="msr-filter-select">
								<option value="">All</option>
								<option value="FIRST">FIRST</option>
								<option value="SECOND">SECOND</option>
								<option value="THIRD">THIRD</option>
								<option value="FOURTH">FOURTH</option>
							</select>
						</div>
						<div class="msr-filter-group">
							<label class="msr-filter-label">Returns Originator Unit</label>
							<input type="text" id="msr_filter_returns_originator_unit" class="msr-filter-input" list="msr_returns_originator_unit_list" placeholder="Type unit name">
							<datalist id="msr_returns_originator_unit_list"></datalist>
						</div>
						<div class="msr-filter-group">
							<label class="msr-filter-label">Personnel Category</label>
							<select id="msr_filter_personnel_category" class="msr-filter-select">
								<option value="">All</option>
								<option value="Officer">Officer</option>
								<option value="Soldier">Soldier</option>
							</select>
						</div>
						<div class="msr-filter-actions">
							<button class="msr-filter-btn msr-filter-btn-primary" onclick="applyMSRFilters()">
								<i class="fa fa-filter"></i> Apply
							</button>
							<button class="msr-filter-btn msr-filter-btn-secondary" onclick="clearMSRFilters()">
								<i class="fa fa-times"></i> Clear
							</button>
						</div>
					</div>

					<div class="msr-stats">
						<div class="msr-stat-card">
							<div class="msr-stat-label">Personnel with Multiple Returns</div>
							<div class="msr-stat-value" id="msr_total_duplicates">0</div>
						</div>
					</div>

					<div class="msr-table-wrapper">
						<div id="msr_loading" class="msr-loading">
							<i class="fa fa-spinner fa-spin"></i>
							<div>Loading personnel with multiple strength returns...</div>
						</div>

						<div id="msr_empty" class="msr-empty" style="display:none;">
							<i class="fa fa-check-circle"></i>
							<div>No personnel found with multiple Strength Returns for the selected filters.</div>
						</div>

						<div id="msr_table_container" style="display:none;">
							<table class="msr-table">
								<thead>
									<tr>
										<th>S/N</th>
										<th>Personnel</th>
										<th>Rank</th>
										<th>Year(s)</th>
										<th>Quarter(s)</th>
										<th>Returns Count</th>
										<th>Strength Returns Documents</th>
									</tr>
								</thead>
								<tbody id="msr_table_body"></tbody>
							</table>
						</div>
					</div>

					<div id="msr_pagination" class="msr-pagination" style="display:none;">
						<div class="msr-pagination-info" id="msr_pagination_info"></div>
						<div class="msr-pagination-controls">
							<button class="msr-page-btn" id="msr_first_btn" onclick="goToMSRPage(1)">
								&lt;&lt;
							</button>
							<button class="msr-page-btn" id="msr_prev_btn" onclick="goToMSRPrevPage()">
								&lt;
							</button>
							<span style="font-size: 12px;">
								Page
								<input type="number" id="msr_page_input" class="msr-page-input" min="1" onchange="goToMSRInputPage()">
								of <span id="msr_total_pages_span">1</span>
							</span>
							<button class="msr-page-btn" id="msr_next_btn" onclick="goToMSRNextPage()">
								&gt;
							</button>
							<button class="msr-page-btn" id="msr_last_btn" onclick="goToMSRLastPage()">
								&gt;&gt;
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;

	page.main.html(html);

	// Pagination state
	window.currentMSRPage = 1;
	window.msrPageLength = 50;
	window.msrTotalPages = 1;
	window.msrTotalCount = 0;

	// Filter state
	window.msrFilters = {
		year: "",
		quarter: "",
		returns_originator_unit: "",
		personnel_category: "",
	};

	function resetMSRDisplayForFilterChange() {
		$("#msr_table_body").empty();
		$("#msr_table_container").hide();
		$("#msr_pagination").hide();
		$("#msr_empty").hide();
		$("#msr_total_duplicates").text(0);
	}

	window.applyMSRFilters = function () {
		resetMSRDisplayForFilterChange();

		window.msrFilters.year = $("#msr_filter_year").val() || "";
		window.msrFilters.quarter = $("#msr_filter_quarter").val() || "";
		window.msrFilters.returns_originator_unit =
			$("#msr_filter_returns_originator_unit").val() || "";
		window.msrFilters.personnel_category =
			$("#msr_filter_personnel_category").val() || "";

		window.currentMSRPage = 1;
		window.loadMultipleStrengthRe(window.currentMSRPage);
	};

	window.clearMSRFilters = function () {
		$("#msr_filter_year").val("");
		$("#msr_filter_quarter").val("");
		$("#msr_filter_returns_originator_unit").val("");
		$("#msr_filter_personnel_category").val("");

		resetMSRDisplayForFilterChange();

		window.msrFilters = {
			year: "",
			quarter: "",
			returns_originator_unit: "",
			personnel_category: "",
		};

		window.currentMSRPage = 1;
		window.loadMultipleStrengthRe(window.currentMSRPage);
	};

	// Type-ahead search for Returns Originator Unit
	let msrUnitSearchTimeout = null;
	$("#msr_filter_returns_originator_unit").on("input", function () {
		resetMSRDisplayForFilterChange();

		const query = $(this).val() || "";
		if (!query.trim()) {
			$("#msr_returns_originator_unit_list").empty();
			return;
		}

		if (msrUnitSearchTimeout) {
			clearTimeout(msrUnitSearchTimeout);
		}

		msrUnitSearchTimeout = setTimeout(function () {
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Unit",
					fields: ["name"],
					filters: {
						name: ["like", `%${query}%`],
					},
					limit_page_length: 20,
					order_by: "name asc",
				},
				callback: function (r) {
					const list = $("#msr_returns_originator_unit_list");
					list.empty();
					if (r.message && Array.isArray(r.message)) {
						r.message.forEach(function (u) {
							if (u.name) {
								list.append(
									$("<option></option>").attr("value", u.name)
								);
							}
						});
					}
				},
			});
		}, 300);
	});

	// Clear displayed list when basic filters change (before Apply)
	$("#msr_filter_year").on("input", resetMSRDisplayForFilterChange);
	$("#msr_filter_quarter").on("change", resetMSRDisplayForFilterChange);
	$("#msr_filter_personnel_category").on(
		"change",
		resetMSRDisplayForFilterChange
	);

	// Data loader
	window.loadMultipleStrengthRe = function (page_no) {
		$("#msr_loading").show();
		$("#msr_empty").hide();
		$("#msr_table_container").hide();
		$("#msr_pagination").hide();

		frappe.call({
			method:
				`dat_pm.nacstnew.doctype.strength_returns.strength_returns.get_personnel_multiple_strength_returns`,
			args: {
				page: page_no,
				page_length: window.msrPageLength,
				year: window.msrFilters.year || null,
				quarter: window.msrFilters.quarter || null,
				returns_originator_unit:
					window.msrFilters.returns_originator_unit || null,
				personnel_category: window.msrFilters.personnel_category || null,
			},
			callback: function (r) {
				$("#msr_loading").hide();

				if (!r.message) {
					$("#msr_empty").show();
					return;
				}

				const msg = r.message;

				window.msrTotalCount = msg.total_duplicates || 0;
				window.msrTotalPages = msg.total_pages || 1;
				window.currentMSRPage = msg.page || 1;

				$("#msr_total_duplicates").text(window.msrTotalCount);

				const data = msg.data || [];
				if (!data.length) {
					$("#msr_empty").show();
					return;
				}

				const tbody = $("#msr_table_body");
				tbody.empty();

				data.forEach(function (row, idx) {
					const tr = $("<tr></tr>");

					const sn =
						(window.currentMSRPage - 1) * window.msrPageLength +
						(idx + 1);
					tr.append($("<td></td>").text(sn));

					const nameCell = $('<td class="msr-name-cell"></td>');
					nameCell.append(
						$("<div></div>").text(row.personnel_name || "Unknown")
					);
					nameCell.append(
						$('<div class="msr-service-number"></div>').text(
							row.service_number || ""
						)
					);
					tr.append(nameCell);

					tr.append($("<td></td>").text(row.rank || ""));

					// Aggregate distinct years and quarters from this personnel's returns
					const years = Array.from(
						new Set(
							(row.returns || [])
								.map((ret) => ret.year)
								.filter((y) => y)
						)
					);
					const quarters = Array.from(
						new Set(
							(row.returns || [])
								.map((ret) => ret.quarter)
								.filter((q) => q)
						)
					);

					tr.append($("<td></td>").text(years.join(", ") || ""));
					tr.append($("<td></td>").text(quarters.join(", ") || ""));

					tr.append($("<td></td>").text(row.returns_count || 0));

					const returnsCell = $("<td></td>");
					(row.returns || []).forEach(function (ret) {
						const ref =
							ret.returns_reference ||
							ret.docname ||
							"Strength Returns";
						const badge = $("<span></span>")
							.addClass("msr-returns-badge")
							.text(
								ref +
									(ret.year && ret.quarter
										? ` (${ret.year} ${ret.quarter})`
										: "")
							)
							.on("click", function () {
								frappe.set_route(
									"Form",
									"Strength Returns",
									ret.docname
								);
							});
						returnsCell.append(badge);
					});
					tr.append(returnsCell);

					tbody.append(tr);
				});

				updateMSRPagination();
				$("#msr_table_container").show();
				$("#msr_pagination").show();
			},
			error: function () {
				$("#msr_loading").hide();
				$("#msr_empty").show();
				frappe.msgprint({
					title: __("Error"),
					message: __(
						"Failed to load personnel with multiple strength returns. Please try again."
					),
					indicator: "red",
				});
			},
		});
	};

	// Pagination helpers
	window.goToMSRPage = function (page_no) {
		if (page_no >= 1 && page_no <= window.msrTotalPages) {
			window.currentMSRPage = page_no;
			window.loadMultipleStrengthRe(window.currentMSRPage);
		}
	};

	window.goToMSRPrevPage = function () {
		if (window.currentMSRPage > 1) {
			window.currentMSRPage -= 1;
			window.loadMultipleStrengthRe(window.currentMSRPage);
		}
	};

	window.goToMSRNextPage = function () {
		if (window.currentMSRPage < window.msrTotalPages) {
			window.currentMSRPage += 1;
			window.loadMultipleStrengthRe(window.currentMSRPage);
		}
	};

	window.goToMSRLastPage = function () {
		window.currentMSRPage = window.msrTotalPages;
		window.loadMultipleStrengthRe(window.currentMSRPage);
	};

	window.goToMSRInputPage = function () {
		const val = parseInt($("#msr_page_input").val(), 10);
		if (val >= 1 && val <= window.msrTotalPages) {
			window.currentMSRPage = val;
			window.loadMultipleStrengthRe(window.currentMSRPage);
		} else {
			$("#msr_page_input").val(window.currentMSRPage);
		}
	};

	function updateMSRPagination() {
		$("#msr_page_input").val(window.currentMSRPage);
		$("#msr_total_pages_span").text(window.msrTotalPages);

		const start = (window.currentMSRPage - 1) * window.msrPageLength + 1;
		const end = Math.min(
			window.currentMSRPage * window.msrPageLength,
			window.msrTotalCount
		);

		$("#msr_pagination_info").text(
			`Showing ${start} to ${end} of ${window.msrTotalCount} personnel with multiple strength returns`
		);

		$("#msr_first_btn").prop("disabled", window.currentMSRPage === 1);
		$("#msr_prev_btn").prop("disabled", window.currentMSRPage === 1);
		$("#msr_next_btn").prop(
			"disabled",
			window.currentMSRPage === window.msrTotalPages
		);
		$("#msr_last_btn").prop(
			"disabled",
			window.currentMSRPage === window.msrTotalPages
		);
	}

	// Initial load
	window.loadMultipleStrengthRe(window.currentMSRPage);
}