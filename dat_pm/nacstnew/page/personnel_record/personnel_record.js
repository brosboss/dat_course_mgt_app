// Copyright (c) 2025, !! and contributors
// For license information, please see license.txt

frappe.pages['personnel-record'].on_page_load = function(wrapper) {
	// Automatically toggle to full width when page loads
	localStorage.container_fullwidth = "true";
	frappe.ui.toolbar.set_fullwidth_if_enabled();
	
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Personnel Record',
		single_column: true
	});
	
	// Store page reference for on_page_show
	wrapper.page = page;
	
	// Create the page content
	build_personnel_record_page(page);
	
	// Check for service number in URL parameters or sessionStorage and auto-load
	setTimeout(function() {
		var urlParams = new URLSearchParams(window.location.search);
		var serviceNumber = urlParams.get('service_number') || sessionStorage.getItem('personnel_record_service_number');
		if (serviceNumber) {
			// Clear sessionStorage after reading
			sessionStorage.removeItem('personnel_record_service_number');
			// Wait a bit for the page to fully load, then load the personnel data
			setTimeout(function() {
				load_personnel_data(serviceNumber);
				// Also set the search field value
				var searchInput = $('#pr_service_number_search');
				if (searchInput.length > 0) {
					// Find the label for this service number
					frappe.call({
						method: `dat_pm.nacstnew.doctype.personnel.personnel.get_all_service_numbers`,
						callback: function(r) {
							if (r.message) {
								var personnel = r.message.find(function(item) {
									return item.service_number === serviceNumber;
								});
								if (personnel) {
									var displayText = personnel.service_number + ' - ' + (personnel.personnel_name || '');
									searchInput.val(displayText);
								} else {
									searchInput.val(serviceNumber);
								}
							}
						}
					});
				}
			}, 500);
		}
	}, 200);
	
	// Also listen to the "show" event directly
	$(wrapper).on('show', function() {
		setTimeout(function() {
			// Check if page content exists
			if ($('#pr_service_number_search').length === 0 && wrapper.page) {
				// Page content doesn't exist, rebuild it
				build_personnel_record_page(wrapper.page);
		} else if (wrapper.page && $('#pr_service_number_search').length > 0) {
			// Check for service number in URL parameters or sessionStorage
			var urlParams = new URLSearchParams(window.location.search);
			var serviceNumber = urlParams.get('service_number') || sessionStorage.getItem('personnel_record_service_number');
			if (serviceNumber) {
				// Clear sessionStorage after reading
				sessionStorage.removeItem('personnel_record_service_number');
					load_personnel_data(serviceNumber);
					// Set the search field value
					frappe.call({
						method: `dat_pm.nacstnew.doctype.personnel.personnel.get_all_service_numbers`,
						callback: function(r) {
							if (r.message) {
								var personnel = r.message.find(function(item) {
									return item.service_number === serviceNumber;
								});
								if (personnel) {
									var displayText = personnel.service_number + ' - ' + (personnel.personnel_name || '');
									$('#pr_service_number_search').val(displayText);
								} else {
									$('#pr_service_number_search').val(serviceNumber);
								}
							}
						}
					});
				} else {
					$('#pr_service_number_search').val('');
					// Clear existing autocomplete if it exists
					if ($('#pr_service_number_search')[0].awesomplete) {
						$('#pr_service_number_search')[0].awesomplete.destroy();
					}
					setup_service_number_autocomplete();
					// Hide personnel details if shown
					$('#pr_personnel_details_container').hide();
				}
			} else if (wrapper.page) {
				// If page elements don't exist, rebuild the page
				build_personnel_record_page(wrapper.page);
			}
		}, 100);
	});
}

// Reload content when page is shown (e.g., when navigating from another page)
frappe.pages['personnel-record'].on_page_show = function(wrapper) {
	// Automatically toggle to full width when page is shown
	localStorage.container_fullwidth = "true";
	frappe.ui.toolbar.set_fullwidth_if_enabled();
	
	// Reinitialize autocomplete when page is shown
	setTimeout(function() {
		// Check if page content exists
		if ($('#pr_service_number_search').length === 0 && wrapper.page) {
			// Page content doesn't exist, rebuild it
			build_personnel_record_page(wrapper.page);
		} else if (wrapper.page && $('#pr_service_number_search').length > 0) {
			// Check for service number in URL parameters or sessionStorage
			var urlParams = new URLSearchParams(window.location.search);
			var serviceNumber = urlParams.get('service_number') || sessionStorage.getItem('personnel_record_service_number');
			if (serviceNumber) {
				// Clear sessionStorage after reading
				sessionStorage.removeItem('personnel_record_service_number');
				load_personnel_data(serviceNumber);
				// Set the search field value
				frappe.call({
					method: `dat_pm.nacstnew.doctype.personnel.personnel.get_all_service_numbers`,
					callback: function(r) {
						if (r.message) {
							var personnel = r.message.find(function(item) {
								return item.service_number === serviceNumber;
							});
							if (personnel) {
								var displayText = personnel.service_number + ' - ' + (personnel.personnel_name || '');
								$('#pr_service_number_search').val(displayText);
							} else {
								$('#pr_service_number_search').val(serviceNumber);
							}
						}
					}
				});
			} else {
				$('#pr_service_number_search').val('');
				// Clear existing autocomplete if it exists
				if ($('#pr_service_number_search')[0].awesomplete) {
					$('#pr_service_number_search')[0].awesomplete.destroy();
				}
				setup_service_number_autocomplete();
				// Hide personnel details if shown
				$('#pr_personnel_details_container').hide();
			}
		} else if (wrapper.page) {
			// If page elements don't exist, rebuild the page
			build_personnel_record_page(wrapper.page);
		}
	}, 100);
}

function build_personnel_record_page(page) {
	// Check if CSS has already been added to avoid duplicates
	if (!page._cssAdded) {
		// Add CSS - include reusable sidebar CSS and page-specific CSS
		page.add_inner_message(
			hideDefaultSidebarCSS('personnel-record') + 
			getNavigationSidebarCSS('pr') + `
		<style id="pr-page-styles">
			/* Scoped styles for personnel-record page only - prevents conflicts with other pages */
			/* Make the page container full width */
			body[data-page-name="personnel-record"] .page-wrapper {
				width: 100% !important;
			}
			
			body[data-page-name="personnel-record"] .layout-main-section-wrapper {
				display: flex !important;
				flex-direction: column !important;
			}
			
			/* All .pr- styles are scoped to personnel-record page */
			.pr-container {
				display: flex;
				gap: 20px;
				height: calc(100vh - 120px);
				width: 100%;
				margin: 0;
				padding: 20px;
			}
			
			body[data-page-name="personnel-record"] .pr-main-content {
				flex: 1;
				display: flex;
				flex-direction: column;
				overflow: hidden;
				min-height: 0;
			}
			
			.pr-main-content-wrapper {
				flex: 1;
				display: flex;
				gap: 20px;
				overflow: hidden;
				min-height: 0;
			}
			
			.pr-details-section {
				flex: 1;
				overflow-y: auto;
				padding-right: 10px;
				min-width: 0;
			}
			
			.pr-posting-history-section {
				width: 55%;
				min-width: 900px;
				overflow-y: auto;
				padding-left: 10px;
				min-height: 0;
			}
			
			/* Scrollbar styling for main content */
			.pr-main-content-wrapper::-webkit-scrollbar,
			.pr-details-section::-webkit-scrollbar,
			.pr-posting-history-section::-webkit-scrollbar {
				width: 6px;
			}
			
			.pr-main-content-wrapper::-webkit-scrollbar-track,
			.pr-details-section::-webkit-scrollbar-track,
			.pr-posting-history-section::-webkit-scrollbar-track {
				background: rgba(255,255,255,0.1);
				border-radius: 10px;
			}
			
			.pr-main-content-wrapper::-webkit-scrollbar-thumb,
			.pr-details-section::-webkit-scrollbar-thumb,
			.pr-posting-history-section::-webkit-scrollbar-thumb {
				background: rgba(255,255,255,0.3);
				border-radius: 10px;
			}
			
			.pr-main-content-wrapper::-webkit-scrollbar-thumb:hover,
			.pr-details-section::-webkit-scrollbar-thumb:hover,
			.pr-posting-history-section::-webkit-scrollbar-thumb:hover {
				background: rgba(255,255,255,0.5);
			}
			
			.pr-selector-compact {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				padding: 15px 20px;
				border-radius: 12px;
				margin-bottom: 20px;
				box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
			}
			
			.pr-selector-row {
				display: flex;
				align-items: center;
				gap: 15px;
				position: relative;
			}
			
			.pr-selector-label {
				color: white;
				font-weight: 600;
				font-size: 14px;
				white-space: nowrap;
			}
			
			.pr-selector-autocomplete {
				flex: 1;
				padding: 10px 15px;
				border: none;
				border-radius: 8px;
				background: white;
				font-size: 14px;
				max-width: 400px;
				position: relative;
				width: 100%;
				box-sizing: border-box;
			}
			
			.pr-selector-autocomplete:focus {
				outline: 2px solid rgba(255,255,255,0.5);
				outline-offset: 2px;
			}
			
			/* Awesomplete styling */
			.pr-selector-autocomplete.awesomplete {
				width: 100%;
				position: relative;
				max-width: 400px;
			}
			
			.pr-selector-autocomplete.awesomplete > ul {
				background: white;
				border: 1px solid #e0e0e0;
				border-radius: 10px;
				box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
				max-height: 400px;
				overflow-y: auto;
				margin-top: 8px;
				z-index: 1000;
				padding: 6px 0;
				animation: fadeInDown 0.2s ease-out;
				box-sizing: border-box;
				left: 0 !important;
				right: auto !important;
				position: absolute !important;
			}
			
			@keyframes fadeInDown {
				from {
					opacity: 0;
					transform: translateY(-10px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
			
			.pr-selector-autocomplete.awesomplete > ul > li {
				padding: 12px 18px;
				cursor: pointer;
				border-bottom: 1px solid #f5f5f5;
				transition: all 0.2s ease;
				display: flex;
				align-items: center;
				gap: 12px;
				position: relative;
				width: 100%;
				box-sizing: border-box;
				overflow: hidden;
			}
			
			.pr-selector-autocomplete.awesomplete > ul > li:last-child {
				border-bottom: none;
			}
			
			.pr-selector-autocomplete.awesomplete > ul > li:hover,
			.pr-selector-autocomplete.awesomplete > ul > li[aria-selected="true"] {
				background: linear-gradient(135deg, #f0f4ff 0%, #e8edff 100%);
				color: #667eea;
				border-left: 3px solid #667eea;
				padding-left: 15px;
				margin-left: 0;
			}
			
			.pr-selector-autocomplete.awesomplete > ul > li .autocomplete-service-number {
				font-weight: 700;
				color: #667eea;
				font-size: 14px;
				min-width: 100px;
				max-width: 150px;
				display: inline-block;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				flex-shrink: 0;
			}
			
			.pr-selector-autocomplete.awesomplete > ul > li:hover .autocomplete-service-number,
			.pr-selector-autocomplete.awesomplete > ul > li[aria-selected="true"] .autocomplete-service-number {
				color: #5568d3;
			}
			
			.pr-selector-autocomplete.awesomplete > ul > li .autocomplete-name {
				color: #2c3e50;
				font-size: 14px;
				flex: 1;
				min-width: 0;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			
			.pr-selector-autocomplete.awesomplete > ul > li:hover .autocomplete-name,
			.pr-selector-autocomplete.awesomplete > ul > li[aria-selected="true"] .autocomplete-name {
				color: #1a252f;
			}
			
			.pr-selector-autocomplete.awesomplete > ul > li .autocomplete-separator {
				color: #b0b0b0;
				margin: 0 8px;
				flex-shrink: 0;
			}
			
			.pr-selector-autocomplete.awesomplete mark {
				background: linear-gradient(135deg, #fff9c4 0%, #fff59d 100%);
				padding: 2px 4px;
				border-radius: 3px;
				font-weight: 600;
				color: #856404;
			}
			
			.pr-selector-autocomplete.awesomplete > ul > li:hover mark,
			.pr-selector-autocomplete.awesomplete > ul > li[aria-selected="true"] mark {
				background: linear-gradient(135deg, #ffe082 0%, #ffd54f 100%);
				color: #5d4037;
			}
			
			/* Scrollbar styling for autocomplete */
			.pr-selector-autocomplete.awesomplete > ul::-webkit-scrollbar {
				width: 8px;
			}
			
			.pr-selector-autocomplete.awesomplete > ul::-webkit-scrollbar-track {
				background: #f5f5f5;
				border-radius: 10px;
			}
			
			.pr-selector-autocomplete.awesomplete > ul::-webkit-scrollbar-thumb {
				background: #c0c0c0;
				border-radius: 10px;
			}
			
			.pr-selector-autocomplete.awesomplete > ul::-webkit-scrollbar-thumb:hover {
				background: #a0a0a0;
			}
			
			.pr-card-compact {
				background: #fff;
				border-radius: 12px;
				box-shadow: 0 4px 20px rgba(0,0,0,0.1);
				overflow: hidden;
				display: none;
			}
			
			.pr-header-compact {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				padding: 20px;
				display: flex;
				align-items: center;
				gap: 20px;
			}
			
			.pr-img-compact {
				width: 100px;
				height: 100px;
				border-radius: 50%;
				object-fit: cover;
				border: 3px solid white;
				box-shadow: 0 4px 10px rgba(0,0,0,0.2);
			}
			
			.pr-img-placeholder-compact {
				width: 100px;
				height: 100px;
				border-radius: 50%;
				background: rgba(255,255,255,0.2);
				display: flex;
				align-items: center;
				justify-content: center;
				border: 3px solid white;
				box-shadow: 0 4px 10px rgba(0,0,0,0.2);
			}
			
			.pr-img-placeholder-compact i {
				font-size: 40px;
				color: white;
			}
			
			.pr-header-info-compact {
				flex: 1;
				color: white;
			}
			
			.pr-name-compact {
				font-size: 24px;
				font-weight: 700;
				margin: 0 0 5px 0;
			}
			
			.pr-meta-compact {
				font-size: 13px;
				opacity: 0.9;
				margin: 3px 0;
			}
			
			.pr-body-compact {
				padding: 20px;
			}
			
			.pr-info-grid-compact {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
				gap: 15px;
			}
			
			.pr-info-card {
				background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
				padding: 15px;
				border-radius: 10px;
				border-left: 4px solid #667eea;
				transition: transform 0.2s ease, box-shadow 0.2s ease;
			}
			
			.pr-info-card:hover {
				transform: translateY(-2px);
				box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
			}
			
			.pr-info-label {
				font-size: 11px;
				font-weight: 700;
				color: #667eea;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				margin-bottom: 5px;
			}
			
			.pr-info-value {
				font-size: 15px;
				font-weight: 600;
				color: #2c3e50;
			}
			
			.pr-posting-history-compact {
				background: #fff;
				border-radius: 12px;
				box-shadow: 0 4px 20px rgba(0,0,0,0.1);
				padding: 20px 20px 10px 20px;
				display: flex;
				flex-direction: column;
				min-height: 0;
				margin-bottom: 15px;
			}
			
			.pr-posting-history-compact:last-child {
				margin-bottom: 0;
			}
			
			.pr-posting-history-compact .pr-section-title-compact {
				margin-top: 0;
				margin-bottom: 10px;
				flex-shrink: 0;
			}
			
			#pr_posting_history_table_container,
			#pr_promotion_history_table_container,
			#pr_courses_attended_table_container {
				flex: 1;
				overflow-y: auto;
				min-height: 0;
				padding-bottom: 0;
				margin-bottom: 0;
			}
			
			.pr-posting-history-compact .pr-posting-table-compact {
				margin-top: 0;
				margin-bottom: 0;
			}
			
			.pr-section-title-compact {
				font-size: 16px;
				font-weight: 700;
				color: #2c3e50;
				margin-bottom: 15px;
				padding-bottom: 10px;
				border-bottom: 2px solid #667eea;
				display: flex;
				align-items: center;
				gap: 10px;
			}
			
			.pr-section-title-compact i {
				color: #667eea;
			}
			
			.pr-posting-table-compact {
				width: 100%;
				border-collapse: collapse;
				font-size: 13px;
				table-layout: auto;
			}
			
			.pr-posting-table-compact th {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				color: white;
				padding: 12px 10px;
				text-align: left;
				font-weight: 600;
				font-size: 12px;
				text-transform: uppercase;
				white-space: nowrap;
			}
			
			.pr-posting-table-compact td {
				padding: 12px 10px;
				border-bottom: 1px solid #e0e0e0;
				font-size: 13px;
				word-wrap: break-word;
			}
			
			.pr-posting-table-compact th:nth-child(1),
			.pr-posting-table-compact td:nth-child(1) {
				min-width: 150px;
			}
			
			.pr-posting-table-compact th:nth-child(2),
			.pr-posting-table-compact td:nth-child(2),
			.pr-posting-table-compact th:nth-child(3),
			.pr-posting-table-compact td:nth-child(3) {
				min-width: 120px;
			}
			
			.pr-posting-table-compact th:nth-child(4),
			.pr-posting-table-compact td:nth-child(4) {
				min-width: 150px;
			}
			
			.pr-posting-table-compact th:nth-child(5),
			.pr-posting-table-compact td:nth-child(5),
			.pr-posting-table-compact th:nth-child(6),
			.pr-posting-table-compact td:nth-child(6) {
				min-width: 100px;
			}
			
			.pr-posting-table-compact th:nth-child(7),
			.pr-posting-table-compact td:nth-child(7) {
				min-width: 100px;
			}
			
			.pr-posting-table-compact th:nth-child(8),
			.pr-posting-table-compact td:nth-child(8) {
				min-width: 120px;
			}
			
			.pr-posting-table-compact th:nth-child(9),
			.pr-posting-table-compact td:nth-child(9) {
				min-width: 80px;
			}
			
			.pr-posting-table-compact tr:hover {
				background-color: #f8f9fa;
			}
			
			.pr-posting-table-compact tbody tr:last-child td {
				border-bottom: none;
			}
			
			.pr-posting-table-compact {
				margin-bottom: 0;
			}
			
			.pr-status-badge {
				display: inline-block;
				padding: 3px 10px;
				border-radius: 10px;
				font-size: 10px;
				font-weight: 700;
				text-transform: uppercase;
			}
			
			.pr-status-tos {
				background: #d4edda;
				color: #155724;
			}
			
			.pr-status-pending {
				background: #fff3cd;
				color: #856404;
			}
			
			.pr-status-cancelled {
				background: #f8d7da;
				color: #721c24;
			}
			
			.pr-empty-state-compact {
				text-align: center;
				padding: 20px;
				color: #6c757d;
			}
			
			#pr_posting_history_table_container .pr-empty-state-compact,
			#pr_promotion_history_table_container .pr-empty-state-compact,
			#pr_courses_attended_table_container .pr-empty-state-compact {
				padding: 15px;
			}
			
			.pr-empty-state-compact i {
				font-size: 36px;
				margin-bottom: 10px;
				opacity: 0.5;
			}
			
		</style>
		`);
		page._cssAdded = true;
	}
	
	// Create HTML structure
	let html = `
		<div class="pr-container">
			${getNavigationSidebar('personnel-record', 'pr')}
			
			<div class="pr-main-content">
				<div class="pr-selector-compact">
					<div class="pr-selector-row">
						<label class="pr-selector-label">Search Personnel:</label>
						<input type="text" id="pr_service_number_search" class="pr-selector-autocomplete" placeholder="Type service number or name to search...">
					</div>
				</div>
				
				<div class="pr-main-content-wrapper">
					<div class="pr-details-section">
						<div id="pr_personnel_details_container" class="pr-card-compact">
							<div class="pr-header-compact">
								<div class="pr-image-section">
									<img id="pr_personnel_image" src="" alt="Personnel Image" class="pr-img-compact" style="display: none;">
									<div id="pr_personnel_image_placeholder" class="pr-img-placeholder-compact">
										<i class="fa fa-user"></i>
									</div>
								</div>
								<div class="pr-header-info-compact">
									<h2 id="pr_personnel_name" class="pr-name-compact"></h2>
									<p id="pr_personnel_service_number" class="pr-meta-compact"></p>
									<p id="pr_personnel_category" class="pr-meta-compact"></p>
								</div>
							</div>
							
							<div class="pr-body-compact">
								<div class="pr-info-grid-compact">
									<div class="pr-info-card">
										<div class="pr-info-label">First Name</div>
										<div class="pr-info-value" id="pr_first_name">-</div>
									</div>
									<div class="pr-info-card">
										<div class="pr-info-label">Last Name</div>
										<div class="pr-info-value" id="pr_last_name">-</div>
									</div>
									<div class="pr-info-card">
										<div class="pr-info-label">Surname</div>
										<div class="pr-info-value" id="pr_surname">-</div>
									</div>
									<div class="pr-info-card">
										<div class="pr-info-label">Phone Number</div>
										<div class="pr-info-value" id="pr_phone_number">-</div>
									</div>
									<div class="pr-info-card">
										<div class="pr-info-label">Type of Commission</div>
										<div class="pr-info-value" id="pr_type_of_commission">-</div>
									</div>
									<div class="pr-info-card">
										<div class="pr-info-label">Course</div>
										<div class="pr-info-value" id="pr_course">-</div>
									</div>
									<div class="pr-info-card">
										<div class="pr-info-label">Current Rank</div>
										<div class="pr-info-value" id="pr_current_rank">-</div>
									</div>
									<div class="pr-info-card">
										<div class="pr-info-label">Date of Last Promotion</div>
										<div class="pr-info-value" id="pr_date_of_last_promotion">-</div>
									</div>
									<div class="pr-info-card">
										<div class="pr-info-label">Current Unit</div>
										<div class="pr-info-value" id="pr_current_unit">-</div>
									</div>
									<div class="pr-info-card">
										<div class="pr-info-label">Current Unit Location</div>
										<div class="pr-info-value" id="pr_current_unit_location">-</div>
									</div>
									<div class="pr-info-card">
										<div class="pr-info-label">Current Deployment</div>
										<div class="pr-info-value" id="pr_current_deployment">-</div>
									</div>
									<div class="pr-info-card">
										<div class="pr-info-label">Remarks</div>
										<div class="pr-info-value" id="pr_remarks">-</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					
					<div class="pr-posting-history-section">
						<div class="pr-posting-history-compact">
							<h3 class="pr-section-title-compact">
								<i class="fa fa-history"></i> Posting History
							</h3>
							<div id="pr_posting_history_table_container">
								<div class="pr-empty-state-compact">
									<i class="fa fa-inbox"></i>
									<p>Select a personnel to view posting history</p>
								</div>
							</div>
						</div>
						
						<div class="pr-posting-history-compact" style="margin-top: 15px;">
							<h3 class="pr-section-title-compact">
								<i class="fa fa-arrow-up"></i> Promotion History
							</h3>
							<div id="pr_promotion_history_table_container">
								<div class="pr-empty-state-compact">
									<i class="fa fa-inbox"></i>
									<p>Select a personnel to view promotion history</p>
								</div>
							</div>
						</div>
						
						<div class="pr-posting-history-compact" style="margin-top: 15px;">
							<h3 class="pr-section-title-compact">
								<i class="fa fa-graduation-cap"></i> Courses Attended
							</h3>
							<div id="pr_courses_attended_table_container">
								<div class="pr-empty-state-compact">
									<i class="fa fa-inbox"></i>
									<p>Select a personnel to view courses attended</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
	
	page.main.html(html);
	
	// Setup autocomplete for service number search
	setup_service_number_autocomplete();
}

function setup_service_number_autocomplete() {
	let serviceNumberInput = document.getElementById('pr_service_number_search');
	let awesompleteInstance = null;
	let allPersonnel = [];
	
	// Load all service numbers and names
	frappe.call({
		method: `dat_pm.nacstnew.doctype.personnel.personnel.get_all_service_numbers`,
		callback: function(r) {
			if (r.message) {
				allPersonnel = r.message;
				
				// Create autocomplete list with formatted display text
				let autocompleteList = r.message.map(function(item) {
					let displayText = item.service_number + ' - ' + (item.personnel_name || '');
					return {
						label: displayText,
						value: item.service_number,
						service_number: item.service_number,
						personnel_name: item.personnel_name || '',
						searchText: (item.service_number + ' ' + (item.personnel_name || '')).toLowerCase()
					};
				});
				
				// Initialize Awesomplete
				awesompleteInstance = new Awesomplete(serviceNumberInput, {
					minChars: 1,
					maxItems: 15,
					autoFirst: false,
					list: autocompleteList.map(function(item) {
						return item.label;
					}),
					filter: function(text, input) {
						let searchTerm = input.toLowerCase();
						// Find the item to search in both service number and name
						let item = autocompleteList.find(function(i) {
							return i.label === text;
						});
						if (item) {
							return item.searchText.includes(searchTerm);
						}
						return text.toLowerCase().includes(searchTerm);
					},
					item: function(text, input) {
						let li = document.createElement('li');
						li.setAttribute('role', 'option');
						
						// Find the original item
						let item = autocompleteList.find(function(i) {
							return i.label === text;
						});
						
						if (item) {
							li.setAttribute('data-service-number', item.service_number);
							
							// Create professional formatted display
							let serviceNumber = item.service_number || '';
							let personnelName = item.personnel_name || '';
							
							// Highlight matching text in service number
							let highlightedServiceNumber = serviceNumber;
							if (input.trim() && serviceNumber.toLowerCase().includes(input.toLowerCase())) {
								let regex = new RegExp('(' + frappe.utils.escape_html(input) + ')', 'gi');
								highlightedServiceNumber = serviceNumber.replace(regex, '<mark>$1</mark>');
							}
							
							// Highlight matching text in name
							let highlightedName = personnelName;
							if (input.trim() && personnelName.toLowerCase().includes(input.toLowerCase())) {
								let regex = new RegExp('(' + frappe.utils.escape_html(input) + ')', 'gi');
								highlightedName = personnelName.replace(regex, '<mark>$1</mark>');
							}
							
							// Build professional HTML structure
							li.innerHTML = `
								<span class="autocomplete-service-number">${highlightedServiceNumber}</span>
								<span class="autocomplete-separator">•</span>
								<span class="autocomplete-name">${highlightedName || 'No name available'}</span>
							`;
						} else {
							// Fallback to original text if item not found
							let highlightedText = text;
							if (input.trim()) {
								let regex = new RegExp('(' + frappe.utils.escape_html(input) + ')', 'gi');
								highlightedText = text.replace(regex, '<mark>$1</mark>');
							}
							li.innerHTML = highlightedText;
						}
						
						return li;
					}
				});
				
				// Store autocomplete list for later use
				serviceNumberInput._autocompleteList = autocompleteList;
				
				// Set dropdown width to match input field width
				function setDropdownWidth() {
					if (awesompleteInstance && awesompleteInstance.ul) {
						let inputWidth = $(serviceNumberInput).outerWidth();
						if (inputWidth > 0) {
							$(awesompleteInstance.ul).css({
								'width': inputWidth + 'px',
								'min-width': inputWidth + 'px',
								'max-width': inputWidth + 'px',
								'left': '0px',
								'right': 'auto'
							});
						}
					}
				}
				
				// Set width when dropdown opens
				$(serviceNumberInput).on('awesomplete-open', function() {
					setTimeout(setDropdownWidth, 10);
				});
				
				// Set width on input to handle resize and typing
				$(serviceNumberInput).on('input focus keyup', function() {
					setTimeout(setDropdownWidth, 10);
				});
				
				// Set width on window resize
				$(window).on('resize', function() {
					setTimeout(setDropdownWidth, 10);
				});
				
				// Initial width set
				setTimeout(setDropdownWidth, 100);
				
				// Handle selection
				$(serviceNumberInput).on('awesomplete-selectcomplete', function(e) {
					let selectedText = e.target.value;
					let selectedItem = autocompleteList.find(function(item) {
						return item.label === selectedText;
					});
					
					if (selectedItem && selectedItem.service_number) {
						load_personnel_data(selectedItem.service_number);
						// Keep the display text in the input
						e.target.value = selectedText;
					}
				});
				
				// Handle Enter key when autocomplete is open
				$(serviceNumberInput).on('keydown', function(e) {
					if (e.key === 'Enter') {
						let currentValue = e.target.value;
						// Try to find exact match first
						let selectedItem = autocompleteList.find(function(item) {
							return item.label === currentValue || item.service_number === currentValue;
						});
						
						if (!selectedItem && awesompleteInstance.ul && awesompleteInstance.ul.querySelector('li[aria-selected="true"]')) {
							// If there's a highlighted item, use it
							let highlightedLi = awesompleteInstance.ul.querySelector('li[aria-selected="true"]');
							let highlightedText = highlightedLi.textContent.trim();
							selectedItem = autocompleteList.find(function(item) {
								return item.label === highlightedText;
							});
						}
						
						if (selectedItem && selectedItem.service_number) {
							e.preventDefault();
							load_personnel_data(selectedItem.service_number);
							e.target.value = selectedItem.label;
							awesompleteInstance.close();
						}
					}
				});
				
				// Clear selection on focus
				$(serviceNumberInput).on('focus', function() {
					if (this.value) {
						this.select();
					}
				});
				
				// Clear displayed data when search field is empty
				$(serviceNumberInput).on('input', function() {
					if (!this.value || this.value.trim() === '') {
						clear_personnel_data();
					}
				});
			}
		}
	});
}


function load_personnel_data(service_number) {
	frappe.call({
		method: `dat_pm.nacstnew.doctype.personnel.personnel.get_personnel_data`,
		args: {
			service_number: service_number
		},
		callback: function(r) {
			if (r.message) {
				console.log("Personnel data received:", r.message);
				console.log("Promotion history:", r.message.promotion_history);
				console.log("Courses attended:", r.message.courses_attended);
				display_personnel_data(r.message);
			}
		}
	});
}

function display_personnel_data(data) {
	// Display image
	if (data.personnel_image) {
		$('#pr_personnel_image').attr('src', data.personnel_image).show();
		$('#pr_personnel_image_placeholder').hide();
	} else {
		$('#pr_personnel_image').hide();
		$('#pr_personnel_image_placeholder').show();
	}
	
	// Display header info
	$('#pr_current_rank').text(data.current_rank || 'N/A');
	$('#pr_personnel_name').text(data.personnel_name || 'N/A');
	$('#personnel_service_number').text('Service Number: ' + data.service_number);
	$('#personnel_category').text('Category: ' + (data.category || 'N/A'));
	
	// Display information cards
	$('#pr_first_name').text(data.first_name || 'N/A');
	$('#pr_last_name').text(data.last_name || 'N/A');
	$('#pr_surname').text(data.surname || 'N/A');
	$('#pr_phone_number').text(data.phone_number || 'N/A');
	$('#pr_type_of_commission').text(data.type_of_commission || 'N/A');
	$('#pr_course').text(data.course || 'N/A');
	$('#pr_current_rank').text(data.current_rank || 'N/A');
	$('#pr_date_of_last_promotion').text(data.date_of_last_promotion || 'N/A');
	$('#pr_current_unit').text(data.current_unit || 'N/A');
	$('#pr_current_unit_location').text(data.current_unit_location || 'N/A');
	$('#pr_current_deployment').text(data.current_deployment || 'N/A');
	$('#pr_remarks').text(data.remarks || 'N/A');
	
	// Display posting history
	display_posting_history(data.posting_history || []);
	
	// Display promotion history
	display_promotion_history(data.promotion_history || []);
	
	// Display courses attended
	display_courses_attended(data.courses_attended || []);
	
	// Ensure all sections are visible
	$('.pr-posting-history-compact').show();
	$('.pr-posting-history-section').show();
	
	// Force show the promotion and courses sections specifically
	$('#pr_promotion_history_table_container').closest('.pr-posting-history-compact').show();
	$('#pr_courses_attended_table_container').closest('.pr-posting-history-compact').show();
	
	// Show container
	$('#pr_personnel_details_container').fadeIn(300);
	
	// Debug: Log section visibility
	setTimeout(function() {
		console.log("Promotion section visible:", $('#pr_promotion_history_table_container').closest('.pr-posting-history-compact').is(':visible'));
		console.log("Courses section visible:", $('#pr_courses_attended_table_container').closest('.pr-posting-history-compact').is(':visible'));
		console.log("Posting history section visible:", $('.pr-posting-history-section').is(':visible'));
	}, 500);
}

function display_posting_history(history) {
	let container = $('#pr_posting_history_table_container');
	
	if (!history || history.length === 0) {
		container.html('<div class="pr-empty-state-compact"><i class="fa fa-inbox"></i><p>No posting history available</p></div>');
		return;
	}
	
	let html = '<table class="pr-posting-table-compact">';
	html += '<thead><tr>';
	html += '<th>Posting Authority</th>';
	html += '<th>From Unit</th>';
	html += '<th>To Unit</th>';
	html += '<th>Appointment</th>';
	html += '<th>WEF Date</th>';
	html += '<th>Date TOS</th>';
	html += '<th>Status</th>';
	html += '<th>Part 2 Order</th>';
	html += '<th>Overstay</th>';
	html += '</tr></thead><tbody>';
	
	history.forEach(function(record) {
		let statusClass = 'pr-status-pending';
		if (record.posting_status === 'TOS') {
			statusClass = 'pr-status-tos';
		} else if (record.posting_status === 'Cancelled') {
			statusClass = 'pr-status-cancelled';
		}
		
		html += '<tr>';
		html += '<td><strong>' + frappe.utils.escape_html(record.posting_authority) + '</strong></td>';
		html += '<td>' + frappe.utils.escape_html(record.from_unit) + '</td>';
		html += '<td><strong>' + frappe.utils.escape_html(record.to_unit) + '</strong></td>';
		html += '<td>' + frappe.utils.escape_html(record.appointment) + '</td>';
		html += '<td>' + (record.wef_date || '') + '</td>';
		html += '<td>' + (record.date_tos || '') + '</td>';
		html += '<td><span class="pr-status-badge ' + statusClass + '">' + frappe.utils.escape_html(record.posting_status) + '</span></td>';
		html += '<td>' + frappe.utils.escape_html(record.part_2_order) + '</td>';
		html += '<td>' + record.overstay_days + '</td>';
		html += '</tr>';
	});
	
	html += '</tbody></table>';
	container.html(html);
}

function display_promotion_history(history) {
	console.log("display_promotion_history called with:", history);
	let container = $('#pr_promotion_history_table_container');
	console.log("Promotion history container found:", container.length > 0);
	
	if (!container || container.length === 0) {
		console.error("Promotion history container not found!");
		return;
	}
	
	if (!history || history.length === 0) {
		console.log("No promotion history data, showing empty state");
		container.html('<div class="pr-empty-state-compact"><i class="fa fa-inbox"></i><p>No promotion history available</p></div>');
		container.show();
		return;
	}
	
	console.log("Building promotion history table with", history.length, "records");
	let html = '<table class="pr-posting-table-compact">';
	html += '<thead><tr>';
	html += '<th>Promotion Authority</th>';
	html += '<th>From Rank</th>';
	html += '<th>To Rank</th>';
	html += '<th>Seniority Date</th>';
	html += '</tr></thead><tbody>';
	
	history.forEach(function(record) {
		console.log("Processing promotion record:", record);
		html += '<tr>';
		html += '<td><strong>' + frappe.utils.escape_html(record.promotion_authority || '') + '</strong></td>';
		html += '<td>' + frappe.utils.escape_html(record.from_rank || '') + '</td>';
		html += '<td><strong>' + frappe.utils.escape_html(record.to_rank || '') + '</strong></td>';
		html += '<td>' + (record.seniority_date || '') + '</td>';
		html += '</tr>';
	});
	
	html += '</tbody></table>';
	console.log("Setting promotion history HTML");
	container.html(html);
	container.show();
	
	// Ensure parent section is visible
	let parentSection = container.closest('.pr-posting-history-compact');
	if (parentSection.length > 0) {
		parentSection.show();
		console.log("Parent section shown");
	}
	
	console.log("Promotion history container visible:", container.is(':visible'));
	console.log("Container HTML length:", container.html().length);
	
	// Debug: Check if table exists in DOM
	setTimeout(function() {
		let table = container.find('table');
		console.log("Table found in container:", table.length > 0);
		if (table.length > 0) {
			console.log("Table is visible:", table.is(':visible'));
			console.log("Table parent visible:", table.parent().is(':visible'));
		}
	}, 100);
}

function display_courses_attended(courses) {
	console.log("display_courses_attended called with:", courses);
	let container = $('#pr_courses_attended_table_container');
	console.log("Courses attended container found:", container.length > 0);
	
	if (!container || container.length === 0) {
		console.error("Courses attended container not found!");
		return;
	}
	
	if (!courses || courses.length === 0) {
		console.log("No courses data, showing empty state");
		container.html('<div class="pr-empty-state-compact"><i class="fa fa-inbox"></i><p>No courses attended available</p></div>');
		container.show();
		return;
	}
	
	console.log("Building courses table with", courses.length, "records");
	let html = '<table class="pr-posting-table-compact">';
	html += '<thead><tr>';
	html += '<th>Source</th>';
	html += '<th>Course Name</th>';
	html += '<th>Start Date</th>';
	html += '<th>End Date</th>';
	html += '<th>Grade</th>';
	html += '<th>Course Report</th>';
	html += '</tr></thead><tbody>';
	
	courses.forEach(function(record) {
		console.log("Processing course record:", record);
		let reportLink = '';
		if (record.record_doctype === 'Legacy Course Record' && record.name) {
			reportLink =
				'<a href="#Form/Legacy Course Record/' +
				frappe.utils.escape_html(record.name) +
				'">Legacy record</a>';
		} else if (record.course_report) {
			reportLink = '<a href="' + frappe.utils.escape_html(record.course_report) + '" target="_blank">View Report</a>';
		} else {
			reportLink = 'N/A';
		}
		let sourceLabel =
			record.record_doctype === 'Legacy Course Record'
				? 'Legacy'
				: 'Course run';
		
		html += '<tr>';
		html += '<td>' + frappe.utils.escape_html(sourceLabel) + '</td>';
		html += '<td>' + frappe.utils.escape_html(record.course_name || '') + '</td>';
		html += '<td>' + (record.course_start_date || '') + '</td>';
		html += '<td>' + (record.course_end_date || '') + '</td>';
		html += '<td>' + frappe.utils.escape_html(record.grade || '') + '</td>';
		html += '<td>' + reportLink + '</td>';
		html += '</tr>';
	});
	
	html += '</tbody></table>';
	console.log("Setting courses HTML");
	container.html(html);
	container.show();
	
	// Ensure parent section is visible
	let parentSection = container.closest('.pr-posting-history-compact');
	if (parentSection.length > 0) {
		parentSection.show();
		console.log("Parent section shown");
	}
	
	console.log("Courses container visible:", container.is(':visible'));
	console.log("Container HTML length:", container.html().length);
	
	// Debug: Check if table exists in DOM
	setTimeout(function() {
		let table = container.find('table');
		console.log("Table found in container:", table.length > 0);
		if (table.length > 0) {
			console.log("Table is visible:", table.is(':visible'));
			console.log("Table parent visible:", table.parent().is(':visible'));
		}
	}, 100);
}

function clear_personnel_data() {
	// Hide personnel details container
	$('#pr_personnel_details_container').hide();
	
	// Reset image
	$('#pr_personnel_image').hide().attr('src', '');
	$('#pr_personnel_image_placeholder').show();
	
	// Reset header info
	$('#pr_personnel_name').text('');
	$('#personnel_service_number').text('');
	$('#personnel_category').text('');
	
	// Reset information cards
	$('#pr_first_name').text('-');
	$('#pr_last_name').text('-');
	$('#pr_surname').text('-');
	$('#pr_phone_number').text('-');
	$('#pr_type_of_commission').text('-');
	$('#pr_course').text('-');
	$('#pr_current_rank').text('-');
	$('#pr_date_of_last_promotion').text('-');
	$('#pr_current_unit').text('-');
	$('#pr_current_unit_location').text('-');
	$('#pr_current_deployment').text('-');
	$('#pr_remarks').text('-');
	
	// Clear posting history and show empty state
	$('#pr_posting_history_table_container').html('<div class="pr-empty-state-compact"><i class="fa fa-inbox"></i><p>Select a personnel to view posting history</p></div>');
	
	// Clear promotion history and show empty state
	$('#pr_promotion_history_table_container').html('<div class="pr-empty-state-compact"><i class="fa fa-inbox"></i><p>Select a personnel to view promotion history</p></div>');
	
	// Clear courses attended and show empty state
	$('#pr_courses_attended_table_container').html('<div class="pr-empty-state-compact"><i class="fa fa-inbox"></i><p>Select a personnel to view courses attended</p></div>');
}
