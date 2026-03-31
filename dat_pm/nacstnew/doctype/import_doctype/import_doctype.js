// Copyright (c) 2026, !! and contributors
// For license information, please see license.txt

frappe.ui.form.on("Import Doctype", {
	import_doctype(frm) {
		if (frm.doc.import_doctype) {
			update_allowed_fields_options(frm);
		} else {
			clear_allowed_fields_options(frm);
		}
	},

	refresh(frm) {
		if (frm.doc.import_doctype) {
			update_allowed_fields_options(frm);
		}
	},

	allowed_import_fields_add(frm, cdt, cdn) {
		// When a new row is added, update its field options
		if (frm.doc.import_doctype && field_options_cache[frm.doc.name]) {
			setTimeout(function() {
				update_row_field_options(frm, cdt, cdn);
			}, 100);
		}
	}
});

// Store options globally for this form
let field_options_cache = {};

function update_allowed_fields_options(frm) {
	if (!frm.doc.import_doctype) return;
	
	// Wait a bit for grid to be ready
	setTimeout(function() {
		frappe.call({
			method: `dat_pm.nacstnew.doctype.import_doctype.import_doctype.get_doctype_fields`,
			args: {
				doctype: frm.doc.import_doctype
			},
			callback: function(r) {
				if (r.message && r.message.length > 0) {
					let field_options = r.message;
					let options_string = field_options.join("\n");
					
					// Cache the options
					field_options_cache[frm.doc.name] = options_string;
					
					// Update options for the child table field
					if (frm.fields_dict.allowed_import_fields && frm.fields_dict.allowed_import_fields.grid) {
						let grid = frm.fields_dict.allowed_import_fields.grid;
						
						// Get the child table meta and update it
						let child_meta = frappe.get_meta("Allowed Import Fields");
						if (child_meta) {
							let docfield = child_meta.fields.find(f => f.fieldname === "allowed_import_fields");
							if (docfield) {
								docfield.options = options_string;
							}
						}
						
						// Update the docfield property - this affects new rows
						grid.update_docfield_property("allowed_import_fields", "options", options_string);
						
						// Update all existing rows
						grid.grid_rows.forEach(function(row) {
							update_row_field(row, options_string);
						});

						// Refresh the grid to apply changes
						frm.refresh_field("allowed_import_fields");
					}
				} else {
					console.warn("No fields found for doctype:", frm.doc.import_doctype);
				}
			},
			error: function(r) {
				console.error("Error fetching doctype fields:", r);
			}
		});
	}, 300);
}

function update_row_field_options(frm, cdt, cdn) {
	if (field_options_cache[frm.doc.name] && frm.fields_dict.allowed_import_fields && frm.fields_dict.allowed_import_fields.grid) {
		let grid = frm.fields_dict.allowed_import_fields.grid;
		let grid_row = grid.grid_rows_by_docname[cdn];
		if (grid_row) {
			update_row_field(grid_row, field_options_cache[frm.doc.name]);
		}
	}
}

function update_row_field(row, options_string) {
	if (row.grid_form && row.grid_form.fields_dict && row.grid_form.fields_dict.allowed_import_fields) {
		let field = row.grid_form.fields_dict.allowed_import_fields;
		field.df.options = options_string;
		if (field.set_options) {
			field.set_options(options_string);
		}
		field.refresh();
	}
}

function clear_allowed_fields_options(frm) {
	if (frm.fields_dict.allowed_import_fields && frm.fields_dict.allowed_import_fields.grid) {
		let grid = frm.fields_dict.allowed_import_fields.grid;
		grid.update_docfield_property("allowed_import_fields", "options", "");
		delete field_options_cache[frm.doc.name];
		frm.refresh_field("allowed_import_fields");
	}
}
