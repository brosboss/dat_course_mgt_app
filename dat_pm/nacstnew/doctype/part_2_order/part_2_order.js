// Copyright (c) 2025, !! and contributors
// For license information, please see license.txt

frappe.ui.form.on("Part 2 Order", {
	refresh(frm) {
		// Add custom CSS for error row highlighting
		if (!document.getElementById('part-2-order-error-style')) {
			let style = document.createElement('style');
			style.id = 'part-2-order-error-style';
			style.textContent = `
				.data-row.error-row,
				.data-row.error-row *,
				.data-row.error-row .form-control,
				.data-row.error-row .static-area,
				.data-row.error-row .link-btn,
				.data-row.error-row .control-value,
				.data-row.error-row input,
				.data-row.error-row select,
				.data-row.error-row span,
				.data-row.error-row div {
					font-weight: bold !important;
					color: #d32f2f !important;
				}
				.field-error-highlight {
					background-color: #ffebee !important;
					border: 2px solid #d32f2f !important;
					color: #d32f2f !important;
					font-weight: bold !important;
				}
				.field-error-highlight input,
				.field-error-highlight .control-value,
				.field-error-highlight .link-btn,
				.field-error-highlight .static-area {
					color: #d32f2f !important;
					font-weight: bold !important;
				}
			`;
			document.head.appendChild(style);
		}
		
		// Load document viewer
		load_document_viewer(frm);
		// Restrict attach field to PDF only
		setup_pdf_only_restriction(frm);
		// Update attach mandatory status based on legacy_record
		update_attach_required(frm);
		
		// Validate all Unit TOS Record rows on refresh
		if (frm.doc.unit_tos_record && frm.doc.unit_tos_record.length > 0) {
			validate_all_rows(frm);
		}
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
		update_part_2_order_reference(frm);
	},
	date: function(frm) {
		update_part_2_order_reference(frm);
	}
});

function update_part_2_order_reference(frm) {
	// Get reference and date values
	let reference = frm.doc.reference;
	let date = frm.doc.date;
	
	// Only update if both fields are provided
	if (reference && date) {
		// Format date as "5 Mar 25" (D MMM YY format)
		let formatted_date = moment(date).format('D MMM YY');
		
		// Construct part 2 order reference: "Reference Dated Date"
		// Handle case where reference might be a date string - convert to string if needed
		let reference_str = typeof reference === 'string' ? reference : (reference ? String(reference) : '');
		let part_2_order_reference = reference_str.trim() + " Dated " + formatted_date;
		
		// Update the field
		frm.set_value('part_2_order_reference', part_2_order_reference);
	} else if (!reference && !date) {
		// If both are cleared, clear part_2_order_reference
		frm.set_value('part_2_order_reference', '');
	}
}

// Auto-fill From Unit and To Unit from Posting Authority Details
frappe.ui.form.on("Unit TOS Record", {
	posting_authority: function(frm, cdt, cdn) {
		// Remove highlight when posting authority changes
		remove_highlight(frm, cdt, cdn);
		// Check for duplicate across Part 2 Orders
		check_duplicate_across_part2_orders(frm, cdt, cdn);
		auto_fill_units(frm, cdt, cdn);
	},
	service_number: function(frm, cdt, cdn) {
		// Remove highlight when service number changes
		remove_highlight(frm, cdt, cdn);
		// Check for duplicate service numbers within this document first
		if (!check_duplicate_service_number(frm, cdt, cdn)) {
			// Check for duplicate across Part 2 Orders
			check_duplicate_across_part2_orders(frm, cdt, cdn);
			// Only auto-fill units if no duplicate found
			auto_fill_units(frm, cdt, cdn);
		}
	}
});

function check_duplicate_service_number(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	
	if (!row.service_number) {
		return false;
	}
	
	// Check if this service number already exists in other rows
	let duplicate_found = false;
	if (frm.doc.unit_tos_record) {
		frm.doc.unit_tos_record.forEach(function(record) {
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
		return true; // Return true to indicate duplicate was found
	}
	
	return false; // No duplicate found
}

function check_duplicate_across_part2_orders(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	
	// Only check if both posting_authority and service_number are provided
	if (!row.posting_authority || !row.service_number) {
		return;
	}
	
	// Call server method to check for duplicates across Part 2 Orders
	frappe.call({
		method: `dat_pm.nacstnew.doctype.part_2_order.part_2_order.check_duplicate_posting_authority_service_number`,
		args: {
			posting_authority: row.posting_authority,
			service_number: row.service_number,
			current_part_2_order: frm.doc.name || null,
			current_row_name: row.name || null
		},
		callback: function(r) {
			if (r.message && r.message.duplicate_found) {
				// Highlight the row
				highlight_row(frm, cdt, cdn);
				
				// Show warning message
				let error_message = __('<p><b>Duplicate Entry Detected!</b></p>');
				error_message += __('<p>The combination of Posting Authority "<b>{0}</b>" and Service Number "<b>{1}</b>" already exists in another Part 2 Order.</p>', [
					row.posting_authority,
					row.service_number
				]);
				
				if (r.message.existing_part_2_orders && r.message.existing_part_2_orders.length > 0) {
					error_message += __('<p><b>Found in the following Part 2 Order(s):</b></p><ul>');
					r.message.existing_part_2_orders.forEach(function(order_name) {
						let part_2_order_url = window.location.origin + '/app/part-2-order/' + encodeURIComponent(order_name);
						let part_2_order_link = `<a href="${part_2_order_url}" target="_blank" onclick="window.open('${part_2_order_url}', '_blank'); return false;" style="color: #007bff; text-decoration: underline; font-weight: bold; cursor: pointer;">${order_name}</a>`;
						error_message += __('<li>{0}</li>', [part_2_order_link]);
					});
					error_message += '</ul>';
				}
				
				error_message += __('<p><b>To resolve:</b></p>');
				error_message += __('<ul><li>Remove this row if it was entered by mistake</li>');
				error_message += __('<li>Or verify that this is a different entry and update the Posting Authority or Service Number</li></ul>');
				
				frappe.msgprint({
					title: __('Duplicate Entry Warning'),
					message: error_message,
					indicator: 'orange'
				});
			} else {
				// No duplicate found, remove highlight if it was set
				remove_highlight(frm, cdt, cdn);
			}
		}
	});
}

function auto_fill_units(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	
	// Check if both posting_authority and service_number are filled
	if (row.posting_authority && row.service_number) {
		// Load the Posting Authority document which includes its child table
		frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "Posting Authority",
				name: row.posting_authority
			},
			callback: function(r) {
				if (r.message && r.message.posting_authority_details) {
					// Find the matching record in the child table
					let matching_record = r.message.posting_authority_details.find(
						function(detail) {
							return detail.service_number === row.service_number;
						}
					);
					
					if (!matching_record) {
						// Service number not found in Posting Authority Details
						// Highlight the affected row
						highlight_row(frm, cdt, cdn);
						
						frappe.msgprint({
							title: __('Data Integrity Warning'),
							message: __('<p>Service Number <b>"{0}"</b> does not exist in Posting Authority <b>"{1}"</b>.</p><p>This validation ensures data integrity by verifying that the service number exists in the corresponding Posting Authority before proceeding. Please verify the service number or add it to the Posting Authority Details.</p>', [
								row.service_number,
								row.posting_authority
							]),
							indicator: 'orange'
						});
						
						// Clear the auto-filled fields if they were set
						frappe.model.set_value(cdt, cdn, "from_unit", "");
						frappe.model.set_value(cdt, cdn, "to_unit", "");
						return;
					}
					
					if (matching_record.from_unit && matching_record.to_unit) {
						// Auto-fill the from_unit and to_unit fields
						frappe.model.set_value(cdt, cdn, "from_unit", matching_record.from_unit);
						frappe.model.set_value(cdt, cdn, "to_unit", matching_record.to_unit);
						// Remove highlight if it was set
						remove_highlight(frm, cdt, cdn);
					} else {
						// Service number exists but units are not set
						// Highlight the affected row
						highlight_row(frm, cdt, cdn);
						
						frappe.msgprint({
							title: __('Data Integrity Warning'),
							message: __('<p>Service Number <b>"{0}"</b> exists in Posting Authority <b>"{1}"</b> but From Unit or To Unit is not set.</p><p>This validation ensures data integrity. Please update the Posting Authority Details with the required unit information.</p>', [
								row.service_number,
								row.posting_authority
							]),
							indicator: 'orange'
						});
					}
				} else {
					// No posting authority details found
					// Highlight the affected row
					highlight_row(frm, cdt, cdn);
					
					frappe.msgprint({
						title: __('Data Integrity Warning'),
						message: __('<p>No Posting Authority Details found for Posting Authority <b>"{0}"</b>.</p><p>This validation ensures data integrity. Please add Posting Authority Details to the selected Posting Authority before proceeding.</p>', [
							row.posting_authority
						]),
						indicator: 'orange'
					});
				}
			}
		});
	}
}

function highlight_row(frm, cdt, cdn) {
	// Get the grid field
	let grid_field = frm.get_field("unit_tos_record");
	if (grid_field && grid_field.grid) {
		// Find the row in the grid
		let grid_row = grid_field.grid.grid_rows_by_docname[cdn];
		if (grid_row) {
			// Add highlight class and error-row class for styling
			let $data_row = grid_row.wrapper.find(".data-row");
			$data_row.addClass("highlight error-row");
			
			// Scroll to the row if it's not visible
			setTimeout(() => {
				if ($data_row.length) {
					$data_row[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				}
			}, 100);
		}
	}
}

function remove_highlight(frm, cdt, cdn) {
	// Get the grid field
	let grid_field = frm.get_field("unit_tos_record");
	if (grid_field && grid_field.grid) {
		// Find the row in the grid
		let grid_row = grid_field.grid.grid_rows_by_docname[cdn];
		if (grid_row) {
			// Remove highlight and error-row classes
			let $data_row = grid_row.wrapper.find(".data-row");
			$data_row.removeClass("highlight error-row");
			// Remove field-specific highlights
			remove_field_highlights(frm, cdt, cdn);
		}
	}
}

function validate_all_rows(frm) {
	// Clear all existing highlights first
	clear_all_highlights(frm);
	
	if (!frm.doc.unit_tos_record || frm.doc.unit_tos_record.length === 0) {
		return;
	}
	
	// Prepare data for validation
	let rows_to_validate = frm.doc.unit_tos_record.map(function(row) {
		return {
			name: row.name,
			idx: row.idx,
			posting_authority: row.posting_authority,
			service_number: row.service_number,
			personnel_name: row.personnel_name,
			from_unit: row.from_unit,
			to_unit: row.to_unit
		};
	});
	
	// Call server method to validate
	frappe.call({
		method: `dat_pm.nacstnew.doctype.part_2_order.part_2_order.validate_unit_tos_records`,
		args: {
			unit_tos_records: rows_to_validate
		},
		callback: function(r) {
			if (r.message && r.message.length > 0) {
				// Highlight mismatched rows and fields
				r.message.forEach(function(validation_result) {
					highlight_mismatched_fields(frm, validation_result);
				});
				
				// Show notification to user
				let error_count = r.message.length;
				let error_message = error_count === 1 
					? __('<p><b>1 row</b> has data integrity issues.</p>')
					: __('<p><b>{0} rows</b> have data integrity issues.</p>', [error_count]);
				
				error_message += __('<p>Please review the highlighted rows and ensure data integrity by:</p>');
				error_message += __('<ul><li>Removing affected rows with incorrect values</li>');
				error_message += __('<li>Entering the correct values from Posting Authority Details</li></ul>');
				
				frappe.msgprint({
					title: __('Data Integrity Validation'),
					message: error_message,
					indicator: 'red'
				});
			}
		}
	});
}

function highlight_mismatched_fields(frm, validation_result) {
	let cdn = validation_result.row_name;
	let mismatches = validation_result.mismatches;
	
	// Get the grid field
	let grid_field = frm.get_field("unit_tos_record");
	if (!grid_field || !grid_field.grid) {
		return;
	}
	
	// Find the row in the grid
	let grid_row = grid_field.grid.grid_rows_by_docname[cdn];
	if (!grid_row) {
		return;
	}
	
	// Highlight the entire row
	let $data_row = grid_row.wrapper.find(".data-row");
	$data_row.addClass("error-row");
	
	// Highlight specific fields that don't match
	let fields_to_check = ["service_number", "personnel_name", "from_unit", "to_unit"];
	
	fields_to_check.forEach(function(fieldname) {
		if (mismatches[fieldname]) {
			// Find the field control in the grid row
			let field_control = grid_row.wrapper.find(`[data-fieldname="${fieldname}"]`);
			if (field_control && field_control.length) {
				// Add error highlight class
				field_control.addClass("field-error-highlight");
				
				// Also highlight the input/control inside
				field_control.find("input, .control-value, .link-btn, .static-area, .form-control")
					.addClass("field-error-highlight");
			}
		}
	});
	
	// Scroll to the first error row
	setTimeout(() => {
		if ($data_row.length) {
			$data_row[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}, 100);
}

function remove_field_highlights(frm, cdt, cdn) {
	let grid_field = frm.get_field("unit_tos_record");
	if (grid_field && grid_field.grid) {
		let grid_row = grid_field.grid.grid_rows_by_docname[cdn];
		if (grid_row) {
			// Remove field-specific highlights
			grid_row.wrapper.find(".field-error-highlight").removeClass("field-error-highlight");
		}
	}
}

function clear_all_highlights(frm) {
	let grid_field = frm.get_field("unit_tos_record");
	if (grid_field && grid_field.grid) {
		// Remove all error highlights from all rows
		grid_field.grid.wrapper.find(".error-row").removeClass("error-row");
		grid_field.grid.wrapper.find(".field-error-highlight").removeClass("field-error-highlight");
	}
}

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
	let functionName = 'toggleFloatViewer_p2o_' + docName;
	
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
