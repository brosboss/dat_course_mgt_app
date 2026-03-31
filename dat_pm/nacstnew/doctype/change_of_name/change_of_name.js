// Copyright (c) 2026, !! and contributors
// For license information, please see license.txt

frappe.ui.form.on("Change of Name", {
	refresh(frm) {

	},
	new_name: function(frm) {
		// Convert to uppercase
		if (frm.doc.new_name) {
			frm.set_value("new_name", frm.doc.new_name.toUpperCase());
		}
	},
	new_middle_name: function(frm) {
		// Convert to uppercase
		if (frm.doc.new_middle_name) {
			frm.set_value("new_middle_name", frm.doc.new_middle_name.toUpperCase());
		}
	},
	new_other_name: function(frm) {
		// Convert to uppercase
		if (frm.doc.new_other_name) {
			frm.set_value("new_other_name", frm.doc.new_other_name.toUpperCase());
		}
	},
	new_personnel_name: function(frm) {
		// Convert to uppercase
		if (frm.doc.new_personnel_name) {
			frm.set_value("new_personnel_name", frm.doc.new_personnel_name.toUpperCase());
		}
	},
	new_surname: function(frm) {
		// Convert to uppercase
		if (frm.doc.new_surname) {
			frm.set_value("new_surname", frm.doc.new_surname.toUpperCase());
		}
	}
});
