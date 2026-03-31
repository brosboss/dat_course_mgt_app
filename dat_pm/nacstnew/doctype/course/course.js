// Copyright (c) 2025, !! and contributors
// For license information, please see license.txt

frappe.ui.form.on("Course", {
	refresh(frm) {
		// Add View Changes button
		if (!frm.is_new() && frm.docname) {
			frm.add_custom_button(__('View Changes'), function() {
				show_document_changes(frm.doctype, frm.docname);
			}, __('Tools'));
		}
		
		// Initially hide both date fields if no personnel category is selected
		if (!frm.doc.personnel_category) {
			frm.set_df_property("date_of__commission", "hidden", 1);
			frm.set_df_property("date_of__commission", "reqd", 0);
			frm.set_df_property("date_of_enlistment", "hidden", 1);
			frm.set_df_property("date_of_enlistment", "reqd", 0);
			// Clear values
			if (frm.doc.date_of__commission) {
				frm.set_value("date_of__commission", null);
			}
			if (frm.doc.date_of_enlistment) {
				frm.set_value("date_of_enlistment", null);
			}
		} else {
			// Apply visibility based on current personnel category
			toggle_date_fields(frm);
		}
	},
	
	personnel_category(frm) {
		toggle_date_fields(frm);
	}
});

function toggle_date_fields(frm) {
	if (!frm.doc.personnel_category) {
		// Hide both fields if no category is selected
		frm.set_df_property("date_of__commission", "hidden", 1);
		frm.set_df_property("date_of__commission", "reqd", 0);
		frm.set_df_property("date_of_enlistment", "hidden", 1);
		frm.set_df_property("date_of_enlistment", "reqd", 0);
		// Clear values
		if (frm.doc.date_of__commission) {
			frm.set_value("date_of__commission", null);
		}
		if (frm.doc.date_of_enlistment) {
			frm.set_value("date_of_enlistment", null);
		}
	} else if (frm.doc.personnel_category === "Officer") {
		// Show date of commission (make it mandatory), hide and clear date of enlistment (make it not mandatory)
		frm.set_df_property("date_of__commission", "hidden", 0);
		frm.set_df_property("date_of__commission", "reqd", 1);
		frm.set_df_property("date_of_enlistment", "hidden", 1);
		frm.set_df_property("date_of_enlistment", "reqd", 0);
		// Clear date of enlistment if it has a value
		if (frm.doc.date_of_enlistment) {
			frm.set_value("date_of_enlistment", null);
		}
	} else if (frm.doc.personnel_category === "Soldier") {
		// Show date of enlistment (make it mandatory), hide and clear date of commission (make it not mandatory)
		frm.set_df_property("date_of__commission", "hidden", 1);
		frm.set_df_property("date_of__commission", "reqd", 0);
		frm.set_df_property("date_of_enlistment", "hidden", 0);
		frm.set_df_property("date_of_enlistment", "reqd", 1);
		// Clear date of commission if it has a value
		if (frm.doc.date_of__commission) {
			frm.set_value("date_of__commission", null);
		}
	} else {
		// For any other category, hide both fields (make them not mandatory)
		frm.set_df_property("date_of__commission", "hidden", 1);
		frm.set_df_property("date_of__commission", "reqd", 0);
		frm.set_df_property("date_of_enlistment", "hidden", 1);
		frm.set_df_property("date_of_enlistment", "reqd", 0);
		// Clear values
		if (frm.doc.date_of__commission) {
			frm.set_value("date_of__commission", null);
		}
		if (frm.doc.date_of_enlistment) {
			frm.set_value("date_of_enlistment", null);
		}
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
