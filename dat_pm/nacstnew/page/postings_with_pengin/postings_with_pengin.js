frappe.pages['postings-with-pengin'].on_page_load = function (wrapper) {
	// Ensure navigation sidebar helpers are loaded before building the page
	frappe.require('assets/dat_pm/js/navigation_sidebar.js', () => {
		// Make container full-width (like other modern pages)
		localStorage.container_fullwidth = 'true';
		if (
			frappe.ui &&
			frappe.ui.toolbar &&
			frappe.ui.toolbar.set_fullwidth_if_enabled
		) {
			frappe.ui.toolbar.set_fullwidth_if_enabled();
		}

		// Create page
		var page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __('Pending Part 2 Order'),
			single_column: true,
		});

		wrapper.page = page;

		// Sidebar + layout CSS (reuse shared navigation sidebar helpers)
		if (typeof hideDefaultSidebarCSS === 'undefined') {
			console.error(
				'hideDefaultSidebarCSS is not defined. Make sure navigation_sidebar.js is loaded.'
			);
		}
		if (typeof getNavigationSidebarCSS === 'undefined') {
			console.error(
				'getNavigationSidebarCSS is not defined. Make sure navigation_sidebar.js is loaded.'
			);
		}
		if (typeof getNavigationSidebar === 'undefined') {
			console.error(
				'getNavigationSidebar is not defined. Make sure navigation_sidebar.js is loaded.'
			);
		}

		let hideSidebarCSS =
			typeof hideDefaultSidebarCSS !== 'undefined'
				? hideDefaultSidebarCSS('postings-with-pengin')
				: '';
		let navCSS =
			typeof getNavigationSidebarCSS !== 'undefined'
				? getNavigationSidebarCSS('pwp')
				: '';

		page.add_inner_message(
			hideSidebarCSS +
				navCSS +
				`
		<style>
			/* Layout container with sidebar */
			body[data-page-name="postings-with-pengin"] .page-wrapper {
				width: 100% !important;
			}

			body[data-page-name="postings-with-pengin"] .layout-main-section-wrapper {
				display: flex !important;
				flex-direction: column !important;
			}

			.pwp-page-container {
				display: flex;
				gap: 20px;
				min-height: calc(100vh - 120px);
				width: 100%;
				margin: 0;
				padding: 20px;
			}

			.pwp-container {
				flex: 1;
				background: #ffffff;
				border-radius: 12px;
				box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
				padding: 20px 20px 24px;
				display: flex;
				flex-direction: column;
				border: 1px solid rgba(148, 163, 184, 0.3);
			}

			.pwp-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 16px;
			}

			.pwp-title {
				font-size: 18px;
				font-weight: 600;
				color: #0f172a;
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.pwp-title-pill {
				font-size: 11px;
				text-transform: uppercase;
				letter-spacing: 0.06em;
				color: #6366f1;
				background: rgba(99, 102, 241, 0.08);
				border-radius: 999px;
				padding: 3px 10px;
				border: 1px solid rgba(99, 102, 241, 0.3);
			}

			.pwp-summary-text {
				font-size: 13px;
				color: #475569;
			}

			/* Filters */
			.pending-part2-filters {
				background: linear-gradient(135deg, #f9fafb 0%, #eef2ff 100%);
				border-radius: 10px;
				padding: 12px 14px;
				border: 1px solid rgba(148, 163, 184, 0.4);
			}

			.pending-part2-filters .control-label {
				font-size: 11px;
				font-weight: 600;
				text-transform: uppercase;
				color: #6b7280;
				margin-bottom: 3px;
			}

			.pending-part2-filters .form-control {
				font-size: 12px;
				border-radius: 8px;
				border-color: #cbd5f5;
				padding: 4px 8px;
				height: 30px;
			}

			.pending-part2-filters .form-control:focus {
				box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.3);
				border-color: #4f46e5;
			}

			.pending-part2-filters .btn {
				font-size: 11px;
				border-radius: 999px;
			}

			/* Table styling */
			.pending-part2-wrapper table.table {
				font-size: 12px;
				border-radius: 10px;
				overflow: hidden;
				border: 1px solid #e2e8f0;
			}

			.pending-part2-wrapper thead th {
				background: #f8fafc;
				color: #475569;
				font-weight: 600;
				border-bottom: 1px solid #e2e8f0;
				padding-top: 8px;
				padding-bottom: 8px;
			}

			.pending-part2-wrapper tbody tr:nth-child(even) td {
				background-color: #f9fafb;
			}

			.pending-part2-wrapper tbody tr:hover td {
				background-color: #eef2ff;
			}

			.pending-part2-wrapper td,
			.pending-part2-wrapper th {
				vertical-align: middle !important;
			}

			.pending-part2-wrapper a {
				color: #4f46e5;
				text-decoration: none;
			}

			.pending-part2-wrapper a:hover {
				text-decoration: underline;
			}

			/* Pagination */
			.pending-part2-wrapper .btn-group .btn {
				font-size: 11px;
			}
		</style>
		`
		);

		let sidebarHTML =
			typeof getNavigationSidebar !== 'undefined'
				? getNavigationSidebar('postings-with-pengin', 'pwp')
				: '<div></div>';

		let html =
			'<div class="pwp-page-container">' +
			sidebarHTML +
			'<div class="pwp-container">' +
			'<div class="pwp-header">' +
			'<div>' +
			'<div class="pwp-title">' +
			'<span>' +
			__('Pending Part 2 Orders') +
			'</span>' +
			'<span class="pwp-title-pill">' +
			__('Postings Without P2') +
			'</span>' +
			'</div>' +
			'</div>' +
			'<div class="pwp-summary-text" id="pending-part2-header-summary"></div>' +
			'</div>' +
			'<div class="pending-part2-wrapper">' +
			'<div class="pending-part2-filters mb-3">' +
			'<div class="form-row">' +
			'<div class="col-md-3 mb-2">' +
			'<label class="control-label">' +
			__('Year') +
			'</label>' +
			'<select class="form-control" id="pp_year"></select>' +
			'</div>' +
			'<div class="col-md-3 mb-2">' +
			'<label class="control-label">' +
			__('Posted To Unit') +
			'</label>' +
			'<select class="form-control" id="pp_to_unit"></select>' +
			'</div>' +
			'<div class="col-md-3 mb-2">' +
			'<label class="control-label">' +
			__('From Date (WEF)') +
			'</label>' +
			'<input type="date" class="form-control" id="pp_from_date" />' +
			'</div>' +
			'<div class="col-md-3 mb-2">' +
			'<label class="control-label">' +
			__('To Date (WEF)') +
			'</label>' +
			'<input type="date" class="form-control" id="pp_to_date" />' +
			'</div>' +
			'</div>' +
			'<div class="mt-1">' +
			'<button class="btn btn-sm btn-primary" id="pp_refresh">' +
			__('Refresh') +
			'</button> ' +
			'<button class="btn btn-sm btn-default" id="pp_clear">' +
			__('Clear Filters') +
			'</button>' +
			'</div>' +
			'</div>' +
			'<div id="pending-part2-summary" class="mb-3"></div>' +
			'<div id="pending-part2-table"></div>' +
			'</div>' +
			'</div>' +
			'</div>';

		page.body.html(html);

	function init_filters() {
		// Load years
		frappe.call({
			method: `dat_pm.nacstnew.page.postings_with_pengin.postings_with_pengin.get_distinct_posting_years`,
			callback: function (r) {
				let opts = [''];
				if (r.message && Array.isArray(r.message)) {
					r.message.forEach(function (y) {
						if (y) opts.push(String(y));
					});
				}
				let $year = $('#pp_year');
				$year.empty();
				opts.forEach(function (opt) {
					$year.append(
						'<option value="' +
							frappe.utils.escape_html(opt) +
							'">' +
							frappe.utils.escape_html(opt) +
							'</option>'
					);
				});
			},
		});

		// Load units
		frappe.call({
			method: `dat_pm.nacstnew.page.postings_with_pengin.postings_with_pengin.get_distinct_posting_units`,
			callback: function (r) {
				let opts = [''];
				if (r.message && Array.isArray(r.message)) {
					r.message.forEach(function (u) {
						if (u) opts.push(u);
					});
				}
				let $unit = $('#pp_to_unit');
				$unit.empty();
				opts.forEach(function (opt) {
					$unit.append(
						'<option value="' +
							frappe.utils.escape_html(opt) +
							'">' +
							frappe.utils.escape_html(opt) +
							'</option>'
					);
				});
			},
		});

		// Change handlers
		$('#pp_year, #pp_to_unit, #pp_from_date, #pp_to_date').on('change', function () {
			load_data(1);
		});

		$('#pp_refresh').on('click', function () {
			load_data(1);
		});

		$('#pp_clear').on('click', function () {
			$('#pp_year').val('');
			$('#pp_to_unit').val('');
			$('#pp_from_date').val('');
			$('#pp_to_date').val('');
			load_data(1);
		});
	}

	function load_data(page_no) {
		page_no = page_no || 1;

		$('#pending-part2-table').html(
			'<div class="text-muted">' + __('Loading...') + '</div>'
		);

		frappe.call({
			method: `dat_pm.nacstnew.page.postings_with_pengin.postings_with_pengin.get_postings_without_part2`,
			args: {
				year: $('#pp_year').val() || null,
				to_unit: $('#pp_to_unit').val() || null,
				from_date: $('#pp_from_date').val() || null,
				to_date: $('#pp_to_date').val() || null,
				page: page_no,
				page_length: 50,
			},
			callback: function (r) {
				if (!r.message) {
					$('#pending-part2-table').html(
						'<div class="text-muted">' + __('No data') + '</div>'
					);
					return;
				}
				render_table(r.message);
			},
		});
	}

	function render_table(result) {
		let data = result.data || [];
		let total = result.total_count || 0;
		let page_no = result.page || 1;
		let total_pages = result.total_pages || 1;

		// Summary
		$('#pending-part2-summary').html(
			'<b>' +
				__('Total records without Part 2 Order: {0}', [total]) +
				'</b>'
		);
		$('#pending-part2-header-summary').html(
			total
				? __('Showing {0} pending posting record(s) without Part 2 Order.', [total])
				: __('No pending posting records without Part 2 Order for the selected filters.')
		);

		if (!data.length) {
			$('#pending-part2-table').html(
				'<div class="text-muted">' +
					__('No posting records found for the selected filters.') +
					'</div>'
			);
			return;
		}

		let html = '';

		html += '<div class="table-responsive">';
		html += '<table class="table table-bordered table-sm">';
		html += '<thead>';
		html += '<tr>';
		html += '<th>' + __('Service Number') + '</th>';
		html += '<th>' + __('Name') + '</th>';
		html += '<th>' + __('Rank') + '</th>';
		html += '<th>' + __('Category') + '</th>';
		html += '<th>' + __('Posting Authority') + '</th>';
		html += '<th>' + __('From Unit') + '</th>';
		html += '<th>' + __('To Unit') + '</th>';
		html += '<th>' + __('Appointment') + '</th>';
		html += '<th>' + __('WEF Date') + '</th>';
		html += '<th>' + __('Posting Status') + '</th>';
		html += '</tr>';
		html += '</thead>';
		html += '<tbody>';

		data.forEach(function (row) {
			html += '<tr>';
			html +=
				'<td><a href="#Form/Personnel/' +
				frappe.utils.escape_html(row.service_number || '') +
				'">' +
				frappe.utils.escape_html(row.service_number || '') +
				'</a></td>';
			html +=
				'<td>' +
				frappe.utils.escape_html(row.personnel_name || '') +
				'</td>';
			html +=
				'<td>' +
				frappe.utils.escape_html(row.current_rank || '') +
				'</td>';
			html +=
				'<td>' +
				frappe.utils.escape_html(row.category || '') +
				'</td>';
			html += '<td>';
			if (row.posting_authority) {
				const pa_name = row.posting_authority;
				const pa_url =
					'/app/posting-authority/' + encodeURIComponent(pa_name);
				html +=
					'<a href="' +
					pa_url +
					'" target="_blank" rel="noopener noreferrer">' +
					frappe.utils.escape_html(pa_name) +
					'</a>';
			}
			html += '</td>';
			html +=
				'<td>' +
				frappe.utils.escape_html(row.from_unit || '') +
				'</td>';
			html +=
				'<td>' +
				frappe.utils.escape_html(row.to_unit || '') +
				'</td>';
			html +=
				'<td>' +
				frappe.utils.escape_html(row.appointment || '') +
				'</td>';
			html +=
				'<td>' +
				frappe.utils.escape_html(row.wef_date || '') +
				'</td>';
			html +=
				'<td>' +
				frappe.utils.escape_html(row.posting_status || '') +
				'</td>';
			html += '</tr>';
		});

		html += '</tbody>';
		html += '</table>';
		html += '</div>';

		// Pagination
		html += '<div class="mt-2">';
		html +=
			'<span class="mr-3">' +
			__('Page {0} of {1}', [page_no, total_pages]) +
			'</span>';

		html += '<div class="btn-group btn-group-sm" role="group">';
		html +=
			'<button class="btn btn-default" ' +
			(page_no <= 1 ? 'disabled' : '') +
			' data-page="' +
			(page_no - 1) +
			'">' +
			__('Prev') +
			'</button>';
		html +=
			'<button class="btn btn-default" ' +
			(page_no >= total_pages ? 'disabled' : '') +
			' data-page="' +
			(page_no + 1) +
			'">' +
			__('Next') +
			'</button>';
		html += '</div>';
		html += '</div>';

		$('#pending-part2-table').html(html);

		$('#pending-part2-table button[data-page]').on('click', function () {
			let p = parseInt($(this).attr('data-page'), 10);
			if (p && p > 0 && p <= total_pages) {
				load_data(p);
			}
		});
	}

	init_filters();
	load_data(1);
	});
};
