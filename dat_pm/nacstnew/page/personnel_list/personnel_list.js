// Copyright (c) 2025, !! and contributors
// For license information, please see license.txt

function safeHideDefaultSidebarCSS(pageName) {
	return typeof hideDefaultSidebarCSS === "function"
		? hideDefaultSidebarCSS(pageName)
		: "";
}

function safeGetNavigationSidebarCSS(sectionCode) {
	return typeof getNavigationSidebarCSS === "function"
		? getNavigationSidebarCSS(sectionCode)
		: "";
}

function safeGetNavigationSidebar(pageName, sectionCode) {
	return typeof getNavigationSidebar === "function"
		? getNavigationSidebar(pageName, sectionCode)
		: "";
}

frappe.pages['personnel-list'].on_page_load = function(wrapper) {
	// Automatically toggle to full width when page loads
	localStorage.container_fullwidth = "true";
	frappe.ui.toolbar.set_fullwidth_if_enabled();
	
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Personnel List',
		single_column: true
	});
	
	// Store page reference for on_page_show
	wrapper.page = page;
	
	// Create the page content
	build_personnel_list_page(page);
	
	// Also listen to the "show" event directly
	$(wrapper).on('show', function() {
		// Ensure full width is still enabled when page is shown
		localStorage.container_fullwidth = "true";
		frappe.ui.toolbar.set_fullwidth_if_enabled();
		
		setTimeout(function() {
			// Check if page content exists
			if ($('#personnel_table_body').length === 0 && wrapper.page) {
				// Page content doesn't exist, rebuild it
				build_personnel_list_page(wrapper.page);
			} else if (typeof window.loadPersonnelList === 'function') {
				// Reset to first page and reload
				window.currentPage = 1;
				window.loadPersonnelList(window.currentPage);
			} else if (wrapper.page) {
				// If function is not available, rebuild the page
				build_personnel_list_page(wrapper.page);
			}
		}, 100);
	});
}

// Reload content when page is shown (e.g., when navigating from another page)
frappe.pages['personnel-list'].on_page_show = function(wrapper) {
	// Automatically toggle to full width when page is shown
	localStorage.container_fullwidth = "true";
	frappe.ui.toolbar.set_fullwidth_if_enabled();
	
	// Reload the personnel list when page is shown
	setTimeout(function() {
		// Check if page content exists
		if ($('#personnel_table_body').length === 0 && wrapper.page) {
			// Page content doesn't exist, rebuild it
			build_personnel_list_page(wrapper.page);
		} else if (typeof window.loadPersonnelList === 'function') {
			// Reset to first page and reload
			window.currentPage = 1;
			window.loadPersonnelList(window.currentPage);
		} else if (wrapper.page) {
			// If function is not available, rebuild the page
			build_personnel_list_page(wrapper.page);
		}
	}, 100);
}

function build_personnel_list_page(page) {
	// Check if CSS has already been added to avoid duplicates
	if (!page._cssAdded) {
		// Add CSS - include reusable sidebar CSS and page-specific CSS
		page.add_inner_message(
			safeHideDefaultSidebarCSS('personnel-list') +
			safeGetNavigationSidebarCSS('pl') + `
		<style id="pl-page-styles">
			/* Make the page container full width */
			body[data-page-name="personnel-list"] .page-wrapper {
				width: 100% !important;
			}
			
			body[data-page-name="personnel-list"] .layout-main-section-wrapper {
				display: flex !important;
				flex-direction: column !important;
			}
			
			.pl-container {
				display: flex;
				gap: 20px;
				padding: 20px;
				min-height: calc(100vh - 120px);
				width: 100%;
				margin: 0;
			}
			
			.pl-main-content-wrapper {
				flex: 1;
				overflow-y: auto;
				padding-right: 10px;
			}
			
			/* Scrollbar styling for main content */
			.pl-main-content-wrapper::-webkit-scrollbar {
				width: 6px;
			}
			
			.pl-main-content-wrapper::-webkit-scrollbar-track {
				background: rgba(255,255,255,0.1);
				border-radius: 10px;
			}
			
			.pl-main-content-wrapper::-webkit-scrollbar-thumb {
				background: rgba(255,255,255,0.3);
				border-radius: 10px;
			}
			
			.pl-main-content-wrapper::-webkit-scrollbar-thumb:hover {
				background: rgba(255,255,255,0.5);
			}
			
			.pl-header {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				padding: 12px 15px;
				border-radius: 8px;
				margin-bottom: 12px;
				box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
			}
			
			.pl-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
			}
			
			.pl-header h2 {
				color: white;
				margin: 0;
				font-size: 18px;
				font-weight: 700;
			}
			
			.pl-export-btn {
				background: rgba(255, 255, 255, 0.2);
				color: white;
				border: 1px solid rgba(255, 255, 255, 0.3);
				border-radius: 6px;
				padding: 8px 16px;
				cursor: pointer;
				font-size: 12px;
				font-weight: 600;
				transition: all 0.2s ease;
				display: flex;
				align-items: center;
				gap: 6px;
			}
			
			.pl-export-btn:hover {
				background: rgba(255, 255, 255, 0.3);
				border-color: rgba(255, 255, 255, 0.5);
				transform: translateY(-1px);
			}
			
			.pl-export-btn i {
				font-size: 14px;
			}
			
			.pl-table-wrapper {
				background: white;
				border-radius: 12px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.1);
				overflow: hidden;
			}
			
			.pl-table {
				width: 100%;
				border-collapse: collapse;
			}
			
			.pl-table thead {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			}
			
			.pl-table th {
				padding: 8px 10px;
				text-align: left;
				color: white;
				font-weight: 600;
				font-size: 11px;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
			
			.pl-table td {
				padding: 8px 10px;
				border-bottom: 1px solid #e0e0e0;
				font-size: 12px;
			}
			
			.pl-table tbody tr:hover {
				background-color: #f8f9fa;
			}
			
			.pl-table tbody tr:last-child td {
				border-bottom: none;
			}
			
			.pl-table .pl-name-cell {
				font-weight: 600;
				color: #2c3e50;
			}
			
			.pl-table .pl-service-number {
				color: #667eea;
				font-size: 10px;
				margin-top: 2px;
			}
			
			.pl-table .pl-name-cell {
				font-size: 12px;
			}
			
			.pl-pagination-container {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 10px 15px;
				background: white;
				border-top: 1px solid #e0e0e0;
				margin-top: 10px;
				border-radius: 0 0 8px 8px;
			}
			
			.pl-pagination-info {
				color: #6c757d;
				font-size: 12px;
			}
			
			.pl-pagination-controls {
				display: flex;
				gap: 8px;
				align-items: center;
			}
			
			.pl-pagination-btn {
				padding: 6px 12px;
				border: 1px solid #ddd;
				background: white;
				border-radius: 6px;
				cursor: pointer;
				font-size: 12px;
				transition: all 0.2s ease;
			}
			
			.pl-pagination-btn:hover:not(:disabled) {
				background: #667eea;
				color: white;
				border-color: #667eea;
			}
			
			.pl-pagination-btn:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
			
			.pl-page-number-input {
				width: 50px;
				padding: 6px;
				border: 1px solid #ddd;
				border-radius: 4px;
				text-align: center;
				font-size: 12px;
			}
			
			.pl-loading-state {
				text-align: center;
				padding: 40px;
				color: #6c757d;
			}
			
			.pl-loading-state i {
				font-size: 48px;
				margin-bottom: 15px;
				opacity: 0.5;
				animation: pl-spin 1s linear infinite;
			}
			
			@keyframes pl-spin {
				from { transform: rotate(0deg); }
				to { transform: rotate(360deg); }
			}
			
			.pl-empty-state {
				text-align: center;
				padding: 40px;
				color: #6c757d;
			}
			
			.pl-empty-state i {
				font-size: 48px;
				margin-bottom: 15px;
				opacity: 0.5;
			}
			
			.pl-filter-section {
				background: white;
				border-radius: 8px;
				padding: 10px 12px;
				margin-bottom: 12px;
				box-shadow: 0 1px 4px rgba(0,0,0,0.1);
				transition: all 0.3s ease;
			}
			
			.pl-filter-section-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 0;
				cursor: pointer;
				padding: 6px 8px;
				border-radius: 6px;
				transition: background-color 0.2s ease;
			}
			
			.pl-filter-section-header:hover {
				background-color: #f8f9fa;
			}
			
			.pl-filter-section-title {
				font-size: 13px;
				font-weight: 600;
				color: #2c3e50;
				display: flex;
				align-items: center;
				gap: 8px;
			}
			
			.pl-filter-toggle-btn {
				background: #667eea;
				color: white;
				border: none;
				border-radius: 6px;
				padding: 6px 12px;
				cursor: pointer;
				font-size: 12px;
				transition: all 0.2s ease;
			}
			
			.pl-filter-toggle-btn:hover {
				background: #5568d3;
			}
			
			.pl-filter-section-content {
				overflow: hidden;
				transition: max-height 0.3s ease, opacity 0.3s ease;
			}
			
			.pl-filter-section-content.collapsed {
				max-height: 0;
				opacity: 0;
				overflow: hidden;
			}
			
			.pl-filter-section-content.expanded {
				max-height: 5000px;
				opacity: 1;
			}
			
			.pl-filter-row {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
				gap: 10px;
				margin-bottom: 10px;
				margin-top: 10px;
			}
			
			.pl-filter-group {
				display: flex;
				flex-direction: column;
			}
			
			.pl-filter-label {
				font-size: 10px;
				font-weight: 600;
				color: #667eea;
				margin-bottom: 4px;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
			
			.pl-filter-input, .pl-filter-select {
				padding: 6px 8px;
				border: 1px solid #ddd;
				border-radius: 4px;
				font-size: 12px;
				transition: border-color 0.2s ease;
			}
			
			.pl-filter-input:focus, .pl-filter-select:focus {
				outline: none;
				border-color: #667eea;
			}
			
			.pl-period-range-section {
				background: #f8f9fa;
				padding: 15px;
				border-radius: 8px;
				margin-top: 15px;
			}
			
			.pl-period-range-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 15px;
			}
			
			.pl-period-range-title {
				font-size: 13px;
				font-weight: 600;
				color: #2c3e50;
			}
			
			.pl-period-range-options {
				display: flex;
				gap: 10px;
				flex-wrap: wrap;
				margin-bottom: 15px;
			}
			
			.pl-period-range-btn {
				padding: 8px 16px;
				border: 2px solid #ddd;
				background: white;
				border-radius: 6px;
				cursor: pointer;
				font-size: 13px;
				transition: all 0.2s ease;
			}
			
			.pl-period-range-btn:hover {
				border-color: #667eea;
				background: #f0f4ff;
			}
			
			.pl-period-range-btn.active {
				border-color: #667eea;
				background: #667eea;
				color: white;
				font-weight: 600;
			}
			
			.pl-period-range-btn.active i {
				margin-left: 5px;
			}
			
			.pl-period-ranges-list {
				margin-top: 15px;
			}
			
			.pl-period-range-item {
				display: flex;
				align-items: center;
				gap: 10px;
				padding: 10px;
				background: white;
				border-radius: 6px;
				margin-bottom: 8px;
				border: 1px solid #ddd;
			}
			
			.pl-period-range-item input[type="number"] {
				width: 80px;
				padding: 6px;
				border: 1px solid #ddd;
				border-radius: 4px;
				font-size: 13px;
			}
			
			.pl-period-range-item input[type="color"] {
				width: 50px;
				height: 35px;
				border: 1px solid #ddd;
				border-radius: 4px;
				cursor: pointer;
			}
			
			.pl-period-range-item-label {
				font-size: 13px;
				font-weight: 500;
				color: #2c3e50;
				min-width: 60px;
			}
			
			.pl-period-range-item-actions {
				margin-left: auto;
				display: flex;
				gap: 5px;
			}
			
			.pl-period-range-item-btn {
				padding: 5px 10px;
				border: none;
				border-radius: 4px;
				cursor: pointer;
				font-size: 12px;
				transition: all 0.2s ease;
			}
			
			.pl-period-range-item-btn.save {
				background: #28a745;
				color: white;
			}
			
			.pl-period-range-item-btn.save:hover {
				background: #218838;
			}
			
			.pl-period-range-item-btn.delete {
				background: #dc3545;
				color: white;
			}
			
			.pl-period-range-item-btn.delete:hover {
				background: #c82333;
			}
			
			.pl-period-range-item-btn.edit {
				background: #667eea;
				color: white;
			}
			
			.pl-period-range-item-btn.edit:hover {
				background: #5568d3;
			}
			
			.pl-add-range-btn {
				padding: 8px 16px;
				border: 2px dashed #667eea;
				background: white;
				border-radius: 6px;
				cursor: pointer;
				font-size: 13px;
				color: #667eea;
				transition: all 0.2s ease;
				margin-top: 10px;
			}
			
			.pl-add-range-btn:hover {
				background: #f0f4ff;
				border-color: #5568d3;
			}
			
			.pl-range-error {
				color: #dc3545;
				font-size: 12px;
				margin-top: 5px;
				display: none;
			}
			
			.pl-range-error.show {
				display: block;
			}
			
			.pl-category-badge {
				display: inline-block;
				padding: 4px 10px;
				border-radius: 12px;
				font-size: 11px;
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
			
			.pl-category-officer {
				background: #e3f2fd;
				color: #1976d2;
			}
			
			.pl-category-soldier {
				background: #fff3e0;
				color: #e65100;
			}
			
			.pl-filter-actions {
				display: flex;
				gap: 10px;
				margin-top: 15px;
			}
			
			.pl-filter-btn {
				padding: 10px 20px;
				border: none;
				border-radius: 6px;
				cursor: pointer;
				font-size: 14px;
				font-weight: 600;
				transition: all 0.2s ease;
			}
			
			.pl-filter-btn-primary {
				background: #667eea;
				color: white;
			}
			
			.pl-filter-btn-primary:hover {
				background: #5568d3;
			}
			
			.pl-filter-btn-secondary {
				background: #e9ecef;
				color: #2c3e50;
			}
			
			.pl-filter-btn-secondary:hover {
				background: #dee2e6;
			}
			
			/* Row highlighting based on period - now handled dynamically via inline styles */
		</style>
		`);
		page._cssAdded = true;
	}
	
	// Create HTML structure
	let html = `
		<div class="pl-container">
			${safeGetNavigationSidebar('personnel-list', 'pl')}
			
			<div class="pl-main-content-wrapper">
				<div class="pl-header">
					<h2><i class="fa fa-users"></i> Personnel List</h2>
					<button class="pl-export-btn" onclick="exportToExcel()" title="Export to Excel">
						<i class="fa fa-file-excel-o"></i> Export to Excel
					</button>
				</div>
				
				<div class="pl-filter-section">
					<div class="pl-filter-section-header" onclick="toggleFilterSection()">
						<div class="pl-filter-section-title">
							<i class="fa fa-filter"></i> Filters & Period Highlights
						</div>
						<button class="pl-filter-toggle-btn" id="filter_toggle_btn" onclick="event.stopPropagation(); toggleFilterSection();">
							<i class="fa fa-chevron-down" id="filter_toggle_icon"></i> <span id="filter_toggle_text">Show</span>
						</button>
					</div>
					<div class="pl-filter-section-content collapsed" id="filter_section_content">
				<div class="pl-filter-row">
					<div class="pl-filter-group">
						<label class="pl-filter-label">Category</label>
						<select id="filter_category" class="pl-filter-select">
							<option value="">All Categories</option>
							<option value="Officer">Officer</option>
							<option value="Soldier">Soldier</option>
						</select>
					</div>
					<div class="pl-filter-group">
						<label class="pl-filter-label">Current Unit</label>
						<select id="filter_current_unit" class="pl-filter-select">
							<option value="">All Units</option>
						</select>
					</div>
					<div class="pl-filter-group">
						<label class="pl-filter-label">Rank</label>
						<select id="filter_rank" class="pl-filter-select">
							<option value="">All Ranks</option>
						</select>
					</div>
					<div class="pl-filter-group">
						<label class="pl-filter-label">Date TOS</label>
						<input type="date" id="filter_date_tos" class="pl-filter-input">
					</div>
					<div class="pl-filter-group">
						<label class="pl-filter-label">Personnel Name</label>
						<input type="text" id="filter_personnel_name" class="pl-filter-input" placeholder="Search by name...">
					</div>
				</div>
				<div class="pl-period-range-section">
					<div class="pl-period-range-header">
						<div class="pl-period-range-title">Highlight Period in Unit:</div>
						<button class="pl-add-range-btn" onclick="addPeriodRange()">
							<i class="fa fa-plus"></i> Add Range
						</button>
					</div>
					<div class="pl-period-range-options" id="period_range_buttons">
					</div>
					<div class="pl-period-ranges-list" id="period_ranges_list">
					</div>
				</div>
				<div class="pl-filter-actions">
					<button class="pl-filter-btn pl-filter-btn-primary" onclick="applyFilters()">
						<i class="fa fa-filter"></i> Apply Filters
					</button>
					<button class="pl-filter-btn pl-filter-btn-secondary" onclick="clearFilters()">
						<i class="fa fa-times"></i> Clear Filters
					</button>
				</div>
					</div>
				</div>
			
			<div class="pl-table-wrapper">
				<div id="loading_state" class="pl-loading-state">
					<i class="fa fa-spinner"></i>
					<p>Loading personnel data...</p>
				</div>
				
				<div id="table_container" style="display: none;">
					<table class="pl-table">
						<thead>
							<tr>
								<th>Personnel Name</th>
								<th>Category</th>
								<th>Current Unit</th>
								<th>Rank</th>
								<th>Date of Enlistment</th>
								<th>Date of Commission</th>
								<th>Years in Service</th>
								<th>Date TOS</th>
								<th>Period in Unit</th>
							</tr>
						</thead>
						<tbody id="personnel_table_body">
						</tbody>
					</table>
				</div>
				
				<div id="empty_state" class="pl-empty-state" style="display: none;">
					<i class="fa fa-inbox"></i>
					<p>No personnel records found</p>
				</div>
			</div>
			
			<div id="pagination_container" class="pl-pagination-container" style="display: none;">
				<div class="pl-pagination-info" id="pagination_info"></div>
				<div class="pl-pagination-controls">
					<button class="pl-pagination-btn" id="first_page_btn" onclick="goToPage(1)">
						<i class="fa fa-angle-double-left"></i> First
					</button>
					<button class="pl-pagination-btn" id="prev_page_btn" onclick="goToPreviousPage()">
						<i class="fa fa-angle-left"></i> Previous
					</button>
					<span style="margin: 0 10px;">
						Page <input type="number" id="page_number_input" class="pl-page-number-input" min="1" onchange="goToPageInput()"> of <span id="total_pages_span">1</span>
					</span>
					<button class="pl-pagination-btn" id="next_page_btn" onclick="goToNextPage()">
						Next <i class="fa fa-angle-right"></i>
					</button>
					<button class="pl-pagination-btn" id="last_page_btn" onclick="goToLastPage()">
						Last <i class="fa fa-angle-double-right"></i>
					</button>
				</div>
			</div>
			</div>
		</div>
	`;
	
	page.main.html(html);
	
	// Initialize pagination state (make them accessible globally for on_page_show)
	window.currentPage = 1;
	window.pageLength = 20;
	window.totalPages = 1;
	window.totalCount = 0;
	
	// Initialize filter state
	window.currentFilters = {
		category: '',
		current_unit: '',
		rank: '',
		date_tos: '',
		personnel_name: ''
	};
	let selectedPeriodRanges = []; // Array of range IDs that are selected
	let periodRanges = []; // Array of {id, min, max, color}
	let editingRangeId = null;
	
	// Load period ranges from localStorage
	loadPeriodRanges();
	
	// Load filter options
	loadFilterOptions();
	
	// Define loadPersonnelList function before calling it
	window.loadPersonnelList = function(page) {
		$('#loading_state').show();
		$('#table_container').hide();
		$('#empty_state').hide();
		$('#pagination_container').hide();
		
		frappe.call({
			method: `dat_pm.nacstnew.doctype.personnel.personnel.get_personnel_list`,
			args: {
				page: page,
				page_length: window.pageLength,
				category: window.currentFilters.category || null,
				current_unit: window.currentFilters.current_unit || null,
				rank: window.currentFilters.rank || null,
				date_tos: window.currentFilters.date_tos || null,
				personnel_name: window.currentFilters.personnel_name || null
			},
			callback: function(r) {
				$('#loading_state').hide();
				
				if (r.message && r.message.data) {
					let data = r.message.data;
					window.totalCount = r.message.total_count;
					window.totalPages = r.message.total_pages;
					window.currentPage = r.message.page;
					
					if (data.length > 0) {
						displayPersonnelTable(data);
						updatePagination();
						$('#table_container').show();
						$('#pagination_container').show();
					} else {
						$('#empty_state').show();
					}
				} else {
					$('#empty_state').show();
				}
			},
			error: function(r) {
				$('#loading_state').hide();
				$('#empty_state').show();
				frappe.msgprint({
					title: __('Error'),
					message: __('Failed to load personnel list. Please try again.'),
					indicator: 'red'
				});
				console.error("Error loading personnel list:", r);
			}
		});
	};
	
	// Load initial data
	window.loadPersonnelList(window.currentPage);
	
	// Render period ranges
	renderPeriodRanges();
	
	// Initialize filter section state (expanded by default)
	let filterSectionExpanded = false;
	
	window.toggleFilterSection = function() {
		filterSectionExpanded = !filterSectionExpanded;
		let content = $('#filter_section_content');
		let icon = $('#filter_toggle_icon');
		let text = $('#filter_toggle_text');
		
		if (filterSectionExpanded) {
			content.removeClass('collapsed').addClass('expanded');
			icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
			text.text('Hide');
		} else {
			content.removeClass('expanded').addClass('collapsed');
			icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
			text.text('Show');
		}
	};
	
	function loadFilterOptions() {
		// Load units
		frappe.call({
			method: `dat_pm.nacstnew.doctype.personnel.personnel.get_distinct_units`,
			callback: function(r) {
				if (r.message) {
					let select = $('#filter_current_unit');
					r.message.forEach(function(unit) {
						let option = $('<option></option>')
							.attr('value', unit)
							.text(unit);
						select.append(option);
					});
				}
			}
		});
		
		// Load ranks
		frappe.call({
			method: `dat_pm.nacstnew.doctype.personnel.personnel.get_distinct_ranks`,
			callback: function(r) {
				if (r.message) {
					let select = $('#filter_rank');
					r.message.forEach(function(rank) {
						let option = $('<option></option>')
							.attr('value', rank)
							.text(rank);
						select.append(option);
					});
				}
			}
		});
	}
	
	window.applyFilters = function() {
		window.currentFilters.category = $('#filter_category').val() || '';
		window.currentFilters.current_unit = $('#filter_current_unit').val() || '';
		window.currentFilters.rank = $('#filter_rank').val() || '';
		window.currentFilters.date_tos = $('#filter_date_tos').val() || '';
		window.currentFilters.personnel_name = $('#filter_personnel_name').val() || '';
		window.currentPage = 1;
		window.loadPersonnelList(window.currentPage);
	};
	
	window.clearFilters = function() {
		$('#filter_category').val('');
		$('#filter_current_unit').val('');
		$('#filter_rank').val('');
		$('#filter_date_tos').val('');
		$('#filter_personnel_name').val('');
		window.currentFilters = {
			category: '',
			current_unit: '',
			rank: '',
			date_tos: '',
			personnel_name: ''
		};
		selectedPeriodRanges = [];
		renderPeriodRanges();
		window.currentPage = 1;
		window.loadPersonnelList(window.currentPage);
	};
	
	// Global functions for pagination
	window.goToPage = function(page) {
		if (page >= 1 && page <= window.totalPages) {
			window.currentPage = page;
			window.loadPersonnelList(window.currentPage);
		}
	};
	
	window.goToPreviousPage = function() {
		if (window.currentPage > 1) {
			window.currentPage--;
			window.loadPersonnelList(window.currentPage);
		}
	};
	
	window.goToNextPage = function() {
		if (window.currentPage < window.totalPages) {
			window.currentPage++;
			window.loadPersonnelList(window.currentPage);
		}
	};
	
	window.goToLastPage = function() {
		window.currentPage = window.totalPages;
		window.loadPersonnelList(window.currentPage);
	};
	
	window.goToPageInput = function() {
		let pageInput = parseInt($('#page_number_input').val());
		if (pageInput >= 1 && pageInput <= window.totalPages) {
			window.currentPage = pageInput;
			window.loadPersonnelList(window.currentPage);
		} else {
			$('#page_number_input').val(window.currentPage);
		}
	};
	
	window.loadPersonnelList = function(page) {
		$('#loading_state').show();
		$('#table_container').hide();
		$('#empty_state').hide();
		$('#pagination_container').hide();
		//dat_pm.nacstnew.doctype.
		frappe.call({
			method: `dat_pm.nacstnew.doctype.personnel.personnel.get_personnel_list`,
			args: {
				page: page,
				page_length: window.pageLength,
				category: window.currentFilters.category || null,
				current_unit: window.currentFilters.current_unit || null,
				rank: window.currentFilters.rank || null,
				date_tos: window.currentFilters.date_tos || null,
				personnel_name: window.currentFilters.personnel_name || null
			},
			callback: function(r) {
				$('#loading_state').hide();
				
				if (r.message && r.message.data) {
					let data = r.message.data;
					window.totalCount = r.message.total_count;
					window.totalPages = r.message.total_pages;
					window.currentPage = r.message.page;
					
					if (data.length > 0) {
						displayPersonnelTable(data);
						updatePagination();
						$('#table_container').show();
						$('#pagination_container').show();
					} else {
						$('#empty_state').show();
					}
				} else {
					$('#empty_state').show();
				}
			},
			error: function(r) {
				$('#loading_state').hide();
				$('#empty_state').show();
				frappe.msgprint({
					title: __('Error'),
					message: __('Failed to load personnel list. Please try again.'),
					indicator: 'red'
				});
				console.error("Error loading personnel list:", r);
			}
		});
	}
	
	function displayPersonnelTable(data) {
		let tbody = $('#personnel_table_body');
		tbody.empty();
		
		data.forEach(function(personnel) {
			let row = $('<tr></tr>');
			
			// Store period_years in data attribute for highlighting
			if (personnel.period_years !== null && personnel.period_years !== undefined) {
				row.attr('data-period-years', personnel.period_years);
			}
			
			// Personnel Name with Service Number
			let nameCell = $('<td class="pl-name-cell"></td>');
			nameCell.append($('<div></div>').text(personnel.personnel_name));
			nameCell.append($('<div class="pl-service-number"></div>').text(personnel.service_number));
			row.append(nameCell);
			
			// Category with badge styling
			let categoryCell = $('<td></td>');
			let category = personnel.category || 'N/A';
			if (category !== 'N/A') {
				let categoryClass = category.toLowerCase() === 'officer' ? 'pl-category-badge pl-category-officer' : 'pl-category-badge pl-category-soldier';
				categoryCell.append($('<span class="' + categoryClass + '"></span>').text(category));
			} else {
				categoryCell.text(category);
			}
			row.append(categoryCell);
			
			// Current Unit
			row.append($('<td></td>').text(personnel.current_unit));
			
			// Rank
			row.append($('<td></td>').text(personnel.current_rank));
			
			// Date of Enlistment
			row.append($('<td></td>').text(personnel.date_of_enlistment || "N/A"));
			
			// Date of Commission
			row.append($('<td></td>').text(personnel.date_of_commission || "N/A"));
			
			// Years in Service
			row.append($('<td></td>').text(personnel.years_in_service || "N/A"));
			
			// Date TOS
			row.append($('<td></td>').text(personnel.date_tos));
			
			// Period Spent
			row.append($('<td></td>').text(personnel.period_spent));
			
			tbody.append(row);
		});
		
		// Apply highlighting based on selected period range
		applyRowHighlighting();
	}
	
	function loadPeriodRanges() {
		// Load from localStorage or use defaults
		let stored = localStorage.getItem('personnel_list_period_ranges');
		if (stored) {
			periodRanges = JSON.parse(stored);
		} else {
			// Default ranges
			periodRanges = [
				{id: 1, min: 1, max: 5, color: '#007bff'},
				{id: 2, min: 5, max: 10, color: '#dc3545'},
				{id: 3, min: 10, max: 15, color: '#ffc107'}
			];
			savePeriodRanges();
		}
	}
	
	function savePeriodRanges() {
		localStorage.setItem('personnel_list_period_ranges', JSON.stringify(periodRanges));
	}
	
	function renderPeriodRanges() {
		// Render buttons
		let buttonsContainer = $('#period_range_buttons');
		buttonsContainer.empty();
		
		// Add "Clear All Highlights" button
		buttonsContainer.append(`
			<button class="pl-period-range-btn ${selectedPeriodRanges.length === 0 ? 'active' : ''}" 
					onclick="clearAllHighlights()">
				Clear All Highlights
			</button>
		`);
		
		// Add buttons for each range (toggleable)
		periodRanges.forEach(function(range) {
			let isActive = selectedPeriodRanges.includes(range.id);
			buttonsContainer.append(`
				<button class="pl-period-range-btn ${isActive ? 'active' : ''}" 
						onclick="togglePeriodRange(${range.id})"
						style="border-color: ${range.color}; color: ${isActive ? 'white' : range.color}; background-color: ${isActive ? range.color : 'white'};">
					${range.min}-${range.max} Years
					${isActive ? ' <i class="fa fa-check"></i>' : ''}
				</button>
			`);
		});
		
		// Render list for editing
		let listContainer = $('#period_ranges_list');
		listContainer.empty();
		
		periodRanges.forEach(function(range) {
			let isEditing = editingRangeId === range.id;
			let itemHtml = `
				<div class="pl-period-range-item" data-range-id="${range.id}">
					<span class="pl-period-range-item-label">Range:</span>
					<input type="number" class="pl-range-min" value="${range.min}" 
						   ${!isEditing ? 'disabled' : ''} step="0.1" min="0" placeholder="Min">
					<span>-</span>
					<input type="number" class="pl-range-max" value="${range.max}" 
						   ${!isEditing ? 'disabled' : ''} step="0.1" min="0" placeholder="Max">
					<span class="pl-period-range-item-label">Color:</span>
					<input type="color" class="pl-range-color" value="${range.color}" 
						   ${!isEditing ? 'disabled' : ''}>
					<div class="pl-range-error" id="range_error_${range.id}"></div>
					<div class="pl-period-range-item-actions">
			`;
			
			if (isEditing) {
				itemHtml += `
					<button class="pl-period-range-item-btn save" onclick="savePeriodRange(${range.id})">
						<i class="fa fa-check"></i> Save
					</button>
					<button class="pl-period-range-item-btn delete" onclick="cancelEditPeriodRange(${range.id})">
						<i class="fa fa-times"></i> Cancel
					</button>
				`;
			} else {
				itemHtml += `
					<button class="pl-period-range-item-btn edit" onclick="editPeriodRange(${range.id})">
						<i class="fa fa-edit"></i> Edit
					</button>
					<button class="pl-period-range-item-btn delete" onclick="deletePeriodRange(${range.id})">
						<i class="fa fa-trash"></i> Delete
					</button>
				`;
			}
			
			itemHtml += `
					</div>
				</div>
			`;
			listContainer.append(itemHtml);
		});
	}
	
	window.addPeriodRange = function() {
		let newId = periodRanges.length > 0 ? Math.max(...periodRanges.map(r => r.id)) + 1 : 1;
		let newRange = {
			id: newId,
			min: 0,
			max: 1,
			color: '#667eea'
		};
		periodRanges.push(newRange);
		editingRangeId = newId;
		savePeriodRanges();
		renderPeriodRanges();
	};
	
	window.editPeriodRange = function(id) {
		editingRangeId = id;
		renderPeriodRanges();
	};
	
	window.cancelEditPeriodRange = function(id) {
		editingRangeId = null;
		loadPeriodRanges(); // Reload to discard changes
		renderPeriodRanges();
	};
	
	window.savePeriodRange = function(id) {
		let item = $(`.pl-period-range-item[data-range-id="${id}"]`);
		let min = parseFloat(item.find('.pl-range-min').val());
		let max = parseFloat(item.find('.pl-range-max').val());
		let color = item.find('.pl-range-color').val();
		let errorDiv = $(`#range_error_${id}`);
		
		// Validation
		if (isNaN(min) || isNaN(max)) {
			errorDiv.text('Please enter valid numbers').addClass('show');
			return;
		}
		
		if (min >= max) {
			errorDiv.text('Minimum must be less than maximum').addClass('show');
			return;
		}
		
		// Check for overlaps with other ranges
		let overlaps = periodRanges.filter(function(r) {
			return r.id !== id && (
				(min >= r.min && min < r.max) ||
				(max > r.min && max <= r.max) ||
				(min <= r.min && max >= r.max)
			);
		});
		
		if (overlaps.length > 0) {
			errorDiv.text('This range overlaps with another range').addClass('show');
			return;
		}
		
		// Update range
		let range = periodRanges.find(r => r.id === id);
		if (range) {
			range.min = min;
			range.max = max;
			range.color = color;
		}
		
		errorDiv.removeClass('show');
		editingRangeId = null;
		savePeriodRanges();
		renderPeriodRanges();
		
		// Re-apply highlighting if this range was selected
		if (selectedPeriodRanges.includes(id)) {
			applyRowHighlighting();
		}
	};
	
	window.deletePeriodRange = function(id) {
		if (confirm('Are you sure you want to delete this range?')) {
			periodRanges = periodRanges.filter(r => r.id !== id);
			// Remove from selected ranges if it was selected
			selectedPeriodRanges = selectedPeriodRanges.filter(rid => rid !== id);
			savePeriodRanges();
			renderPeriodRanges();
			applyRowHighlighting();
		}
	};
	
	window.togglePeriodRange = function(rangeId) {
		let index = selectedPeriodRanges.indexOf(rangeId);
		if (index > -1) {
			// Remove from selection
			selectedPeriodRanges.splice(index, 1);
		} else {
			// Add to selection
			selectedPeriodRanges.push(rangeId);
		}
		renderPeriodRanges();
		applyRowHighlighting();
	};
	
	window.clearAllHighlights = function() {
		selectedPeriodRanges = [];
		renderPeriodRanges();
		applyRowHighlighting();
	};
	
	function applyRowHighlighting() {
		// Remove all highlighting first
		$('#personnel_table_body tr').each(function() {
			let row = $(this);
			// Remove inline styles and event handlers
			row.css('background-color', '');
			row.off('mouseenter mouseleave');
		});
		
		if (selectedPeriodRanges.length === 0) {
			return; // No highlighting selected
		}
		
		// Get all selected ranges
		let selectedRanges = periodRanges.filter(r => selectedPeriodRanges.includes(r.id));
		if (selectedRanges.length === 0) {
			return;
		}
		
		// Add highlighting based on selected ranges
		$('#personnel_table_body tr').each(function() {
			let row = $(this);
			let periodYears = parseFloat(row.attr('data-period-years'));
			
			if (isNaN(periodYears)) {
				return; // Skip rows without period data
			}
			
			// Find the first matching range (if multiple match, use the first one)
			let matchingRange = selectedRanges.find(function(range) {
				return periodYears >= range.min && periodYears < range.max;
			});
			
			if (matchingRange) {
				// Convert hex color to rgba for transparency
				let rgb = hexToRgb(matchingRange.color);
				if (rgb) {
					row.css('background-color', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
					row.on('mouseenter', function() {
						$(this).css('background-color', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
					});
					row.on('mouseleave', function() {
						$(this).css('background-color', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
					});
				}
			}
		});
	}
	
	function hexToRgb(hex) {
		let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}
	
	// Export to Excel function
	window.exportToExcel = function() {
		// Show loading indicator
		frappe.show_alert({
			message: __('Preparing export...'),
			indicator: 'blue'
		});
		
		// Get current filters
		let filters = {
			category: window.currentFilters.category || null,
			current_unit: window.currentFilters.current_unit || null,
			rank: window.currentFilters.rank || null,
			date_tos: window.currentFilters.date_tos || null,
			personnel_name: window.currentFilters.personnel_name || null
		};
		
		// Build URL for export
		let url = frappe.urllib.get_full_url(`/api/method/dat_pm.nacstnew.doctype.personnel.personnel.export_personnel_list_to_excel`);
		url += '?' + $.param(filters);
		
		// Open in new window to trigger download
		window.open(url, '_blank');
		
		// Show success message after a short delay
		setTimeout(function() {
			frappe.show_alert({
				message: __('Export started. File will download shortly.'),
				indicator: 'green'
			});
		}, 500);
	};
	
	function updatePagination() {
		// Update page number input
		$('#page_number_input').val(currentPage);
		$('#total_pages_span').text(totalPages);
		
		// Update pagination info
		let start = (currentPage - 1) * pageLength + 1;
		let end = Math.min(currentPage * pageLength, totalCount);
		$('#pagination_info').text(`Showing ${start} to ${end} of ${totalCount} personnel`);
		
		// Update button states
		$('#first_page_btn').prop('disabled', currentPage === 1);
		$('#prev_page_btn').prop('disabled', currentPage === 1);
		$('#next_page_btn').prop('disabled', currentPage === totalPages);
		$('#last_page_btn').prop('disabled', currentPage === totalPages);
	}
}

