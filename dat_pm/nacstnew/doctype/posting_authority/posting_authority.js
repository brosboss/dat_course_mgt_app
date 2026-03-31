// Copyright (c) 2025, !! and contributors
// For license information, please see license.txt

frappe.ui.form.on("Posting Authority", {
	refresh(frm) {
		// Add View Changes button
		if (!frm.is_new() && frm.docname) {
			frm.add_custom_button(__('View Changes'), function() {
				show_document_changes(frm.doctype, frm.docname);
			}, __('Tools'));
		}
		
		load_document_viewer(frm);
		// Restrict posting_document field to PDF only
		setup_pdf_only_restriction(frm);
		// Update posting_document mandatory status based on legacy_record
		update_posting_document_required(frm);
	},
	legacy_record: function(frm) {
		// Update posting_document mandatory status when legacy_record changes
		update_posting_document_required(frm);
	},
	posting_document: function(frm) {
		// Validate PDF on change
		validate_pdf_document(frm);
		load_document_viewer(frm);
	},
	validate: function(frm) {
		// Client-side validation: posting_document is mandatory if legacy_record is not checked
		if (!frm.doc.legacy_record && !frm.doc.posting_document) {
			frappe.msgprint({
				title: __('Missing Required Field'),
				message: __('Posting Document is mandatory when Legacy Record is not checked. Please attach a document.'),
				indicator: 'red'
			});
			frappe.validated = false;
		}
	},
	reference: function(frm) {
		update_posting_authority(frm);
	},
	date: function(frm) {
		update_posting_authority(frm);
	}
});

function setup_pdf_only_restriction(frm) {
	// Get the posting_document field control
	let posting_doc_field = frm.get_field("posting_document");
	if (!posting_doc_field) {
		// Retry after a short delay if field is not ready
		setTimeout(function() {
			setup_pdf_only_restriction(frm);
		}, 100);
		return;
	}
	
	// Override the set_upload_options method to restrict to PDF only
	if (posting_doc_field.set_upload_options) {
		let original_set_upload_options = posting_doc_field.set_upload_options.bind(posting_doc_field);
		posting_doc_field.set_upload_options = function() {
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
		posting_doc_field.set_upload_options();
	}
	
	// Also hook into on_attach_click to ensure restrictions are set
	if (posting_doc_field.on_attach_click) {
		let original_on_attach_click = posting_doc_field.on_attach_click.bind(posting_doc_field);
		posting_doc_field.on_attach_click = function() {
			this.set_upload_options();
			original_on_attach_click();
		};
	}
	
	// Set restrictions on existing file uploader if it exists
	if (posting_doc_field.file_uploader) {
		if (posting_doc_field.file_uploader.restrictions) {
			posting_doc_field.file_uploader.restrictions.allowed_file_types = [".pdf", "application/pdf"];
		}
	}
}

function validate_pdf_document(frm) {
	let posting_document = frm.doc.posting_document;
	
	if (!posting_document) {
		return; // No document attached, validation not needed
	}
	
	// Check if the file is a PDF
	let file_extension = posting_document.split('.').pop().toLowerCase();
	
	if (file_extension !== 'pdf') {
		frappe.msgprint({
			title: __('Invalid File Type'),
			message: __('Only PDF documents are allowed for Posting Document. Please attach a PDF file.'),
			indicator: 'red'
		});
		
		// Clear the field
		frm.set_value('posting_document', '');
		frm.refresh_field('posting_document');
	}
}

function update_posting_authority(frm) {
	// Get reference and date values
	let reference = frm.doc.reference;
	let date = frm.doc.date;
	
	// Only update if both fields are provided
	if (reference && date) {
		// Format date as "5 Mar 25" (D MMM YY format)
		let formatted_date = moment(date).format('D MMM YY');
		
		// Construct posting authority: "Reference Dated Date"
		let posting_authority = reference.trim() + " Dated " + formatted_date;
		
		// Update the field
		frm.set_value('posting_authority', posting_authority);
	} else if (!reference && !date) {
		// If both are cleared, clear posting_authority
		frm.set_value('posting_authority', '');
	}
}

// Prevent duplicate service numbers in Posting Authority Details
frappe.ui.form.on("Posting Authority Details", {
	service_number: function(frm, cdt, cdn) {
		check_duplicate_service_number(frm, cdt, cdn);
	},
	before_posting_authority_details_remove: function(frm, doctype, name) {
		// Prevent deletion if row is used in Unit TOS Record
		console.log("before_posting_authority_details_remove", doctype, name);
		
		// prevent_deletion_if_used(frm, doctype, name);
		
		return prevent_deletion_if_used(frm, doctype, name);
		// frappe.throw("Cannot delete row - used in Unit TOS Record");
	}
});

function check_duplicate_service_number(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	
	if (!row.service_number) {
		return;
	}
	
	// Check if this service number already exists in other rows
	let duplicate_found = false;
	if (frm.doc.posting_authority_details) {
		frm.doc.posting_authority_details.forEach(function(record) {
			// Skip the current row being edited
			if (record.name !== row.name && record.service_number === row.service_number) {
				duplicate_found = true;
			}
		});
	}
	
	if (duplicate_found) {
		frappe.msgprint({
			title: __('Duplicate Service Number'),
			message: __('Service Number "{0}" already exists in another row. Please use a different service number.', [row.service_number]),
			indicator: 'red'
		});
		// Clear the service number field
		frappe.model.set_value(cdt, cdn, "service_number", "");
		frappe.model.set_value(cdt, cdn, "personnel_name", "");
	}
}

function prevent_deletion_if_used(frm, doctype, name) {
	// Get the row being deleted
	let row = frappe.get_doc(doctype, name);
	
	
	
	if (!frm.doc.name || !row.service_number) {
		// Allow deletion if required fields are missing
		return Promise.resolve();
	}
	
	// Check if this row is used in Unit TOS Record
	return frappe.call({
		method: `dat_pm.nacstnew.doctype.posting_authority.posting_authority.check_posting_authority_details_used_in_unit_tos`,
		args: {
			posting_authority:   frm.doc.name,
			service_number: row.service_number,
			personnel_name: row.personnel_name,
			from_unit: row.from_unit,
			to_unit: row.to_unit
		}
	}).then(function(r) {
		

		if (r.message && r.message.used) {
			let error_message = __('Cannot delete Posting Authority Details row for Service Number "<b>{0}</b>".<br><br>', [row.service_number]);
			
			if (r.message.part_2_order) {
				// Create clickable link for Part 2 Order that opens in new tab
				let part_2_order_url = window.location.origin + '/app/part-2-order/' + encodeURIComponent(r.message.part_2_order);
				let part_2_order_link = `<a href="${part_2_order_url}" target="_blank" onclick="window.open('${part_2_order_url}', '_blank'); return false;" style="color: #007bff; text-decoration: underline; font-weight: bold; cursor: pointer;">${r.message.part_2_order}</a>`;
				
				error_message += __('This record is used in Part 2 Order "<b>{0}</b>" in the Unit TOS Record child table.<br><br>', [part_2_order_link]);
				error_message += __('Deleting this record would create an orphaned record in the Part 2 Order.<br><br>');
				error_message += __('<b>To delete this record:</b><br>');
				error_message += __('1. Open Part 2 Order {0}<br>', [part_2_order_link]);
				error_message += __('2. Remove the corresponding row from the Unit TOS Record child table<br>');
				error_message += __('3. Save the Part 2 Order<br>');
				error_message += __('4. Then you can delete this Posting Authority Details row');
			} else {
				error_message += __('This record is used in a Unit TOS Record child table.<br><br>');
				error_message += __('Deleting this record would create an orphaned record.<br><br>');
				error_message += __('<b>To delete this record:</b><br>');
				error_message += __('1. Remove the corresponding row from the Unit TOS Record in the Part 2 Order<br>');
				error_message += __('2. Save the Part 2 Order<br>');
				error_message += __('3. Then you can delete this Posting Authority Details row');
			}
			
			frappe.msgprint({
				title: __('Cannot Delete - Used in Unit TOS Record'),
				message: error_message,
				indicator: 'red'
			});
			
			// Prevent deletion by rejecting the promise
			return Promise.reject(new Error("Cannot delete row - used in Unit TOS Record"));
		}
	});
}

function load_document_viewer(frm) {
	let document_view_field = frm.get_field("document_view");
	if (!document_view_field) {
		return;
	}
	
	let posting_document = frm.doc.posting_document;
	
	if (!posting_document) {
		// No document attached, show empty state
		let empty_html = `
			<div class="document-viewer-empty">
				<i class="fa fa-file-o" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
				<p style="color: #999; font-size: 14px;">No document attached. Please attach a document in the "Posting Document" field.</p>
			</div>
		`;
		document_view_field.df.options = empty_html;
		document_view_field.set_value(empty_html);
		return;
	}
	
	// Get the file URL - handle Frappe file paths
	let file_url = posting_document;
	if (file_url.startsWith('/files/') || file_url.startsWith('/private/files/')) {
		file_url = window.location.origin + file_url;
	} else if (!file_url.startsWith('http')) {
		// If it's just a filename, construct the path
		file_url = window.location.origin + '/files/' + file_url;
	}
	
	// Determine file type
	let file_extension = posting_document.split('.').pop().toLowerCase();
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
			
			.float-toggle-btn {
				position: fixed;
				bottom: 30px;
				right: 30px;
				width: 60px;
				height: 60px;
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				border: none;
				border-radius: 50%;
				color: white;
				font-size: 24px;
				cursor: pointer;
				box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
				z-index: 999;
				transition: all 0.3s ease;
				display: flex;
				align-items: center;
				justify-content: center;
			}
			
			.float-toggle-btn:hover {
				transform: scale(1.1);
				box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
			}
			
			.float-toggle-btn.floating {
				background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
			}
			
			.document-viewer-container.floating ~ .float-toggle-btn {
				display: none;
			}
		</style>
		<div class="document-viewer-container" id="document-viewer-${frm.doc.name || 'new'}">
			<div class="document-viewer-header">
				<div class="document-viewer-title">
					<i class="fa fa-file-text-o"></i>
					<span>Posting Document Viewer</span>
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
					`<img src="${file_url}" class="document-viewer-image" alt="Posting Document" />` :
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
	
	// Add global function for float toggle (scoped to avoid conflicts)
	let docName = frm.doc.name || 'new';
	let functionName = 'toggleFloatViewer_' + docName;
	
	window[functionName] = function() {
		let container = document.getElementById('document-viewer-' + docName);
		let floatBtn = document.getElementById('float-btn-' + docName);
		
		if (!container) return;
		
		if (container.classList.contains('floating')) {
			// Remove floating mode - return to normal position
			container.classList.remove('floating');
			if (floatBtn) {
				let textSpan = floatBtn.querySelector('.float-btn-text');
				if (textSpan) textSpan.textContent = 'Float';
				floatBtn.classList.remove('floating');
			}
		} else {
			// Add floating mode - float at top right
			container.classList.add('floating');
			if (floatBtn) {
				let textSpan = floatBtn.querySelector('.float-btn-text');
				if (textSpan) textSpan.textContent = 'Unfloat';
				floatBtn.classList.add('floating');
			}
		}
	};
	
	// Update the onclick handler to use the scoped function
	setTimeout(function() {
		let floatBtn = document.getElementById('float-btn-' + docName);
		if (floatBtn) {
			floatBtn.onclick = window[functionName];
		}
	}, 100);
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

function update_posting_document_required(frm) {
	// Get the posting_document field
	let posting_doc_field = frm.get_field("posting_document");
	if (!posting_doc_field) {
		return;
	}
	
	// Make posting_document mandatory if legacy_record is not checked
	if (!frm.doc.legacy_record) {
		posting_doc_field.df.reqd = 1;
		frm.toggle_reqd("posting_document", true);
	} else {
		posting_doc_field.df.reqd = 0;
		frm.toggle_reqd("posting_document", false);
	}
	
	// Refresh the field to update the UI
	frm.refresh_field("posting_document");
}