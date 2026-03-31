frappe.pages['audit-log'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __('Audit Log'),
		single_column: true
	});

	// Store page reference
	wrapper.page = page;
	
	// Helper function to escape HTML
	function escape_html(str) {
		if (!str) return '';
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
	
	// Create filter section
	let filter_section = $(`
		<div class="filter-section" style="padding: 20px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0;">
			<div class="row">
				<div class="col-sm-6">
					<div class="form-group">
						<label for="doctype-filter">${__('DocType')}</label>
						<input type="text" id="doctype-filter" class="form-control" 
							placeholder="${__('Enter DocType name (e.g., Personnel, Promotion)')}">
					</div>
				</div>
				<div class="col-sm-6" style="padding-top: 25px;">
					<button class="btn btn-primary btn-sm" id="load-activities-btn">
						${__('Load Activities')}
					</button>
					<button class="btn btn-secondary btn-sm" id="clear-filter-btn" style="margin-left: 10px;">
						${__('Clear')}
					</button>
				</div>
			</div>
		</div>
	`).appendTo(page.body);

	// Create activities container
	let activities_container = $(`
		<div class="activities-container" style="padding: 20px;">
			<div id="activities-list"></div>
			<div id="no-activities" class="text-muted text-center" style="padding: 40px; display: none;">
				${__('No activities found. Enter a DocType and click Load Activities.')}
			</div>
		</div>
	`).appendTo(page.body);

	// Load activities function
	function load_activities() {
		let doctype = $('#doctype-filter').val().trim();
		
		if (!doctype) {
			frappe.show_alert({
				message: __('Please enter a DocType'),
				indicator: 'orange'
			});
			return;
		}

		// Show loading
		$('#activities-list').html(`
			<div class="text-center" style="padding: 40px;">
				<div class="spinner-border text-primary" role="status">
					<span class="sr-only">${__('Loading...')}</span>
				</div>
			</div>
		`);
		$('#no-activities').hide();

		frappe.call({
			method: `dat_pm.nacstnew.page.audit_log.audit_log.get_activities_by_doctype`,
			args: {
				doctype: doctype,
				limit: 100
			},
			callback: function(r) {
				if (r.message && r.message.length > 0) {
					display_activities(r.message, doctype);
				} else {
					$('#activities-list').html('');
				$('#no-activities').html(
					`<div>${__('No activities found for DocType')} <strong>${escape_html(doctype)}</strong></div>`
				).show();
				}
			},
			error: function(r) {
				frappe.show_alert({
					message: __('Error loading activities'),
					indicator: 'red'
				});
				$('#activities-list').html('');
				$('#no-activities').show();
			}
		});
	}

	// Display activities
	function display_activities(activities, doctype) {
		if (!activities || activities.length === 0) {
			$('#activities-list').html('');
			$('#no-activities').show();
			return;
		}

		$('#no-activities').hide();
		
		let html = `
			<div style="margin-bottom: 20px;">
				<h5>${__('Activities for')} <strong>${escape_html(doctype)}</strong> (${activities.length})</h5>
			</div>
			<div style="overflow-x: auto;">
				<table class="table table-bordered table-hover" style="margin-bottom: 0;">
					<thead style="background-color: #f8f9fa;">
						<tr>
							<th style="width: 150px; padding: 8px;">${__('Date & Time')}</th>
							<th style="width: 120px; padding: 8px;">${__('User')}</th>
							<th style="width: 150px; padding: 8px;">${__('Document')}</th>
							<th style="padding: 8px;">${__('Activity / Changes')}</th>
							<th style="width: 100px; padding: 8px;">${__('Status')}</th>
						</tr>
					</thead>
					<tbody>
		`;

		activities.forEach(function(activity) {
			let date = activity.communication_date ? 
				frappe.datetime.str_to_user(activity.communication_date, true) : 
				__('Unknown date');
			
			let user = activity.full_name || activity.user || __('Unknown user');
			
			// Format document reference
			let document_ref = '';
			if (activity.reference_name && activity.reference_doctype) {
				let route = frappe.router.slug(activity.reference_doctype);
				document_ref = `<a href="/app/${route}/${encodeURIComponent(activity.reference_name)}" 
					class="text-primary" title="${escape_html(activity.reference_name)}">
					${escape_html(activity.reference_name)}
				</a>`;
			} else {
				document_ref = '<span class="text-muted">-</span>';
			}

			// Format content - make it compact, single line
			let content = activity.content || '';
			let subject = activity.subject || __('Activity');
			
			if (content) {
				// Extract text if it's HTML
				let temp_div = $('<div>').html(content);
				let text_content = temp_div.text();
				
				// If content has multiple lines, join with semicolon for compact display
				if (text_content.includes('\n')) {
					let lines = text_content.split('\n').filter(function(line) {
						return line.trim();
					});
					content = lines.join('; ');
				} else {
					content = text_content;
				}
				
				// Highlight arrows
				content = escape_html(content).replace(/→/g, '<span style="color: #007bff; font-weight: bold;">→</span>');
				
				// Combine subject and content
				if (content && content.trim()) {
					subject = escape_html(subject) + ': ' + content;
				} else {
					subject = escape_html(subject);
				}
			} else {
				subject = escape_html(subject);
			}

			// Format status
			let status = '';
			if (activity.status) {
				let badge_class = 'badge-secondary';
				if (activity.status === 'Success') badge_class = 'badge-success';
				if (activity.status === 'Failed') badge_class = 'badge-danger';
				status = `<span class="badge ${badge_class}">${escape_html(activity.status)}</span>`;
			} else {
				status = '<span class="text-muted">-</span>';
			}

			html += `
				<tr>
					<td style="padding: 8px; font-size: 12px; white-space: nowrap;">${date}</td>
					<td style="padding: 8px; font-size: 12px;">${escape_html(user)}</td>
					<td style="padding: 8px; font-size: 12px;">${document_ref}</td>
					<td style="padding: 8px; font-size: 12px;">${subject}</td>
					<td style="padding: 8px; text-align: center;">${status}</td>
				</tr>
			`;
		});

		html += `
					</tbody>
				</table>
			</div>
		`;
		$('#activities-list').html(html);
	}

	// Bind events
	$('#load-activities-btn').on('click', function() {
		load_activities();
	});

	$('#clear-filter-btn').on('click', function() {
		$('#doctype-filter').val('');
		$('#activities-list').html('');
		$('#no-activities').html(__('No activities found. Enter a DocType and click Load Activities.')).show();
	});

	// Allow Enter key to trigger load
	$('#doctype-filter').on('keypress', function(e) {
		if (e.which === 13) {
			load_activities();
		}
	});

	// Show initial message
	$('#no-activities').show();
}