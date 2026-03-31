// Real-Time Audit Log - Futuristic Matrix Style Monitoring Dashboard
frappe.pages['rtal'].on_page_load = function(wrapper) {
	// Automatically toggle to full width when page loads
	localStorage.container_fullwidth = "true";
	frappe.ui.toolbar.set_fullwidth_if_enabled();
	
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __('Real-Time Audit Log'),
		single_column: true
	});

	// Store page reference
	wrapper.page = page;
	
	// Add futuristic matrix CSS and sidebar
	// Check if navigation sidebar functions are available
	if (typeof hideDefaultSidebarCSS === 'undefined') {
		console.error('hideDefaultSidebarCSS is not defined. Make sure navigation_sidebar.js is loaded.');
	}
	if (typeof getNavigationSidebarCSS === 'undefined') {
		console.error('getNavigationSidebarCSS is not defined. Make sure navigation_sidebar.js is loaded.');
	}
	if (typeof getNavigationSidebar === 'undefined') {
		console.error('getNavigationSidebar is not defined. Make sure navigation_sidebar.js is loaded.');
	}
	
	let navCSS = typeof getNavigationSidebarCSS !== 'undefined' ? getNavigationSidebarCSS('rtal') : '';
	let hideSidebarCSS = typeof hideDefaultSidebarCSS !== 'undefined' ? hideDefaultSidebarCSS('rtal') : '';
	
	page.add_inner_message(
		hideSidebarCSS + 
		navCSS + `
		<style>
			@keyframes matrix-rain {
				0% { transform: translateY(-100vh); opacity: 0; }
				10% { opacity: 1; }
				90% { opacity: 1; }
				100% { transform: translateY(100vh); opacity: 0; }
			}
			
			@keyframes glow {
				0%, 100% { text-shadow: 0 0 5px #00ff00, 0 0 10px #00ff00, 0 0 15px #00ff00; }
				50% { text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00; }
			}
			
			@keyframes slide-in {
				from {
					transform: translateX(-100%);
					opacity: 0;
				}
				to {
					transform: translateX(0);
					opacity: 1;
				}
			}
			
			/* Layout container with sidebar */
			body[data-page-name="rtal"] .page-wrapper {
				width: 100% !important;
			}
			
			body[data-page-name="rtal"] .layout-main-section-wrapper {
				display: flex !important;
				flex-direction: column !important;
			}
			
			.rtal-page-container {
				display: flex;
				gap: 20px;
				height: calc(100vh - 120px);
				width: 100%;
				margin: 0;
				padding: 20px;
			}
			
			.rtal-container {
				background: #000;
				color: #00ff00;
				font-family: 'Courier New', monospace;
				min-height: calc(100vh - 160px);
				padding: 10px;
				position: relative;
				overflow: hidden;
				flex: 1;
				display: flex;
				flex-direction: column;
			}
			
			.rtal-header {
				text-align: center;
				padding: 10px 15px;
				border: 1px solid #00ff00;
				margin-bottom: 10px;
				background: rgba(0, 255, 0, 0.1);
				box-shadow: 0 0 10px #00ff00;
				animation: glow 2s ease-in-out infinite;
			}
			
			.rtal-header h1 {
				color: #00ff00;
				text-shadow: 0 0 10px #00ff00;
				margin: 0;
				font-size: 20px;
				letter-spacing: 2px;
			}
			
			.rtal-stats {
				display: flex;
				justify-content: space-around;
				margin-bottom: 10px;
				flex-wrap: wrap;
				gap: 8px;
			}
			
			.rtal-stat-box {
				border: 1px solid #00ff00;
				padding: 8px 12px;
				background: rgba(0, 255, 0, 0.05);
				min-width: 120px;
				text-align: center;
				flex: 1;
			}
			
			.rtal-stat-label {
				font-size: 10px;
				color: #00ff88;
				margin-bottom: 3px;
			}
			
			.rtal-stat-value {
				font-size: 18px;
				color: #00ff00;
				font-weight: bold;
			}
			
			.rtal-activity-stream {
				max-height: calc(100vh - 220px);
				overflow-y: auto;
				border: 1px solid #00ff00;
				background: rgba(0, 0, 0, 0.8);
				padding: 5px;
			}
			
			.rtal-activity-item {
				border-left: 3px solid;
				padding: 6px 8px;
				margin-bottom: 5px;
				background: rgba(0, 0, 0, 0.6);
				animation: slide-in 0.5s ease-out;
				font-size: 11px;
				line-height: 1.4;
			}
			
			.rtal-activity-item.create {
				border-color: #0088ff;
				box-shadow: 0 0 10px rgba(0, 136, 255, 0.5);
			}
			
			.rtal-activity-item.update {
				border-color: #ff4444;
				box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
			}
			
			.rtal-activity-item.comment {
				border-color: #ffaa00;
				box-shadow: 0 0 10px rgba(255, 170, 0, 0.5);
			}
			
			.rtal-activity-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 3px;
				font-weight: bold;
			}
			
			.rtal-activity-doctype {
				color: #00ffff;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				font-size: 10px;
			}
			
			.rtal-activity-time {
				color: #888;
				font-size: 9px;
				white-space: nowrap;
			}
			
			.rtal-activity-user {
				color: #00ff88;
				margin: 2px 0;
				font-size: 10px;
			}
			
			.rtal-activity-content {
				color: #ccc;
				margin-top: 3px;
				padding-left: 5px;
				font-size: 10px;
			}
			
			.rtal-activity-content ul {
				margin: 2px 0;
				padding-left: 15px;
			}
			
			.rtal-activity-content li {
				margin: 1px 0;
			}
			
			.rtal-scrollbar::-webkit-scrollbar {
				width: 8px;
			}
			
			.rtal-scrollbar::-webkit-scrollbar-track {
				background: rgba(0, 255, 0, 0.1);
			}
			
			.rtal-scrollbar::-webkit-scrollbar-thumb {
				background: #00ff00;
				border-radius: 4px;
			}
			
			.rtal-scrollbar::-webkit-scrollbar-thumb:hover {
				background: #00ff88;
			}
			
			.rtal-loading {
				text-align: center;
				padding: 40px;
				color: #00ff00;
				font-size: 18px;
			}
			
			.rtal-empty {
				text-align: center;
				padding: 40px;
				color: #666;
				font-size: 14px;
			}
		</style>
	`);
	
	// Create the page content with sidebar
	let sidebarHTML = typeof getNavigationSidebar !== 'undefined' ? getNavigationSidebar('rtal', 'rtal') : '<div></div>';
	
	let html = `
		<div class="rtal-page-container">
			${sidebarHTML}
			<div class="rtal-container">
			<div class="rtal-header">
				<h1>⚡ REAL-TIME AUDIT LOG ⚡</h1>
				<div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #00ff88; margin-top: 5px; padding-top: 5px; border-top: 1px solid rgba(0, 255, 0, 0.3);">
					<div>
						<span id="rtal-status">SYSTEM ACTIVE | LIVE</span>
						<span style="margin-left: 15px; color: #00ffff;">SYNC:</span> <span id="rtal-last-sync" style="color: #00ffff;">INITIALIZING...</span>
					</div>
					<button id="rtal-pause-btn" style="
						padding: 4px 12px;
						background: rgba(0, 255, 0, 0.2);
						border: 1px solid #00ff00;
						color: #00ff00;
						cursor: pointer;
						font-family: 'Courier New', monospace;
						font-size: 10px;
					">⏸ PAUSE</button>
				</div>
			</div>
			
			<div style="margin-bottom: 10px; padding: 8px; border: 1px solid #00ff00; background: rgba(0, 255, 0, 0.05);">
				<div style="display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap;">
					<div style="flex: 1; min-width: 180px;">
						<label style="display: block; color: #00ff88; font-size: 9px; margin-bottom: 3px;">MODULE:</label>
						<select id="rtal-module-filter" style="
							width: 100%;
							padding: 5px;
							background: #000;
							border: 1px solid #00ff00;
							color: #00ff00;
							font-family: 'Courier New', monospace;
							font-size: 11px;
						">
							<option value="">ALL MODULES</option>
						</select>
					</div>
					<div style="flex: 1; min-width: 180px;">
						<label style="display: block; color: #00ff88; font-size: 9px; margin-bottom: 3px;">DOCTYPE:</label>
						<select id="rtal-doctype-filter" disabled style="
							width: 100%;
							padding: 5px;
							background: #000;
							border: 1px solid #666;
							color: #666;
							font-family: 'Courier New', monospace;
							font-size: 11px;
						">
							<option value="">SELECT MODULE FIRST</option>
						</select>
					</div>
					<div style="flex: 1; min-width: 180px;">
						<label style="display: block; color: #00ff88; font-size: 9px; margin-bottom: 3px;">FROM DATE:</label>
						<input type="text" id="rtal-from-date" class="form-control" style="
							width: 100%;
							padding: 5px;
							background: #000;
							border: 1px solid #00ff00;
							color: #00ff00;
							font-family: 'Courier New', monospace;
							font-size: 11px;
						" placeholder="Select date & time">
					</div>
					<div style="flex: 1; min-width: 180px;">
						<label style="display: block; color: #00ff88; font-size: 9px; margin-bottom: 3px;">TO DATE:</label>
						<input type="text" id="rtal-to-date" class="form-control" style="
							width: 100%;
							padding: 5px;
							background: #000;
							border: 1px solid #00ff00;
							color: #00ff00;
							font-family: 'Courier New', monospace;
							font-size: 11px;
						" placeholder="Select date & time">
					</div>
					<div>
						<button id="rtal-reset-filters" style="
							padding: 5px 12px;
							background: rgba(0, 255, 0, 0.2);
							border: 1px solid #00ff00;
							color: #00ff00;
							cursor: pointer;
							font-family: 'Courier New', monospace;
							font-size: 10px;
							height: 28px;
						">RESET</button>
					</div>
				</div>
			</div>
			
			<div class="rtal-stats" id="rtal-stats">
				<div class="rtal-stat-box">
					<div class="rtal-stat-label">TOTAL ACTIVITIES</div>
					<div class="rtal-stat-value" id="stat-total">0</div>
				</div>
				<div class="rtal-stat-box">
					<div class="rtal-stat-label">NEW RECORDS</div>
					<div class="rtal-stat-value" id="stat-creates" style="color: #0088ff;">0</div>
				</div>
				<div class="rtal-stat-box">
					<div class="rtal-stat-label">UPDATES</div>
					<div class="rtal-stat-value" id="stat-updates" style="color: #ff4444;">0</div>
				</div>
				<div class="rtal-stat-box">
					<div class="rtal-stat-label">COMMENTS</div>
					<div class="rtal-stat-value" id="stat-comments" style="color: #ffaa00;">0</div>
				</div>
			</div>
			
			<div class="rtal-activity-stream rtal-scrollbar" id="rtal-stream">
				<div class="rtal-loading">INITIALIZING MONITORING SYSTEM...</div>
			</div>
			</div>
		</div>
	`;
	
	page.body.html(html);
	
	// Initialize Frappe datetime pickers
	function init_datetime_pickers() {
		let sysdefaults = frappe.boot.sysdefaults;
		// Get user's date format (for datepicker library, e.g., "yyyy-mm-dd")
		let date_format = (sysdefaults && sysdefaults.date_format) ? sysdefaults.date_format : "yyyy-mm-dd";
		let time_format = (sysdefaults && sysdefaults.time_format) ? sysdefaults.time_format : "HH:mm:ss";
		
		// Function to handle date selection and conversion
		function handleDateSelect(formattedDate, date, inst) {
			if (formattedDate) {
				// Air Datepicker passes the instance as `inst` and the input is available as `inst.$el`
				// In older code this was referenced as `inst.input`, which is undefined and breaks the handler.
				let inputId = null;
				if (inst && inst.$el) {
					// inst.$el is a jQuery object
					inputId = $(inst.$el).attr('id');
				}
				if (!inputId) {
					console.warn('RTAL: Could not determine input element for datepicker selection');
				}
				
				// The formattedDate is in user format, convert to system format for backend
				// formattedDate includes both date and time in user format
				let systemDate = frappe.datetime.user_to_str(formattedDate, false); // false = not time only
				
				// Ensure we have a valid datetime string
				if (!systemDate || systemDate.trim() === '') {
					console.warn('Invalid date conversion:', formattedDate);
					return;
				}
				
				// If time is not included (only date), set appropriate defaults
				if (systemDate && !systemDate.includes(' ')) {
					// Only date, no time - add time component
					if (inputId === 'rtal-from-date') {
						// For from_date, use start of day (00:00:00)
						systemDate = systemDate + ' 00:00:00';
					} else if (inputId === 'rtal-to-date') {
						// For to_date, use end of day (23:59:59)
						systemDate = systemDate + ' 23:59:59';
					}
				}
				
				if (inputId === 'rtal-from-date') {
					selectedFromDate = systemDate;
				} else if (inputId === 'rtal-to-date') {
					selectedToDate = systemDate;
				}
				// Reset activities and reload
				activities = [];
				lastUpdate = null;
				load_activities();
			}
		}
		
		let datepicker_options = {
			language: "en",
			dateFormat: date_format, // User's date format (e.g., "yyyy-mm-dd")
			timepicker: true,
			timeFormat: time_format.toLowerCase().replace("mm", "ii"), // Convert "mm" to "ii" for minutes
			keyboardNav: false,
			todayButton: true,
			startDate: new Date(), // Start with current date
			firstDay: frappe.datetime.get_first_day_of_the_week_index(),
			onSelect: handleDateSelect,
			onShow: function(inst, animationComplete) {
				// Update "Now" button text
				let $nowButton = inst.$datepicker.find('[data-action="today"]');
				$nowButton.text(__("Now"));
			}
		};
		
		// Initialize FROM DATE picker
		let fromDatePicker = $('#rtal-from-date').datepicker(datepicker_options).data('datepicker');
		if (fromDatePicker) {
			// Add "Now" button click handler for FROM DATE
			fromDatePicker.$datepicker.find('[data-action="today"]').off('click.rtal').on('click.rtal', function() {
				let nowDate = frappe.datetime.now_datetime(true);
				fromDatePicker.selectDate(nowDate);
				fromDatePicker.hide();
			});
		}
		
		// Initialize TO DATE picker
		let toDatePicker = $('#rtal-to-date').datepicker(datepicker_options).data('datepicker');
		if (toDatePicker) {
			// Add "Now" button click handler for TO DATE
			toDatePicker.$datepicker.find('[data-action="today"]').off('click.rtal').on('click.rtal', function() {
				let nowDate = frappe.datetime.now_datetime(true);
				toDatePicker.selectDate(nowDate);
				toDatePicker.hide();
			});
		}
	}
	
	// Initialize datetime pickers after a short delay to ensure DOM is ready
	setTimeout(function() {
		init_datetime_pickers();
	}, 100);
	
	// Real-time monitoring
	let lastUpdate = null;
	let updateInterval = null;
	let activities = [];
	let isPaused = false;
	let lastSyncTime = null;
	let selectedModule = '';
	let selectedDoctype = '';
	let selectedFromDate = '';
	let selectedToDate = '';
	
	// Load modules for filters
	let modulesLoaded = false;
	let allDoctypes = []; // Store all doctypes for reference
	
	function load_filters() {
		// Load accessible modules (permission-based)
		frappe.call({
			method: `dat_pm.nacstnew.page.rtal.rtal.get_accessible_modules`,
			callback: function(r) {
				if (r.message && r.message.length > 0) {
					let moduleSelect = $('#rtal-module-filter');
					r.message.forEach(function(moduleName) {
						moduleSelect.append(`<option value="${escape_html(moduleName)}">${escape_html(moduleName)}</option>`);
					});
				} else {
					// No accessible modules
					$('#rtal-module-filter').html('<option value="">NO ACCESS</option>');
				}
				modulesLoaded = true;
				setup_filter_handlers();
			},
			error: function(r) {
				console.error('Error loading modules:', r);
				modulesLoaded = true;
				setup_filter_handlers();
			}
		});
	}
	
	// Load doctypes for a specific module
	function load_doctypes_for_module(moduleName) {
		let doctypeSelect = $('#rtal-doctype-filter');
		
		// Clear existing options except the first one
		doctypeSelect.find('option:not(:first)').remove();
		
		if (!moduleName) {
			doctypeSelect.prop('disabled', true);
			doctypeSelect.css({
				'border': '1px solid #666',
				'color': '#666'
			});
			doctypeSelect.html('<option value="">SELECT MODULE FIRST</option>');
			return;
		}
		
		// Show loading
		doctypeSelect.html('<option value="">LOADING...</option>');
		doctypeSelect.prop('disabled', true);
		
		// Fetch accessible doctypes for the selected module (permission-based)
		frappe.call({
			method: `dat_pm.nacstnew.page.rtal.rtal.get_accessible_doctypes`,
			args: {
				module: moduleName
			},
			callback: function(r) {
				doctypeSelect.html('<option value="">ALL DOCTYPES</option>');
				
				if (r.message && r.message.length > 0) {
					r.message.forEach(function(dtName) {
						doctypeSelect.append(`<option value="${escape_html(dtName)}">${escape_html(dtName)}</option>`);
					});
				} else {
					doctypeSelect.append('<option value="">NO ACCESSIBLE DOCTYPES</option>');
				}
				
				// Enable and style the select
				doctypeSelect.prop('disabled', false);
				doctypeSelect.css({
					'border': '1px solid #00ff00',
					'color': '#00ff00'
				});
			},
			error: function(r) {
				doctypeSelect.html('<option value="">ERROR LOADING</option>');
			}
		});
	}
	
	// Handle filter changes (set up after filters are loaded)
	function setup_filter_handlers() {
		$('#rtal-module-filter').off('change').on('change', function() {
			selectedModule = $(this).val();
			
			// Clear doctype selection when module changes
			selectedDoctype = '';
			
			// Dynamically load doctypes for the selected module
			load_doctypes_for_module(selectedModule);
			
			// Reset activities and reload
			activities = [];
			lastUpdate = null;
			load_activities();
		});
		
		$('#rtal-doctype-filter').off('change').on('change', function() {
			selectedDoctype = $(this).val();
			
			// Reset activities and reload
			activities = [];
			lastUpdate = null;
			load_activities();
		});
		
		// Date picker handlers are set up in init_datetime_pickers()
		// They handle the onSelect event directly
		
		$('#rtal-reset-filters').off('click').on('click', function() {
			$('#rtal-module-filter').val('');
			selectedModule = '';
			selectedDoctype = '';
			$('#rtal-doctype-filter').val('');
			
			// Clear datetime pickers
			let fromDatePicker = $('#rtal-from-date').data('datepicker');
			let toDatePicker = $('#rtal-to-date').data('datepicker');
			if (fromDatePicker) {
				fromDatePicker.clear();
			}
			if (toDatePicker) {
				toDatePicker.clear();
			}
			$('#rtal-from-date').val('');
			$('#rtal-to-date').val('');
			selectedFromDate = '';
			selectedToDate = '';
			
			// Reset doctype filter
			load_doctypes_for_module('');
			
			// Reset activities and reload
			activities = [];
			lastUpdate = null;
			load_activities();
		});
	}
	
	// Function to update last sync display
	function update_last_sync_display() {
		if (lastSyncTime) {
			// Format as "5 Dec 25 HH:mm:ss"
			let date_obj = moment(lastSyncTime);
			let date_str = date_obj.format('D MMM YY');
			let time_str = date_obj.format('HH:mm:ss');
			$('#rtal-last-sync').text(date_str + ' ' + time_str);
		} else {
			$('#rtal-last-sync').text('NO SYNC YET');
		}
	}
	
	// Pause/Resume functionality (set up after HTML is added)
	setTimeout(function() {
		$('#rtal-pause-btn').on('click', function() {
			if (isPaused) {
				// Resume
				isPaused = false;
				$(this).text('⏸ PAUSE');
				$('#rtal-status').text('SYSTEM MONITORING ACTIVE | LIVE FEED');
				load_activities();
				updateInterval = setInterval(function() {
					if (!isPaused) {
						load_activities();
					}
				}, 10000); // 10 seconds instead of 3
			} else {
				// Pause
				isPaused = true;
				$(this).text('▶ RESUME');
				$('#rtal-status').text('SYSTEM MONITORING PAUSED');
				if (updateInterval) {
					clearInterval(updateInterval);
					updateInterval = null;
				}
			}
		});
	}, 100);
	
	function load_activities() {
		if (isPaused) return;
		
		frappe.call({
			method: `dat_pm.nacstnew.page.rtal.rtal.get_realtime_activities`,
			args: {
				limit: 100, // Reduced from 200
				since: (selectedFromDate || selectedToDate) ? null : lastUpdate, // Don't use 'since' if date range is set
				doctype: selectedDoctype || null,
				module: selectedModule || null,
				from_date: selectedFromDate || null,
				to_date: selectedToDate || null
			},
			callback: function(r) {
				// Update last sync time
				lastSyncTime = new Date();
				update_last_sync_display();
				
				if (r.message && r.message.length > 0) {
					// On first load, just set activities
					if (activities.length === 0) {
						activities = r.message;
						if (activities.length > 0) {
							lastUpdate = activities[0].communication_date || activities[0].creation;
						}
						display_activities(false); // Full rebuild on first load
					} else {
						// Filter out duplicates
						let new_activities = r.message.filter(function(activity) {
							return !activities.find(function(a) {
								return a.name === activity.name;
							});
						});
						
						// Only update if there are new activities
						if (new_activities.length > 0) {
							// Add new activities to the beginning
							activities = new_activities.concat(activities);
							
							// Keep only last 100 (reduced from 200 for better performance)
							activities = activities.slice(0, 100);
							
							// Update last update time
							lastUpdate = new_activities[0].communication_date || new_activities[0].creation;
							
							display_activities(false); // Full rebuild when new activities found
						} else {
							// No new activities, just update stats
							display_activities(true); // Only update stats
						}
					}
				} else if (activities.length === 0) {
					// First load with no results
					display_activities(false);
				}
			},
			error: function(r) {
				console.error('Error loading activities:', r);
				// Update last sync time even on error (shows last attempt)
				lastSyncTime = new Date();
				update_last_sync_display();
				$('#rtal-last-sync').css('color', '#ff4444'); // Red color on error
				setTimeout(function() {
					$('#rtal-last-sync').css('color', '#00ffff'); // Reset to cyan after 2 seconds
				}, 2000);
			}
		});
	}
	
	function display_activities(onlyNew = false) {
		if (activities.length === 0) {
			$('#rtal-stream').html('<div class="rtal-empty">NO ACTIVITIES DETECTED</div>');
			return;
		}
		
		// Update stats
		let creates = activities.filter(a => a.change_type === 'create').length;
		let updates = activities.filter(a => a.change_type === 'update').length;
		let comments = activities.filter(a => a.change_type === 'comment').length;
		
		$('#stat-total').text(activities.length);
		$('#stat-creates').text(creates);
		$('#stat-updates').text(updates);
		$('#stat-comments').text(comments);
		
		// Only rebuild HTML if not just updating stats
		if (onlyNew) {
			return;
		}
		
		// Build HTML
		let html = '';
		activities.forEach(function(activity) {
			// Format date as "5 Dec 25" and include time
			let date = '';
			if (activity.communication_date) {
				// Convert to user timezone first
				let date_obj = frappe.datetime.convert_to_user_tz(activity.communication_date, false);
				// Format as "5 Dec 25 HH:mm:ss"
				let date_str = moment(date_obj).format('D MMM YY');
				let time_str = moment(date_obj).format('HH:mm:ss');
				date = date_str + ' ' + time_str;
			} else {
				date = __('Unknown date');
			}
			
			let user = activity.full_name || activity.user || __('Unknown user');
			let doctype = activity.reference_doctype || activity.timeline_doctype || 'Unknown';
			let docname = activity.reference_name || activity.timeline_name || '';
			
			// Determine change type and color class
			let change_type = activity.change_type || 'update';
			let change_class = change_type;
			
			// Format content
			let content = format_activity_content(activity.content || activity.subject || '');
			
			// Create clickable document link if doctype and docname are available
			let docnameHtml = '';
			if (docname && doctype && doctype !== 'Unknown') {
				// Create clickable link using frappe.set_route
				docnameHtml = `<a href="#" onclick="frappe.set_route('Form', '${escape_html(doctype)}', '${escape_html(docname)}'); return false;" style="color: #00ffff; text-decoration: underline; cursor: pointer; font-size: 10px;">${escape_html(docname)}</a>`;
			} else if (docname) {
				// Just show the name if no doctype
				docnameHtml = `<span style="color: #fff; font-size: 10px;">${escape_html(docname)}</span>`;
			}
			
			html += `
				<div class="rtal-activity-item ${change_class}">
					<div class="rtal-activity-header">
						<div style="flex: 1; display: flex; align-items: center; gap: 8px;">
							<span class="rtal-activity-doctype">${escape_html(doctype)}</span>
							${docnameHtml}
							<span class="rtal-activity-user" style="margin: 0; color: #00ff88;">| ${escape_html(user)}</span>
						</div>
						<div class="rtal-activity-time">${date}</div>
					</div>
					<div class="rtal-activity-content">${content}</div>
				</div>
			`;
		});
		
		$('#rtal-stream').html(html);
	}
	
	function format_activity_content(content) {
		if (!content) return '<span style="color: #666;">No details</span>';
		
		// Extract text if it's HTML
		let temp_div = $('<div>').html(content);
		let text_content = temp_div.text();
		
		// If content has multiple lines, format as list
		if (text_content.includes('\n')) {
			let lines = text_content.split('\n').filter(function(line) {
				return line.trim();
			});
			
			if (lines.length > 1) {
				let html = '<ul>';
				lines.forEach(function(line) {
					line = escape_html(line);
					line = line.replace(/→/g, '<span style="color: #00ff00;">→</span>');
					html += '<li>' + line + '</li>';
				});
				html += '</ul>';
				return html;
			}
		}
		
		// Single line
		let escaped = escape_html(text_content);
		escaped = escaped.replace(/→/g, '<span style="color: #00ff00;">→</span>');
		return escaped;
	}
	
	function escape_html(str) {
		if (!str) return '';
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
	
	// Load filters first, then activities
	load_filters();
	
	// Initial load
	setTimeout(function() {
		load_activities();
	}, 500);
	
	// Set up real-time updates every 10 seconds (reduced from 3 for better performance)
	updateInterval = setInterval(function() {
		if (!isPaused) {
			load_activities();
		}
	}, 10000);
	
	// Cleanup function to stop timer and release resources
	function cleanup() {
		if (updateInterval) {
			clearInterval(updateInterval);
			updateInterval = null;
		}
		// Clear any pending API calls if possible
		activities = [];
		lastUpdate = null;
	}
	
	// Clean up on page removal (Frappe page navigation)
	$(wrapper).on('remove', function() {
		cleanup();
	});
	
	// Clean up when page is hidden (tab switch, minimize, etc.)
	$(document).on('visibilitychange', function() {
		if (document.hidden) {
			// Pause updates when page is hidden to save resources
			if (updateInterval && !isPaused) {
				clearInterval(updateInterval);
				updateInterval = null;
			}
		} else {
			// Resume updates when page becomes visible again
			if (!updateInterval && !isPaused) {
				load_activities();
				updateInterval = setInterval(function() {
					if (!isPaused) {
						load_activities();
					}
				}, 10000);
			}
		}
	});
	
	// Clean up on window unload (browser close, refresh, navigation)
	$(window).on('beforeunload', function() {
		cleanup();
	});
	
	// Clean up on pagehide (more reliable than beforeunload in some browsers)
	$(window).on('pagehide', function() {
		cleanup();
	});
}

// Reload content when page is shown
frappe.pages['rtal'].on_page_show = function(wrapper) {
	// Automatically toggle to full width when page is shown
	localStorage.container_fullwidth = "true";
	frappe.ui.toolbar.set_fullwidth_if_enabled();
}
