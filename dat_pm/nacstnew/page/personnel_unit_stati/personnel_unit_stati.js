frappe.pages['personnel-unit-stati'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Personnel Unit Analysis',
		single_column: true
	});

	// Add CSS - include reusable sidebar CSS and page-specific CSS
	page.add_inner_message(
		hideDefaultSidebarCSS('personnel-unit-stati') + 
		getNavigationSidebarCSS('pus') + `
		<style id="pus-page-styles">
			/* Make the page container full width */
			body[data-page-name="personnel-unit-stati"] .page-wrapper {
				width: 100% !important;
			}
			
			body[data-page-name="personnel-unit-stati"] .layout-main-section-wrapper {
				display: flex !important;
				flex-direction: column !important;
			}
			
			.unit-mismatch-container {
				display: flex;
				gap: 20px;
				padding: 20px;
				min-height: calc(100vh - 120px);
				width: 100%;
				margin: 0;
			}
			
			.pus-main-content-wrapper {
				flex: 1;
				overflow-y: auto;
				padding-right: 10px;
			}
			
			/* Scrollbar styling for main content */
			.pus-main-content-wrapper::-webkit-scrollbar {
				width: 8px;
			}
			
			.pus-main-content-wrapper::-webkit-scrollbar-track {
				background: #f1f1f1;
				border-radius: 10px;
			}
			
			.pus-main-content-wrapper::-webkit-scrollbar-thumb {
				background: #888;
				border-radius: 10px;
			}
			
			.pus-main-content-wrapper::-webkit-scrollbar-thumb:hover {
				background: #555;
			}
		</style>
	`);

	// Create container for filters and data with sidebar
	let $container = $(`
		<div class="unit-mismatch-container">
			${getNavigationSidebar('personnel-unit-stati', 'pus')}
			<div class="pus-main-content-wrapper">
				<div class="stats-header" style="margin-bottom: 20px;">
					<div class="stats-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
						color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; position: relative;">
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<div>
								<h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">
									Unit Mismatch Analysis
								</h3>
								<p style="margin: 0; opacity: 0.9; font-size: 14px;">
									Personnel with different units in Part 2 Orders vs Strength Returns
								</p>
							</div>
							<button class="btn btn-light btn-sm" onclick="refreshData()" 
								style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); 
								color: white; padding: 8px 16px;">
								<i class="fa fa-refresh"></i> Refresh
							</button>
						</div>
					</div>
				</div>
			<div id="loading-state" style="text-align: center; padding: 40px;">
				<div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; 
					border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
				<p style="margin-top: 15px; color: #6c757d;">Loading data...</p>
			</div>
			<style>
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			</style>
			<div id="data-container" style="display: none;"></div>
			</div>
		</div>
	`).appendTo(page.main);

	// Make refreshData available globally
	window.refreshData = function() {
		$('#data-container').hide();
		$('#loading-state').show();
		loadData();
	};

	// Load data
	loadData();

	function loadData() {
		frappe.call({
			method: `dat_pm.nacstnew.doctype.personnel.personnel.get_personnel_unit_mismatches`,
			callback: function(r) {
				if (r.message) {
					displayData(r.message);
				} else {
					showError('Failed to load data');
				}
			},
			error: function(err) {
				showError('Error loading data: ' + (err.message || 'Unknown error'));
			}
		});
	}

	function displayData(data) {
		$('#loading-state').hide();
		
		if (!data || data.length === 0) {
			$('#data-container').html(`
				<div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 8px;">
					<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
						style="color: #28a745; margin-bottom: 15px;">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
						<polyline points="22 4 12 14.01 9 11.01"></polyline>
					</svg>
					<h4 style="color: #28a745; margin: 0;">No Unit Mismatches Found</h4>
					<p style="color: #6c757d; margin-top: 10px;">All personnel have matching unit information.</p>
				</div>
			`).show();
			return;
		}

		// Create summary stats
		let currentUnitLatest = data.filter(d => d.latest_source === 'current_unit').length;
		let returnsLatest = data.filter(d => d.latest_source === 'personnel_unit_from_returns').length;
		let equalDates = data.filter(d => d.latest_source === 'equal').length;
		let noDate = data.filter(d => !d.latest_source).length;

		let summaryHTML = `
			<div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
				gap: 15px; margin-bottom: 25px;">
				<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
					border-left: 4px solid #dc3545;">
					<div style="font-size: 32px; font-weight: bold; color: #dc3545;">${data.length}</div>
					<div style="color: #6c757d; margin-top: 5px; font-size: 14px;">Total Mismatches</div>
				</div>
				<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
					border-left: 4px solid #007bff;">
					<div style="font-size: 32px; font-weight: bold; color: #007bff;">${currentUnitLatest}</div>
					<div style="color: #6c757d; margin-top: 5px; font-size: 14px;">Part 2 Order Latest</div>
				</div>
				<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
					border-left: 4px solid #28a745;">
					<div style="font-size: 32px; font-weight: bold; color: #28a745;">${returnsLatest}</div>
					<div style="color: #6c757d; margin-top: 5px; font-size: 14px;">Returns Latest</div>
				</div>
			</div>
		`;

		// Create table
		let tableHTML = `
			<div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
				<div style="overflow-x: auto;">
					<table class="table table-hover" style="margin: 0; width: 100%;">
						<thead style="background: #f8f9fa;">
							<tr>
								<th style="padding: 12px; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">
									Service Number
								</th>
								<th style="padding: 12px; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">
									Personnel Name
								</th>
								<th style="padding: 12px; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">
									Current Unit<br/><small style="font-weight: 400; color: #6c757d;">(Part 2 Order)</small>
								</th>
								<th style="padding: 12px; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">
									Unit from Returns<br/><small style="font-weight: 400; color: #6c757d;">(Strength Returns)</small>
								</th>
								<th style="padding: 12px; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">
									Latest Information
								</th>
								<th style="padding: 12px; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">
									Date Comparison
								</th>
							</tr>
						</thead>
						<tbody>
		`;

		data.forEach(row => {
			let latestIndicator = '';
			let latestColor = '';
			
			if (row.latest_source === 'current_unit') {
				latestIndicator = '<span style="background: #007bff; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">Part 2 Order</span>';
				latestColor = '#007bff';
			} else if (row.latest_source === 'personnel_unit_from_returns') {
				latestIndicator = '<span style="background: #28a745; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">Returns</span>';
				latestColor = '#28a745';
			} else if (row.latest_source === 'equal') {
				latestIndicator = '<span style="background: #6c757d; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">Equal Dates</span>';
				latestColor = '#6c757d';
			} else {
				latestIndicator = '<span style="background: #ffc107; color: #212529; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">No Date</span>';
				latestColor = '#ffc107';
			}

			let currentUnitCell = row.current_unit || '<span style="color: #6c757d;">N/A</span>';
			if (row.latest_source === 'current_unit') {
				currentUnitCell = `<strong style="color: ${latestColor};">${currentUnitCell}</strong>`;
			}

			let returnsUnitCell = row.personnel_unit_from_returns || '<span style="color: #6c757d;">N/A</span>';
			if (row.latest_source === 'personnel_unit_from_returns') {
				returnsUnitCell = `<strong style="color: ${latestColor};">${returnsUnitCell}</strong>`;
			}

			let currentUnitDate = row.current_unit_date ? 
				(frappe.datetime.str_to_user ? frappe.datetime.str_to_user(row.current_unit_date, false) : row.current_unit_date) : 
				'<span style="color: #6c757d;">N/A</span>';
			
			let returnsDate = row.returns_date ? 
				(frappe.datetime.str_to_user ? frappe.datetime.str_to_user(row.returns_date, false) : row.returns_date) : 
				'<span style="color: #6c757d;">N/A</span>';

			let dateComparisonHTML = `
				<div style="font-size: 12px;">
					<div style="margin-bottom: 5px;">
						<strong>Part 2 Order:</strong> ${currentUnitDate}
					</div>
					<div>
						<strong>Returns:</strong> ${returnsDate}
					</div>
				</div>
			`;

			let personnelLink = `<a href="/app/personnel/${encodeURIComponent(row.service_number)}" 
				style="color: #007bff; text-decoration: none;">${frappe.utils.escape_html(row.service_number)}</a>`;
			
			let nameLink = `<a href="/app/personnel/${encodeURIComponent(row.service_number)}" 
				style="color: #007bff; text-decoration: none;">${frappe.utils.escape_html(row.personnel_name || '')}</a>`;

			tableHTML += `
				<tr style="border-bottom: 1px solid #dee2e6;">
					<td style="padding: 12px;">${personnelLink}</td>
					<td style="padding: 12px;">${nameLink}</td>
					<td style="padding: 12px;">${currentUnitCell}</td>
					<td style="padding: 12px;">${returnsUnitCell}</td>
					<td style="padding: 12px;">${latestIndicator}</td>
					<td style="padding: 12px;">${dateComparisonHTML}</td>
				</tr>
			`;
		});

		tableHTML += `
						</tbody>
					</table>
				</div>
			</div>
		`;

		$('#data-container').html(summaryHTML + tableHTML).show();
	}

	function showError(message) {
		$('#loading-state').hide();
		$('#data-container').html(`
			<div style="text-align: center; padding: 40px; background: #f8d7da; border-radius: 8px; color: #721c24;">
				<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
					style="margin-bottom: 15px;">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="12" y1="8" x2="12" y2="12"></line>
					<line x1="12" y1="16" x2="12.01" y2="16"></line>
				</svg>
				<h4 style="margin: 0;">Error</h4>
				<p style="margin-top: 10px;">${frappe.utils.escape_html(message)}</p>
				<button class="btn btn-primary btn-sm" onclick="location.reload()" 
					style="margin-top: 15px;">Retry</button>
			</div>
		`).show();
	}
}