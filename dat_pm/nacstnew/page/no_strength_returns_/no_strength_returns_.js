frappe.pages["no-strength-returns-"].on_page_load = function (wrapper) {
	// Ensure navigation sidebar helpers are loaded before building the page
	frappe.require("assets/dat_pm/js/navigation_sidebar.js", () => {
		// Make page full width for better visibility
		localStorage.container_fullwidth = "true";
		frappe.ui.toolbar.set_fullwidth_if_enabled();

		const page = frappe.ui.make_app_page({
			parent: wrapper,
			title: "Personnel with NO Strength Returns",
			single_column: true,
		});

		wrapper.page = page;

		build_no_strength_returns_page(page);
	});
};

frappe.pages["no-strength-returns-"].on_page_show = function (wrapper) {
	localStorage.container_fullwidth = "true";
	frappe.ui.toolbar.set_fullwidth_if_enabled();

	// Reload data when page is shown again
	if (typeof window.loadNoStrengthReturns === "function") {
		window.currentNSRPage = 1;
		window.loadNoStrengthReturns(window.currentNSRPage);
	}
};

function build_no_strength_returns_page(page) {
	// Add lightweight styles specific to this page + shared sidebar CSS
	if (!page._nsr_css_added) {
		// Ensure navigation helpers are available (log if not, but don't break)
		if (typeof hideDefaultSidebarCSS === "undefined") {
			console.error(
				"hideDefaultSidebarCSS is not defined. Make sure navigation_sidebar.js is loaded."
			);
		}
		if (typeof getNavigationSidebarCSS === "undefined") {
			console.error(
				"getNavigationSidebarCSS is not defined. Make sure navigation_sidebar.js is loaded."
			);
		}
		if (typeof getNavigationSidebar === "undefined") {
			console.error(
				"getNavigationSidebar is not defined. Make sure navigation_sidebar.js is loaded."
			);
		}

		const sidebarCSS =
			typeof hideDefaultSidebarCSS !== "undefined"
				? hideDefaultSidebarCSS("no-strength-returns-")
				: "";
		const navCSS =
			typeof getNavigationSidebarCSS !== "undefined"
				? getNavigationSidebarCSS("nsr")
				: "";

		page.add_inner_message(`
		${sidebarCSS}
		${navCSS}
		<style>
			body[data-page-name="no-strength-returns-"] .page-wrapper {
				width: 100% !important;
			}

			.nsr-layout {
				display: flex;
				gap: 20px;
				padding: 20px;
				min-height: calc(100vh - 120px);
				width: 100%;
				margin: 0;
			}

			.nsr-main {
				flex: 1;
				overflow-y: auto;
				padding-right: 10px;
			}

			.nsr-container {
				width: 100%;
			}

			.nsr-header {
				background: linear-gradient(135deg, #ff6b6b 0%, #f06595 100%);
				padding: 12px 15px;
				border-radius: 8px;
				margin-bottom: 12px;
				box-shadow: 0 2px 8px rgba(240, 101, 149, 0.3);
				display: flex;
				justify-content: space-between;
				align-items: center;
				color: #fff;
			}

			.nsr-header h2 {
				margin: 0;
				font-size: 18px;
				font-weight: 700;
			}

			.nsr-stats {
				display: flex;
				gap: 12px;
				margin-bottom: 15px;
				flex-wrap: wrap;
			}

			.nsr-stat-card {
				background: #fff;
				border-radius: 8px;
				padding: 10px 12px;
				box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
				min-width: 150px;
			}

			.nsr-stat-label {
				font-size: 11px;
				text-transform: uppercase;
				color: #6c757d;
				margin-bottom: 4px;
			}

			.nsr-stat-value {
				font-size: 18px;
				font-weight: 700;
				color: #343a40;
			}

			.nsr-stat-sub {
				font-size: 11px;
				color: #868e96;
				margin-top: 2px;
			}

			.nsr-table-wrapper {
				background: #fff;
				border-radius: 8px;
				box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
				overflow: hidden;
			}

			.nsr-table {
				width: 100%;
				border-collapse: collapse;
			}

			.nsr-table thead {
				background: #343a40;
				color: #fff;
			}

			.nsr-table th {
				padding: 8px 10px;
				font-size: 11px;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				border-bottom: 1px solid #444;
			}

			.nsr-table td {
				padding: 8px 10px;
				font-size: 12px;
				border-bottom: 1px solid #e9ecef;
			}

			.nsr-table tbody tr:hover {
				background-color: #f8f9fa;
			}

			.nsr-name-cell {
				font-weight: 600;
				color: #212529;
			}

			.nsr-service-number {
				font-size: 10px;
				color: #868e96;
				margin-top: 2px;
			}

			.nsr-category-badge {
				display: inline-block;
				padding: 3px 8px;
				border-radius: 12px;
				font-size: 10px;
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}

			.nsr-category-officer {
				background: #e3f2fd;
				color: #1971c2;
			}

			.nsr-category-soldier {
				background: #fff3e0;
				color: #d9480f;
			}

			.nsr-pagination {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 10px 12px;
				background: #fff;
				border-radius: 0 0 8px 8px;
				border-top: 1px solid #e9ecef;
				margin-top: 8px;
			}

			.nsr-pagination-info {
				font-size: 12px;
				color: #6c757d;
			}

			.nsr-pagination-controls {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.nsr-page-btn {
				padding: 5px 10px;
				border-radius: 4px;
				border: 1px solid #ced4da;
				background: #fff;
				font-size: 12px;
				cursor: pointer;
				transition: all 0.15s ease;
			}

			.nsr-page-btn:hover:not(:disabled) {
				background: #495057;
				color: #fff;
				border-color: #495057;
			}

			.nsr-page-btn:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			.nsr-page-input {
				width: 48px;
				padding: 5px;
				border-radius: 4px;
				border: 1px solid #ced4da;
				font-size: 12px;
				text-align: center;
			}

			.nsr-loading,
			.nsr-empty {
				padding: 30px;
				text-align: center;
				color: #868e96;
			}

			.nsr-loading i,
			.nsr-empty i {
				font-size: 32px;
				margin-bottom: 8px;
				display: block;
			}

			.nsr-filter-section {
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

			.nsr-filter-group {
				display: flex;
				flex-direction: column;
				min-width: 160px;
			}

			.nsr-filter-label {
				font-size: 10px;
				font-weight: 600;
				color: #495057;
				margin-bottom: 3px;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}

			.nsr-filter-input,
			.nsr-filter-select {
				padding: 6px 8px;
				border-radius: 4px;
				border: 1px solid #ced4da;
				font-size: 12px;
			}

			.nsr-filter-input:focus,
			.nsr-filter-select:focus {
				outline: none;
				border-color: #667eea;
				box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
			}

			.nsr-filter-actions {
				display: flex;
				gap: 8px;
				margin-left: auto;
			}

			.nsr-filter-btn {
				padding: 7px 14px;
				border-radius: 4px;
				border: none;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				transition: all 0.15s ease;
			}

			.nsr-filter-btn-primary {
				background-color: #667eea;
				color: #fff;
			}

			.nsr-filter-btn-primary:hover {
				background-color: #5568d3;
			}

			.nsr-filter-btn-secondary {
				background-color: #e9ecef;
				color: #343a40;
			}

			.nsr-filter-btn-secondary:hover {
				background-color: #dee2e6;
			}
		</style>
		`);
		page._nsr_css_added = true;
	}

	const sidebarHTML =
		typeof getNavigationSidebar !== "undefined"
			? getNavigationSidebar("no-strength-returns-", "nsr")
			: "<div></div>";

	const html = `
		<div class="nsr-layout">
			${sidebarHTML}

			<div class="nsr-main">
				<div class="nsr-container">
					<div class="nsr-header">
						<h2><i class="fa fa-user-times"></i> Personnel with NO Strength Returns</h2>
						<div style="font-size: 12px; opacity: 0.85;">
							Shows all personnel that have never appeared in <b>Strength Returns</b>.
						</div>
					</div>

					<div class="nsr-filter-section">
						<div class="nsr-filter-group">
							<label class="nsr-filter-label">Year</label>
							<input type="text" id="nsr_filter_year" class="nsr-filter-input" placeholder="e.g. 2025">
						</div>
						<div class="nsr-filter-group">
							<label class="nsr-filter-label">Quarter</label>
							<select id="nsr_filter_quarter" class="nsr-filter-select">
								<option value="">All</option>
								<option value="FIRST">FIRST</option>
								<option value="SECOND">SECOND</option>
								<option value="THIRD">THIRD</option>
								<option value="FOURTH">FOURTH</option>
							</select>
						</div>
						<div class="nsr-filter-group">
							<label class="nsr-filter-label">Returns Originator Unit</label>
							<input type="text" id="nsr_filter_returns_originator_unit" class="nsr-filter-input" list="nsr_returns_originator_unit_list" placeholder="Type unit name">
							<datalist id="nsr_returns_originator_unit_list"></datalist>
						</div>
						<div class="nsr-filter-group">
							<label class="nsr-filter-label">Personnel Category</label>
							<select id="nsr_filter_personnel_category" class="nsr-filter-select">
								<option value="">All</option>
								<option value="Officer">Officer</option>
								<option value="Soldier">Soldier</option>
							</select>
						</div>
						<div class="nsr-filter-actions">
							<button class="nsr-filter-btn nsr-filter-btn-primary" onclick="applyNSRFilters()">
								<i class="fa fa-filter"></i> Apply
							</button>
							<button class="nsr-filter-btn nsr-filter-btn-secondary" onclick="clearNSRFilters()">
								<i class="fa fa-times"></i> Clear
							</button>
						</div>
					</div>

					<div class="nsr-stats">
						<div class="nsr-stat-card">
							<div class="nsr-stat-label">Total Personnel</div>
							<div class="nsr-stat-value" id="nsr_total_personnel">-</div>
						</div>
						<div class="nsr-stat-card">
							<div class="nsr-stat-label">With Strength Returns</div>
							<div class="nsr-stat-value" id="nsr_total_with_returns">-</div>
						</div>
						<div class="nsr-stat-card">
							<div class="nsr-stat-label">Without Strength Returns</div>
							<div class="nsr-stat-value" id="nsr_total_without_returns">-</div>
							<div class="nsr-stat-sub" id="nsr_percent_without">-</div>
						</div>
					</div>

					<div class="nsr-table-wrapper">
						<div id="nsr_loading" class="nsr-loading">
							<i class="fa fa-spinner fa-spin"></i>
							<div>Loading personnel without strength returns...</div>
						</div>

						<div id="nsr_empty" class="nsr-empty" style="display:none;">
							<i class="fa fa-check-circle"></i>
							<div>All personnel have at least one Strength Returns record.</div>
						</div>

						<div id="nsr_table_container" style="display:none;">
							<table class="nsr-table">
								<thead>
									<tr>
										<th>S/N</th>
										<th>Personnel</th>
										<th>Category</th>
										<th>Rank</th>
										<th>Current Unit</th>
										<th>Current Deployment</th>
										<th>DTOS (if any)</th>
									</tr>
								</thead>
								<tbody id="nsr_table_body"></tbody>
							</table>
						</div>
					</div>

					<div id="nsr_pagination" class="nsr-pagination" style="display:none;">
						<div class="nsr-pagination-info" id="nsr_pagination_info"></div>
						<div class="nsr-pagination-controls">
							<button class="nsr-page-btn" id="nsr_first_btn" onclick="goToNSRPage(1)">
								&lt;&lt;
							</button>
							<button class="nsr-page-btn" id="nsr_prev_btn" onclick="goToNSRPrevPage()">
								&lt;
							</button>
							<span style="font-size: 12px;">
								Page
								<input type="number" id="nsr_page_input" class="nsr-page-input" min="1" onchange="goToNSRInputPage()">
								of <span id="nsr_total_pages_span">1</span>
							</span>
							<button class="nsr-page-btn" id="nsr_next_btn" onclick="goToNSRNextPage()">
								&gt;
							</button>
							<button class="nsr-page-btn" id="nsr_last_btn" onclick="goToNSRLastPage()">
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
	window.currentNSRPage = 1;
	window.nsrPageLength = 50;
	window.nsrTotalPages = 1;
	window.nsrTotalCount = 0;

	// Filter state
	window.nsrFilters = {
		year: "",
		quarter: "",
		returns_originator_unit: "",
		personnel_category: "",
	};

	function resetNSRDisplayForFilterChange() {
		// Clear current rows and hide list/pagination until Apply is clicked
		$("#nsr_table_body").empty();
		$("#nsr_table_container").hide();
		$("#nsr_pagination").hide();
		$("#nsr_empty").hide();

		// Reset stats derived from the current filter context to avoid confusion
		// Keep total personnel as-is; clear "with" / "without" and percentage.
		$("#nsr_total_with_returns").text(0);
		$("#nsr_total_without_returns").text(0);
		$("#nsr_percent_without").text("-");
	}

	window.applyNSRFilters = function () {
		resetNSRDisplayForFilterChange();

		window.nsrFilters.year = $("#nsr_filter_year").val() || "";
		window.nsrFilters.quarter = $("#nsr_filter_quarter").val() || "";
		window.nsrFilters.returns_originator_unit =
			$("#nsr_filter_returns_originator_unit").val() || "";
		window.nsrFilters.personnel_category =
			$("#nsr_filter_personnel_category").val() || "";

		window.currentNSRPage = 1;
		window.loadNoStrengthReturns(window.currentNSRPage);
	};

	window.clearNSRFilters = function () {
		$("#nsr_filter_year").val("");
		$("#nsr_filter_quarter").val("");
		$("#nsr_filter_returns_originator_unit").val("");
		$("#nsr_filter_personnel_category").val("");

		window.nsrFilters = {
			year: "",
			quarter: "",
			returns_originator_unit: "",
			personnel_category: "",
		};

		resetNSRDisplayForFilterChange();
		window.currentNSRPage = 1;
		window.loadNoStrengthReturns(window.currentNSRPage);
	};

	// Type-ahead search for Returns Originator Unit (fetch units matching typed text)
	let nsrUnitSearchTimeout = null;
	$("#nsr_filter_returns_originator_unit").on("input", function () {
		resetNSRDisplayForFilterChange();

		const query = $(this).val() || "";

		// If empty, clear suggestions and skip server call
		if (!query.trim()) {
			$("#nsr_returns_originator_unit_list").empty();
			return;
		}

		if (nsrUnitSearchTimeout) {
			clearTimeout(nsrUnitSearchTimeout);
		}

		nsrUnitSearchTimeout = setTimeout(function () {
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
					const list = $("#nsr_returns_originator_unit_list");
					list.empty();
					if (r.message && Array.isArray(r.message)) {
						r.message.forEach(function (u) {
							if (u.name) {
								list.append(
									$("<option></option>")
										.attr("value", u.name)
								);
							}
						});
					}
				},
			});
		}, 300);
	});

	// Clear displayed list whenever basic filters change (before Apply)
	$("#nsr_filter_year").on("input", resetNSRDisplayForFilterChange);
	$("#nsr_filter_quarter").on("change", resetNSRDisplayForFilterChange);
	$("#nsr_filter_personnel_category").on("change", resetNSRDisplayForFilterChange);

	window.loadNoStrengthReturns = function (page_no) {
		$("#nsr_loading").show();
		$("#nsr_empty").hide();
		$("#nsr_table_container").hide();
		$("#nsr_pagination").hide();

		frappe.call({
			method:
				`dat_pm.nacstnew.doctype.personnel.personnel.get_personnel_without_strength_returns`,
			args: {
				page: page_no,
				page_length: window.nsrPageLength,
				// Filters
				category: window.nsrFilters.personnel_category || null,
				year: window.nsrFilters.year || null,
				quarter: window.nsrFilters.quarter || null,
				returns_originator_unit:
					window.nsrFilters.returns_originator_unit || null,
				personnel_category: window.nsrFilters.personnel_category || null,
			},
			callback: function (r) {
				$("#nsr_loading").hide();

				if (!r.message) {
					$("#nsr_empty").show();
					return;
				}

				const msg = r.message;

				// Update stats
				$("#nsr_total_personnel").text(msg.total_personnel || 0);
				$("#nsr_total_with_returns").text(msg.total_with_returns || 0);
				$("#nsr_total_without_returns").text(msg.total_without_returns || 0);
				if (msg.stats && msg.stats.percent_without_returns !== undefined) {
					$("#nsr_percent_without").text(
						msg.stats.percent_without_returns + "% of all personnel"
					);
				}

				const data = msg.data || [];
				window.nsrTotalCount = msg.total_without_returns || 0;
				window.nsrTotalPages = msg.total_pages || 1;
				window.currentNSRPage = msg.page || 1;

				if (!data.length) {
					$("#nsr_empty").show();
					return;
				}

				const tbody = $("#nsr_table_body");
				tbody.empty();

				data.forEach(function (row, idx) {
					const tr = $("<tr></tr>");

					// Serial number (respects pagination)
					const sn = (window.currentNSRPage - 1) * window.nsrPageLength + (idx + 1);
					tr.append($("<td></td>").text(sn));

					// Name + service number
					const nameCell = $('<td class="nsr-name-cell"></td>');
					nameCell.append(
						$("<div></div>").text(row.personnel_name || "Unknown")
					);
					nameCell.append(
						$('<div class="nsr-service-number"></div>').text(
							row.service_number || ""
						)
					);
					tr.append(nameCell);

					// Category badge
					const catCell = $("<td></td>");
					const cat = row.category || "N/A";
					if (cat !== "N/A") {
						const cls =
							cat.toLowerCase() === "officer"
								? "nsr-category-badge nsr-category-officer"
								: "nsr-category-badge nsr-category-soldier";
						catCell.append($("<span></span>").addClass(cls).text(cat));
					} else {
						catCell.text(cat);
					}
					tr.append(catCell);

					tr.append($("<td></td>").text(row.current_rank || ""));
					tr.append($("<td></td>").text(row.current_unit || ""));
					tr.append(
						$("<td></td>").text(row.current_deployment || "")
					);
					tr.append($("<td></td>").text(row.dtos || ""));

					tbody.append(tr);
				});

				updateNSRPagination();
				$("#nsr_table_container").show();
				$("#nsr_pagination").show();
			},
			error: function () {
				$("#nsr_loading").hide();
				$("#nsr_empty").show();
				frappe.msgprint({
					title: __("Error"),
					message: __(
						"Failed to load personnel without strength returns. Please try again."
					),
					indicator: "red",
				});
			},
		});
	};

	window.goToNSRPage = function (page_no) {
		if (page_no >= 1 && page_no <= window.nsrTotalPages) {
			window.currentNSRPage = page_no;
			window.loadNoStrengthReturns(window.currentNSRPage);
		}
	};

	window.goToNSRPrevPage = function () {
		if (window.currentNSRPage > 1) {
			window.currentNSRPage -= 1;
			window.loadNoStrengthReturns(window.currentNSRPage);
		}
	};

	window.goToNSRNextPage = function () {
		if (window.currentNSRPage < window.nsrTotalPages) {
			window.currentNSRPage += 1;
			window.loadNoStrengthReturns(window.currentNSRPage);
		}
	};

	window.goToNSRLastPage = function () {
		window.currentNSRPage = window.nsrTotalPages;
		window.loadNoStrengthReturns(window.currentNSRPage);
	};

	window.goToNSRInputPage = function () {
		const val = parseInt($("#nsr_page_input").val(), 10);
		if (val >= 1 && val <= window.nsrTotalPages) {
			window.currentNSRPage = val;
			window.loadNoStrengthReturns(window.currentNSRPage);
		} else {
			$("#nsr_page_input").val(window.currentNSRPage);
		}
	};

	function updateNSRPagination() {
		$("#nsr_page_input").val(window.currentNSRPage);
		$("#nsr_total_pages_span").text(window.nsrTotalPages);

		const start = (window.currentNSRPage - 1) * window.nsrPageLength + 1;
		const end = Math.min(
			window.currentNSRPage * window.nsrPageLength,
			window.nsrTotalCount
		);

		$("#nsr_pagination_info").text(
			`Showing ${start} to ${end} of ${window.nsrTotalCount} personnel with no strength returns`
		);

		$("#nsr_first_btn").prop("disabled", window.currentNSRPage === 1);
		$("#nsr_prev_btn").prop("disabled", window.currentNSRPage === 1);
		$("#nsr_next_btn").prop(
			"disabled",
			window.currentNSRPage === window.nsrTotalPages
		);
		$("#nsr_last_btn").prop(
			"disabled",
			window.currentNSRPage === window.nsrTotalPages
		);
	}

	// Initial load
	window.loadNoStrengthReturns(window.currentNSRPage);
}