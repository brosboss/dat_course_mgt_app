// Copyright (c) 2026, !! and contributors
// For license information, please see license.txt

// ─── Module-level state ──────────────────────────────────────────────────────
let _ppaData = [];   // full result set from last server call
let _ppaPage = 1;
const PPA_PAGE_SIZE = 50; // rows per page

// ─── Field event hooks ───────────────────────────────────────────────────────
frappe.ui.form.on("Posting Proposal Analysis", {
    refresh(frm) {
        _ppaData = [];
        _ppaPage = 1;
        load_personnel_list(frm);
    },
    years_in_current_unit(frm) { _ppaPage = 1; load_personnel_list(frm); },
    priimary_specialty_course(frm) { _ppaPage = 1; load_personnel_list(frm); },
    secondary_specialty_course(frm) { _ppaPage = 1; load_personnel_list(frm); },
    auxiliary_specialty_course(frm) { _ppaPage = 1; load_personnel_list(frm); },
    exact_match(frm) { _ppaPage = 1; load_personnel_list(frm); },
});

// ─── Server call ─────────────────────────────────────────────────────────────
function load_personnel_list(frm) {
    const years = frm.doc.years_in_current_unit || null;
    const primary = frm.doc.priimary_specialty_course || null;
    const secondary = frm.doc.secondary_specialty_course || null;
    const auxiliary = frm.doc.auxiliary_specialty_course || null;
    const exactMatch = frm.doc.exact_match ? 1 : 0;

    if (!years && !primary && !secondary && !auxiliary) {
        _ppaData = [];
        render_personnel_table(frm);
        return;
    }

    set_personnel_html(frm, `
        <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">
            <i class="fa fa-spinner fa-spin" style="font-size:20px;display:block;margin-bottom:6px;"></i>
            Loading…
        </div>
    `);

    frappe.call({
        method: `dat_pm.nacstnew.doctype.posting_proposal_analysis.posting_proposal_analysis.get_filtered_personnel_html`,
        args: {
            years_in_current_unit: years, primary_course: primary,
            secondary_course: secondary, auxiliary_course: auxiliary,
            exact_match: exactMatch
        },
        callback(r) {
            const result = r.message;
            if (!result || !result.rows) {
                _ppaData = [];
            } else {
                _ppaData = result.rows;
            }
            _ppaPage = 1;
            render_personnel_table(frm);
        },
        error() {
            set_personnel_html(frm, `<p style="color:red;font-size:12px;">Error loading list. Please try again.</p>`);
        },
    });
}

// ─── Renderer ────────────────────────────────────────────────────────────────
function render_personnel_table(frm) {
    if (!_ppaData.length) {
        const hasFilter = frm.doc.years_in_current_unit
            || frm.doc.priimary_specialty_course
            || frm.doc.secondary_specialty_course
            || frm.doc.auxiliary_specialty_course;
        set_personnel_html(frm, hasFilter
            ? `<p style="font-size:12px;color:var(--text-muted);padding:10px 0;">No personnel found matching the selected criteria.</p>`
            : `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">
                   <i class="fa fa-filter" style="font-size:20px;display:block;margin-bottom:6px;"></i>
                   Enter at least one filter criterion above to see matching personnel.
               </div>`
        );
        return;
    }

    const total = _ppaData.length;
    const totalPages = Math.ceil(total / PPA_PAGE_SIZE);
    _ppaPage = Math.max(1, Math.min(_ppaPage, totalPages));
    const start = (_ppaPage - 1) * PPA_PAGE_SIZE;
    const pageRows = _ppaData.slice(start, start + PPA_PAGE_SIZE);

    // Already-added service numbers (for button state)
    const addedSet = new Set((frm.doc.posting_proposal_analysis_list || []).map(r => r.service_number));

    // Build rows
    const esc = s => $('<div>').text(s).html();
    let rowsHtml = "";
    pageRows.forEach((p, i) => {
        const globalIdx = start + i + 1;
        const isAdded = addedSet.has(p.service_number);
        const btnClass = isAdded ? "ppa-add-btn ppa-added" : "ppa-add-btn";
        const btnLabel = isAdded ? "✓ Added" : "+ Add";
        const bg = (globalIdx % 2 === 0) ? "background:var(--fg-color);" : "";
        rowsHtml += `<tr style="${bg}">
            <td>${globalIdx}</td>
            <td><b>${esc(p.service_number)}</b></td>
            <td>${esc(p.personnel_name)}</td>
            <td>${esc(p.current_rank)}</td>
            <td>${esc(p.current_unit)}</td>
            <td>${esc(p.years_display)}</td>
            <td>${esc(p.main_primary_specialty) || "—"}</td>
            <td>${esc(p.main_secondary_specialty) || "—"}</td>
            <td>${esc(p.main_auxiliary_specialty) || "—"}</td>
            <td style="text-align:center;white-space:nowrap;">
                <button class="btn btn-xs btn-primary ${btnClass}"
                    data-svc="${esc(p.service_number)}"
                    data-unit="${esc(p.current_unit)}"
                    data-yrs="${p.years_int}"
                >${btnLabel}</button>
            </td>
        </tr>`;
    });

    // Pagination controls
    const prevDis = _ppaPage <= 1 ? "disabled" : "";
    const nextDis = _ppaPage >= totalPages ? "disabled" : "";
    const pageInfo = `${start + 1}–${Math.min(start + PPA_PAGE_SIZE, total)} of ${total}`;

    const html = `
    <style>
        .ppa-tbl{width:100%;border-collapse:collapse;font-size:11.5px;}
        .ppa-tbl th{background:var(--subtle-fg);padding:5px 7px;text-align:left;
                    border:1px solid var(--table-border-color);font-weight:600;white-space:nowrap;}
        .ppa-tbl td{padding:3px 7px;border:1px solid var(--table-border-color);
                    vertical-align:middle;line-height:1.3;}
        .ppa-add-btn.ppa-added{background:#5cb85c!important;border-color:#4cae4c!important;
                                cursor:default;pointer-events:none;}
        .ppa-bar{display:flex;align-items:center;justify-content:space-between;
                 margin:6px 0 4px;font-size:11.5px;color:var(--text-muted);}
        .ppa-bar button{font-size:11px;padding:1px 8px;}
        .ppa-pg-info{margin:0 8px;}
    </style>
    <div class="ppa-bar">
        <span>${total} personnel found &nbsp;|&nbsp; Page ${_ppaPage} / ${totalPages}</span>
        <span>
            <button class="btn btn-xs btn-default ppa-prev" ${prevDis}>‹ Prev</button>
            <span class="ppa-pg-info">${pageInfo}</span>
            <button class="btn btn-xs btn-default ppa-next" ${nextDis}>Next ›</button>
        </span>
    </div>
    <table class="ppa-tbl">
        <thead><tr>
            <th>#</th><th>Svc No.</th><th>Name</th><th>Rank</th>
            <th>Unit</th><th>Yrs</th>
            <th>Primary</th><th>Secondary</th><th>Auxiliary</th><th>Add</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
    </table>`;

    set_personnel_html(frm, html);

    // ── Wire buttons (after DOM settles) ──────────────────────────────────
    setTimeout(() => {
        const wrapper = frm.get_field("personnel_list")?.$wrapper
            || frm.fields_dict["personnel_list"]?.$wrapper;
        if (!wrapper) return;

        // Pagination
        wrapper.off("click.ppa_pg")
            .on("click.ppa_pg", ".ppa-prev", () => { _ppaPage--; render_personnel_table(frm); })
            .on("click.ppa_pg", ".ppa-next", () => { _ppaPage++; render_personnel_table(frm); });

        // Add-to-proposal
        wrapper.off("click.ppa_add").on("click.ppa_add", ".ppa-add-btn", function () {
            const $btn = $(this);
            const svc = $btn.data("svc");
            const unit = $btn.data("unit");
            const yrs = parseInt($btn.data("yrs") || 0);

            if (!svc || !unit) {
                frappe.msgprint(__("Service number or unit missing — cannot add row."));
                return;
            }

            const already = (frm.doc.posting_proposal_analysis_list || [])
                .find(r => r.service_number === svc);
            if (already) {
                frappe.show_alert({ message: __("{0} is already in the proposal list.", [svc]), indicator: "orange" });
                $btn.addClass("ppa-added").text("✓ Added");
                return;
            }

            const child = frappe.model.add_child(frm.doc, "Posting Proposal Analysis List", "posting_proposal_analysis_list");
            frappe.model.set_value(child.doctype, child.name, "service_number", svc);
            frappe.model.set_value(child.doctype, child.name, "current_unit", unit);
            frappe.model.set_value(child.doctype, child.name, "years_in_current_unit", yrs);
            frm.refresh_field("posting_proposal_analysis_list");

            frappe.show_alert({ message: __("{0} added to proposal list.", [svc]), indicator: "green" });
            $btn.addClass("ppa-added").text("✓ Added");
        });
    }, 120);
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function set_personnel_html(frm, html) {
    const field = frm.get_field("personnel_list");
    if (field) {
        field.df.options = html;
        field.set_value(html);
    } else {
        frm.set_df_property("personnel_list", "options", html);
        frm.refresh_field("personnel_list");
    }
}
