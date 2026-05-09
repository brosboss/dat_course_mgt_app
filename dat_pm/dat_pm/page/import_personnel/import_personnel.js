frappe.pages["import-personnel"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Import Personnel"),
		single_column: true,
	});

	const state = {
		rows: [],
		created: [],
		import_reference: null,
		row_validation: null,
		_skip_ref_change: false,
		page_size: 20,
		rows_page: 1,
		created_page: 1,
		dropdown_options: {
			category: [],
			type_of_commission: [],
			course: [],
			current_rank: [],
		},
	};

	const method = (fn) => `dat_pm.nacstnew.doctype.personnel.personnel.${fn}`;

	const $main = $(page.main);
	$main.empty();

	const $ref_row = $(`<div class="flex align-items-center" style="gap: 10px; flex-wrap: wrap; margin-bottom: 12px;"></div>`);
	$ref_row.append(
		$(`<label class="control-label" style="margin:0;">${__("Import reference")}</label>`),
		$(`<select class="form-control ip-ref-select" style="max-width: min(100%, 520px);"></select>`)
	);
	const $ref_select = $ref_row.find(".ip-ref-select");

	const $actions = $(`<div class="flex align-items-center" style="gap: 8px; flex-wrap: wrap; margin-bottom: 12px;"></div>`);
	const $table_host = $(`<div class="import-personnel-table"></div>`);
	const $status = $(`<div class="help-box" style="display:none; margin-top: 12px;"></div>`);

	$main.append($ref_row, $actions, $table_host, $status);

	function set_status(html, is_error) {
		if (!html) {
			$status.hide().empty();
			return;
		}
		$status.html(html).show();
		$status.toggleClass("alert-danger", !!is_error);
		$status.toggleClass("alert-info", !is_error);
	}

	function csv_escape_cell(val) {
		if (val == null || val === "") return "";
		const s = String(val);
		if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
		return s;
	}

	function show_server_error_as_status(r) {
		const msgs = [];
		const raw = r && r._server_messages ? r._server_messages : null;
		if (raw) {
			try {
				const arr = JSON.parse(raw) || [];
				arr.forEach((x) => {
					try {
						const o = JSON.parse(x);
						msgs.push(o.message || x);
					} catch (e) {
						msgs.push(x);
					}
				});
			} catch (e) {
				// ignore parse errors and fallback below
			}
		}
		if (!msgs.length) msgs.push(__("Import failed. Please review row/column errors and try again."));
		const html = `<p><strong>${__("Submit failed")}</strong></p><ul>${msgs
			.map((m) => `<li>${frappe.utils.escape_html(String(m))}</li>`)
			.join("")}</ul>`;
		set_status(html, true);
	}

	function get_select_html(fieldname, current_value, row_idx) {
		const options = state.dropdown_options[fieldname] || [];
		const safeCurrent = current_value || "";
		const hasCurrent = !!safeCurrent && options.includes(safeCurrent);
		let html = `<select class="form-control input-xs ip-cell-select" data-field="${frappe.utils.escape_html(
			fieldname
		)}" data-idx="${row_idx}" style="min-width: 160px;">`;
		html += `<option value="">${__("Select...")}</option>`;
		if (safeCurrent && !hasCurrent) {
			html += `<option value="${frappe.utils.escape_html(safeCurrent)}" selected>${frappe.utils.escape_html(
				`${safeCurrent} (${__("not found")})`
			)}</option>`;
		}
		options.forEach((opt) => {
			const selected = opt === safeCurrent ? "selected" : "";
			html += `<option value="${frappe.utils.escape_html(opt)}" ${selected}>${frappe.utils.escape_html(opt)}</option>`;
		});
		html += `</select>`;
		return html;
	}

	function load_dropdown_options() {
		frappe.call({
			method: method("get_personnel_import_dropdown_options"),
			callback(r) {
				if (r.exc) return;
				const m = r.message || {};
				state.dropdown_options.category = m.category || [];
				state.dropdown_options.type_of_commission = m.type_of_commission || [];
				state.dropdown_options.course = m.course || [];
				state.dropdown_options.current_rank = m.current_rank || [];
				render_table();
			},
		});
	}

	function extract_error_fields(rv) {
		const fields = new Set();
		if (!rv) return fields;
		if (rv.database_duplicate || rv.file_duplicate) fields.add("service_number");
		(rv.messages || []).forEach((m) => {
			const msg = String(m || "");
			const match = msg.match(/Column\s+'([^']+)'/i);
			if (match && match[1]) fields.add(match[1]);
		});
		return fields;
	}

	function error_cell_style(has_error) {
		return has_error ? ' style="background-color:#f8d7da;"' : "";
	}

	function value_not_in_options(fieldname, value) {
		if (!value) return false;
		const opts = state.dropdown_options[fieldname] || [];
		return !opts.includes(value);
	}

	function rows_validation_ready() {
		if (!state.rows.length) return false;
		if (!Array.isArray(state.row_validation) || state.row_validation.length !== state.rows.length) return false;
		return state.row_validation.every((rv) => !rv.database_duplicate && !rv.file_duplicate && !(rv.messages || []).length);
	}

	function apply_validation_result(payload) {
		const rv = payload.row_validation || [];
		state.row_validation = rv;
		let html = "";
		let is_error = false;
		const dbN = rv.filter((x) => x.database_duplicate).length;
		const fileN = rv.filter((x) => x.file_duplicate).length;
		const structMsgs = [];
		rv.forEach((x) => (x.messages || []).forEach((m) => structMsgs.push(m)));

		if (dbN) {
			is_error = true;
			html += `<p><strong>${__("{0} row(s) already exist in Personnel", [String(dbN)])}</strong>.</p>`;
		}
		if (fileN) {
			is_error = true;
			html += `<p><strong>${__("{0} duplicate service number row(s) found in this file", [String(fileN)])}</strong>.</p>`;
		}
		if (structMsgs.length) {
			is_error = true;
			html +=
				`<p><strong>${__("Other issues")}</strong></p><ul>` +
				structMsgs.map((e) => `<li>${frappe.utils.escape_html(e)}</li>`).join("") +
				`</ul>`;
		}
		if (!html) html = `<p>${__("All rows passed checks. You can submit the import.")}</p>`;
		set_status(html, is_error);
	}

	function run_validate_after_upload() {
		if (!state.rows.length) {
			state.row_validation = [];
			set_status("");
			render_table();
			refresh_actions();
			return;
		}
		frappe.call({
			method: method("validate_personnel_import_rows"),
			args: { rows_json: JSON.stringify(state.rows) },
			callback(r) {
				if (r.exc) return;
				apply_validation_result(r.message);
				render_table();
				refresh_actions();
			},
		});
	}

	function sync_reference_dropdown() {
		frappe.call({
			method: method("get_personnel_import_references"),
			callback(r) {
				if (r.exc) return;
				const refs = r.message.references || [];
				const current = state.import_reference || "";
				state._skip_ref_change = true;
				$ref_select.empty();
				$ref_select.append($("<option>").val("").text(__("— New CSV import —")));
				refs.forEach((x) => $ref_select.append($("<option>").val(x.import_reference).text(`${x.import_reference} — ${x.cnt} ${__("rows")}`)));
				if (current) $ref_select.val(current);
				state._skip_ref_change = false;
			},
		});
	}

	function render_table() {
		$table_host.empty();
		if (!state.rows.length && !state.created.length) {
			$table_host.append(`<p class="text-muted">${__("No rows loaded yet.")}</p>`);
			return;
		}

		const show_submitted = state.created.length > 0;
		const cols = show_submitted
			? ["_row", "service_number", "category", "type_of_commission", "course", "current_rank", "personnel_name", "doc", "actions"]
			: ["_row", "service_number", "category", "type_of_commission", "course", "current_rank", "personnel_name", "actions"];

		let thead = "<tr>";
		cols.forEach((c) => {
			if (c === "actions") thead += "<th></th>";
			else if (c === "doc") thead += `<th>${__("Record")}</th>`;
			else if (c === "_row") thead += "<th>#</th>";
			else if (c === "service_number") thead += `<th>${__("Service Number")}</th>`;
			else if (c === "category") thead += `<th>${__("Category")}</th>`;
			else if (c === "type_of_commission") thead += `<th>${__("Type of Commission")}</th>`;
			else if (c === "course") thead += `<th>${__("Course")}</th>`;
			else if (c === "current_rank") thead += `<th>${__("Current Rank")}</th>`;
			else if (c === "personnel_name") thead += `<th>${__("Personnel Name")}</th>`;
		});
		thead += "</tr>";

		let tbody = "";
		if (show_submitted) {
			const total = state.created.length;
			const total_pages = Math.max(1, Math.ceil(total / state.page_size));
			state.created_page = Math.min(state.created_page, total_pages);
			const start = (state.created_page - 1) * state.page_size;
			const page_rows = state.created.slice(start, start + state.page_size);
			page_rows.forEach((rec, idx) => {
				const row_num = start + idx + 1;
				const link = `<a href="#Form/Personnel/${encodeURIComponent(rec.name)}">${frappe.utils.escape_html(rec.name)}</a>`;
				const remove_btn = `<button type="button" class="btn btn-xs btn-default btn-remove-import" data-name="${frappe.utils.escape_html(rec.name)}">${__("Remove")}</button>`;
				tbody += `<tr>
					<td>${row_num}</td>
					<td>${frappe.utils.escape_html(rec.service_number || "")}</td>
					<td>${frappe.utils.escape_html(rec.category || "")}</td>
					<td>${frappe.utils.escape_html(rec.type_of_commission || "")}</td>
					<td>${frappe.utils.escape_html(rec.course || "")}</td>
					<td>${frappe.utils.escape_html(rec.current_rank || "")}</td>
					<td>${frappe.utils.escape_html(rec.personnel_name || "")}</td>
					<td>${link}</td>
					<td>${remove_btn}</td>
				</tr>`;
			});
		} else {
			const total = state.rows.length;
			const total_pages = Math.max(1, Math.ceil(total / state.page_size));
			state.rows_page = Math.min(state.rows_page, total_pages);
			const start = (state.rows_page - 1) * state.page_size;
			const page_rows = state.rows.slice(start, start + state.page_size);
			page_rows.forEach((row, idx) => {
				const real_idx = start + idx;
				const rv = state.row_validation && state.row_validation[real_idx];
				const errFields = extract_error_fields(rv);
				const remove_btn = `<button type="button" class="btn btn-xs btn-default btn-remove-row" data-idx="${real_idx}">${__("Remove")}</button>`;
				const categoryError = errFields.has("category") || value_not_in_options("category", row.category || "");
				const tocError =
					errFields.has("type_of_commission") ||
					value_not_in_options("type_of_commission", row.type_of_commission || "");
				const courseError = errFields.has("course") || value_not_in_options("course", row.course || "");
				const rankError = errFields.has("current_rank") || value_not_in_options("current_rank", row.current_rank || "");
				tbody += `<tr>
					<td>${frappe.utils.escape_html(String(row._row || ""))}</td>
					<td${error_cell_style(errFields.has("service_number"))}>${frappe.utils.escape_html(row.service_number || "")}</td>
					<td${error_cell_style(categoryError)}>${get_select_html("category", row.category || "", real_idx)}</td>
					<td${error_cell_style(tocError)}>${get_select_html("type_of_commission", row.type_of_commission || "", real_idx)}</td>
					<td${error_cell_style(courseError)}>${get_select_html("course", row.course || "", real_idx)}</td>
					<td${error_cell_style(rankError)}>${get_select_html("current_rank", row.current_rank || "", real_idx)}</td>
					<td${error_cell_style(errFields.has("personnel_name"))}>${frappe.utils.escape_html(row.personnel_name || "")}</td>
					<td>${remove_btn}</td>
				</tr>`;
			});
		}

		$table_host.append(`<div class="table-responsive"><table class="table table-bordered table-condensed">${thead}${tbody}</table></div>`);
		if (show_submitted) {
			const total_pages = Math.max(1, Math.ceil(state.created.length / state.page_size));
			if (total_pages > 1) {
				$table_host.append(
					`<div class="flex align-items-center" style="gap:8px; margin-top:8px;">
						<button type="button" class="btn btn-default btn-xs ip-prev-created" ${
							state.created_page <= 1 ? "disabled" : ""
						}>${__("Prev")}</button>
						<span class="text-muted">${__("Page")} ${state.created_page} ${__("of")} ${total_pages}</span>
						<button type="button" class="btn btn-default btn-xs ip-next-created" ${
							state.created_page >= total_pages ? "disabled" : ""
						}>${__("Next")}</button>
					</div>`
				);
			}
		} else {
			const total_pages = Math.max(1, Math.ceil(state.rows.length / state.page_size));
			if (total_pages > 1) {
				$table_host.append(
					`<div class="flex align-items-center" style="gap:8px; margin-top:8px;">
						<button type="button" class="btn btn-default btn-xs ip-prev-rows" ${state.rows_page <= 1 ? "disabled" : ""}>${__(
							"Prev"
						)}</button>
						<span class="text-muted">${__("Page")} ${state.rows_page} ${__("of")} ${total_pages}</span>
						<button type="button" class="btn btn-default btn-xs ip-next-rows" ${state.rows_page >= total_pages ? "disabled" : ""}>${__(
							"Next"
						)}</button>
					</div>`
				);
			}
		}

		$table_host.find(".btn-remove-row").on("click", function () {
			const idx = cint($(this).data("idx"));
			state.rows.splice(idx, 1);
			render_table();
			refresh_actions();
			run_validate_after_upload();
		});
		$table_host.find(".ip-cell-select").on("change", function () {
			const idx = cint($(this).data("idx"));
			const field = ($(this).data("field") || "").trim();
			if (!state.rows[idx] || !field) return;
			state.rows[idx][field] = ($(this).val() || "").trim();
			run_validate_after_upload();
		});

		$table_host.find(".btn-remove-import").on("click", function () {
			const name = $(this).data("name");
			frappe.confirm(__("Remove this personnel record from the selected imported data?"), () => {
				frappe.call({
					method: method("delete_personnel_import_row"),
					args: { service_number: name, import_reference: state.import_reference },
					callback(r) {
						if (r.exc) return;
						state.created = state.created.filter((c) => c.name !== name);
						if (!state.created.length) {
							state.import_reference = null;
							state._skip_ref_change = true;
							$ref_select.val("");
							state._skip_ref_change = false;
						}
						render_table();
						refresh_actions();
						sync_reference_dropdown();
						frappe.show_alert({ message: __("Removed"), indicator: "green" });
					},
				});
			});
		});
		$table_host.find(".ip-prev-rows").on("click", function () {
			state.rows_page = Math.max(1, state.rows_page - 1);
			render_table();
		});
		$table_host.find(".ip-next-rows").on("click", function () {
			state.rows_page += 1;
			render_table();
		});
		$table_host.find(".ip-prev-created").on("click", function () {
			state.created_page = Math.max(1, state.created_page - 1);
			render_table();
		});
		$table_host.find(".ip-next-created").on("click", function () {
			state.created_page += 1;
			render_table();
		});
	}

	function download_import_template() {
		frappe.call({
			method: method("get_personnel_import_template_rows"),
			callback(r) {
				if (r.exc) return;
				const fields = r.message.fields || [];
				const rows = r.message.rows || [];
				const lines = [fields.join(",")];
				rows.forEach((row) => lines.push(fields.map((f) => csv_escape_cell(row[f] || "")).join(",")));
				const csv = "\uFEFF" + lines.join("\n");
				const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = "personnel_import_template.csv";
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				frappe.show_alert({ message: __("Template downloaded"), indicator: "green" });
			},
		});
	}

	function run_submit() {
		if (!rows_validation_ready()) return;
		frappe.call({
			method: method("submit_personnel_import"),
			args: { rows_json: JSON.stringify(state.rows) },
			callback(r) {
				if (r.exc) {
					show_server_error_as_status(r);
					return;
				}
				state.import_reference = r.message.import_reference;
				state.created = r.message.created || [];
				state.rows = [];
				state.row_validation = null;
				state.rows_page = 1;
				state.created_page = 1;
				set_status(`<p>${__("Imported")} ${state.created.length} ${__("record(s).")} ${__("Reference:")} ${frappe.utils.escape_html(state.import_reference)}</p>`, false);
				render_table();
				refresh_actions();
				sync_reference_dropdown();
				frappe.show_alert({ message: __("Import complete"), indicator: "green" });
			},
		});
	}

	function run_delete_entire_reference() {
		if (!state.import_reference) return;
		const ref = state.import_reference;
		frappe.confirm(
			__("This will permanently delete every Personnel record in import reference {0}. This cannot be undone. Continue?", [ref]),
			() => {
				frappe.call({
					method: method("delete_personnel_import_reference"),
					args: { import_reference: ref },
					callback(r) {
						if (r.exc) return;
						const deleted = r.message.deleted || 0;
						state.import_reference = null;
						state.created = [];
						state._skip_ref_change = true;
						$ref_select.val("");
						state._skip_ref_change = false;
						set_status(`<p>${__("Deleted {0} personnel record(s).", [String(deleted)])}</p>`, false);
						render_table();
						refresh_actions();
						sync_reference_dropdown();
						frappe.show_alert({ message: __("Imported data deleted"), indicator: "green" });
					},
				});
			}
		);
	}

	function refresh_actions() {
		$actions.empty();
		const template_btn = $(`<button class="btn btn-default btn-sm">${__("Download CSV template")}</button>`).on("click", download_import_template);
		const upload_btn = $(`<button class="btn btn-default btn-sm">${__("Upload CSV")}</button>`).on("click", () => {
			new frappe.ui.FileUploader({
				dialog_title: __("Upload CSV"),
				allow_multiple: false,
				restrictions: { allowed_file_types: [".csv"] },
				on_success(file_doc) {
					frappe.call({
						method: method("parse_personnel_import_file"),
						args: { file_name: file_doc.name },
						callback(r) {
							if (r.exc) return;
							state.rows = r.message.rows || [];
							state.created = [];
							state.import_reference = null;
							state.row_validation = null;
							state.rows_page = 1;
							state.created_page = 1;
							state._skip_ref_change = true;
							$ref_select.val("");
							state._skip_ref_change = false;
							set_status("");
							render_table();
							refresh_actions();
							run_validate_after_upload();
							frappe.show_alert({ message: __("File loaded"), indicator: "green" });
						},
					});
				},
			});
		});
		const submit_btn = $(`<button class="btn btn-primary btn-sm" ${!rows_validation_ready() ? "disabled" : ""}>${__("Submit import")}</button>`).on("click", run_submit);
		const delete_btn = $(`<button class="btn btn-danger btn-sm" ${!state.import_reference ? "disabled" : ""}>${__("Delete imported data")}</button>`).on(
			"click",
			run_delete_entire_reference
		);
		const reset_btn = $(`<button class="btn btn-default btn-sm">${__("Clear")}</button>`).on("click", () => {
			state.rows = [];
			state.created = [];
			state.import_reference = null;
			state.row_validation = null;
			state.rows_page = 1;
			state.created_page = 1;
			state._skip_ref_change = true;
			$ref_select.val("");
			state._skip_ref_change = false;
			set_status("");
			render_table();
			refresh_actions();
			sync_reference_dropdown();
		});
		$actions.append(template_btn, upload_btn, submit_btn, delete_btn, reset_btn);
	}

	$ref_select.on("change", function () {
		if (state._skip_ref_change) return;
		const v = ($(this).val() || "").trim();
		if (!v) {
			state.import_reference = null;
			state.created = [];
			state.rows = [];
			state.row_validation = null;
			set_status("");
			render_table();
			refresh_actions();
			return;
		}
		frappe.call({
			method: method("get_personnel_import_records"),
			args: { import_reference: v },
			freeze: true,
			freeze_message: __("Loading imported data..."),
			callback(r) {
				if (r.exc) return;
				state.import_reference = r.message.import_reference;
				state.created = r.message.created || [];
				state.rows = [];
				state.row_validation = null;
				state.rows_page = 1;
				state.created_page = 1;
				set_status(`<p>${__("Loaded import reference")} <strong>${frappe.utils.escape_html(state.import_reference)}</strong>.</p>`, false);
				render_table();
				refresh_actions();
			},
		});
	});

	render_table();
	refresh_actions();
	sync_reference_dropdown();
	load_dropdown_options();
};