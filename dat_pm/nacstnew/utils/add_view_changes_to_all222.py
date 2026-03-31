# Copyright (c) 2024, Nacstnew and contributors
# License: MIT. See LICENSE

"""
Script to add View Changes button to all doctype JS files
Run this via: bench --site [site] execute nacstnew.nacstnew.nacstnew.utils.add_view_changes_to_all.add_view_changes_to_all
"""

import frappe
import os
from frappe.modules import get_module_path, scrub


def add_view_changes_to_all():
	"""Add view_changes code to all doctype JS files"""
	
	# Doctypes that already have the code
	already_done = ["Personnel", "Promotion", "Posting Authority", "Mission", "Course"]
	
	# Get all doctypes in nacstnew module
	doctypes = frappe.get_all(
		"DocType",
		filters={
			"module": "Nacstnew",
			"istable": 0,
			"issingle": 0
		},
		fields=["name"]
	)
	
	# View Changes button code
	button_code = """
		// Add View Changes button
		if (!frm.is_new() && frm.docname) {
			frm.add_custom_button(__('View Changes'), function() {
				show_document_changes(frm.doctype, frm.docname);
			}, __('Tools'));
		}
"""
	
	# Functions code
	functions_code = """

// View Changes functionality
function show_document_changes(doctype, docname) {
	frappe.call({
		method: 'nacstnew.nacstnew.page.audit_log.audit_log.get_document_changes',
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
	if (text_content.includes('\\n')) {
		let lines = text_content.split('\\n').filter(function(line) { return line.trim(); });
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
"""
	
	updated = 0
	skipped = 0
	
	for doctype in doctypes:
		doctype_name = doctype.name
		
		if doctype_name in already_done:
			skipped += 1
			print(f"- {doctype_name} - already has view_changes code")
			continue
		
		try:
			module_path = get_module_path("Nacstnew")
			doctype_path = os.path.join(
				module_path,
				"doctype",
				scrub(doctype_name),
				scrub(doctype_name) + ".js"
			)
			
			if not os.path.exists(doctype_path):
				print(f"✗ {doctype_name} - JS file not found")
				continue
			
			# Read existing file
			with open(doctype_path, 'r') as f:
				existing_code = f.read()
			
			# Check if already has the code
			if "show_document_changes" in existing_code:
				skipped += 1
				print(f"- {doctype_name} - already has view_changes code")
				continue
			
			# Find refresh function and add button code
			modified = False
			lines = existing_code.split('\n')
			new_lines = []
			in_refresh = False
			refresh_indent = 0
			
			for i, line in enumerate(lines):
				new_lines.append(line)
				
				# Look for refresh function
				if 'refresh' in line and ('function' in line or 'refresh(frm)' in line or 'refresh: function' in line):
					in_refresh = True
					refresh_indent = len(line) - len(line.lstrip())
					continue
				
				# If we're in refresh function and find the opening brace
				if in_refresh and '{' in line and not '}' in line:
					# Add button code after opening brace
					indent = ' ' * (refresh_indent + 4)
					new_lines.append(indent + button_code.strip())
					modified = True
					in_refresh = False
					continue
				
				# Check if we've left the refresh function
				if in_refresh and '}' in line:
					# Check if this closes the refresh function
					current_indent = len(line) - len(line.lstrip())
					if current_indent <= refresh_indent:
						in_refresh = False
			
			# If we couldn't find refresh function, try to add it
			if not modified:
				# Look for frappe.ui.form.on pattern
				if 'frappe.ui.form.on' in existing_code:
					# Try to add refresh function
					form_on_pos = existing_code.find('frappe.ui.form.on')
					if form_on_pos != -1:
						# Find the opening brace after the doctype name
						brace_pos = existing_code.find('{', form_on_pos)
						if brace_pos != -1:
							# Insert refresh function
							insert_pos = brace_pos + 1
							indent = '\n\t'
							refresh_func = f"{indent}refresh(frm) {{{button_code}{indent}}}," + indent
							existing_code = existing_code[:insert_pos] + refresh_func + existing_code[insert_pos:]
							modified = True
			
			# Add functions at the end if modified
			if modified:
				existing_code = '\n'.join(new_lines) if modified and 'new_lines' in locals() else existing_code
				existing_code += functions_code
				
				# Write back
				with open(doctype_path, 'w') as f:
					f.write(existing_code)
				
				updated += 1
				print(f"✓ {doctype_name} - view_changes code added")
			else:
				# If no refresh function found, just add functions at the end
				existing_code += functions_code
				with open(doctype_path, 'w') as f:
					f.write(existing_code)
				updated += 1
				print(f"✓ {doctype_name} - functions added (no refresh function found, add button manually)")
				
		except Exception as e:
			print(f"✗ {doctype_name} - Error: {str(e)}")
			frappe.log_error(f"Error adding view_changes to {doctype_name}: {str(e)}")
	
	print(f"\n{'='*50}")
	print(f"Summary:")
	print(f"  - Updated: {updated} doctypes")
	print(f"  - Skipped (already done): {skipped} doctypes")
	print(f"  - Total: {len(doctypes)} doctypes")
	print(f"{'='*50}")
	print(f"\nNote: If a doctype doesn't have a refresh function, you'll need to add the button code manually.")


if __name__ == "__main__":
	add_view_changes_to_all()

