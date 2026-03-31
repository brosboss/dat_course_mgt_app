// Copyright (c) 2025, !! and contributors
// For license information, please see license.txt

frappe.ui.form.on("Promotion", {
	refresh(frm) {
		// Add View Changes button
		if (!frm.is_new() && frm.docname) {
			frm.add_custom_button(__('View Changes'), function() {
				show_document_changes(frm.doctype, frm.docname);
			}, __('Tools'));
		}
		
		// Load document viewer
		load_document_viewer(frm);
		// Restrict attach field to PDF only
		setup_pdf_only_restriction(frm);
		// Update attach mandatory status based on legacy_record
		update_attach_required(frm);
	},
	legacy_record: function(frm) {
		// Update attach mandatory status when legacy_record changes
		update_attach_required(frm);
	},
	attach: function(frm) {
		// Validate PDF on change
		validate_pdf_document(frm, 'attach');
		load_document_viewer(frm);
	},
	validate: function(frm) {
		// Client-side validation: attach is mandatory if legacy_record is not checked
		if (!frm.doc.legacy_record && !frm.doc.attach) {
			frappe.msgprint({
				title: __('Missing Required Field'),
				message: __('Attach is mandatory when Legacy Record is not checked. Please attach a document.'),
				indicator: 'red'
			});
			frappe.validated = false;
		}
	},
	reference: function(frm) {
		update_promotion_authority(frm);
	},
	date: function(frm) {
		update_promotion_authority(frm);
	}
});

function load_document_viewer(frm) {
	let document_view_field = frm.get_field("document_view");
	if (!document_view_field) {
		return;
	}
	
	let attach_document = frm.doc.attach;
	
	if (!attach_document) {
		// No document attached, show empty state
		let empty_html = `
			<div class="document-viewer-empty">
				<i class="fa fa-file-o" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
				<p style="color: #999; font-size: 14px;">No document attached. Please attach a document in the "Attach" field.</p>
			</div>
		`;
		document_view_field.df.options = empty_html;
		document_view_field.set_value(empty_html);
		return;
	}
	
	// Get the file URL - handle Frappe file paths
	let file_url = attach_document;
	if (file_url.startsWith('/files/') || file_url.startsWith('/private/files/')) {
		file_url = window.location.origin + file_url;
	} else if (!file_url.startsWith('http')) {
		// If it's just a filename, construct the path
		file_url = window.location.origin + '/files/' + file_url;
	}
	
	// Determine file type
	let file_extension = attach_document.split('.').pop().toLowerCase();
	let is_image = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(file_extension);
	let is_pdf = file_extension === 'pdf';
	
	// Create document viewer HTML with floating button
	let viewer_html = `
		<style>
			.document-viewer-container {
				position: relative;
				width: 100%;
				min-height: 400px;
				border: 1px solid #e0e0e0;
				border-radius: 8px;
				background: #f8f9fa;
				overflow: hidden;
			}
			
			.document-viewer-container.floating {
				position: fixed;
				top: 60px;
				right: 20px;
				width: 500px;
				max-width: 40vw;
				height: calc(100vh - 100px);
				z-index: 1000;
				box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
				border-radius: 12px;
			}
			
			.document-viewer-header {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				color: white;
				padding: 12px 15px;
				display: flex;
				justify-content: space-between;
				align-items: center;
				border-radius: 8px 8px 0 0;
			}
			
			.document-viewer-container.floating .document-viewer-header {
				border-radius: 12px 12px 0 0;
			}
			
			.document-viewer-title {
				font-weight: 600;
				font-size: 14px;
				display: flex;
				align-items: center;
				gap: 8px;
			}
			
			.document-viewer-actions {
				display: flex;
				gap: 8px;
			}
			
			.document-viewer-btn {
				background: rgba(255, 255, 255, 0.2);
				border: 1px solid rgba(255, 255, 255, 0.3);
				color: white;
				padding: 6px 12px;
				border-radius: 6px;
				cursor: pointer;
				font-size: 12px;
				font-weight: 500;
				transition: all 0.2s ease;
				display: flex;
				align-items: center;
				gap: 6px;
			}
			
			.document-viewer-btn:hover {
				background: rgba(255, 255, 255, 0.3);
				transform: translateY(-1px);
			}
			
			.document-viewer-content {
				width: 100%;
				height: calc(100% - 50px);
				overflow: auto;
				background: white;
			}
			
			.document-viewer-container.floating .document-viewer-content {
				height: calc(100vh - 150px);
			}
			
			.document-viewer-iframe,
			.document-viewer-image {
				width: 100%;
				height: 100%;
				border: none;
				display: block;
			}
			
			.document-viewer-image {
				object-fit: contain;
				background: #f5f5f5;
			}
			
			.document-viewer-empty {
				text-align: center;
				padding: 60px 20px;
				color: #999;
			}
		</style>
		<div class="document-viewer-container" id="document-viewer-${frm.doc.name || 'new'}">
			<div class="document-viewer-header">
				<div class="document-viewer-title">
					<i class="fa fa-file-text-o"></i>
					<span>Document Viewer</span>
				</div>
				<div class="document-viewer-actions">
					<button class="document-viewer-btn" id="float-btn-${frm.doc.name || 'new'}">
						<i class="fa fa-arrows-alt"></i>
						<span class="float-btn-text">Float</span>
					</button>
					<a href="${file_url}" target="_blank" class="document-viewer-btn" style="text-decoration: none;">
						<i class="fa fa-external-link"></i>
						<span>Open</span>
					</a>
				</div>
			</div>
			<div class="document-viewer-content">
				${is_image ? 
					`<img src="${file_url}" class="document-viewer-image" alt="Document" />` :
					is_pdf ?
					`<iframe src="${file_url}" class="document-viewer-iframe" frameborder="0"></iframe>` :
					`<iframe src="${file_url}" class="document-viewer-iframe" frameborder="0"></iframe>`
				}
			</div>
		</div>
	`;
	
	// Set the HTML content
	document_view_field.df.options = viewer_html;
	document_view_field.set_value(viewer_html);
	
	// Add scoped function for float toggle
	let docName = frm.doc.name || 'new';
	let functionName = 'toggleFloatViewer_prom_' + docName;
	
	window[functionName] = function() {
		let container = document.getElementById('document-viewer-' + docName);
		let floatBtn = document.getElementById('float-btn-' + docName);
		
		if (!container) return;
		
		if (container.classList.contains('floating')) {
			// Remove floating mode
			container.classList.remove('floating');
			if (floatBtn) {
				let textSpan = floatBtn.querySelector('.float-btn-text');
				if (textSpan) textSpan.textContent = 'Float';
				floatBtn.classList.remove('floating');
			}
		} else {
			// Add floating mode
			container.classList.add('floating');
			if (floatBtn) {
				let textSpan = floatBtn.querySelector('.float-btn-text');
				if (textSpan) textSpan.textContent = 'Unfloat';
				floatBtn.classList.add('floating');
			}
		}
	};
	
	// Update the onclick handler
	setTimeout(function() {
		let floatBtn = document.getElementById('float-btn-' + docName);
		if (floatBtn) {
			floatBtn.onclick = window[functionName];
		}
	}, 100);
}

function setup_pdf_only_restriction(frm) {
	// Get the attach field control
	let attach_field = frm.get_field("attach");
	if (!attach_field) {
		// Retry after a short delay if field is not ready
		setTimeout(function() {
			setup_pdf_only_restriction(frm);
		}, 100);
		return;
	}
	
	// Override the set_upload_options method to restrict to PDF only
	if (attach_field.set_upload_options) {
		let original_set_upload_options = attach_field.set_upload_options.bind(attach_field);
		attach_field.set_upload_options = function() {
			original_set_upload_options();
			// Force PDF only restriction
			if (this.upload_options) {
				if (!this.upload_options.restrictions) {
					this.upload_options.restrictions = {};
				}
				this.upload_options.restrictions.allowed_file_types = [".pdf", "application/pdf"];
			}
		};
		// Call it immediately to set restrictions
		attach_field.set_upload_options();
	}
	
	// Also hook into on_attach_click to ensure restrictions are set
	if (attach_field.on_attach_click) {
		let original_on_attach_click = attach_field.on_attach_click.bind(attach_field);
		attach_field.on_attach_click = function() {
			this.set_upload_options();
			original_on_attach_click();
		};
	}
}

function validate_pdf_document(frm, fieldname) {
	let document = frm.doc[fieldname];
	
	if (!document) {
		return; // No document attached, validation not needed
	}
	
	// Check if the file is a PDF
	let file_extension = document.split('.').pop().toLowerCase();
	
	if (file_extension !== 'pdf') {
		frappe.msgprint({
			title: __('Invalid File Type'),
			message: __('Only PDF documents are allowed. Please attach a PDF file.'),
			indicator: 'red'
		});
		
		// Clear the field
		frm.set_value(fieldname, '');
		frm.refresh_field(fieldname);
	}
}

function update_promotion_authority(frm) {
	// Get reference and date values
	let reference = frm.doc.reference;
	let date = frm.doc.date;
	
	// Only update if both fields are provided
	if (reference && date) {
		// Format date as "5 Mar 25" (D MMM YY format)
		let formatted_date = moment(date).format('D MMM YY');
		
		// Construct promotion authority: "Reference Dated Date"
		let promotion_authority = reference.trim() + " Dated " + formatted_date;
		
		// Update the field
		frm.set_value('promotion_authority', promotion_authority);
	} else if (!reference && !date) {
		// If both are cleared, clear promotion_authority
		frm.set_value('promotion_authority', '');
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

function update_attach_required(frm) {
	// Get the attach field
	let attach_field = frm.get_field("attach");
	if (!attach_field) {
		return;
	}
	
	// Make attach mandatory if legacy_record is not checked
	if (!frm.doc.legacy_record) {
		attach_field.df.reqd = 1;
		frm.toggle_reqd("attach", true);
	} else {
		attach_field.df.reqd = 0;
		frm.toggle_reqd("attach", false);
	}
	
	// Refresh the field to update the UI
	frm.refresh_field("attach");
}
