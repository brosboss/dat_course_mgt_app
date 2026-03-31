// Copyright (c) 2025, !! and contributors
// For license information, please see license.txt

frappe.ui.form.on("Mission", {
	refresh(frm) {
		// Add View Changes button
		if (!frm.is_new() && frm.docname) {
			frm.add_custom_button(__('View Changes'), function() {
				show_document_changes(frm.doctype, frm.docname);
			}, __('Tools'));
		}
		
		// Set minimum date for mission_end_date based on mission_start_date
		setup_mission_date_validation(frm);
	},
	reference: function(frm) {
		update_mission_authority(frm);
	},
	date: function(frm) {
		update_mission_authority(frm);
	},
	validate: function(frm) {
		// Validate mission dates on form validation
		validate_all_mission_dates(frm);
	},
	mission_list: function(frm) {
		// Re-setup date validation when mission list changes
		setup_mission_date_validation(frm);
	}
});

// Validate Mission List dates
frappe.ui.form.on("Mission List", {
	mission_start_date: function(frm, cdt, cdn) {
		validate_mission_date_range(frm, cdt, cdn);
		// Update minimum date for end date field
		update_end_date_minimum(frm, cdt, cdn);
	},
	mission_end_date: function(frm, cdt, cdn) {
		validate_mission_date_range(frm, cdt, cdn);
	}
});

function setup_mission_date_validation(frm) {
	// Set up date validation for all rows in mission_list
	if (frm.fields_dict.mission_list && frm.fields_dict.mission_list.grid) {
		frm.fields_dict.mission_list.grid.wrapper.on('grid-row-render', function(e, row) {
			update_end_date_minimum(frm, row.doctype, row.name);
		});
	}
}

function update_end_date_minimum(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	
	if (row && row.mission_start_date) {
		// If end date is already set and is less than start date, clear it
		if (row.mission_end_date) {
			let start_date = moment(row.mission_start_date);
			let end_date = moment(row.mission_end_date);
			
			if (end_date.isBefore(start_date)) {
				frappe.model.set_value(cdt, cdn, "mission_end_date", "");
				frm.refresh_field("mission_list");
			}
		}
	}
}

function validate_mission_date_range(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	
	if (row.mission_start_date && row.mission_end_date) {
		let start_date = moment(row.mission_start_date);
		let end_date = moment(row.mission_end_date);
		
		if (end_date.isBefore(start_date)) {
			frappe.msgprint({
				title: __("Invalid Date Range"),
				message: __("Mission End Date ({0}) cannot be less than Mission Start Date ({1}). Please select an end date that is on or after the start date.", [
					frappe.datetime.str_to_user(row.mission_end_date),
					frappe.datetime.str_to_user(row.mission_start_date)
				]),
				indicator: "red"
			});
			
			// Clear the end date to force user to select a valid date
			frappe.model.set_value(cdt, cdn, "mission_end_date", "");
			frm.refresh_field("mission_list");
		}
	}
}

function validate_all_mission_dates(frm) {
	if (frm.doc.mission_list) {
		for (let i = 0; i < frm.doc.mission_list.length; i++) {
			let row = frm.doc.mission_list[i];
			if (row.mission_start_date && row.mission_end_date) {
				let start_date = moment(row.mission_start_date);
				let end_date = moment(row.mission_end_date);
				
				if (end_date.isBefore(start_date)) {
					frappe.msgprint({
						title: __("Invalid Date Range"),
						message: __("Row {0}: Mission End Date cannot be less than Mission Start Date. Please correct the dates.", [i + 1]),
						indicator: "red"
					});
					frappe.validated = false;
					return false;
				}
			}
		}
	}
	return true;
}

function update_mission_authority(frm) {
	// Get reference and date values
	let reference = frm.doc.reference;
	let date = frm.doc.date;
	
	// Only update if both fields are provided
	if (reference && date) {
		// Format date as "5 Mar 25" (D MMM YY format)
		let formatted_date = moment(date).format('D MMM YY');
		
		// Construct mission authority: "Reference Dated Date"
		let mission_authority = reference.trim() + " Dated " + formatted_date;
		
		// Update the field
		frm.set_value('mission_authority', mission_authority);
	} else if (!reference && !date) {
		// If both are cleared, clear mission_authority
		frm.set_value('mission_authority', '');
	}
}

// View Changes functionality
function show_document_changes(doctype, docname) {
	frappe.call({
		method: `dat_pm.nacstnew.page.audit_log.audit_log.get_document_changes`,
		args: { doctype: doctype, docname: docname },
		callback: function(r) {
			if (r.message && r.message.length > 0) {
				display_changes_dialog(doctype, docname, r.message);
			} else {
				frappe.msgprint({
					title: __('No Changes Found'),
					message: __('No changes have been tracked for this document.'),
					indicator: 'blue'
				});
			}
		},
		error: function(r) {
			frappe.msgprint({
				title: __('Error'),
				message: __('Error loading changes: {0}', [r.message || 'Unknown error']),
				indicator: 'red'
			});
		}
	});
}

function display_changes_dialog(doctype, docname, versions) {
	let dialog = new frappe.ui.Dialog({
		title: __('Document Changes - {0}: {1}', [doctype, docname]),
		fields: [{ fieldtype: 'HTML', options: '<div id="changes-container" style="max-height: 600px; overflow-y: auto;"></div>' }],
		size: 'extra-large'
	});
	
	let html = '<div style="padding: 10px;">';
	versions.forEach(function(version) {
		let date = version.communication_date ? frappe.datetime.str_to_user(version.communication_date, true) : __('Unknown date');
		let user = version.full_name || version.user || __('Unknown user');
		html += `<div style="border: 1px solid #e0e0e0; border-radius: 4px; padding: 15px; margin-bottom: 15px; background: #fff;">
			<div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
				<div><strong>${frappe.utils.escape_html(version.subject || __('Document changed'))}</strong></div>
				<div style="font-size: 12px; color: #666;">${date} by ${frappe.utils.escape_html(user)}</div>
			</div>
			<div style="color: #555; font-size: 13px;">${format_changes_content(version.content)}</div>
		</div>`;
	});
	html += '</div>';
	dialog.$body.find('#changes-container').html(html);
	dialog.show();
}

function format_changes_content(content) {
	if (!content) return '<span class="text-muted">No details available</span>';
	let temp_div = $('<div>').html(content);
	let text_content = temp_div.text();
	if (text_content.includes('\n')) {
		let lines = text_content.split('\n').filter(function(line) { return line.trim(); });
		if (lines.length > 1) {
			let html = '<ul style="margin: 0; padding-left: 20px;">';
			lines.forEach(function(line) {
				line = frappe.utils.escape_html(line);
				line = line.replace(/→/g, '<span style="color: #007bff; font-weight: bold; margin: 0 5px;">→</span>');
				html += '<li style="margin-bottom: 5px;">' + line + '</li>';
			});
			html += '</ul>';
			return html;
		}
	}
	let escaped = frappe.utils.escape_html(text_content);
	escaped = escaped.replace(/→/g, '<span style="color: #007bff; font-weight: bold; margin: 0 5px;">→</span>');
	return escaped;
}
