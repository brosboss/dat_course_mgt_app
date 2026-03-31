frappe.pages['personnel_import'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Data Import',
		single_column: true
	});

	// Create main container
	let container = $('<div class="personnel-import-container"></div>').appendTo(page.body);
	
	// Store selected doctype and columns
	let selected_doctype = null;
	let selected_columns = [];
	
	// Doctype selector section
	let doctype_section = $(`
		<div class="doctype-selector-section" style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #d1d8dd;">
			<h4>Select Doctype to Import</h4>
			<div class="doctype-selector" style="margin: 15px 0;">
				<label for="import_doctype" style="display: block; margin-bottom: 5px; font-weight: 500;">
					Doctype:
				</label>
				<select id="import_doctype" class="form-control" style="max-width: 400px;">
					<option value="">-- Select Doctype --</option>
				</select>
				<small class="text-muted" style="display: block; margin-top: 5px;">
					Select the doctype you want to import data into
				</small>
			</div>
		</div>
	`).appendTo(container);
	
	// Instructions section (will be updated dynamically)
	let instructions = $(`
		<div class="import-instructions" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: none;">
			<h4>Import Instructions</h4>
			<div id="instructions_content"></div>
		</div>
	`).appendTo(container);
	
	// Column selection section
	let column_selection_section = $(`
		<div class="column-selection-section" style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #d1d8dd; display: none;">
			<h4>Select Columns for Import</h4>
			<p style="color: #666; margin-bottom: 15px; font-size: 13px;">
				Select the columns you want to include in the import. Mandatory fields are pre-selected and cannot be deselected.
			</p>
			<div style="margin-bottom: 10px;">
				<button class="btn btn-sm btn-default" id="btn_select_all_columns" style="margin-right: 5px;">
					Select All
				</button>
				<button class="btn btn-sm btn-default" id="btn_deselect_all_columns">
					Deselect All
				</button>
			</div>
			<div id="columns_container" style="max-height: 300px; overflow-y: auto; border: 1px solid #d1d8dd; padding: 15px; background: #f8f9fa; border-radius: 4px;">
				<div id="columns_list"></div>
			</div>
			<small class="text-muted" style="display: block; margin-top: 10px;">
				Selected columns: <span id="selected_count">0</span>
			</small>
		</div>
	`).appendTo(container);
	
	// Load doctypes from Import Doctype
	function load_doctypes() {
		frappe.call({
			method: 'frappe.client.get_list',
			args: {
				doctype: 'Import Doctype',
				fields: ['import_doctype'],
				order_by: 'import_doctype asc'
			},
			callback: function(r) {
				if (r.message) {
					let select = $('#import_doctype');
					select.empty();
					select.append('<option value="">-- Select Doctype --</option>');
					r.message.forEach(function(item) {
						select.append('<option value="' + item.import_doctype + '">' + item.import_doctype + '</option>');
					});
				}
			}
		});
	}
	
	// Load doctypes on page load
	load_doctypes();
	
	// Handle doctype selection change
	$('#import_doctype').on('change', function() {
		selected_doctype = $(this).val();
		selected_columns = [];
		if (selected_doctype) {
			update_instructions(selected_doctype);
			load_columns(selected_doctype);
			$('.import-instructions').show();
			$('.column-selection-section').show();
			// Disable file upload and buttons until columns are selected
			$('#import_file').prop('disabled', true);
			$('#btn_download_template_xlsx').prop('disabled', true);
			$('#btn_download_template_csv').prop('disabled', true);
			$('#btn_import').prop('disabled', true);
		} else {
			$('.import-instructions').hide();
			$('.column-selection-section').hide();
			// Disable file upload and buttons
			$('#import_file').prop('disabled', true);
			$('#btn_download_template_xlsx').prop('disabled', true);
			$('#btn_download_template_csv').prop('disabled', true);
			$('#btn_import').prop('disabled', true);
			$('#file_preview_section').hide();
		}
	});
	
	// Update instructions based on selected doctype
	function update_instructions(doctype) {
		frappe.call({
			method: 'frappe.client.get',
			args: {
				doctype: 'DocType',
				name: doctype
			},
			callback: function(r) {
				if (r.message) {
					let meta = r.message;
					// Get mandatory fields
					let mandatory_fields = [];
					if (meta.fields) {
						meta.fields.forEach(function(field) {
							if (field.reqd && field.fieldname !== 'data_import_reference') {
								mandatory_fields.push(field.fieldname);
							}
						});
					}
					
					let instructions_html = '<ul style="margin: 10px 0; padding-left: 20px;">';
					instructions_html += '<li>Upload a CSV or Excel file (.csv, .xlsx, .xls)</li>';
					if (mandatory_fields.length > 0) {
						instructions_html += '<li>File must contain the following mandatory columns:';
						instructions_html += '<ul style="margin-top: 5px;">';
						mandatory_fields.forEach(function(field) {
							instructions_html += '<li><strong>' + field + '</strong></li>';
						});
						instructions_html += '</ul>';
						instructions_html += '</li>';
					}
					instructions_html += '<li>Select the columns you want to import from the column selection section below</li>';
					instructions_html += '<li>If a record with the same unique identifier exists, it will be updated</li>';
					instructions_html += '</ul>';
					
					$('#instructions_content').html(instructions_html);
				}
			}
		});
	}
	
	// Load and display columns for the selected doctype
	function load_columns(doctype) {
		// First, get the allowed fields from Import Doctype
		frappe.call({
			method: 'frappe.client.get_list',
			args: {
				doctype: 'Import Doctype',
				filters: {
					import_doctype: doctype
				},
				fields: ['name']
			},
			callback: function(import_doctype_r) {
				if (!import_doctype_r.message || import_doctype_r.message.length === 0) {
					frappe.msgprint(__('No Import Doctype configuration found for {0}. Please configure it first.', [doctype]));
					return;
				}
				
				let import_doctype_name = import_doctype_r.message[0].name;
				
				// Get the Import Doctype record with child table
				frappe.call({
					method: 'frappe.client.get',
					args: {
						doctype: 'Import Doctype',
						name: import_doctype_name
					},
					callback: function(import_doc_r) {
						if (!import_doc_r.message) {
							frappe.msgprint(__('Error loading Import Doctype configuration'));
							return;
						}
						
						// Get allowed fields from child table
						let allowed_fields = [];
						if (import_doc_r.message.allowed_import_fields) {
							import_doc_r.message.allowed_import_fields.forEach(function(row) {
								if (row.allowed_import_fields) {
									allowed_fields.push(row.allowed_import_fields);
								}
							});
						}
						
						if (allowed_fields.length === 0) {
							frappe.msgprint(__('No allowed import fields configured for {0}. Please configure them in Import Doctype.', [doctype]));
							return;
						}
						
						// Now get the doctype meta to get field details
						frappe.call({
							method: 'frappe.client.get',
							args: {
								doctype: 'DocType',
								name: doctype
							},
							callback: function(r) {
								if (r.message) {
									let meta = r.message;
									let all_fields = [];
									let mandatory_fields = [];
									
									// Create a map of allowed fields for quick lookup
									let allowed_fields_map = {};
									allowed_fields.forEach(function(fieldname) {
										allowed_fields_map[fieldname] = true;
									});
									
									// Get only allowed importable fields
									if (meta.fields) {
										meta.fields.forEach(function(field) {
											// Only include fields that are in the allowed_fields list
											if (field.fieldname && 
												allowed_fields_map[field.fieldname] &&
												field.fieldname !== 'data_import_reference' &&
												!field.fieldname.startsWith('_') &&
												['Data', 'Link', 'Int', 'Float', 'Currency', 'Percent', 'Check', 'Select', 'Date', 'Datetime', 'Time', 'Text', 'Small Text', 'Long Text', 'Code', 'Text Editor', 'Attach', 'Attach Image', 'Barcode', 'Geolocation'].includes(field.fieldtype) &&
												field.fieldtype !== 'Section Break' &&
												field.fieldtype !== 'Column Break' &&
												field.fieldtype !== 'Tab Break' &&
												field.fieldtype !== 'HTML' &&
												field.fieldtype !== 'Button') {
												
												all_fields.push({
													fieldname: field.fieldname,
													label: field.label || field.fieldname,
													reqd: field.reqd || false,
													fieldtype: field.fieldtype
												});
												
												if (field.reqd) {
													mandatory_fields.push(field.fieldname);
												}
											}
										});
									}
					
									// Sort fields: mandatory first, then alphabetically
									all_fields.sort(function(a, b) {
										if (a.reqd && !b.reqd) return -1;
										if (!a.reqd && b.reqd) return 1;
										return a.label.localeCompare(b.label);
									});
									
									// Build column selection UI
									let columns_html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">';
									all_fields.forEach(function(field) {
										let is_mandatory = mandatory_fields.includes(field.fieldname);
										let checked = is_mandatory ? 'checked' : '';
										let disabled = is_mandatory ? 'disabled' : '';
										let mandatory_badge = is_mandatory ? '<span style="color: #d9534f; font-size: 11px; margin-left: 5px;">(Required)</span>' : '';
										
										columns_html += `
											<div style="padding: 8px; background: white; border: 1px solid #d1d8dd; border-radius: 4px;">
												<label style="display: flex; align-items: center; cursor: pointer; margin: 0;">
													<input type="checkbox" class="column-checkbox" 
														data-fieldname="${field.fieldname}" 
														value="${field.fieldname}"
														${checked} 
														${disabled}
														style="margin-right: 8px;">
													<span style="font-size: 13px;">
														<strong>${frappe.utils.escape_html(field.label)}</strong>
														${mandatory_badge}
														<br>
														<small style="color: #666;">${field.fieldname} (${field.fieldtype})</small>
													</span>
												</label>
											</div>
										`;
									});
									columns_html += '</div>';
									
									$('#columns_list').html(columns_html);
									
									// Initialize selected columns with mandatory fields
									selected_columns = mandatory_fields.slice();
									update_selected_count();
									
									// Handle checkbox changes
									$('.column-checkbox').on('change', function() {
										let fieldname = $(this).data('fieldname');
										if ($(this).is(':checked')) {
											if (!selected_columns.includes(fieldname)) {
												selected_columns.push(fieldname);
											}
										} else {
											selected_columns = selected_columns.filter(f => f !== fieldname);
										}
										update_selected_count();
										update_button_states();
									});
									
									// Select All button
									$('#btn_select_all_columns').off('click').on('click', function() {
										$('.column-checkbox').each(function() {
											if (!$(this).prop('disabled')) {
												$(this).prop('checked', true);
												let fieldname = $(this).data('fieldname');
												if (!selected_columns.includes(fieldname)) {
													selected_columns.push(fieldname);
												}
											}
										});
										update_selected_count();
										update_button_states();
									});
									
									// Deselect All button
									$('#btn_deselect_all_columns').off('click').on('click', function() {
										$('.column-checkbox').each(function() {
											if (!$(this).prop('disabled')) {
												$(this).prop('checked', false);
												let fieldname = $(this).data('fieldname');
												selected_columns = selected_columns.filter(f => f !== fieldname);
											}
										});
										update_selected_count();
										update_button_states();
									});
									
									update_button_states();
								}
							}
						});
					}
				});
			}
		});
	
	}
			

	
	// Update selected count display
	function update_selected_count() {
		$('#selected_count').text(selected_columns.length);
	}
	
	// Update button states based on selected columns
	function update_button_states() {
		if (selected_doctype && selected_columns.length > 0) {
			$('#import_file').prop('disabled', false);
			$('#btn_download_template_xlsx').prop('disabled', false);
			$('#btn_download_template_csv').prop('disabled', false);
			$('#btn_import').prop('disabled', false);
		} else {
			$('#import_file').prop('disabled', true);
			$('#btn_download_template_xlsx').prop('disabled', true);
			$('#btn_download_template_csv').prop('disabled', true);
			$('#btn_import').prop('disabled', true);
		}
	}

	// File upload section
	let upload_section = $(`
		<div class="upload-section" style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #d1d8dd;">
			<h4>Upload File</h4>
			<div class="template-download-section" style="margin: 15px 0; padding: 15px; background: #f0f7ff; border-radius: 4px; border: 1px solid #b3d9ff;">
				<p style="margin: 0 0 10px 0; font-weight: 500;">Need a template?</p>
				<p style="margin: 0 0 10px 0; color: #666; font-size: 13px;">
					Download a template file with the correct column headers to get started.
				</p>
				<div class="template-buttons" style="display: flex; gap: 10px;">
					<button class="btn btn-sm btn-default" id="btn_download_template_xlsx" style="margin: 0;" disabled>
						<i class="fa fa-download"></i> Download Excel Template (.xlsx)
					</button>
					<button class="btn btn-sm btn-default" id="btn_download_template_csv" style="margin: 0;" disabled>
						<i class="fa fa-download"></i> Download CSV Template (.csv)
					</button>
				</div>
			</div>
			<div class="file-upload-area" style="margin: 15px 0;">
				<input type="file" id="import_file" accept=".csv,.xlsx,.xls" style="margin-bottom: 10px;" disabled>
			</div>
			<div class="file-preview-section" id="file_preview_section" style="display: none; margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 4px; border: 1px solid #d1d8dd;">
				<h5 style="margin: 0 0 10px 0;">File Preview</h5>
				<div id="file_info" style="margin-bottom: 10px; font-size: 13px; color: #666;"></div>
				<div id="file_preview_table" style="max-height: 300px; overflow: auto; border: 1px solid #d1d8dd; background: white;">
					<table class="table table-bordered table-condensed" style="margin: 0; font-size: 12px;">
						<thead id="preview_headers"></thead>
						<tbody id="preview_rows"></tbody>
					</table>
				</div>
				<small class="text-muted" style="display: block; margin-top: 5px;">
					Showing first 10 rows. Total rows will be processed during import.
				</small>
			</div>
			<div class="import-reference-section" style="margin: 15px 0;">
				<label for="import_reference" style="display: block; margin-bottom: 5px; font-weight: 500;">
					Import Reference (optional - used for rollback):
				</label>
				<input type="text" id="import_reference" class="form-control" 
					placeholder="e.g., IMPORT_2025_01_12" 
					style="max-width: 400px;">
				<small class="text-muted" style="display: block; margin-top: 5px;">
					If not provided, a timestamp-based reference will be generated automatically
				</small>
			</div>
			<button class="btn btn-primary" id="btn_import" style="margin-top: 10px;" disabled>
				<i class="fa fa-upload"></i> Import Data
			</button>
		</div>
	`).appendTo(container);

	// Results section (initially hidden)
	let results_section = $(`
		<div class="results-section" style="display: none; background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #d1d8dd;">
			<h4>Import Results</h4>
			<div id="import_results"></div>
		</div>
	`).appendTo(container);

	// Rollback section
	let rollback_section = $(`
		<div class="rollback-section" style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #d1d8dd;">
			<h4>Rollback Import</h4>
			<p style="color: #666; margin-bottom: 15px;">
				Enter an import reference to rollback all records imported with that reference.
			</p>
			<div class="rollback-input-section" style="margin: 15px 0;">
				<label for="rollback_reference" style="display: block; margin-bottom: 5px; font-weight: 500;">
					Import Reference:
				</label>
				<input type="text" id="rollback_reference" class="form-control" 
					placeholder="Enter import reference" 
					style="max-width: 400px; margin-bottom: 10px;">
				<button class="btn btn-danger" id="btn_rollback" style="margin-top: 5px;">
					<i class="fa fa-undo"></i> Rollback Import
				</button>
			</div>
			<div id="rollback_results" style="margin-top: 15px;"></div>
		</div>
	`).appendTo(container);

	// Template download button handlers
	$('#btn_download_template_xlsx').on('click', function() {
		if (!selected_doctype) {
			frappe.msgprint(__('Please select a doctype first'));
			return;
		}
		if (selected_columns.length === 0) {
			frappe.msgprint(__('Please select at least one column to import'));
			return;
		}
		
		let btn = $(this);
		let original_html = btn.html();
		btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Generating...');
		
		// Create a hidden iframe to handle the download
		let iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		iframe.name = 'download_frame_xlsx';
		document.body.appendChild(iframe);
		
		// Create a form to submit
		let form = document.createElement('form');
		form.method = 'POST';
		form.action = `/api/method/dat_pm.nacstnew.doctype.personnel.personnel.download_personnel_import_template`;
		form.target = 'download_frame_xlsx';
		
		// Add doctype parameter
		let doctypeInput = document.createElement('input');
		doctypeInput.type = 'hidden';
		doctypeInput.name = 'doctype';
		doctypeInput.value = selected_doctype;
		form.appendChild(doctypeInput);
		
		// Add selected columns parameter
		let columnsInput = document.createElement('input');
		columnsInput.type = 'hidden';
		columnsInput.name = 'columns';
		columnsInput.value = JSON.stringify(selected_columns);
		form.appendChild(columnsInput);
		
		// Add file_format parameter
		let fileFormatInput = document.createElement('input');
		fileFormatInput.type = 'hidden';
		fileFormatInput.name = 'file_format';
		fileFormatInput.value = 'xlsx';
		form.appendChild(fileFormatInput);
		
		// Add CSRF token
		let csrfInput = document.createElement('input');
		csrfInput.type = 'hidden';
		csrfInput.name = 'csrf_token';
		csrfInput.value = frappe.csrf_token;
		form.appendChild(csrfInput);
		
		document.body.appendChild(form);
		form.submit();
		
		// Clean up after download
		setTimeout(function() {
			document.body.removeChild(form);
			document.body.removeChild(iframe);
			btn.prop('disabled', false).html(original_html);
		}, 2000);
	});

	$('#btn_download_template_csv').on('click', function() {
		if (!selected_doctype) {
			frappe.msgprint(__('Please select a doctype first'));
			return;
		}
		if (selected_columns.length === 0) {
			frappe.msgprint(__('Please select at least one column to import'));
			return;
		}
		
		let btn = $(this);
		let original_html = btn.html();
		btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Generating...');
		
		// Create a hidden iframe to handle the download
		let iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		iframe.name = 'download_frame_csv';
		document.body.appendChild(iframe);
		
		// Create a form to submit
		let form = document.createElement('form');
		form.method = 'POST';
		form.action = `/api/method/dat_pm.nacstnew.doctype.personnel.personnel.download_personnel_import_template`;
		form.target = 'download_frame_csv';
		
		// Add doctype parameter
		let doctypeInput = document.createElement('input');
		doctypeInput.type = 'hidden';
		doctypeInput.name = 'doctype';
		doctypeInput.value = selected_doctype;
		form.appendChild(doctypeInput);
		
		// Add selected columns parameter
		let columnsInput = document.createElement('input');
		columnsInput.type = 'hidden';
		columnsInput.name = 'columns';
		columnsInput.value = JSON.stringify(selected_columns);
		form.appendChild(columnsInput);
		
		// Add file_format parameter
		let fileFormatInput = document.createElement('input');
		fileFormatInput.type = 'hidden';
		fileFormatInput.name = 'file_format';
		fileFormatInput.value = 'csv';
		form.appendChild(fileFormatInput);
		
		// Add CSRF token
		let csrfInput = document.createElement('input');
		csrfInput.type = 'hidden';
		csrfInput.name = 'csrf_token';
		csrfInput.value = frappe.csrf_token;
		form.appendChild(csrfInput);
		
		document.body.appendChild(form);
		form.submit();
		
		// Clean up after download
		setTimeout(function() {
			document.body.removeChild(form);
			document.body.removeChild(iframe);
			btn.prop('disabled', false).html(original_html);
		}, 2000);
	});

	// File change handler for preview
	$('#import_file').on('change', function() {
		let file_input = this;
		let file = file_input.files[0];
		
		if (!file) {
			$('#file_preview_section').hide();
			return;
		}
		
		let file_name = file.name;
		let file_extension = file_name.split('.').pop().toLowerCase();
		
		// Validate file extension
		if (!['csv', 'xlsx', 'xls'].includes(file_extension)) {
			frappe.msgprint(__('Please select a valid CSV or Excel file (.csv, .xlsx, .xls)'));
			file_input.value = '';
			$('#file_preview_section').hide();
			return;
		}
		
		// Show preview section
		$('#file_preview_section').show();
		$('#file_info').html(`<strong>File:</strong> ${file_name} (${(file.size / 1024).toFixed(2)} KB)`);
		
		// Read file for preview
		let reader = new FileReader();
		reader.onload = function(e) {
			let file_data = e.target.result;
			preview_file_data(file_data, file_extension);
		};
		
		// Read file as text for CSV, or as array buffer for Excel
		if (file_extension === 'csv') {
			reader.readAsText(file);
		} else {
			reader.readAsArrayBuffer(file);
		}
	});
	
	// Function to preview file data
	function preview_file_data(file_data, file_extension) {
		try {
			if (file_extension === 'csv') {
				preview_csv(file_data);
			} else {
				preview_excel(file_data);
			}
		} catch (error) {
			$('#preview_headers').html('<tr><td colspan="10" style="color: red;">Error parsing file: ' + error.message + '</td></tr>');
			$('#preview_rows').html('');
		}
	}
	
	// Preview CSV file
	function preview_csv(csv_text) {
		let lines = csv_text.split('\n');
		if (lines.length === 0) {
			$('#preview_headers').html('<tr><td>No data found</td></tr>');
			$('#preview_rows').html('');
			return;
		}
		
		// Parse CSV (simple parser - handles basic cases)
		let rows = [];
		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];
			// Skip completely empty lines
			if (!line || !line.trim()) {
				continue;
			}
			
			// Simple CSV parsing (split by comma, handle quoted values)
			let values = [];
			let current = '';
			let inQuotes = false;
			
			for (let j = 0; j < line.length; j++) {
				let char = line[j];
				if (char === '"') {
					inQuotes = !inQuotes;
				} else if (char === ',' && !inQuotes) {
					values.push(current.trim());
					current = '';
				} else {
					current += char;
				}
			}
			values.push(current.trim());
			
			// Only add row if it has at least one non-empty value
			if (values.some(v => v && v.trim())) {
				rows.push(values);
			}
		}
		
		// Find the last row with content (stop processing empty rows)
		let lastRowWithContent = rows.length - 1;
		for (let i = rows.length - 1; i >= 0; i--) {
			if (rows[i] && rows[i].some(cell => cell && cell.trim())) {
				lastRowWithContent = i;
				break;
			}
		}
		
		// Trim rows to only include up to the last row with content
		rows = rows.slice(0, lastRowWithContent + 1);
		
		if (rows.length === 0) {
			$('#preview_headers').html('<tr><td>No data found</td></tr>');
			$('#preview_rows').html('');
			return;
		}
		
		// Display preview
		display_preview_table(rows);
	}
	
	// Preview Excel file
	function preview_excel(array_buffer) {
		// Show loading message
		$('#preview_headers').html('<tr><td colspan="10" style="text-align: center; padding: 20px; color: #666;">Loading preview...</td></tr>');
		$('#preview_rows').html('');
		
		// Convert ArrayBuffer to base64
		let bytes = new Uint8Array(array_buffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		let base64_data = btoa(binary);
		
		// Call backend to parse Excel file
		frappe.call({
			method: `dat_pm.nacstnew.doctype.personnel.personnel.preview_excel_file`,
			args: {
				file_content: base64_data,
				doctype: selected_doctype,
				columns: selected_columns
			},
			callback: function(r) {
				if (r.message && r.message.rows) {
					display_preview_table(r.message.rows);
				} else if (r.message && r.message.error) {
					$('#preview_headers').html('<tr><td colspan="10" style="text-align: center; padding: 20px; color: red;">Error: ' + frappe.utils.escape_html(r.message.error) + '</td></tr>');
					$('#preview_rows').html('');
				}
			},
			error: function(r) {
				$('#preview_headers').html('<tr><td colspan="10" style="text-align: center; padding: 20px; color: red;">Error loading preview. File will still be imported.</td></tr>');
				$('#preview_rows').html('');
			}
		});
	}
	
	// Display preview table without validation
	function display_preview_table(rows, max_rows = 10) {
		if (!rows || rows.length === 0) {
			$('#preview_headers').html('<tr><td>No data found</td></tr>');
			$('#preview_rows').html('');
			return;
		}
		
		// Filter out data_import_reference column
		let headers = rows[0];
		let data_import_ref_index = -1;
		headers.forEach(function(header, idx) {
			if (header && header.trim().toLowerCase() === 'data_import_reference') {
				data_import_ref_index = idx;
			}
		});
		
		// Filter headers
		let filtered_headers = [];
		if (data_import_ref_index >= 0) {
			filtered_headers = headers.filter(function(header, idx) {
				return idx !== data_import_ref_index;
			});
		} else {
			filtered_headers = headers;
		}
		
		// Build header HTML with serial number column
		let header_html = '<tr>';
		header_html += '<th style="background: #f0f0f0; padding: 8px; font-weight: bold; width: 60px;">S.No.</th>';
		filtered_headers.forEach(function(header) {
			header_html += '<th style="background: #f0f0f0; padding: 8px; font-weight: bold;">' + frappe.utils.escape_html(header || '') + '</th>';
		});
		header_html += '</tr>';
		$('#preview_headers').html(header_html);
		
		// Filter and display data rows (limit to max_rows)
		let data_rows = rows.slice(1, max_rows + 1);
		let rows_html = '';
		data_rows.forEach(function(row, idx) {
			let serial_number = idx + 1; // Serial number starts from 1
			rows_html += '<tr>';
			rows_html += '<td style="padding: 6px; text-align: center; font-weight: bold;">' + serial_number + '</td>';
			// Filter out data_import_reference column from each row
			let filtered_row = row;
			if (data_import_ref_index >= 0) {
				filtered_row = row.filter(function(value, idx) {
					return idx !== data_import_ref_index;
				});
			}
			filtered_row.forEach(function(value) {
				rows_html += '<td style="padding: 6px;">' + frappe.utils.escape_html(value || '') + '</td>';
			});
			rows_html += '</tr>';
		});
		$('#preview_rows').html(rows_html);
	}
	
	// Simple preview table without validation (fallback)
	function display_preview_table_simple(rows, max_rows = 10) {
		// Filter out data_import_reference column
		let headers = rows[0];
		let data_import_ref_index = -1;
		headers.forEach(function(header, idx) {
			if (header && header.trim().toLowerCase() === 'data_import_reference') {
				data_import_ref_index = idx;
			}
		});
		
		// Filter headers
		let filtered_headers = [];
		if (data_import_ref_index >= 0) {
			filtered_headers = headers.filter(function(header, idx) {
				return idx !== data_import_ref_index;
			});
		} else {
			filtered_headers = headers;
		}
		
		let header_html = '<tr>';
		header_html += '<th style="background: #f0f0f0; padding: 8px; font-weight: bold; width: 60px;">S.No.</th>';
		filtered_headers.forEach(function(header) {
			header_html += '<th style="background: #f0f0f0; padding: 8px; font-weight: bold;">' + frappe.utils.escape_html(header || '') + '</th>';
		});
		header_html += '</tr>';
		$('#preview_headers').html(header_html);
		
		let data_rows = rows.slice(1, max_rows + 1);
		let rows_html = '';
		data_rows.forEach(function(row, idx) {
			let serial_number = idx + 1; // Serial number starts from 1
			rows_html += '<tr>';
			rows_html += '<td style="padding: 6px; text-align: center; font-weight: bold;">' + serial_number + '</td>';
			// Filter out data_import_reference column from each row
			let filtered_row = row;
			if (data_import_ref_index >= 0) {
				filtered_row = row.filter(function(value, idx) {
					return idx !== data_import_ref_index;
				});
			}
			filtered_row.forEach(function(value) {
				rows_html += '<td style="padding: 6px;">' + frappe.utils.escape_html(value || '') + '</td>';
			});
			rows_html += '</tr>';
		});
		$('#preview_rows').html(rows_html);
	}

	// Import button handler
	$('#btn_import').on('click', function() {
		if (!selected_doctype) {
			frappe.msgprint(__('Please select a doctype first'));
			return;
		}
		if (selected_columns.length === 0) {
			frappe.msgprint(__('Please select at least one column to import'));
			return;
		}
		
		let file_input = $('#import_file')[0];
		let file = file_input.files[0];
		
		if (!file) {
			frappe.msgprint(__('Please select a file to import'));
			return;
		}

		// Get file extension BEFORE FileReader operations
		let file_name = file.name;
		let file_extension = file_name.split('.').pop().toLowerCase();

		let import_reference = $('#import_reference').val().trim();
		if (!import_reference) {
			import_reference = null; // Let backend generate one
		}

		// Show loading
		let btn = $(this);
		btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Importing...');

		// Read file and send to backend
		let reader = new FileReader();
		reader.onload = function(e) {
			let file_data = e.target.result;

			// Convert file to base64 for transmission
			let base64_data = '';
			if (file_extension === 'csv') {
				// CSV is already text
				base64_data = btoa(unescape(encodeURIComponent(file_data)));
			} else {
				// Excel files - convert ArrayBuffer to base64
				let bytes = new Uint8Array(file_data);
				let binary = '';
				for (let i = 0; i < bytes.byteLength; i++) {
					binary += String.fromCharCode(bytes[i]);
				}
				base64_data = btoa(binary);
			}

			frappe.call({
				method: `dat_pm.nacstnew.doctype.personnel.personnel.import_personnel_data`,
				args: {
					file_name: file_name,
					file_content: base64_data,
					file_extension: file_extension,
					import_reference: import_reference,
					doctype: selected_doctype,
					columns: selected_columns
				},
				callback: function(r) {
					btn.prop('disabled', false).html('<i class="fa fa-upload"></i> Import Data');
					
					if (r.message) {
						display_import_results(r.message);
					} else {
						frappe.msgprint(__('Import failed. Please check the console for errors.'));
					}
				},
				error: function(r) {
					btn.prop('disabled', false).html('<i class="fa fa-upload"></i> Import Data');
					frappe.msgprint({
						title: __('Import Error'),
						message: r.message || __('An error occurred during import'),
						indicator: 'red'
					});
				}
			});
		};

		// Read file as text for CSV, or as array buffer for Excel
		if (file_extension === 'csv') {
			reader.readAsText(file);
		} else {
			reader.readAsArrayBuffer(file);
		}
	});

	// Rollback button handler
	$('#btn_rollback').on('click', function() {
		let rollback_reference = $('#rollback_reference').val().trim();
		
		if (!rollback_reference) {
			frappe.msgprint(__('Please enter an import reference'));
			return;
		}

		frappe.confirm(
			__('Are you sure you want to rollback all records imported with reference "{0}"? This action cannot be undone.', [rollback_reference]),
			function() {
				// Yes
				let btn = $('#btn_rollback');
				btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Rolling back...');

				frappe.call({
					method: `dat_pm.nacstnew.doctype.personnel.personnel.rollback_personnel_import`,
					args: {
						import_reference: rollback_reference
					},
					callback: function(r) {
						btn.prop('disabled', false).html('<i class="fa fa-undo"></i> Rollback Import');
						
						if (r.message) {
							display_rollback_results(r.message);
						}
					},
					error: function(r) {
						btn.prop('disabled', false).html('<i class="fa fa-undo"></i> Rollback Import');
						frappe.msgprint({
							title: __('Rollback Error'),
							message: r.message || __('An error occurred during rollback'),
							indicator: 'red'
						});
					}
				});
			},
			function() {
				// No - do nothing
			}
		);
	});

	function display_import_results(results) {
		let results_html = '';
		
		if (results.success) {
			results_html = `
				<div class="alert alert-success" style="padding: 15px; border-radius: 4px; margin-bottom: 15px;">
					<strong>Import Completed Successfully!</strong>
					<ul style="margin: 10px 0 0 0; padding-left: 20px;">
						<li>Total rows processed: ${results.total_rows || 0}</li>
						<li>Records created: ${results.created || 0}</li>
						<li>Records updated: ${results.updated || 0}</li>
						<li>Records failed: ${results.failed || 0}</li>
						<li>Import Reference: <strong>${results.import_reference || 'N/A'}</strong></li>
					</ul>
				</div>
			`;

			if (results.errors && results.errors.length > 0) {
				results_html += `
					<div class="alert alert-warning" style="padding: 15px; border-radius: 4px; margin-top: 15px;">
						<strong>Errors/Warnings:</strong>
						<ul style="margin: 10px 0 0 0; padding-left: 20px; max-height: 200px; overflow-y: auto;">
							${results.errors.map(err => `<li>${frappe.utils.escape_html(err)}</li>`).join('')}
						</ul>
					</div>
				`;
			}

			// Update import reference field if it was auto-generated
			if (results.import_reference && !$('#import_reference').val()) {
				$('#import_reference').val(results.import_reference);
			}
		} else {
			results_html = `
				<div class="alert alert-danger" style="padding: 15px; border-radius: 4px;">
					<strong>Import Failed!</strong>
					<p>${frappe.utils.escape_html(results.error || 'Unknown error occurred')}</p>
					${results.errors && results.errors.length > 0 ? `
						<ul style="margin: 10px 0 0 0; padding-left: 20px;">
							${results.errors.map(err => `<li>${frappe.utils.escape_html(err)}</li>`).join('')}
						</ul>
					` : ''}
				</div>
			`;
		}

		$('#import_results').html(results_html);
		$('.results-section').show();
	}

	function display_rollback_results(results) {
		let results_html = '';
		
		if (results.success) {
			results_html = `
				<div class="alert alert-success" style="padding: 15px; border-radius: 4px;">
					<strong>Rollback Completed Successfully!</strong>
					<ul style="margin: 10px 0 0 0; padding-left: 20px;">
						<li>Records deleted: ${results.deleted || 0}</li>
						<li>Import Reference: <strong>${results.import_reference || 'N/A'}</strong></li>
					</ul>
				</div>
			`;
		} else {
			results_html = `
				<div class="alert alert-danger" style="padding: 15px; border-radius: 4px;">
					<strong>Rollback Failed!</strong>
					<p>${frappe.utils.escape_html(results.error || 'Unknown error occurred')}</p>
				</div>
			`;
		}

		$('#rollback_results').html(results_html);
	}
}