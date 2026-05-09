// Copyright (c) 2026, !! and contributors
// For license information, please see license.txt

frappe.ui.form.on("System Update", {
	refresh(frm) {
		if (frm.is_new()) {
			return;
		}
		frappe.call({
			method: "dat_pm.dat_pm.doctype.system_update.system_update.get_update_info",
			callback(r) {
				const m = r.message;
				if (!m) {
					return;
				}
				let latest = "";
				if (m.hint) {
					latest = m.hint;
				} else {
					const parts = [];
					if (m.installed_version) {
						parts.push(__("Installed") + ": " + m.installed_version);
					}
					if (m.local_commit) {
						parts.push(__("Local") + ": " + m.local_commit);
					}
					if (m.remote_commit) {
						parts.push(__("Remote") + ": " + m.remote_commit);
					}
					if (m.branch) {
						parts.push(__("Branch") + ": " + m.branch);
					}
					latest = parts.join(" · ");
					if (m.update_available) {
						latest += " — " + __("Update available");
					} else if (m.remote_commit) {
						latest += " — " + __("Up to date");
					} else if (m.remote_hint) {
						latest += " — " + m.remote_hint;
					}
				}
				frm.set_value("latest_version", latest);
			},
		});
	},

	update(frm) {
		if (frm.is_new()) {
			frappe.msgprint(__("Save the document before updating."));
			return;
		}
		frappe.confirm(
			__(
				"This will pull the latest code for the Dat Pm app, rebuild assets, run database migrations, and clear cache. The site may be briefly unavailable. Continue?"
			),
			() => {
				frappe.call({
					method: "dat_pm.dat_pm.doctype.system_update.system_update.start_update",
					args: { docname: frm.doc.name },
					freeze: true,
					freeze_message: __("Starting update…"),
					callback() {
						frappe.show_alert({
							message: __(
								"Update has been started. If you use background workers, it runs there; otherwise it runs immediately. Reload this form in a few minutes to see the result."
							),
							indicator: "blue",
						});
						frm.reload_doc();
					},
					error() {
						frm.reload_doc();
					},
				});
			}
		);
	},
});
