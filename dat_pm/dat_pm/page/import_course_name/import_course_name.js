frappe.pages["import-course-name"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Import Course Name"),
		single_column: true,
	});

	const state = {
		rows: [],
		/** @type {{ name: string, course_name: string, course_abbreviation?: string, parent_course_name?: string, course_frequency?: string, ranks?: string, prerequisites?: string }[]} */
		created: [],
		/** @type {string | null} Course Name.import_batch */
		import_batch: null,
		rolled_over: false,
		/** @type {null | { database_duplicate: boolean, file_duplicate: boolean, messages: string[] }[]} */
		row_validation: null,
		_skip_batch_change: false,
		/** @type {number | null} */
		batch_number: null,
		/** @type {boolean | undefined} */
		import_lock_enabled: undefined,
		dropdown_options: {
			rank: [],
			course_name: [],
			course_frequency: [],
		},
	};

	const method = (fn) => `dat_pm.nacstnew.doctype.course_name.course_name.${fn}`;

	function batch_option_label(num, rowCount) {
		return `${__("Batch {0}", [String(num)])} — ${rowCount} ${__("rows")}`;
	}

	function ranks_cell(row) {
		const r = row.ranks;
		if (Array.isArray(r)) return r.join(", ");
		return r || "";
	}

	function prerequisites_cell(row) {
		const p = row.prerequisites;
		if (Array.isArray(p)) return p.join(", ");
		return p || "";
	}

	const $main = $(page.main);
	$main.empty();

	const $batch_row = $(`<div class="flex align-items-center" style="gap: 10px; flex-wrap: wrap; margin-bottom: 12px;"></div>`);
	$batch_row.append(
		$(`<label class="control-label" style="margin:0;">${__("Import batch")}</label>`),
		$(`<select class="form-control icn-batch-select" style="max-width: min(100%, 480px);"></select>`)
	);
	const $batch_select = $batch_row.find(".icn-batch-select");

	const $actions = $(`<div class="flex align-items-center" style="gap: 8px; flex-wrap: wrap; margin-bottom: 12px;"></div>`);
	const $table_host = $(`<div class="import-course-name-table"></div>`);
	const $status = $(`<div class="help-box" style="display:none; margin-top: 12px;"></div>`);

	$main.append($batch_row, $actions, $table_host, $status);

	$batch_select.on("change", function () {
		if (state._skip_batch_change) return;
		const v = ($(this).val() || "").trim();
		if (!v) {
			state.import_batch = null;
			state.batch_number = null;
			state.created = [];
			state.rolled_over = false;
			state.import_lock_enabled = undefined;
			state.rows = [];
			state.row_validation = null;
			set_status("");
			render_table();
			refresh_actions();
			return;
		}
		frappe.call({
			method: method("get_batch_records"),
			args: { import_batch: v },
			freeze: true,
			freeze_message: __("Loading batch…"),
			callback(r) {
				if (r.exc) return;
				const m = r.message;
				state.import_batch = m.import_batch;
				state.batch_number = m.batch_number != null ? m.batch_number : null;
				state.created = m.created || [];
				state.rolled_over = !!m.rolled_over;
				state.import_lock_enabled = m.import_lock_enabled !== false;
				state.rows = [];
				state.row_validation = null;
				if (!state.rolled_over) {
					set_status(
						`<p>${__(
							"Batch loaded. Remove rows, use Roll over to unlock for editing, or Delete entire batch — same as after a new CSV import."
						)}</p>`,
						false
					);
				} else {
					set_status(
						`<p>${__(
							"This batch is already unlocked. Edit records from the form, or delete the entire batch here."
						)}</p>`,
						false
					);
				}
				render_table();
				refresh_actions();
			},
		});
	});

	function sync_batch_dropdown() {
		frappe.call({
			method: method("get_import_batches"),
			callback(r) {
				if (r.exc) return;
				const batches = r.message.batches || [];
				const current = state.import_batch || "";
				state._skip_batch_change = true;
				$batch_select.empty();
				$batch_select.append($("<option>").val("").text(__("— New CSV import —")));
				batches.forEach(function (b) {
					const label = batch_option_label(b.batch_number, b.cnt);
					$batch_select.append($("<option>").val(b.batch).text(label));
				});
				if (current) {
					$batch_select.val(current);
					if ($batch_select.val() !== current && state.created.length) {
						const n = state.batch_number != null ? state.batch_number : "?";
						$batch_select.append(
							$("<option>")
								.val(current)
								.text(batch_option_label(n, state.created.length))
						);
						$batch_select.val(current);
					}
				} else {
					$batch_select.val("");
				}
				state._skip_batch_change = false;
			},
		});
	}

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
		if (/[",\n\r]/.test(s)) {
			return '"' + s.replace(/"/g, '""') + '"';
		}
		return s;
	}

	function load_dropdown_options() {
		frappe.call({
			method: method("get_import_course_name_dropdown_options"),
			callback(r) {
				if (r.exc) return;
				const m = r.message || {};
				state.dropdown_options.rank = m.rank || [];
				state.dropdown_options.course_name = m.course_name || [];
				state.dropdown_options.course_frequency = m.course_frequency || [];
				render_table();
			},
		});
	}

	function get_select_html(fieldname, optionsKey, current_value, row_idx) {
		const options = state.dropdown_options[optionsKey] || [];
		const safeCurrent = current_value || "";
		const hasCurrent = !!safeCurrent && options.includes(safeCurrent);
		let html = `<select class="form-control input-xs icn-cell-select" data-field="${frappe.utils.escape_html(
			fieldname
		)}" data-idx="${row_idx}" style="min-width: 120px;">`;
		html += `<option value="">${__("Select...")}</option>`;
		if (safeCurrent && !hasCurrent) {
			html += `<option value="${frappe.utils.escape_html(safeCurrent)}" selected>${frappe.utils.escape_html(
				`${safeCurrent} (${__("not found")})`
			)}</option>`;
		}
		options.forEach(function (opt) {
			const selected = opt === safeCurrent ? "selected" : "";
			html += `<option value="${frappe.utils.escape_html(opt)}" ${selected}>${frappe.utils.escape_html(opt)}</option>`;
		});
		html += `</select>`;
		return html;
	}

	function get_text_input_html(fieldname, value, row_idx) {
		const v = value != null ? String(value) : "";
		return `<input type="text" class="form-control input-xs icn-cell-input" data-field="${frappe.utils.escape_html(
			fieldname
		)}" data-idx="${row_idx}" value="${frappe.utils.escape_html(v)}" style="min-width: 100px;" />`;
	}

	function extract_error_fields(rv) {
		const fields = new Set();
		if (!rv) return fields;
		if (rv.database_duplicate || rv.file_duplicate) {
			fields.add("course_name");
		}
		(rv.messages || []).forEach(function (m) {
			const match = String(m).match(/Column\s+'([^']+)'/i);
			if (match && match[1]) fields.add(match[1]);
		});
		return fields;
	}

	function error_cell_style(has_error) {
		return has_error ? ' style="background-color:#f8d7da;"' : "";
	}

	function value_not_in_list(options, value) {
		if (!value || !String(value).trim()) return false;
		return !(options || []).includes(String(value).trim());
	}

	function show_import_guide() {
		frappe.call({
			method: method("get_import_course_name_guide_html"),
			freeze: true,
			freeze_message: __("Loading guide…"),
			callback(r) {
				if (r.exc) return;
				const html = typeof r.message === "string" ? r.message : "";
				const d = new frappe.ui.Dialog({
					title: __("Import Course Name — Guide"),
					size: "large",
					fields: [{ fieldtype: "HTML", fieldname: "guide_html", options: html }],
				});
				d.show();
			},
		});
	}

	function download_import_template() {
		const headers = [
			"course_name",
			"course_abbreviation",
			"parent_course_name",
			"course_frequency",
			"rank_1",
			"rank_2",
			"rank_3",
			"rank_4",
			"rank_5",
			"mandatory_prerequisite_course_1",
			"mandatory_prerequisite_course_2",
			"mandatory_prerequisite_course_3",
			"mandatory_prerequisite_course_4",
			"mandatory_prerequisite_course_5",
		];
		frappe.call({
			method: method("get_import_template_sample_rows"),
			freeze: true,
			freeze_message: __("Preparing template…"),
			callback(r) {
				if (r.exc) return;
				const rows = r.message.rows || [];
				const source = r.message.source;
				const lines = [headers.join(",")];
				rows.forEach(function (row) {
					const r1 = row.rank_1 != null ? row.rank_1 : row.ranks;
					const p1 =
						row.mandatory_prerequisite_course_1 != null
							? row.mandatory_prerequisite_course_1
							: row.prerequisite_1 != null
								? row.prerequisite_1
								: row.mandatory_prerequisites;
					lines.push(
						[
							csv_escape_cell(row.course_name),
							csv_escape_cell(row.course_abbreviation),
							csv_escape_cell(row.parent_course_name),
							csv_escape_cell(row.course_frequency),
							csv_escape_cell(r1),
							csv_escape_cell(row.rank_2),
							csv_escape_cell(row.rank_3),
							csv_escape_cell(row.rank_4),
							csv_escape_cell(row.rank_5),
							csv_escape_cell(p1),
							csv_escape_cell(row.mandatory_prerequisite_course_2 ?? row.prerequisite_2),
							csv_escape_cell(row.mandatory_prerequisite_course_3 ?? row.prerequisite_3),
							csv_escape_cell(row.mandatory_prerequisite_course_4 ?? row.prerequisite_4),
							csv_escape_cell(row.mandatory_prerequisite_course_5 ?? row.prerequisite_5),
						].join(",")
					);
				});
				const csv = "\uFEFF" + lines.join("\n");
				const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = "course_name_import_template.csv";
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				const msg =
					source === "placeholder"
						? __("Template downloaded (example rows only—add Rank and Course Name masters for live samples).")
						: __("Template downloaded with sample ranks and prerequisites from your database.");
				frappe.show_alert({ message: msg, indicator: "green" });
			},
		});
	}

	function download_existing_course_names() {
		frappe.call({
			method: method("get_existing_course_names_csv"),
			freeze: true,
			freeze_message: __("Preparing list…"),
			callback(r) {
				if (r.exc) return;
				const csv = "\uFEFF" + (typeof r.message === "string" ? r.message : "");
				const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = "existing_course_names.csv";
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				frappe.show_alert({ message: __("Course name list downloaded"), indicator: "green" });
			},
		});
	}

	function rows_validation_ready() {
		if (!state.rows.length) return false;
		if (!Array.isArray(state.row_validation) || state.row_validation.length !== state.rows.length) return false;
		return state.row_validation.every(function (rv) {
			return (
				!rv.database_duplicate &&
				!rv.file_duplicate &&
				(!rv.messages || !rv.messages.length)
			);
		});
	}

	function apply_validation_result(payload) {
		const rv = payload.row_validation || [];
		state.row_validation = rv;
		let html = "";
		let is_error = false;
		const dbN = rv.filter(function (x) {
			return x.database_duplicate;
		}).length;
		const fileN = rv.filter(function (x) {
			return x.file_duplicate;
		}).length;
		const structMsgs = [];
		rv.forEach(function (x) {
			(x.messages || []).forEach(function (m) {
				structMsgs.push(m);
			});
		});
		if (dbN) {
			is_error = true;
			html +=
				`<p><strong>${__("{0} row(s) already exist as Course Name", [String(dbN)])}</strong> — ${__(
					"highlighted in red. Use a new course name or remove the row before submitting."
				)}</p>`;
		}
		if (fileN) {
			is_error = true;
			html +=
				`<p><strong>${__("{0} row(s) duplicated within this file", [String(fileN)])}</strong> — ${__(
					"the same course name appears more than once. Remove or adjust duplicate lines."
				)}</p>`;
		}
		if (structMsgs.length) {
			is_error = true;
			html +=
				`<p><strong>${__("Other issues")}</strong></p><ul>` +
				structMsgs
					.map(function (e) {
						return `<li>${frappe.utils.escape_html(e)}</li>`;
					})
					.join("") +
				`</ul>`;
		}
		if (!html) {
			html = `<p>${__("All rows passed checks. You can submit the import.")}</p>`;
		}
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
			method: method("validate_import_rows"),
			args: { rows_json: JSON.stringify(state.rows) },
			callback(r) {
				if (r.exc) return;
				apply_validation_result(r.message);
				render_table();
				refresh_actions();
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
			? ["_row", "course_name", "abbr", "parent", "frequency", "ranks", "prereqs", "doc", "actions"]
			: (function () {
					const c = ["_row", "course_name", "abbr", "parent", "frequency"];
					for (let i = 1; i <= 5; i++) c.push(`rank_${i}`);
					for (let i = 1; i <= 5; i++) c.push(`mandatory_prerequisite_course_${i}`);
					c.push("actions");
					return c;
			  })();

		let thead = "<tr>";
		cols.forEach((c) => {
			if (c === "actions") thead += `<th></th>`;
			else if (c === "doc") thead += `<th>${__("Record")}</th>`;
			else if (c === "_row") thead += `<th>#</th>`;
			else if (c === "course_name") thead += `<th>${__("Course Name")}</th>`;
			else if (c === "abbr") thead += `<th>${__("Abbreviation")}</th>`;
			else if (c === "parent") thead += `<th>${__("Parent")}</th>`;
			else if (c === "frequency") thead += `<th>${__("Frequency")}</th>`;
			else if (c === "ranks") thead += `<th>${__("Ranks")}</th>`;
			else if (c === "prereqs") thead += `<th>${__("Prerequisites")}</th>`;
			else if (c.startsWith("rank_")) thead += `<th>${__("Rank")} ${c.replace("rank_", "")}</th>`;
			else if (c.startsWith("mandatory_prerequisite_course_"))
				thead += `<th>${__("Prereq")} ${c.replace("mandatory_prerequisite_course_", "")}</th>`;
			else thead += `<th>${frappe.utils.escape_html(c)}</th>`;
		});
		thead += "</tr>";

		let tbody = "";
		if (show_submitted) {
			const lockUi = state.import_lock_enabled !== false;
			const allow_remove = state.import_batch && (!state.rolled_over || !lockUi);
			if (state.rolled_over) {
				$table_host.append(
					`<p class="text-muted" style="margin-bottom:8px;">${__(
						"These records are unlocked. Open each Course Name to edit and save."
					)}</p>`
				);
			}
			state.created.forEach((rec, idx) => {
				const link = `<a href="#Form/Course Name/${encodeURIComponent(rec.name)}">${frappe.utils.escape_html(
					rec.name
				)}</a>`;
				const remove_btn = allow_remove
					? `<button type="button" class="btn btn-xs btn-default btn-remove-import" data-name="${frappe.utils.escape_html(
							rec.name
					  )}">${__("Remove")}</button>`
					: "";
				tbody += `<tr data-idx="${idx}">
					<td>${frappe.utils.escape_html(String(idx + 1))}</td>
					<td>${frappe.utils.escape_html(rec.course_name || "")}</td>
					<td>${frappe.utils.escape_html(rec.course_abbreviation || "")}</td>
					<td>${frappe.utils.escape_html(rec.parent_course_name || "")}</td>
					<td>${frappe.utils.escape_html(rec.course_frequency || "")}</td>
					<td>${frappe.utils.escape_html(rec.ranks || "")}</td>
					<td>${frappe.utils.escape_html(rec.prerequisites || "")}</td>
					<td>${link}</td>
					<td>${remove_btn}</td>
				</tr>`;
			});
		} else {
			state.rows.forEach((row, idx) => {
				const rv = state.row_validation && state.row_validation[idx];
				const errFields = extract_error_fields(rv);
				const remove_btn = `<button type="button" class="btn btn-xs btn-default btn-remove-row" data-idx="${idx}">${__(
					"Remove"
				)}</button>`;
				const cn = row.course_name || "";
				const cnErrReal =
					errFields.has("course_name") || !!(rv && (rv.file_duplicate || rv.database_duplicate) && cn);
				const abbrErr = errFields.has("course_abbreviation");
				const parentVal = row.parent_course_name || "";
				const parentErr =
					errFields.has("parent_course_name") ||
					(!!parentVal && value_not_in_list(state.dropdown_options.course_name, parentVal));
				const freqVal = row.course_frequency || "";
				const freqErr = errFields.has("course_frequency");
				let tds = `<td>${frappe.utils.escape_html(String(row._row || ""))}</td>`;
				tds += `<td${error_cell_style(cnErrReal)}>${get_text_input_html("course_name", cn, idx)}</td>`;
				tds += `<td${error_cell_style(abbrErr)}>${get_text_input_html(
					"course_abbreviation",
					row.course_abbreviation || "",
					idx
				)}</td>`;
				tds += `<td${error_cell_style(parentErr)}>${get_select_html(
					"parent_course_name",
					"course_name",
					parentVal,
					idx
				)}</td>`;
				tds += `<td${error_cell_style(freqErr)}>${get_select_html(
					"course_frequency",
					"course_frequency",
					freqVal,
					idx
				)}</td>`;
				for (let i = 1; i <= 5; i++) {
					const rk = `rank_${i}`;
					const rvv = (row[rk] || "").trim();
					const rErr =
						errFields.has(rk) || (!!rvv && value_not_in_list(state.dropdown_options.rank, rvv));
					tds += `<td${error_cell_style(rErr)}>${get_select_html(rk, "rank", rvv, idx)}</td>`;
				}
				for (let i = 1; i <= 5; i++) {
					const pk = `mandatory_prerequisite_course_${i}`;
					const pv = (row[pk] || "").trim();
					const pErr =
						errFields.has(pk) || (!!pv && value_not_in_list(state.dropdown_options.course_name, pv));
					tds += `<td${error_cell_style(pErr)}>${get_select_html(pk, "course_name", pv, idx)}</td>`;
				}
				tds += `<td>${remove_btn}</td>`;
				tbody += `<tr>${tds}</tr>`;
			});
		}

		$table_host.append(
			`<div class="table-responsive"><table class="table table-bordered table-condensed">${thead}${tbody}</table></div>`
		);

		$table_host.find(".btn-remove-row").on("click", function () {
			const idx = cint($(this).data("idx"));
			state.rows.splice(idx, 1);
			render_table();
			refresh_actions();
			run_validate_after_upload();
		});

		$table_host.find(".icn-cell-select").on("change", function () {
			const idx = cint($(this).data("idx"));
			const field = ($(this).data("field") || "").trim();
			if (!state.rows[idx] || !field) return;
			state.rows[idx][field] = ($(this).val() || "").trim();
			run_validate_after_upload();
		});

		$table_host.find(".icn-cell-input").on("change blur", function () {
			const idx = cint($(this).data("idx"));
			const field = ($(this).data("field") || "").trim();
			if (!state.rows[idx] || !field) return;
			state.rows[idx][field] = ($(this).val() || "").trim();
			run_validate_after_upload();
		});

		$table_host.find(".btn-remove-import").on("click", function () {
			const name = $(this).data("name");
			frappe.confirm(__("Remove this course name from the database?"), () => {
				frappe.call({
					method: method("delete_import_row"),
					args: { doc_name: name, import_batch: state.import_batch },
					callback(r) {
						if (!r.exc) {
							state.created = state.created.filter((c) => c.name !== name);
							if (!state.created.length) {
								state.import_batch = null;
								state.batch_number = null;
								state.import_lock_enabled = undefined;
								state._skip_batch_change = true;
								$batch_select.val("");
								state._skip_batch_change = false;
							}
							frappe.show_alert({ message: __("Removed"), indicator: "green" });
							render_table();
							refresh_actions();
							if (!state.created.length) {
								sync_batch_dropdown();
							}
						}
					},
				});
			});
		});
	}

	function refresh_actions() {
		$actions.empty();

		const template_btn = $(`<button class="btn btn-default btn-sm">${__("Download CSV template")}</button>`).on(
			"click",
			() => download_import_template()
		);

		const list_btn = $(`<button class="btn btn-default btn-sm">${__(
			"Download existing course names"
		)}</button>`).on("click", () => download_existing_course_names());

		const upload_btn = $(`<button class="btn btn-default btn-sm">${__("Upload CSV")}</button>`).on("click", () => {
			new frappe.ui.FileUploader({
				dialog_title: __("Upload CSV"),
				allow_multiple: false,
				restrictions: { allowed_file_types: [".csv"] },
				on_success(file_doc) {
					frappe.call({
						method: method("parse_import_file"),
						args: { file_name: file_doc.name },
						callback(r) {
							if (r.exc) return;
							state.rows = r.message.rows || [];
							state.created = [];
							state.import_batch = null;
							state.batch_number = null;
							state.import_lock_enabled = undefined;
							state._skip_batch_change = true;
							$batch_select.val("");
							state._skip_batch_change = false;
							state.rolled_over = false;
							state.row_validation = null;
							set_status("");
							render_table();
							refresh_actions();
							frappe.show_alert({ message: __("File loaded"), indicator: "green" });
							run_validate_after_upload();
						},
					});
				},
			});
		});

		const submit_btn = $(
			`<button class="btn btn-primary btn-sm" ${!rows_validation_ready() ? "disabled" : ""}>${__(
				"Submit import"
			)}</button>`
		).on("click", () => run_submit());

		const lockUi = state.import_lock_enabled !== false;
		const rollover_btn = $(
			`<button class="btn btn-warning btn-sm" ${
				!state.import_batch || state.rolled_over || !lockUi ? "disabled" : ""
			}>${__("Roll over (unlock for editing)")}</button>`
		).on("click", () => run_rollover());

		const delete_batch_btn = $(
			`<button class="btn btn-danger btn-sm" ${!state.import_batch ? "disabled" : ""}>${__(
				"Delete entire batch"
			)}</button>`
		).on("click", () => run_delete_entire_batch());

		const reset_btn = $(`<button class="btn btn-default btn-sm">${__("Clear")}</button>`).on("click", () => {
			state.rows = [];
			state.created = [];
			state.import_batch = null;
			state.batch_number = null;
			state.import_lock_enabled = undefined;
			state.rolled_over = false;
			state.row_validation = null;
			state._skip_batch_change = true;
			$batch_select.val("");
			state._skip_batch_change = false;
			set_status("");
			render_table();
			refresh_actions();
			sync_batch_dropdown();
		});

		$actions.append(template_btn, list_btn, upload_btn, submit_btn, rollover_btn, delete_batch_btn, reset_btn);
	}

	function run_submit() {
		if (!state.rows.length || !rows_validation_ready()) return;
		frappe.call({
			method: method("submit_import"),
			args: { rows_json: JSON.stringify(state.rows) },
			callback(r) {
				if (r.exc) return;
				const m = r.message;
				state.import_batch = m.import_batch;
				state.batch_number = m.batch_number != null ? m.batch_number : null;
				state.created = m.created || [];
				state.import_lock_enabled = m.import_lock_enabled !== false;
				state.rows = [];
				state.row_validation = null;
				state.rolled_over = false;
				const batchTitle =
					state.batch_number != null
						? __("Batch {0}", [String(state.batch_number)])
						: frappe.utils.escape_html(state.import_batch || "");
				set_status(
					`<p>${__("Imported")} ${state.created.length} ${__("record(s).")} ${__("Batch:")} ${batchTitle}</p>`,
					false
				);
				render_table();
				refresh_actions();
				sync_batch_dropdown();
				frappe.show_alert({ message: __("Import complete"), indicator: "green" });
			},
		});
	}

	function run_rollover() {
		if (!state.import_batch || state.rolled_over) return;
		frappe.confirm(
			__(
				"Roll over will unlock every Course Name in this batch so they can be edited in the form and saved again. Continue?"
			),
			() => {
				frappe.call({
					method: method("rollover_import_batch"),
					args: { import_batch: state.import_batch },
					callback(r) {
						if (r.exc) return;
						if (r.message.import_lock_enabled !== false) {
							state.rolled_over = true;
						}
						set_status(
							`<p>${__("Unlocked {0} record(s). You can open each Course Name to edit.", [
								String(r.message.unlocked || 0),
							])}</p>`,
							false
						);
						render_table();
						refresh_actions();
						frappe.show_alert({ message: __("Roll over complete"), indicator: "green" });
					},
				});
			}
		);
	}

	function run_delete_entire_batch() {
		if (!state.import_batch) return;
		const bid = state.import_batch;
		const batchTitle =
			state.batch_number != null ? __("Batch {0}", [String(state.batch_number)]) : frappe.utils.escape_html(bid);
		frappe.confirm(
			__(
				"This will permanently delete every Course Name in {0}. Child courses or references may block deletion. Continue?",
				[batchTitle]
			),
			() => {
				frappe.call({
					method: method("delete_import_batch"),
					args: { import_batch: bid },
					callback(r) {
						if (r.exc) return;
						const deleted = r.message.deleted || 0;
						state.created = [];
						state.import_batch = null;
						state.batch_number = null;
						state.import_lock_enabled = undefined;
						state.rolled_over = false;
						state._skip_batch_change = true;
						$batch_select.val("");
						state._skip_batch_change = false;
						set_status(`<p>${__("Deleted {0} course name(s).", [String(deleted)])}</p>`, false);
						render_table();
						refresh_actions();
						sync_batch_dropdown();
						frappe.show_alert({ message: __("Batch deleted"), indicator: "green" });
					},
				});
			}
		);
	}

	page.add_inner_button(__("Guide"), () => show_import_guide());

	render_table();
	refresh_actions();
	sync_batch_dropdown();
	load_dropdown_options();
};
