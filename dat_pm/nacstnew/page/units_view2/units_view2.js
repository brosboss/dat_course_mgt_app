// Copyright (c) 2025, !! and contributors
// For license information, please see license.txt

frappe.pages['units-view2'].on_page_load = function(wrapper) {
	// Automatically toggle to full width when page loads
	localStorage.container_fullwidth = "true";
	frappe.ui.toolbar.set_fullwidth_if_enabled();
	
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Units View 2 (Compact)',
		single_column: true
	});
	
	// Store page reference for on_page_show
	wrapper.page = page;
	
	// Create the page content
	build_units_view2_page(page);
	
	// Also listen to the "show" event directly
	$(wrapper).on('show', function() {
		// Ensure full width is still enabled when page is shown
		localStorage.container_fullwidth = "true";
		frappe.ui.toolbar.set_fullwidth_if_enabled();
		
		setTimeout(function() {
			// Check if page content exists
			if ($('#units_container').length === 0 && wrapper.page) {
				// Page content doesn't exist, rebuild it
				build_units_view2_page(wrapper.page);
			} else if (wrapper.page && $('#units_container').length > 0) {
				// Reload units data
				load_units_data();
			} else if (wrapper.page) {
				// If page elements don't exist, rebuild the page
				build_units_view2_page(wrapper.page);
			}
		}, 100);
	});
}

// Reload content when page is shown
frappe.pages['units-view2'].on_page_show = function(wrapper) {
	// Automatically toggle to full width when page is shown
	localStorage.container_fullwidth = "true";
	frappe.ui.toolbar.set_fullwidth_if_enabled();
	
	setTimeout(function() {
		// Check if page content exists
		if ($('#units_container').length === 0 && wrapper.page) {
			// Page content doesn't exist, rebuild it
			build_units_view2_page(wrapper.page);
		} else if (wrapper.page && $('#units_container').length > 0) {
			// Reload units data
			load_units_data();
		} else if (wrapper.page) {
			// If page elements don't exist, rebuild the page
			build_units_view2_page(wrapper.page);
		}
	}, 100);
}

function build_units_view2_page(page) {
	// Check if CSS has already been added to avoid duplicates
	if (!page._cssAdded) {
		// Ensure navigation functions are available
		if (typeof hideDefaultSidebarCSS === 'undefined') {
			console.error('hideDefaultSidebarCSS is not defined. Make sure navigation_sidebar.js is loaded.');
		}
		if (typeof getNavigationSidebarCSS === 'undefined') {
			console.error('getNavigationSidebarCSS is not defined. Make sure navigation_sidebar.js is loaded.');
		}
		if (typeof getNavigationSidebar === 'undefined') {
			console.error('getNavigationSidebar is not defined. Make sure navigation_sidebar.js is loaded.');
		}
		
		// Add CSS - include reusable sidebar CSS and page-specific CSS
		let sidebarCSS = typeof hideDefaultSidebarCSS !== 'undefined' ? hideDefaultSidebarCSS('units-view2') : '';
		let navCSS = typeof getNavigationSidebarCSS !== 'undefined' ? getNavigationSidebarCSS('uv2') : '';
		
		page.add_inner_message(
			sidebarCSS + 
			navCSS + `
		<style id="uv2-page-styles">
			/* Make the page container full width */
			body[data-page-name="units-view2"] .page-wrapper {
				width: 100% !important;
			}
			
			body[data-page-name="units-view2"] .layout-main-section-wrapper {
				display: flex !important;
				flex-direction: column !important;
			}
			
			.uv2-container {
				display: flex;
				gap: 15px;
				width: 100%;
				margin: 0;
				padding: 12px;
				min-height: calc(100vh - 120px);
			}
			
			/* Ensure sidebar is visible and properly sized - match other pages */
			.uv2-container > .uv2-nav-sidebar {
				flex-shrink: 0;
				width: 250px !important;
				align-self: stretch;
				display: block !important;
				overflow-y: auto;
				overflow-x: hidden;
			}
			
			.uv2-main-content {
				flex: 1;
				display: flex;
				flex-direction: column;
				overflow: hidden;
				min-height: 0;
			}
			
			.uv2-summary-section {
				width: 280px;
				flex-shrink: 0;
				display: flex;
				flex-direction: column;
				max-height: calc(100vh - 160px);
				overflow-y: auto;
				overflow-x: hidden;
			}
			
			.uv2-summary-section::-webkit-scrollbar {
				width: 6px;
			}
			
			.uv2-summary-section::-webkit-scrollbar-track {
				background: rgba(255,255,255,0.1);
				border-radius: 10px;
			}
			
			.uv2-summary-section::-webkit-scrollbar-thumb {
				background: rgba(102, 126, 234, 0.3);
				border-radius: 10px;
			}
			
			.uv2-summary-section::-webkit-scrollbar-thumb:hover {
				background: rgba(102, 126, 234, 0.5);
			}
			
			.uv2-header {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				padding: 12px 15px;
				border-radius: 8px;
				margin-bottom: 12px;
				box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
			}
			
			.uv2-header h1 {
				color: white;
				margin: 0;
				font-size: 18px;
				font-weight: 700;
			}
			
			.uv2-header p {
				color: rgba(255, 255, 255, 0.9);
				margin: 3px 0 0 0;
				font-size: 12px;
			}
			
			.uv2-filter-section {
				background: #fff;
				padding: 10px 12px;
				border-radius: 6px;
				margin-bottom: 12px;
				box-shadow: 0 1px 4px rgba(0,0,0,0.1);
				display: flex;
				align-items: center;
				gap: 10px;
			}
			
			.uv2-filter-label {
				font-weight: 600;
				color: #2c3e50;
				font-size: 12px;
				display: flex;
				align-items: center;
				gap: 6px;
			}
			
			.uv2-filter-label i {
				color: #667eea;
			}
			
			.uv2-filter-select {
				padding: 6px 10px;
				border: 1px solid #e0e0e0;
				border-radius: 4px;
				font-size: 12px;
				background: white;
				color: #2c3e50;
				cursor: pointer;
				min-width: 150px;
			}
			
			.uv2-filter-select:focus {
				outline: none;
				border-color: #667eea;
				box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
			}
			
			#units_container {
				display: flex;
				flex-direction: column;
				gap: 8px;
				padding: 0;
				overflow-y: auto;
				flex: 1;
				min-height: 0;
			}
			
			.uv2-unit-accordion {
				background: #fff;
				border-radius: 6px;
				box-shadow: 0 1px 4px rgba(0,0,0,0.1);
				overflow: hidden;
				transition: box-shadow 0.2s ease;
			}
			
			.uv2-unit-accordion:hover {
				box-shadow: 0 2px 8px rgba(0,0,0,0.15);
			}
			
			.uv2-unit-accordion.expanded {
				box-shadow: 0 2px 12px rgba(0,0,0,0.15);
			}
			
			.uv2-unit-header {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				padding: 10px 12px;
				color: white;
				cursor: pointer;
				display: flex;
				flex-direction: column;
				gap: 8px;
				user-select: none;
				transition: background 0.2s ease;
			}
			
			.uv2-unit-header:hover {
				background: linear-gradient(135deg, #5568d3 0%, #653d8f 100%);
			}
			
			.uv2-unit-header-top {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 15px;
				flex-wrap: wrap;
			}
			
			.uv2-unit-header-left {
				display: flex;
				align-items: center;
				flex: 1 1 auto;
				min-width: 0;
				gap: 15px;
				flex-wrap: wrap;
				row-gap: 8px;
			}
			
			.uv2-unit-name-container {
				flex: 0 0 auto;
				min-width: 150px;
			}
			
			.uv2-unit-header-title {
				font-size: 14px;
				font-weight: 700;
				margin: 0;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			
			.uv2-unit-location-container {
				flex: 0 0 auto;
				min-width: 120px;
			}
			
			.uv2-unit-location {
				font-size: 11px;
				opacity: 0.9;
				display: flex;
				align-items: center;
				gap: 6px;
				white-space: nowrap;
			}
			
			.uv2-unit-location i {
				font-size: 10px;
				flex-shrink: 0;
			}
			
			.uv2-unit-personnel-container {
				flex: 0 0 auto;
				min-width: 100px;
			}
			
			.uv2-unit-personnel-count {
				font-size: 11px;
				opacity: 0.9;
				white-space: nowrap;
			}
			
			.uv2-unit-commander {
				display: flex;
				align-items: center;
				width: 100%;
				margin-top: 5px;
				padding-top: 8px;
				border-top: 1px solid rgba(255, 255, 255, 0.2);
			}
			
			.uv2-commander-info-line {
				display: flex;
				align-items: center;
				gap: 6px;
				font-size: 12px;
				color: rgba(255, 255, 255, 0.95);
				flex-wrap: wrap;
				row-gap: 4px;
			}
			
			.uv2-commander-info-line i {
				font-size: 11px;
				opacity: 0.9;
				flex-shrink: 0;
			}
			
			.uv2-commander-name {
				font-weight: 600;
				word-wrap: break-word;
				overflow-wrap: break-word;
			}
			
			.uv2-commander-appointment {
				font-weight: 400;
				opacity: 0.9;
				font-size: 11px;
				word-wrap: break-word;
				overflow-wrap: break-word;
			}
			
			.uv2-commander-separator {
				opacity: 0.7;
				margin: 0 4px;
				flex-shrink: 0;
			}
			
			.uv2-commander-phone {
				font-size: 11px;
				color: rgba(255, 255, 255, 0.9);
				word-wrap: break-word;
				overflow-wrap: break-word;
			}
			
			.uv2-commander-phone-link {
				color: rgba(255, 255, 255, 0.9);
				text-decoration: none;
				display: inline-flex;
				align-items: center;
				gap: 4px;
				transition: color 0.2s ease;
			}
			
			.uv2-commander-phone-link:hover {
				color: white;
				text-decoration: underline;
			}
			
			.uv2-commander-phone-link i {
				font-size: 10px;
			}
			
			.uv2-unit-toggle {
				font-size: 12px;
				opacity: 0.9;
				transition: transform 0.2s ease;
				flex-shrink: 0;
				align-self: flex-start;
				margin-top: 2px;
			}
			
			.uv2-unit-accordion.expanded .uv2-unit-toggle {
				transform: rotate(180deg);
			}
			
			/* Responsive adjustments for smaller screens */
			@media (max-width: 1200px) {
				.uv2-unit-header {
					gap: 8px;
				}
				
				.uv2-unit-header-left {
					gap: 12px;
				}
				
				.uv2-unit-name-container {
					min-width: 120px;
				}
				
				.uv2-unit-location-container {
					min-width: 100px;
				}
				
				.uv2-unit-personnel-container {
					min-width: 80px;
				}
			}
			
			@media (max-width: 768px) {
				.uv2-unit-header-left {
					width: 100%;
					gap: 10px;
				}
				
				.uv2-unit-name-container {
					min-width: 100%;
					flex: 1 1 100%;
				}
				
				.uv2-unit-location-container,
				.uv2-unit-personnel-container {
					min-width: auto;
					flex: 0 0 auto;
				}
				
				.uv2-unit-toggle {
					position: absolute;
					top: 10px;
					right: 12px;
				}
				
				.uv2-unit-header {
					position: relative;
					padding-right: 35px;
				}
			}
			
			.uv2-unit-body {
				max-height: 0;
				overflow: hidden;
				transition: max-height 0.3s ease;
			}
			
			.uv2-unit-accordion.expanded .uv2-unit-body {
				max-height: 600px;
				overflow-y: auto;
			}
			
			.uv2-personnel-table {
				width: 100%;
				border-collapse: collapse;
				font-size: 11px;
			}
			
			.uv2-personnel-table thead {
				background: #f8f9fa;
				position: sticky;
				top: 0;
				z-index: 1;
			}
			
			.uv2-personnel-table th {
				padding: 6px 8px;
				text-align: left;
				font-weight: 600;
				font-size: 10px;
				text-transform: uppercase;
				color: #667eea;
				border-bottom: 2px solid #667eea;
			}
			
			.uv2-personnel-table td {
				padding: 6px 8px;
				border-bottom: 1px solid #f0f0f0;
				vertical-align: middle;
			}
			
			.uv2-personnel-table tbody tr:hover {
				background-color: #f8f9fa;
			}
			
			.uv2-personnel-table tbody tr:last-child td {
				border-bottom: none;
			}
			
			.uv2-personnel-name {
				font-weight: 600;
				color: #2c3e50;
				font-size: 11px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				max-width: 180px;
			}
			
			.uv2-personnel-name-hover {
				cursor: pointer;
				position: relative;
			}
			
			.uv2-personnel-popup {
				position: fixed;
				background: white;
				border: 1px solid #ddd;
				border-radius: 8px;
				box-shadow: 0 4px 20px rgba(0,0,0,0.15);
				padding: 0;
				z-index: 10000;
				display: none;
				max-width: 320px;
				max-height: 500px;
				overflow-y: auto;
				font-size: 11px;
			}
			
			.uv2-personnel-popup.show {
				display: block;
			}
			
			.uv2-popup-header {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				color: white;
				padding: 10px 12px;
				border-radius: 8px 8px 0 0;
				display: flex;
				align-items: center;
				gap: 10px;
			}
			
			.uv2-popup-image {
				width: 50px;
				height: 50px;
				border-radius: 50%;
				object-fit: cover;
				border: 2px solid white;
				flex-shrink: 0;
			}
			
			.uv2-popup-image-placeholder {
				width: 50px;
				height: 50px;
				border-radius: 50%;
				background: rgba(255,255,255,0.2);
				display: flex;
				align-items: center;
				justify-content: center;
				border: 2px solid white;
				flex-shrink: 0;
			}
			
			.uv2-popup-image-placeholder i {
				color: white;
				font-size: 24px;
			}
			
			.uv2-popup-header-info {
				flex: 1;
				min-width: 0;
			}
			
			.uv2-popup-name {
				font-weight: 700;
				font-size: 13px;
				margin: 0 0 3px 0;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			
			.uv2-popup-rank {
				font-size: 11px;
				opacity: 0.9;
				margin: 0;
			}
			
			.uv2-popup-body {
				padding: 10px 12px;
			}
			
			.uv2-popup-section {
				margin-bottom: 10px;
			}
			
			.uv2-popup-section:last-child {
				margin-bottom: 0;
			}
			
			.uv2-popup-section-title {
				font-weight: 700;
				color: #667eea;
				font-size: 10px;
				text-transform: uppercase;
				margin-bottom: 6px;
				padding-bottom: 4px;
				border-bottom: 1px solid #f0f0f0;
			}
			
			.uv2-popup-list {
				list-style: none;
				padding: 0;
				margin: 0;
			}
			
			.uv2-popup-list-item {
				padding: 3px 0;
				font-size: 10px;
				color: #2c3e50;
				border-bottom: 1px solid #f8f9fa;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			
			.uv2-popup-list-item:last-child {
				border-bottom: none;
			}
			
			.uv2-popup-list-item strong {
				color: #667eea;
				font-weight: 600;
			}
			
			.uv2-popup-table {
				width: 100%;
				border-collapse: collapse;
				font-size: 9px;
			}
			
			.uv2-popup-table td {
				padding: 3px 4px;
				border-bottom: 1px solid #f8f9fa;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			
			.uv2-popup-table td:first-child {
				font-weight: 600;
				color: #667eea;
				max-width: 120px;
			}
			
			.uv2-popup-table td:nth-child(2),
			.uv2-popup-table td:nth-child(3) {
				font-size: 8px;
				color: #6c757d;
				max-width: 70px;
			}
			
			.uv2-popup-table tr:last-child td {
				border-bottom: none;
			}
			
			.uv2-popup-info-row {
				display: flex;
				justify-content: space-between;
				padding: 3px 0;
				font-size: 10px;
			}
			
			.uv2-popup-info-label {
				color: #6c757d;
				font-weight: 600;
			}
			
			.uv2-popup-info-value {
				color: #2c3e50;
			}
			
			.uv2-popup-loading {
				padding: 20px;
				text-align: center;
				color: #6c757d;
			}
			
			.uv2-popup-loading i {
				font-size: 18px;
				animation: uv2-spin 1s linear infinite;
			}
			
			.uv2-personnel-popup::-webkit-scrollbar {
				width: 5px;
			}
			
			.uv2-personnel-popup::-webkit-scrollbar-track {
				background: #f8f9fa;
			}
			
			.uv2-personnel-popup::-webkit-scrollbar-thumb {
				background: #667eea;
				border-radius: 10px;
			}
			
			.uv2-personnel-rank {
				font-weight: 600;
				color: #667eea;
				font-size: 10px;
				white-space: nowrap;
			}
			
			.uv2-personnel-service {
				font-size: 10px;
				color: #6c757d;
				white-space: nowrap;
			}
			
			.uv2-personnel-phone {
				font-size: 10px;
				color: #25D366;
				text-decoration: none;
				font-weight: 600;
				cursor: pointer;
				white-space: nowrap;
			}
			
			.uv2-personnel-phone:hover {
				text-decoration: underline;
			}
			
			.uv2-personnel-category {
				display: inline-block;
				padding: 2px 6px;
				border-radius: 3px;
				font-size: 9px;
				font-weight: 700;
				text-transform: uppercase;
				white-space: nowrap;
			}
			
			.uv2-personnel-category.officer {
				background: #e3f2fd;
				color: #1976d2;
			}
			
			.uv2-personnel-category.soldier {
				background: #fff3e0;
				color: #e65100;
			}
			
			.uv2-personnel-period {
				font-size: 9px;
				color: #6c757d;
				white-space: nowrap;
			}
			
			.uv2-personnel-action {
				color: #667eea;
				text-decoration: none;
				font-size: 10px;
				cursor: pointer;
				white-space: nowrap;
			}
			
			.uv2-personnel-action:hover {
				text-decoration: underline;
			}
			
			.uv2-pagination {
				display: flex;
				justify-content: center;
				align-items: center;
				gap: 8px;
				margin-top: 12px;
				padding: 10px;
				background: white;
				border-radius: 6px;
				box-shadow: 0 1px 4px rgba(0,0,0,0.1);
			}
			
			.uv2-pagination button {
				padding: 6px 12px;
				border: 1px solid #e0e0e0;
				border-radius: 4px;
				background: white;
				color: #2c3e50;
				cursor: pointer;
				font-size: 12px;
				transition: all 0.2s ease;
			}
			
			.uv2-pagination button:hover:not(:disabled) {
				background: #667eea;
				color: white;
				border-color: #667eea;
			}
			
			.uv2-pagination button:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
			
			.uv2-pagination .uv2-page-info {
				color: #6c757d;
				font-size: 12px;
				margin: 0 8px;
			}
			
			.uv2-summary-card {
				background: #fff;
				border-radius: 8px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.1);
				padding: 10px;
				margin-bottom: 12px;
				overflow-x: hidden;
				width: 100%;
				box-sizing: border-box;
			}
			
			.uv2-summary-card h3 {
				margin: 0 0 10px 0;
				font-size: 14px;
				font-weight: 700;
				color: #2c3e50;
				padding-bottom: 8px;
				border-bottom: 2px solid #667eea;
			}
			
			.uv2-summary-table {
				width: 100%;
				border-collapse: collapse;
				font-size: 10px;
				table-layout: fixed;
			}
			
			.uv2-summary-table thead {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				color: white;
			}
			
			.uv2-summary-table th {
				padding: 6px 4px;
				text-align: left;
				font-weight: 600;
				font-size: 9px;
				text-transform: uppercase;
			}
			
			.uv2-summary-table th:first-child {
				width: 50%;
			}
			
			.uv2-summary-table th:nth-child(2),
			.uv2-summary-table th:nth-child(3) {
				width: 15%;
			}
			
			.uv2-summary-table th:last-child {
				width: 20%;
				text-align: right;
			}
			
			.uv2-summary-table td {
				padding: 6px 4px;
				border-bottom: 1px solid #f0f0f0;
				vertical-align: middle;
				word-wrap: break-word;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			
			.uv2-summary-table td:first-child {
				font-size: 11px;
				font-weight: 700;
				color: #667eea;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			
			.uv2-summary-table td:last-child {
				text-align: right;
				font-weight: 600;
				font-size: 11px;
				padding-right: 8px;
			}
			
			.uv2-summary-table td:nth-child(2),
			.uv2-summary-table td:nth-child(3) {
				text-align: center;
			}
			
			.uv2-summary-table tbody tr:hover {
				background-color: #f8f9fa;
			}
			
			.uv2-summary-table tbody tr:last-child td {
				border-bottom: none;
			}
			
			.uv2-summary-table tbody tr.uv2-totals-row {
				background: #f8f9fa !important;
				font-weight: 700;
				border-top: 2px solid #667eea;
				position: sticky;
				bottom: 0;
			}
			
			.uv2-summary-table tbody tr.uv2-totals-row td {
				padding: 8px 4px;
				font-weight: 700;
				border-top: 2px solid #667eea;
			}
			
			.uv2-summary-table tbody tr.uv2-totals-row td:first-child {
				color: #2c3e50;
				font-size: 11px;
			}
			
			.uv2-summary-table tbody tr.uv2-totals-row:hover {
				background: #f8f9fa !important;
			}
			
			.uv2-officer-count {
				color: #1976d2;
				font-weight: 700;
				font-size: 10px;
			}
			
			.uv2-soldier-count {
				color: #e65100;
				font-weight: 700;
				font-size: 10px;
			}
			
			.uv2-empty-state {
				text-align: center;
				padding: 30px 15px;
				color: #6c757d;
				font-size: 12px;
			}
			
			.uv2-empty-state i {
				font-size: 36px;
				margin-bottom: 10px;
				opacity: 0.5;
			}
			
			.uv2-loading {
				text-align: center;
				padding: 30px;
				color: #6c757d;
			}
			
			.uv2-loading i {
				font-size: 24px;
				animation: uv2-spin 1s linear infinite;
			}
			
			@keyframes uv2-spin {
				from { transform: rotate(0deg); }
				to { transform: rotate(360deg); }
			}
			
			/* Scrollbar styling */
			.uv2-unit-body::-webkit-scrollbar {
				width: 5px;
			}
			
			.uv2-unit-body::-webkit-scrollbar-track {
				background: rgba(255,255,255,0.1);
				border-radius: 10px;
			}
			
			.uv2-unit-body::-webkit-scrollbar-thumb {
				background: rgba(102, 126, 234, 0.3);
				border-radius: 10px;
			}
			
			.uv2-unit-body::-webkit-scrollbar-thumb:hover {
				background: rgba(102, 126, 234, 0.5);
			}
			
			#units_container::-webkit-scrollbar {
				width: 6px;
			}
			
			#units_container::-webkit-scrollbar-track {
				background: rgba(255,255,255,0.1);
				border-radius: 10px;
			}
			
			#units_container::-webkit-scrollbar-thumb {
				background: rgba(102, 126, 234, 0.3);
				border-radius: 10px;
			}
			
			#units_container::-webkit-scrollbar-thumb:hover {
				background: rgba(102, 126, 234, 0.5);
			}
			
			.uv2-expand-all {
				background: #667eea;
				color: white;
				border: none;
				border-radius: 4px;
				padding: 6px 12px;
				cursor: pointer;
				font-size: 11px;
				font-weight: 600;
				transition: all 0.2s ease;
				margin-left: auto;
			}
			
			.uv2-expand-all:hover {
				background: #5568d3;
			}
		</style>
		`);
		page._cssAdded = true;
	}
	
	// Create HTML structure
	let sidebarHTML = typeof getNavigationSidebar !== 'undefined' ? getNavigationSidebar('units-view2', 'uv2') : '<div></div>';
	
	let html = `
		<div class="uv2-container">
			${sidebarHTML}
			
			<div class="uv2-main-content">
				<div class="uv2-header">
					<h1><i class="fa fa-building"></i> Units View 2 (Compact)</h1>
					<p>Compact view for many units and personnel</p>
				</div>
				
				<div class="uv2-filter-section">
					<label class="uv2-filter-label">
						<i class="fa fa-filter"></i> Category:
					</label>
					<select id="category_filter" class="uv2-filter-select">
						<option value="">All Categories</option>
						<option value="Officer">Officer</option>
						<option value="Soldier">Soldier</option>
					</select>
					<button class="uv2-expand-all" onclick="toggleAllUnits()">
						<i class="fa fa-arrows-v"></i> <span id="expand_all_text">Expand All</span>
					</button>
				</div>
				
				<div id="units_container">
					<div class="uv2-loading">
						<i class="fa fa-spinner"></i>
						<p>Loading units...</p>
					</div>
				</div>
				
				<div id="pagination_container" style="display: none;">
					<!-- Pagination will be inserted here -->
				</div>
			</div>
			
			<div class="uv2-summary-section">
				<div class="uv2-summary-card">
					<h3><i class="fa fa-chart-bar"></i> Summary</h3>
					<div id="units_summary_table_container">
						<div class="uv2-loading">
							<i class="fa fa-spinner"></i>
							<p>Loading...</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
	
	page.main.html(html);
	
	// Setup filter change handler
	$('#category_filter').on('change', function() {
		currentPage = 1; // Reset to first page when filter changes
		load_units_data();
	});
	
	// Load units data
	currentPage = 1;
	load_units_data();
}

// Global variable for current page
var currentPage = 1;
var pageLength = 20; // Increased from 10 to show more units per page

function navigateToPersonnelRecord(serviceNumber) {
	// Open personnel record page in a new tab with service number parameter
	// Store service number in sessionStorage for the page to pick up
	sessionStorage.setItem('personnel_record_service_number', serviceNumber);
	// Get the base URL and construct the full route
	var baseUrl = window.location.origin;
	var route = '/app/personnel-record';
	// Open in new tab
	window.open(baseUrl + route, '_blank');
}

function formatPhoneNumber(phone) {
	if (!phone) return '';
	
	// Remove all non-digit characters except +
	let cleaned = phone.replace(/[^\d+]/g, '');
	
	// If it starts with +, keep it, otherwise ensure country code
	if (cleaned.startsWith('+')) {
		return cleaned.substring(1); // Remove + for WhatsApp API
	}
	
	// If it starts with 0, replace with country code (assuming Nigeria +234)
	if (cleaned.startsWith('0')) {
		return '234' + cleaned.substring(1);
	}
	
	// If it doesn't start with country code, assume it's a local number and add country code
	if (cleaned.length === 10 || cleaned.length === 11) {
		return '234' + cleaned;
	}
	
	return cleaned;
}

function load_units_data() {
	let container = $('#units_container');
	let category = $('#category_filter').val() || '';
	
	// Show loading state
	container.html('<div class="uv2-loading"><i class="fa fa-spinner"></i><p>Loading units...</p></div>');
	
	frappe.call({
		method: `dat_pm.nacstnew.doctype.personnel.personnel.get_units_with_personnel`,
		args: {
			category: category,
			page: currentPage,
			page_length: pageLength
		},
		callback: function(r) {
			if (r.message) {
				if (r.message.units && r.message.units.length > 0) {
					display_units(r.message.units);
					display_pagination(r.message);
					display_units_summary(r.message.units_summary || []);
				} else {
					container.html('<div class="uv2-empty-state"><i class="fa fa-building"></i><p>No units found</p></div>');
					$('#pagination_container').hide();
					$('#units_summary_table_container').html('<div class="uv2-empty-state" style="padding: 15px;"><i class="fa fa-building"></i><p>No units found</p></div>');
				}
			} else {
				container.html('<div class="uv2-empty-state"><i class="fa fa-building"></i><p>No units found</p></div>');
				$('#pagination_container').hide();
				$('#units_summary_table_container').html('<div class="uv2-empty-state" style="padding: 15px;"><i class="fa fa-building"></i><p>No units found</p></div>');
			}
		},
		error: function(r) {
			console.error("Error loading units:", r);
			container.html('<div class="uv2-empty-state"><i class="fa fa-exclamation-triangle"></i><p>Error loading units. Please try again.</p></div>');
			$('#pagination_container').hide();
		}
	});
}

function display_units(units) {
	let container = $('#units_container');
	
	if (!units || units.length === 0) {
		container.html('<div class="uv2-empty-state"><i class="fa fa-building"></i><p>No units found</p></div>');
		return;
	}
	
	let html = '';
	
	units.forEach(function(unit, index) {
		let unitId = 'unit_' + index;
		html += '<div class="uv2-unit-accordion" id="' + unitId + '">';
		
		// Unit header (clickable)
		html += '<div class="uv2-unit-header" onclick="toggleUnit(\'' + unitId + '\')">';
		// Top row: Unit info and toggle
		html += '<div class="uv2-unit-header-top">';
		html += '<div class="uv2-unit-header-left">';
		html += '<div class="uv2-unit-name-container">';
		html += '<h3 class="uv2-unit-header-title">' + frappe.utils.escape_html(unit.unit_name) + '</h3>';
		html += '</div>';
		html += '<div class="uv2-unit-location-container">';
		if (unit.unit_location) {
			html += '<span class="uv2-unit-location"><i class="fa fa-map-marker"></i> ' + frappe.utils.escape_html(unit.unit_location) + '</span>';
		} else {
			html += '<span class="uv2-unit-location"></span>';
		}
		html += '</div>';
		html += '<div class="uv2-unit-personnel-container">';
		html += '<span class="uv2-unit-personnel-count">' + unit.personnel_count + ' Personnel</span>';
		html += '</div>';
		html += '</div>';
		html += '<div class="uv2-unit-toggle"><i class="fa fa-chevron-down"></i></div>';
		html += '</div>';
		
		// Commander info on separate line below unit info
		if (unit.commander && unit.commander.name) {
			html += '<div class="uv2-unit-commander" onclick="event.stopPropagation();">';
			html += '<div class="uv2-commander-info-line">';
			html += '<i class="fa fa-user-shield"></i> ';
			html += '<span class="uv2-commander-name">' + frappe.utils.escape_html(unit.commander.name) + '</span>';
			if (unit.commander.appointment) {
				html += ' <span class="uv2-commander-appointment">(' + frappe.utils.escape_html(unit.commander.appointment) + ')</span>';
			}
			if (unit.commander.phone_number) {
				let phoneNumber = formatPhoneNumber(unit.commander.phone_number);
				html += ' <span class="uv2-commander-separator">-</span> ';
				if (phoneNumber) {
					let whatsappUrl = 'https://wa.me/' + phoneNumber + '?text=' + encodeURIComponent('Hello ' + (unit.commander.name || 'there') + '!');
					html += '<a href="' + whatsappUrl + '" target="_blank" onclick="event.stopPropagation(); return true;" class="uv2-commander-phone-link">';
					html += '<i class="fa fa-whatsapp"></i> ' + frappe.utils.escape_html(unit.commander.phone_number);
					html += '</a>';
				} else {
					html += '<span class="uv2-commander-phone">' + frappe.utils.escape_html(unit.commander.phone_number) + '</span>';
				}
			}
			html += '</div>';
			html += '</div>';
		}
		html += '</div>';
		
		// Unit body (collapsible)
		html += '<div class="uv2-unit-body">';
		
		if (unit.personnel && unit.personnel.length > 0) {
			html += '<table class="uv2-personnel-table">';
			html += '<thead>';
			html += '<tr>';
			html += '<th style="width: 25%;">Name</th>';
			html += '<th style="width: 15%;">Rank</th>';
			html += '<th style="width: 18%;">Service No.</th>';
			html += '<th style="width: 18%;">Phone</th>';
			html += '<th style="width: 10%;">Category</th>';
			html += '<th style="width: 10%;">Period</th>';
			html += '<th style="width: 4%;">Action</th>';
			html += '</tr>';
			html += '</thead>';
			html += '<tbody>';
			
			unit.personnel.forEach(function(person) {
				html += '<tr>';
				
				// Name
				html += '<td>';
				let serviceNumber = person.service_number || '';
				let personIndex = unit.personnel.indexOf(person);
				let nameId = 'personnel_name_' + index + '_' + personIndex;
				html += '<div class="uv2-personnel-name uv2-personnel-name-hover" id="' + nameId + '" data-service-number="' + frappe.utils.escape_html(serviceNumber) + '" onmouseenter="showPersonnelPopup(event, \'' + nameId + '\', \'' + frappe.utils.escape_html(serviceNumber) + '\')" onmouseleave="hidePersonnelPopup(\'' + nameId + '\')">' + frappe.utils.escape_html(person.personnel_name || 'N/A') + '</div>';
				html += '<div class="uv2-personnel-popup" id="popup_' + nameId + '"></div>';
				html += '</td>';
				
				// Rank
				html += '<td>';
				html += '<div class="uv2-personnel-rank">' + frappe.utils.escape_html(person.current_rank || 'N/A') + '</div>';
				html += '</td>';
				
				// Service Number
				html += '<td>';
				html += '<div class="uv2-personnel-service">' + frappe.utils.escape_html(person.service_number || '') + '</div>';
				html += '</td>';
				
				// Phone Number
				html += '<td>';
				if (person.phone_number) {
					let phoneNumber = formatPhoneNumber(person.phone_number);
					if (phoneNumber) {
						let imageUrl = person.personnel_image ? window.location.origin + person.personnel_image : '';
						let personnelName = person.personnel_name || 'there';
						let message = 'Hello ' + personnelName + '!';
						
						let whatsappUrl = 'https://wa.me/' + phoneNumber + '?text=' + encodeURIComponent(message);
						
						if (imageUrl) {
							whatsappUrl += encodeURIComponent('\n\nImage link: ') + encodeURIComponent(imageUrl);
						}
						
						html += '<a href="' + whatsappUrl + '" target="_blank" class="uv2-personnel-phone" onclick="event.stopPropagation(); return true;">';
						html += '<i class="fa fa-whatsapp"></i> ' + frappe.utils.escape_html(person.phone_number);
						html += '</a>';
					} else {
						html += '<span class="uv2-personnel-phone">' + frappe.utils.escape_html(person.phone_number) + '</span>';
					}
				} else {
					html += '<span style="color: #ccc;">-</span>';
				}
				html += '</td>';
				
				// Category
				html += '<td>';
				if (person.category) {
					let categoryClass = person.category.toLowerCase();
					html += '<span class="uv2-personnel-category ' + categoryClass + '">' + frappe.utils.escape_html(person.category) + '</span>';
				} else {
					html += '<span style="color: #ccc;">-</span>';
				}
				html += '</td>';
				
				// Period
				html += '<td>';
				if (person.period_in_unit && person.period_in_unit !== 'N/A') {
					html += '<div class="uv2-personnel-period">' + frappe.utils.escape_html(person.period_in_unit) + '</div>';
				} else {
					html += '<span style="color: #ccc;">-</span>';
				}
				html += '</td>';
				
				// Action
				html += '<td>';
				if (person.service_number) {
					let serviceNumber = frappe.utils.escape_html(person.service_number);
					html += '<a href="#" onclick="event.stopPropagation(); navigateToPersonnelRecord(\'' + serviceNumber + '\'); return false;" class="uv2-personnel-action" title="View Details">';
					html += '<i class="fa fa-eye"></i>';
					html += '</a>';
				} else {
					html += '<span style="color: #ccc;">-</span>';
				}
				html += '</td>';
				
				html += '</tr>';
			});
			
			html += '</tbody>';
			html += '</table>';
		} else {
			html += '<div class="uv2-empty-state" style="padding: 15px;"><i class="fa fa-users"></i><p>No personnel assigned</p></div>';
		}
		
		html += '</div>';
		html += '</div>';
	});
	
	container.html(html);
}

// Global variable to track popup timeout
var popupTimeout = null;
var currentPopupServiceNumber = null;

function showPersonnelPopup(event, nameId, serviceNumber) {
	// Clear any existing timeout
	if (popupTimeout) {
		clearTimeout(popupTimeout);
		popupTimeout = null;
	}
	
	// Hide any other visible popups
	$('.uv2-personnel-popup.show').removeClass('show');
	
	// Don't show if already showing for this service number
	if (currentPopupServiceNumber === serviceNumber) {
		return;
	}
	
	let popupId = 'popup_' + nameId;
	let popup = $('#' + popupId);
	let nameElement = $('#' + nameId);
	
	if (!serviceNumber || !serviceNumber.trim()) {
		return;
	}
	
	// Position popup near cursor
	let mouseX = event.pageX || event.clientX;
	let mouseY = event.pageY || event.clientY;
	
	// Show loading state
	popup.html('<div class="uv2-popup-loading"><i class="fa fa-spinner"></i><p>Loading...</p></div>');
	popup.addClass('show');
	
	// Position popup - try to place it to the right, or left if not enough space
	let windowWidth = $(window).width();
	let popupWidth = 320;
	let popupX = mouseX + 15;
	
	if (popupX + popupWidth > windowWidth - 20) {
		popupX = mouseX - popupWidth - 15;
	}
	
	// Adjust if too close to left edge
	if (popupX < 20) {
		popupX = 20;
	}
	
	popup.css({
		left: popupX + 'px',
		top: (mouseY - 10) + 'px'
	});
	
	// Fetch personnel data
	frappe.call({
		method: `dat_pm.nacstnew.doctype.personnel.personnel.get_personnel_data`,
		args: {
			service_number: serviceNumber
		},
		callback: function(r) {
			if (r.message) {
				displayPersonnelPopup(popup, r.message);
				currentPopupServiceNumber = serviceNumber;
			} else {
				popup.html('<div class="uv2-popup-loading"><p>No data available</p></div>');
			}
		},
		error: function(r) {
			console.error("Error loading personnel data:", r);
			popup.html('<div class="uv2-popup-loading"><p>Error loading data</p></div>');
		}
	});
}

function hidePersonnelPopup(nameId) {
	let popupId = 'popup_' + nameId;
	let popup = $('#' + popupId);
	
	// Add a small delay before hiding to allow moving mouse to popup
	popupTimeout = setTimeout(function() {
		popup.removeClass('show');
		currentPopupServiceNumber = null;
	}, 200);
}

function displayPersonnelPopup(popup, data) {
	let html = '';
	
	// Header with image and name
	html += '<div class="uv2-popup-header">';
	if (data.personnel_image) {
		html += '<img src="' + frappe.utils.escape_html(data.personnel_image) + '" alt="' + frappe.utils.escape_html(data.personnel_name || '') + '" class="uv2-popup-image" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">';
		html += '<div class="uv2-popup-image-placeholder" style="display: none;"><i class="fa fa-user"></i></div>';
	} else {
		html += '<div class="uv2-popup-image-placeholder"><i class="fa fa-user"></i></div>';
	}
	html += '<div class="uv2-popup-header-info">';
	html += '<div class="uv2-popup-name">' + frappe.utils.escape_html(data.personnel_name || 'N/A') + '</div>';
	html += '<div class="uv2-popup-rank">' + frappe.utils.escape_html(data.current_rank || '') + '</div>';
	html += '</div>';
	html += '</div>';
	
	// Body
	html += '<div class="uv2-popup-body">';
	
	// Basic Info
	html += '<div class="uv2-popup-section">';
	html += '<div class="uv2-popup-section-title"><i class="fa fa-info-circle"></i> Basic Info</div>';
	html += '<div class="uv2-popup-info-row">';
	html += '<span class="uv2-popup-info-label">Service No:</span>';
	html += '<span class="uv2-popup-info-value">' + frappe.utils.escape_html(data.service_number || '') + '</span>';
	html += '</div>';
	if (data.category) {
		html += '<div class="uv2-popup-info-row">';
		html += '<span class="uv2-popup-info-label">Category:</span>';
		html += '<span class="uv2-popup-info-value">' + frappe.utils.escape_html(data.category || '') + '</span>';
		html += '</div>';
	}
	if (data.current_unit) {
		html += '<div class="uv2-popup-info-row">';
		html += '<span class="uv2-popup-info-label">Current Unit:</span>';
		html += '<span class="uv2-popup-info-value">' + frappe.utils.escape_html(data.current_unit || '') + '</span>';
		html += '</div>';
	}
	if (data.type_of_commission) {
		html += '<div class="uv2-popup-info-row">';
		html += '<span class="uv2-popup-info-label">Commission:</span>';
		html += '<span class="uv2-popup-info-value">' + frappe.utils.escape_html(data.type_of_commission || '') + '</span>';
		html += '</div>';
	}
	html += '</div>';
	
	// Units Served (Posting History)
	if (data.posting_history && data.posting_history.length > 0) {
		html += '<div class="uv2-popup-section">';
		html += '<div class="uv2-popup-section-title"><i class="fa fa-building"></i> Units Served (' + data.posting_history.length + ')</div>';
		html += '<table class="uv2-popup-table">';
		
		// Show only last 5 units for compactness
		let unitsToShow = data.posting_history.slice(0, 5);
		unitsToShow.forEach(function(unit) {
			html += '<tr>';
			html += '<td>' + frappe.utils.escape_html(unit.to_unit || 'N/A') + '</td>';
			html += '<td>' + (unit.wef_date ? frappe.utils.escape_html(unit.wef_date) : '-') + '</td>';
			html += '<td>' + (unit.appointment ? frappe.utils.escape_html(unit.appointment) : '-') + '</td>';
			html += '</tr>';
		});
		
		if (data.posting_history.length > 5) {
			html += '<tr><td colspan="3" style="font-style: italic; color: #6c757d; text-align: center;">... and ' + (data.posting_history.length - 5) + ' more</td></tr>';
		}
		
		html += '</table>';
		html += '</div>';
	}
	
	// Courses Attended
	if (data.courses_attended && data.courses_attended.length > 0) {
		html += '<div class="uv2-popup-section">';
		html += '<div class="uv2-popup-section-title"><i class="fa fa-graduation-cap"></i> Courses (' + data.courses_attended.length + ')</div>';
		html += '<table class="uv2-popup-table">';
		
		// Show only last 5 courses for compactness
		let coursesToShow = data.courses_attended.slice(0, 5);
		coursesToShow.forEach(function(course) {
			html += '<tr>';
			html += '<td>' + frappe.utils.escape_html(course.course_name || 'N/A') + '</td>';
			let dateRange = '';
			if (course.course_start_date) {
				dateRange = frappe.utils.escape_html(course.course_start_date);
				if (course.course_end_date) {
					dateRange += ' - ' + frappe.utils.escape_html(course.course_end_date);
				}
			}
			html += '<td>' + (dateRange || '-') + '</td>';
			html += '<td>' + (course.grade ? frappe.utils.escape_html(course.grade) : '-') + '</td>';
			html += '</tr>';
		});
		
		if (data.courses_attended.length > 5) {
			html += '<tr><td colspan="3" style="font-style: italic; color: #6c757d; text-align: center;">... and ' + (data.courses_attended.length - 5) + ' more</td></tr>';
		}
		
		html += '</table>';
		html += '</div>';
	}
	
	html += '</div>';
	
	popup.html(html);
	
	// Keep popup visible when hovering over it
	popup.off('mouseenter mouseleave').on('mouseenter', function() {
		if (popupTimeout) {
			clearTimeout(popupTimeout);
			popupTimeout = null;
		}
	});
	
	popup.on('mouseleave', function() {
		popup.removeClass('show');
		currentPopupServiceNumber = null;
	});
	
	// Adjust position if popup goes off screen
	setTimeout(function() {
		let popupElement = popup[0];
		if (popupElement) {
			let rect = popupElement.getBoundingClientRect();
			let windowHeight = $(window).height();
			
			if (rect.bottom > windowHeight - 10) {
				let currentTop = parseInt(popup.css('top')) || 0;
				let newTop = currentTop - (rect.bottom - windowHeight + 10);
				popup.css('top', newTop + 'px');
			}
		}
	}, 10);
}

function toggleUnit(unitId) {
	let accordion = $('#' + unitId);
	accordion.toggleClass('expanded');
}

function toggleAllUnits() {
	let allExpanded = $('.uv2-unit-accordion.expanded').length === $('.uv2-unit-accordion').length;
	
	if (allExpanded) {
		// Collapse all
		$('.uv2-unit-accordion').removeClass('expanded');
		$('#expand_all_text').text('Expand All');
	} else {
		// Expand all
		$('.uv2-unit-accordion').addClass('expanded');
		$('#expand_all_text').text('Collapse All');
	}
}

function display_pagination(paginationData) {
	let container = $('#pagination_container');
	
	if (!paginationData || paginationData.total_pages <= 1) {
		container.hide();
		return;
	}
	
	let html = '<div class="uv2-pagination">';
	
	// Previous button
	html += '<button onclick="goToPage(' + (paginationData.page - 1) + ')" ' + (paginationData.page <= 1 ? 'disabled' : '') + '>';
	html += '<i class="fa fa-chevron-left"></i> Prev';
	html += '</button>';
	
	// Page info
	html += '<span class="uv2-page-info">';
	html += 'Page ' + paginationData.page + ' of ' + paginationData.total_pages;
	html += ' (' + paginationData.total_units + ' units)';
	html += '</span>';
	
	// Next button
	html += '<button onclick="goToPage(' + (paginationData.page + 1) + ')" ' + (paginationData.page >= paginationData.total_pages ? 'disabled' : '') + '>';
	html += 'Next <i class="fa fa-chevron-right"></i>';
	html += '</button>';
	
	html += '</div>';
	
	container.html(html);
	container.show();
}

function goToPage(page) {
	if (page < 1) return;
	currentPage = page;
	load_units_data();
	// Scroll to top of units container
	$('#units_container')[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function display_units_summary(unitsSummary) {
	let container = $('#units_summary_table_container');
	
	if (!unitsSummary || unitsSummary.length === 0) {
		container.html('<div class="uv2-empty-state" style="padding: 15px;"><i class="fa fa-building"></i><p>No units found</p></div>');
		return;
	}
	
	// Sort units by name, but keep "No Unit Assigned" at the end
	unitsSummary.sort(function(a, b) {
		let aName = a.unit_name || '';
		let bName = b.unit_name || '';
		
		// If one is "No Unit Assigned", it goes to the end
		if (aName === "No Unit Assigned" && bName !== "No Unit Assigned") return 1;
		if (bName === "No Unit Assigned" && aName !== "No Unit Assigned") return -1;
		
		// Otherwise, sort alphabetically
		return aName.localeCompare(bName);
	});
	
	let html = '<table class="uv2-summary-table">';
	html += '<thead>';
	html += '<tr>';
	html += '<th>Unit</th>';
	html += '<th>Off.</th>';
	html += '<th>Sol.</th>';
	html += '<th>Total</th>';
	html += '</tr>';
	html += '</thead>';
	html += '<tbody>';
	
	unitsSummary.forEach(function(unit) {
		html += '<tr>';
		html += '<td>' + frappe.utils.escape_html(unit.unit_name || 'N/A') + '</td>';
		html += '<td><span class="uv2-officer-count">' + (unit.officers_count || 0) + '</span></td>';
		html += '<td><span class="uv2-soldier-count">' + (unit.soldiers_count || 0) + '</span></td>';
		html += '<td style="text-align: right;"><strong>' + (unit.total_count || 0) + '</strong></td>';
		html += '</tr>';
	});
	
	// Add totals row
	let totalOfficers = unitsSummary.reduce(function(sum, unit) { return sum + (parseInt(unit.officers_count) || 0); }, 0);
	let totalSoldiers = unitsSummary.reduce(function(sum, unit) { return sum + (parseInt(unit.soldiers_count) || 0); }, 0);
	let totalPersonnel = unitsSummary.reduce(function(sum, unit) { return sum + (parseInt(unit.total_count) || 0); }, 0);
	
	html += '<tr class="uv2-totals-row">';
	html += '<td><strong>Total</strong></td>';
	html += '<td><span class="uv2-officer-count">' + totalOfficers + '</span></td>';
	html += '<td><span class="uv2-soldier-count">' + totalSoldiers + '</span></td>';
	html += '<td><strong>' + totalPersonnel + '</strong></td>';
	html += '</tr>';
	
	html += '</tbody>';
	html += '</table>';
	
	container.html(html);
}

