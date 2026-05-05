# Copyright (c) 2026, !! and contributors
# For license information, please see license.txt

import csv
import io
import random
from pathlib import Path
from typing import Any

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, format_date, getdate


def _legacy_has_import_locked_column() -> bool:
	"""True if DB is migrated; avoids errors when DocType JSON has the field but table does not."""
	return bool(frappe.db.has_column("Legacy Course Record", "import_locked"))


def _import_course_history_guide_path() -> Path:
	return (
		Path(frappe.get_app_path("dat_pm"))
		/ "dat_pm"
		/ "page"
		/ "import_course_histor"
		/ "tutorial"
		/ "import_course_history"
	)


@frappe.whitelist()
def get_import_course_history_guide_html():
	"""HTML for the Import Course History page guide (file: page/.../tutorial/import_course_history)."""
	_can_import_course_history()
	path = _import_course_history_guide_path()
	if not path.is_file():
		frappe.throw(_("The import guide file is missing. Contact your administrator."))
	return path.read_text(encoding="utf-8")


@frappe.whitelist()
def get_course_name_list_csv():
	"""CSV of all Course Name rows (for import reference)."""
	_can_import_course_history()
	rows = frappe.db.sql(
		"""
		SELECT course_name, IFNULL(course_abbreviation, '') AS course_abbreviation
		FROM `tabCourse Name`
		ORDER BY course_name ASC
		""",
		as_dict=True,
	)
	buf = io.StringIO()
	writer = csv.writer(buf)
	writer.writerow(["course_name", "course_abbreviation"])
	for r in rows:
		writer.writerow([(r.get("course_name") or "").strip(), (r.get("course_abbreviation") or "").strip()])
	return buf.getvalue()


class LegacyCourseRecord(Document):
	def validate(self):
		if self.is_new():
			return
		previous = self.get_doc_before_save()
		if not previous:
			return
		if not _legacy_has_import_locked_column():
			return
		if cint(previous.get("import_locked")):
			frappe.throw(
				_(
					"This legacy course record is locked after import. "
					"Use Import Course History → Roll over to unlock for editing."
				)
			)


def _can_import_course_history():
	if frappe.session.user == "Administrator":
		return
	if "Import Course History Manager" in frappe.get_roles() or "System Manager" in frappe.get_roles():
		return
	frappe.throw(_("Not permitted to import legacy course history."), frappe.PermissionError)


def _normalize_header(label: str) -> str:
	return (label or "").strip().lower().replace(" ", "_")


def _row_get(row: dict, *keys: str) -> str | None:
	for k in keys:
		v = row.get(k)
		if v is None:
			continue
		if isinstance(v, str):
			s = v.strip()
			if s:
				return s
		else:
			return str(v)
	return None


def _map_csv_row(raw: dict[str, Any]) -> dict[str, Any]:
	"""Normalize one CSV row dict (already lower_snake headers) to import keys."""
	mapped: dict[str, Any] = {}
	sn = _row_get(
		raw,
		"service_number",
		"personnel",
		"service_no",
		"svc_no",
	)
	if sn:
		mapped["personnel"] = sn
	cn = _row_get(raw, "course_name", "course")
	if cn:
		mapped["course_name"] = cn
	sd = _row_get(raw, "start_date", "start")
	if sd:
		mapped["start_date"] = sd
	ed = _row_get(raw, "end_date", "end")
	if ed:
		mapped["end_date"] = ed
	g = _row_get(raw, "grade")
	if g:
		mapped["grade"] = g
	pn = _row_get(raw, "personnel_name", "name")
	if pn:
		mapped["personnel_name"] = pn
	return mapped


def _decode_file_content(content: str | bytes) -> str:
	"""Frappe File.get_content() may return bytes or str depending on version / path."""
	if isinstance(content, bytes):
		text = content.decode("utf-8-sig")
	else:
		text = str(content)
	if text.startswith("\ufeff"):
		text = text[1:]
	return text


def _existing_legacy_personnel_course_pairs() -> set[tuple[str, str]]:
	rows = frappe.db.sql(
		"""
		SELECT personnel, course_name
		FROM `tabLegacy Course Record`
		WHERE IFNULL(personnel, '') != '' AND IFNULL(course_name, '') != ''
		""",
		as_dict=True,
	)
	return {(r["personnel"], r["course_name"]) for r in rows}


def _find_random_importable_pairs(limit: int = 5, pool: int = 500) -> list[tuple[str, str]]:
	"""Up to `limit` (personnel, course_name) pairs that exist in masters but not yet in Legacy Course Record."""
	personnel = frappe.get_all("Personnel", pluck="name", limit=pool)
	courses = frappe.get_all("Course Name", pluck="name", limit=pool)
	if not personnel or not courses:
		return []
	existing = _existing_legacy_personnel_course_pairs()
	random.shuffle(personnel)
	random.shuffle(courses)
	pairs: list[tuple[str, str]] = []
	for p in personnel:
		for c in courses:
			if len(pairs) >= limit:
				return pairs
			if (p, c) in existing or (p, c) in pairs:
				continue
			pairs.append((p, c))
	return pairs


def _placeholder_template_rows() -> list[dict[str, str]]:
	return [
		{
			"service_number": "SN-001",
			"course_name": "Exact-Course-Name-From-Master",
			"start_date": "2024-01-15",
			"end_date": "2024-06-20",
			"grade": "",
			"personnel_name": "",
		}
	]


@frappe.whitelist()
def get_import_template_sample_rows():
	"""Sample CSV rows using real Personnel and Course Name values; avoids pairs already in Legacy Course Record."""
	_can_import_course_history()
	limit = 5
	pairs = _find_random_importable_pairs(limit=limit)
	if not pairs:
		return {"rows": _placeholder_template_rows(), "source": "placeholder"}

	rows: list[dict[str, str]] = []
	for p, c in pairs:
		pn = frappe.db.get_value("Personnel", p, "personnel_name") or ""
		rows.append(
			{
				"service_number": p,
				"course_name": c,
				"start_date": "",
				"end_date": "",
				"grade": "",
				"personnel_name": pn,
			}
		)
	return {"rows": rows, "source": "database"}


@frappe.whitelist()
def parse_import_file(file_name: str):
	_can_import_course_history()
	if not file_name:
		frappe.throw(_("Attach a CSV file first."))
	file_doc = frappe.get_doc("File", file_name)
	content = file_doc.get_content()
	if not content:
		frappe.throw(_("Empty file."))
	text = _decode_file_content(content)
	reader = csv.DictReader(io.StringIO(text))
	if not reader.fieldnames:
		frappe.throw(_("The CSV has no header row."))
	norm_fields = [_normalize_header(h) for h in reader.fieldnames if h]
	if len(norm_fields) != len(set(norm_fields)):
		frappe.throw(_("Duplicate column headers in CSV."))
	rows_out: list[dict[str, Any]] = []
	for i, raw_row in enumerate(reader):
		if not any((str(v or "").strip()) for v in raw_row.values()):
			continue
		normalized = {
			_normalize_header(k): (v.strip() if isinstance(v, str) else v) for k, v in raw_row.items() if k
		}
		mapped = _map_csv_row(normalized)
		mapped["_row"] = i + 2
		rows_out.append(mapped)
	return {"rows": rows_out}


def _duplicate_pairs_in_upload(rows: list[dict[str, Any]]) -> list[tuple[str, str]]:
	seen: dict[tuple[str, str], int] = {}
	dups: list[tuple[str, str]] = []
	for r in rows:
		p = (r.get("personnel") or "").strip()
		c = (r.get("course_name") or "").strip()
		if not p or not c:
			continue
		key = (p, c)
		seen[key] = seen.get(key, 0) + 1
		if seen[key] == 2:
			dups.append(key)
	return dups


def _pairs_already_in_database(rows: list[dict[str, Any]]) -> list[tuple[str, str]]:
	found: list[tuple[str, str]] = []
	seen_db: set[tuple[str, str]] = set()
	for r in rows:
		p = (r.get("personnel") or "").strip()
		c = (r.get("course_name") or "").strip()
		if not p or not c:
			continue
		key = (p, c)
		if key in seen_db:
			continue
		if frappe.db.exists("Legacy Course Record", {"personnel": p, "course_name": c}):
			found.append(key)
			seen_db.add(key)
	return found


def _validate_rows_per_row(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
	"""Per uploaded row: link errors, duplicate-in-file, duplicate-in-database."""
	pair_counts: dict[tuple[str, str], int] = {}
	for r in rows:
		p = (r.get("personnel") or "").strip()
		c = (r.get("course_name") or "").strip()
		if p and c:
			pair_counts[(p, c)] = pair_counts.get((p, c), 0) + 1

	out: list[dict[str, Any]] = []
	for r in rows:
		row_no = r.get("_row") or "?"
		p = (r.get("personnel") or "").strip()
		c = (r.get("course_name") or "").strip()
		messages: list[str] = []

		if not p:
			messages.append(_("Row {0}: service number / personnel is required.").format(row_no))
		if not c:
			messages.append(_("Row {0}: course name is required.").format(row_no))

		file_duplicate = bool(p and c and pair_counts.get((p, c), 0) > 1)
		database_duplicate = bool(
			p and c and frappe.db.exists("Legacy Course Record", {"personnel": p, "course_name": c})
		)

		if p and c:
			if not frappe.db.exists("Personnel", p):
				messages.append(_("Row {0}: Personnel '{1}' does not exist.").format(row_no, p))
			if not frappe.db.exists("Course Name", c):
				messages.append(_("Row {0}: Course Name '{1}' does not exist.").format(row_no, c))
			g = (r.get("grade") or "").strip()
			if g and not frappe.db.exists("Grade", g):
				messages.append(_("Row {0}: Grade '{1}' does not exist.").format(row_no, g))

		out.append(
			{
				"database_duplicate": database_duplicate,
				"file_duplicate": file_duplicate,
				"messages": messages,
			}
		)
	return out


def _import_rows_are_valid(row_validation: list[dict[str, Any]]) -> bool:
	for rv in row_validation:
		if rv.get("messages"):
			return False
		if rv.get("file_duplicate"):
			return False
		if rv.get("database_duplicate"):
			return False
	return True


def _parse_dates_for_row(r: dict[str, Any]) -> dict[str, Any]:
	out = dict(r)
	for f in ("start_date", "end_date"):
		if not out.get(f):
			out[f] = None
			continue
		try:
			out[f] = getdate(out[f])
		except Exception:
			row_no = r.get("_row") or "?"
			frappe.throw(_("Row {0}: invalid date in {1}.").format(row_no, f))
	return out


@frappe.whitelist()
def validate_import_rows(rows_json: str):
	_can_import_course_history()
	rows: list[dict[str, Any]] = frappe.parse_json(rows_json)
	row_validation = _validate_rows_per_row(rows)
	ok = _import_rows_are_valid(row_validation)
	errors = [m for rv in row_validation for m in rv.get("messages", [])]
	file_dups = _duplicate_pairs_in_upload(rows)
	db_dups = _pairs_already_in_database(rows)
	return {
		"ok": ok,
		"errors": errors,
		"file_duplicates": [{"personnel": a, "course_name": b} for a, b in file_dups],
		"database_duplicates": [{"personnel": a, "course_name": b} for a, b in db_dups],
		"row_validation": row_validation,
	}


@frappe.whitelist()
def submit_import(rows_json: str):
	_can_import_course_history()
	rows: list[dict[str, Any]] = frappe.parse_json(rows_json)
	if not rows:
		frappe.throw(_("No rows to import."))
	row_validation = _validate_rows_per_row(rows)
	structural = [m for rv in row_validation for m in rv.get("messages", [])]
	if structural:
		frappe.throw("\n".join(structural), title=_("Validation failed"))
	if any(rv.get("file_duplicate") for rv in row_validation):
		file_dups = _duplicate_pairs_in_upload(rows)
		msg = ", ".join(f"{a} / {b}" for a, b in file_dups)
		frappe.throw(_("Duplicate service number and course in file: {0}").format(msg))
	if any(rv.get("database_duplicate") for rv in row_validation):
		db_dups = _pairs_already_in_database(rows)
		msg = ", ".join(f"{a} / {b}" for a, b in db_dups)
		frappe.throw(_("Already in database (same personnel and course): {0}").format(msg))

	batch_id = frappe.generate_hash(length=12)
	created: list[dict[str, str]] = []
	for r in rows:
		r2 = _parse_dates_for_row(r)
		row_payload: dict[str, Any] = {
			"doctype": "Legacy Course Record",
			"personnel": r2["personnel"].strip(),
			"course_name": r2["course_name"].strip(),
			"start_date": r2.get("start_date"),
			"end_date": r2.get("end_date"),
			"grade": (r2.get("grade") or "").strip() or None,
			"import_batch": batch_id,
		}
		if _legacy_has_import_locked_column():
			row_payload["import_locked"] = 1
		doc = frappe.get_doc(row_payload)
		doc.insert()
		created.append(
			{
				"name": doc.name,
				"personnel": doc.personnel or "",
				"course_name": doc.course_name or "",
				"start_date": format_date(doc.start_date) if doc.start_date else "",
				"end_date": format_date(doc.end_date) if doc.end_date else "",
				"grade": doc.grade or "",
			}
		)

	return {
		"import_batch": batch_id,
		"created": created,
		"batch_number": _get_batch_number(batch_id),
		"import_lock_enabled": _legacy_has_import_locked_column(),
	}


def _get_batches_ordered_numbered() -> list[dict[str, Any]]:
	"""Oldest batch (by first inserted row) = batch_number 1, then 2, 3, …"""
	rows = frappe.db.sql(
		"""
		SELECT import_batch AS batch, COUNT(*) AS cnt, MAX(modified) AS modified, MIN(creation) AS first_created
		FROM `tabLegacy Course Record`
		WHERE IFNULL(import_batch, '') != ''
		GROUP BY import_batch
		ORDER BY first_created ASC
		""",
		as_dict=True,
	)
	out: list[dict[str, Any]] = []
	for i, r in enumerate(rows, start=1):
		row = dict(r)
		row.pop("first_created", None)
		row["batch_number"] = i
		out.append(row)
	return out


def _get_batch_number(import_batch: str) -> int | None:
	if not import_batch:
		return None
	for b in _get_batches_ordered_numbered():
		if b["batch"] == import_batch:
			return int(b["batch_number"])
	return None


@frappe.whitelist()
def get_import_batches():
	"""Distinct import_batch values with counts and display index (Batch 1, 2, …)."""
	_can_import_course_history()
	return {"batches": _get_batches_ordered_numbered()}


@frappe.whitelist()
def get_batch_records(import_batch: str):
	"""Load all Legacy Course Record rows for a batch (reload batch on the page)."""
	_can_import_course_history()
	if not import_batch:
		frappe.throw(_("Import batch is required."))
	fields = ["name", "personnel", "course_name", "start_date", "end_date", "grade"]
	if _legacy_has_import_locked_column():
		fields.append("import_locked")
	docs = frappe.get_all(
		"Legacy Course Record",
		filters={"import_batch": import_batch},
		fields=fields,
		order_by="name asc",
	)
	if not docs:
		frappe.throw(_("No legacy course records found for this batch."))
	if _legacy_has_import_locked_column():
		locked_any = any(cint(d.get("import_locked")) for d in docs)
	else:
		# No DB column yet: treat as locked so the page matches "just submitted" (roll over / remove / delete work).
		locked_any = True
	created = []
	for d in docs:
		created.append(
			{
				"name": d.name,
				"personnel": d.personnel or "",
				"course_name": d.course_name or "",
				"start_date": format_date(d.get("start_date")) if d.get("start_date") else "",
				"end_date": format_date(d.get("end_date")) if d.get("end_date") else "",
				"grade": d.get("grade") or "",
			}
		)
	return {
		"import_batch": import_batch,
		"batch_number": _get_batch_number(import_batch),
		"created": created,
		"rolled_over": not locked_any,
		"import_lock_enabled": _legacy_has_import_locked_column(),
	}


@frappe.whitelist()
def delete_import_row(doc_name: str, import_batch: str):
	_can_import_course_history()
	if not doc_name or not import_batch:
		frappe.throw(_("Document and batch are required."))
	doc = frappe.get_doc("Legacy Course Record", doc_name)
	if (doc.import_batch or "") != import_batch:
		frappe.throw(_("This record does not belong to the selected import batch."))
	if _legacy_has_import_locked_column() and not cint(doc.get("import_locked")):
		frappe.throw(_("Only locked import rows can be removed from this page. Use the form or list to delete."))
	frappe.delete_doc("Legacy Course Record", doc_name, ignore_permissions=False)


@frappe.whitelist()
def rollover_import_batch(import_batch: str):
	"""Unlock all records in a batch so they can be edited and saved from the form."""
	_can_import_course_history()
	if not import_batch:
		frappe.throw(_("Import batch is required."))
	names = frappe.get_all(
		"Legacy Course Record",
		filters={"import_batch": import_batch},
		pluck="name",
	)
	if not names:
		frappe.throw(_("No legacy course records found for this batch."))
	if _legacy_has_import_locked_column():
		for name in names:
			frappe.db.set_value("Legacy Course Record", name, "import_locked", 0, update_modified=True)
	return {"unlocked": len(names), "import_lock_enabled": _legacy_has_import_locked_column()}


@frappe.whitelist()
def delete_import_batch(import_batch: str):
	"""Permanently delete every Legacy Course Record belonging to this import batch."""
	_can_import_course_history()
	if not import_batch:
		frappe.throw(_("Import batch is required."))
	names = frappe.get_all(
		"Legacy Course Record",
		filters={"import_batch": import_batch},
		pluck="name",
	)
	if not names:
		frappe.throw(_("No legacy course records found for this batch."))
	for name in names:
		frappe.delete_doc("Legacy Course Record", name, ignore_permissions=False)
	return {"deleted": len(names)}
