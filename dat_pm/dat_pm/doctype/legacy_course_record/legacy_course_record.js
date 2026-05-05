// Copyright (c) 2026, !! and contributors
// For license information, please see license.txt

frappe.ui.form.on("Legacy Course Record", {
	refresh(frm) {
		const has_lock = frappe.meta.get_docfield(frm.doctype, "import_locked");
		if (!frm.is_new() && has_lock && cint(frm.doc.import_locked)) {
			frm.set_read_only();
			frm.disable_save();
			frm.set_intro(
				__(
					"This record is locked after import. Open Import Course History and use Roll over to unlock for editing and resubmission."
				),
				"blue"
			);
		} else {
			frm.set_intro("");
			frm.enable_save();
		}
	},
});
