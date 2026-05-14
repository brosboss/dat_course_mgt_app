# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import csv
import io
import random
from pathlib import Path
from typing import Any

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint


def _cn_has_import_locked_column() -> bool:
	return bool(frappe.db.has_column("Course Name", "import_locked"))


def _import_course_name_guide_path() -> Path:
	return (
		Path(frappe.get_app_path("dat_pm"))
		/ "dat_pm"
		/ "page"
		/ "import_course_name"
		/ "tutorial"
		/ "import_course_name"
	)


@frappe.whitelist()
def get_import_course_name_guide_html():
	_can_import_course_name()
	path = _import_course_name_guide_path()
	if not path.is_file():
		frappe.throw(_("The import guide file is missing. Contact your administrator."))
	return path.read_text(encoding="utf-8")


@frappe.whitelist()
def get_existing_course_names_csv():
	"""CSV of Course Name rows for reference when building imports."""
	_can_import_course_name()
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


class CourseName(Document):
	def validate(self):
		if self.is_new():
			return
		previous = self.get_doc_before_save()
		if not previous:
			return
		if not _cn_has_import_locked_column():
			return
		if cint(previous.get("import_locked")):
			frappe.throw(
				_(
					"This course name is locked after import. "
					"Use Import Course Name → Roll over to unlock for editing."
				)
			)


def _can_import_course_name():
	if frappe.session.user == "Administrator":
		return
	if "Import Course Name Manager" in frappe.get_roles() or "System Manager" in frappe.get_roles():
		return
	frappe.throw(_("Not permitted to import course names."), frappe.PermissionError)


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


def _split_pipe_values(s: str | None) -> list[str]:
	if not s:
		return []
	return [p.strip() for p in str(s).split("|") if p.strip()]


def _cell_str(raw: dict[str, Any], key: str) -> str:
	v = raw.get(key)
	if v is None:
		return ""
	if isinstance(v, str):
		return v.strip()
	return str(v).strip()


def _collect_ranks_from_normalized_row(raw: dict[str, Any]) -> list[str]:
	"""rank_1…rank_5 columns (plus legacy pipe-separated ranks). Order preserved; duplicates dropped."""
	out: list[str] = []
	seen: set[str] = set()
	for i in range(1, 6):
		s = ""
		for key in (f"rank_{i}", f"qualified_rank_{i}", f"rank{i}"):
			t = _cell_str(raw, key)
			if t:
				s = t
				break
		if s and s not in seen:
			seen.add(s)
			out.append(s)
	for pk in ("ranks", "qualified_rank", "qualified_ranks"):
		sv = _cell_str(raw, pk)
		if not sv:
			continue
		for p in _split_pipe_values(sv):
			if p not in seen:
				seen.add(p)
				out.append(p)
	legacy_rank = _cell_str(raw, "rank")
	if legacy_rank and "|" in legacy_rank:
		for p in _split_pipe_values(legacy_rank):
			if p not in seen:
				seen.add(p)
				out.append(p)
	elif legacy_rank and legacy_rank not in seen:
		seen.add(legacy_rank)
		out.append(legacy_rank)
	return out


def _collect_prerequisites_from_normalized_row(raw: dict[str, Any]) -> list[str]:
	"""mandatory_prerequisite_course_1…5 (same pattern as rank_1…5). Also accepts prerequisite_1…5 and pipe columns."""
	out: list[str] = []
	seen: set[str] = set()
	for i in range(1, 6):
		s = ""
		for key in (
			f"mandatory_prerequisite_course_{i}",
			f"mandatory_prerequisite_{i}",
			f"prerequisite_{i}",
			f"prereq_{i}",
			f"prereq{i}",
		):
			t = _cell_str(raw, key)
			if t:
				s = t
				break
		if s and s not in seen:
			seen.add(s)
			out.append(s)
	for pk in ("mandatory_prerequisites", "prerequisites", "mandatory_prerequisite_courses"):
		sv = _cell_str(raw, pk)
		if not sv:
			continue
		for p in _split_pipe_values(sv):
			if p not in seen:
				seen.add(p)
				out.append(p)
	legacy = _cell_str(raw, "mandatory_prerequisite_course")
	if legacy and "|" in legacy:
		for p in _split_pipe_values(legacy):
			if p not in seen:
				seen.add(p)
				out.append(p)
	elif legacy and legacy not in seen:
		seen.add(legacy)
		out.append(legacy)
	return out


def _map_csv_row(raw: dict[str, Any]) -> dict[str, Any]:
	mapped: dict[str, Any] = {}
	cn = _row_get(raw, "course_name", "name", "title")
	if cn:
		mapped["course_name"] = cn
	ca = _row_get(raw, "course_abbreviation", "abbreviation", "abbr")
	if ca:
		mapped["course_abbreviation"] = ca
	pc = _row_get(raw, "parent_course_name", "parent")
	if pc:
		mapped["parent_course_name"] = pc
	cf = _row_get(raw, "course_frequency", "frequency")
	if cf:
		mapped["course_frequency"] = cf
	ranks_list = _collect_ranks_from_normalized_row(raw)
	if ranks_list:
		mapped["ranks"] = ranks_list
	prereq_list = _collect_prerequisites_from_normalized_row(raw)
	if prereq_list:
		mapped["prerequisites"] = prereq_list
	# Expose rank_1…rank_5 and prerequisite slots for inline editing on the import page.
	for i in range(1, 6):
		s = ""
		for key in (f"rank_{i}", f"qualified_rank_{i}", f"rank{i}"):
			t = _cell_str(raw, key)
			if t:
				s = t
				break
		if not s and ranks_list and len(ranks_list) >= i:
			s = ranks_list[i - 1]
		mapped[f"rank_{i}"] = s
	for i in range(1, 6):
		s = ""
		for key in (
			f"mandatory_prerequisite_course_{i}",
			f"mandatory_prerequisite_{i}",
			f"prerequisite_{i}",
			f"prereq_{i}",
			f"prereq{i}",
		):
			t = _cell_str(raw, key)
			if t:
				s = t
				break
		if not s and prereq_list and len(prereq_list) >= i:
			s = prereq_list[i - 1]
		mapped[f"mandatory_prerequisite_course_{i}"] = s
	return mapped


def _sync_row_ranks_and_prereqs_from_slots(r: dict[str, Any]) -> None:
	"""Rebuild ranks / prerequisites lists from rank_1…5 and mandatory_prerequisite_course_1…5."""
	ranks: list[str] = []
	seen_r: set[str] = set()
	for i in range(1, 6):
		s = (r.get(f"rank_{i}") or "").strip()
		if s and s not in seen_r:
			seen_r.add(s)
			ranks.append(s)
	r["ranks"] = ranks
	prereqs: list[str] = []
	seen_p: set[str] = set()
	for i in range(1, 6):
		s = (r.get(f"mandatory_prerequisite_course_{i}") or "").strip()
		if s and s not in seen_p:
			seen_p.add(s)
			prereqs.append(s)
	r["prerequisites"] = prereqs


def _decode_file_content(content: str | bytes) -> str:
	if isinstance(content, bytes):
		text = content.decode("utf-8-sig")
	else:
		text = str(content)
	if text.startswith("\ufeff"):
		text = text[1:]
	return text


def _exists_exact_name(doctype: str, value: str) -> bool:
	"""Case-sensitive existence check for name-based Link values."""
	if not value:
		return False
	res = frappe.db.sql(
		f"SELECT name FROM `tab{doctype}` WHERE BINARY name = %s LIMIT 1",
		(value,),
		as_dict=True,
	)
	return bool(res)


def _course_names_in_upload(rows: list[dict[str, Any]]) -> set[str]:
	out: set[str] = set()
	for r in rows:
		cn = (r.get("course_name") or "").strip()
		if cn:
			out.add(cn)
	return out


def _prerequisite_satisfied_by_db_or_upload(pr: str, names_in_upload: set[str]) -> bool:
	if _exists_exact_name("Course Name", pr):
		return True
	if pr in names_in_upload:
		return True
	return False


def _missing_prerequisite_names_for_stub(rows: list[dict[str, Any]], names_in_upload: set[str]) -> set[str]:
	"""Prerequisite titles that are neither in the DB nor defined as a course on another row in this file."""
	missing: set[str] = set()
	for r in rows:
		_sync_row_ranks_and_prereqs_from_slots(r)
		cn = (r.get("course_name") or "").strip()
		prereqs = r.get("prerequisites") or []
		if isinstance(prereqs, str):
			prereqs = _split_pipe_values(prereqs)
		for pr in prereqs:
			pr = (pr or "").strip()
			if not pr or pr == cn:
				continue
			if _prerequisite_satisfied_by_db_or_upload(pr, names_in_upload):
				continue
			missing.add(pr)
	return missing


def _ranks_for_row(r: dict[str, Any]) -> list[str]:
	_sync_row_ranks_and_prereqs_from_slots(r)
	ranks = r.get("ranks") or []
	if isinstance(ranks, str):
		ranks = _split_pipe_values(ranks)
	return [x for x in ranks if (x or "").strip()]


def _first_row_referencing_prerequisite(rows: list[dict[str, Any]], pr: str) -> dict[str, Any] | None:
	for r in rows:
		_sync_row_ranks_and_prereqs_from_slots(r)
		cn = (r.get("course_name") or "").strip()
		for i in range(1, 6):
			cell = (r.get(f"mandatory_prerequisite_course_{i}") or "").strip()
			if cell == pr and pr != cn:
				return r
		prereqs = r.get("prerequisites") or []
		if isinstance(prereqs, str):
			prereqs = _split_pipe_values(prereqs)
		if pr in [(x or "").strip() for x in prereqs] and pr != cn:
			return r
	return None


def _import_course_prerequisite_cycle_message(rows: list[dict[str, Any]]) -> str | None:
	"""Detect cycles among prerequisites that are both satisfied from rows in this upload (A needs B, B needs A)."""
	names_in_upload = _course_names_in_upload(rows)
	# in-upload prerequisite edges: course -> set of prereqs that are also course names in this file
	prereqs_in_upload: dict[str, set[str]] = {}
	for r in rows:
		_sync_row_ranks_and_prereqs_from_slots(r)
		cn = (r.get("course_name") or "").strip()
		if not cn or cn not in names_in_upload:
			continue
		prereqs = r.get("prerequisites") or []
		if isinstance(prereqs, str):
			prereqs = _split_pipe_values(prereqs)
		edges: set[str] = set()
		for pr in prereqs:
			pr = (pr or "").strip()
			if pr and pr != cn and pr in names_in_upload:
				edges.add(pr)
		if edges:
			prereqs_in_upload[cn] = edges

	if not prereqs_in_upload:
		return None

	in_degree: dict[str, int] = {cn: 0 for cn in names_in_upload}
	dependents: dict[str, list[str]] = {}
	for cn, pres in prereqs_in_upload.items():
		for pr in pres:
			dependents.setdefault(pr, []).append(cn)
			in_degree[cn] = in_degree.get(cn, 0) + 1

	queue = [cn for cn in names_in_upload if in_degree.get(cn, 0) == 0]
	seen = 0
	while queue:
		n = queue.pop(0)
		seen += 1
		for dep in dependents.get(n, []):
			in_degree[dep] -= 1
			if in_degree[dep] == 0:
				queue.append(dep)

	if seen != len(names_in_upload):
		return _(
			"Circular prerequisite dependency among courses in this file (each appears as another row's course name). "
			"Remove or change one of the prerequisite links so the chain is not cyclic."
		)
	return None


def _topological_sort_import_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]] | None:
	"""Insert order: prerequisites that are also rows in this file come before dependents."""
	names_in_upload = _course_names_in_upload(rows)
	by_cn: dict[str, dict[str, Any]] = {}
	for r in rows:
		cn = (r.get("course_name") or "").strip()
		if cn:
			by_cn[cn] = r

	prereqs_in_upload: dict[str, set[str]] = {}
	for r in rows:
		_sync_row_ranks_and_prereqs_from_slots(r)
		cn = (r.get("course_name") or "").strip()
		if not cn or cn not in names_in_upload:
			continue
		prereqs = r.get("prerequisites") or []
		if isinstance(prereqs, str):
			prereqs = _split_pipe_values(prereqs)
		edges: set[str] = set()
		for pr in prereqs:
			pr = (pr or "").strip()
			if pr and pr != cn and pr in names_in_upload:
				edges.add(pr)
		if edges:
			prereqs_in_upload[cn] = edges

	in_degree: dict[str, int] = {cn: 0 for cn in names_in_upload}
	dependents: dict[str, list[str]] = {}
	for cn, pres in prereqs_in_upload.items():
		for pr in pres:
			dependents.setdefault(pr, []).append(cn)
			in_degree[cn] = in_degree.get(cn, 0) + 1

	queue = sorted([cn for cn in names_in_upload if in_degree.get(cn, 0) == 0])
	order: list[str] = []
	while queue:
		n = queue.pop(0)
		order.append(n)
		for dep in sorted(dependents.get(n, [])):
			in_degree[dep] -= 1
			if in_degree[dep] == 0:
				queue.append(dep)
		queue.sort()

	if len(order) != len(names_in_upload):
		return None
	out_rows = [by_cn[c] for c in order if c in by_cn]
	for r in rows:
		cn = (r.get("course_name") or "").strip()
		if not cn or cn not in by_cn:
			out_rows.append(r)
	return out_rows


def _insert_stub_prerequisite_course_if_missing(
	course_title: str,
	ranks: list[str],
	import_batch: str,
	*,
	lock_import_row: bool = True,
	_raise_on_empty_ranks: bool = True,
) -> bool:
	"""Insert a minimal Course Name for a missing prerequisite title. Returns True if a new row was inserted."""
	if not course_title or _exists_exact_name("Course Name", course_title):
		return False
	if not ranks:
		if _raise_on_empty_ranks:
			frappe.throw(
				_("Cannot auto-create missing prerequisite '{0}': the row that references it has no valid ranks.").format(
					course_title
				)
			)
		return False
	row_payload: dict[str, Any] = {
		"doctype": "Course Name",
		"course_name": course_title,
		"course_abbreviation": None,
		"parent_course_name": None,
		"course_frequency": None,
		"qualified_rank": [{"rank": x} for x in ranks],
		"mandatory_prerequisite_course": [],
		"import_batch": import_batch,
	}
	if _cn_has_import_locked_column():
		row_payload["import_locked"] = 1 if lock_import_row else 0
	frappe.get_doc(row_payload).insert()
	return True


def _ranks_existing_in_master(ranks: list[str]) -> list[str]:
	"""Keep rank names that exist (case-sensitive) on Rank."""
	out: list[str] = []
	seen: set[str] = set()
	for x in ranks:
		s = (x or "").strip()
		if not s or s in seen:
			continue
		if _exists_exact_name("Rank", s):
			seen.add(s)
			out.append(s)
	return out


@frappe.whitelist()
def create_missing_prerequisite_courses_from_preview(rows_json: str):
	"""Create Course Name catalogue entries for prerequisite titles in columns 1–5 that are not in the database yet.

	Uses the first preview row that references each title; qualified ranks are taken from that row (valid Rank names only).
	Prerequisite titles that appear as another row's ``course_name`` in the same preview are not created here (the import defines them).
	"""
	_can_import_course_name()
	rows: list[dict[str, Any]] = frappe.parse_json(rows_json)
	if not rows:
		frappe.throw(_("No rows loaded."))
	cycle_msg = _import_course_prerequisite_cycle_message(rows)
	if cycle_msg:
		frappe.throw(cycle_msg)
	names_in_upload = _course_names_in_upload(rows)
	missing = sorted(_missing_prerequisite_names_for_stub(rows, names_in_upload))
	created: list[dict[str, str]] = []
	skipped: list[str] = []
	for pr in missing:
		ref = _first_row_referencing_prerequisite(rows, pr)
		if not ref:
			continue
		ranks = _ranks_for_row(ref)
		valid_ranks = _ranks_existing_in_master(ranks)
		if not valid_ranks:
			skipped.append(pr)
			continue
		if _insert_stub_prerequisite_course_if_missing(
			pr,
			valid_ranks,
			"",
			lock_import_row=False,
			_raise_on_empty_ranks=True,
		):
			created.append({"name": pr, "course_name": pr})
	return {
		"created": created,
		"skipped_no_valid_ranks": skipped,
		"nothing_to_do": not missing,
	}


@frappe.whitelist()
def get_import_course_name_dropdown_options():
	"""Dropdown options for inline correction on Import Course Name page."""
	_can_import_course_name()
	return {
		"rank": frappe.get_all("Rank", pluck="name", order_by="name asc"),
		"course_name": frappe.get_all("Course Name", pluck="name", order_by="name asc"),
		"course_frequency": ["Yearly", "Quaterly", "One-off"],
	}


def _normalize_frequency(val: str | None) -> str | None:
	if not val:
		return None
	s = val.strip()
	if not s:
		return None
	low = s.lower().replace(" ", "").replace("_", "")
	aliases = {
		"yearly": "Yearly",
		"quaterly": "Quaterly",
		"quarterly": "Quaterly",
		"one-off": "One-off",
		"oneoff": "One-off",
	}
	if low in aliases:
		return aliases[low]
	if s in ("Yearly", "Quaterly", "One-off"):
		return s
	return None


def _placeholder_template_rows() -> list[dict[str, str]]:
	ex_r = ["Example-Rank-A", "Example-Rank-B", "Example-Rank-C", "Example-Rank-D", "Example-Rank-E"]
	ex_p = ["Existing-Course-A", "Existing-Course-B", "Existing-Course-C", "Existing-Course-D", "Existing-Course-E"]
	row = {
		"course_name": "New-Unique-Course-Title",
		"course_abbreviation": "NUCT",
		"parent_course_name": "",
		"course_frequency": "Yearly",
	}
	for i, label in enumerate(ex_r, start=1):
		row[f"rank_{i}"] = f"Replace-With-Real-{label}"
	for i, label in enumerate(ex_p, start=1):
		row[f"mandatory_prerequisite_course_{i}"] = f"Replace-With-{label}"
	return [row]


@frappe.whitelist()
def get_import_template_sample_rows():
	_can_import_course_name()
	limit = 5
	rank_pool = frappe.get_all("Rank", pluck="name", limit=200)
	course_pool = frappe.get_all("Course Name", pluck="name", limit=300)
	if not rank_pool:
		return {"rows": _placeholder_template_rows(), "source": "placeholder"}

	existing = set(frappe.get_all("Course Name", pluck="name", limit=2000))
	rows: list[dict[str, str]] = []
	for _ in range(limit):
		pool_copy = list(rank_pool)
		random.shuffle(pool_copy)
		picked_ranks = pool_copy[:5]
		while len(picked_ranks) < 5:
			picked_ranks.append("")
		pc_copy = list(course_pool)
		random.shuffle(pc_copy)
		picked_prereq = pc_copy[:5]
		while len(picked_prereq) < 5:
			picked_prereq.append("")
		for _try in range(20):
			candidate = f"SAMPLE-COURSE-{frappe.generate_hash(length=8)}"
			if candidate not in existing:
				existing.add(candidate)
				rec = {
					"course_name": candidate,
					"course_abbreviation": "",
					"parent_course_name": "",
					"course_frequency": "Yearly",
				}
				for i, rk in enumerate(picked_ranks, start=1):
					rec[f"rank_{i}"] = rk
				for i, pq in enumerate(picked_prereq, start=1):
					rec[f"mandatory_prerequisite_course_{i}"] = pq
				rows.append(rec)
				break
		if len(rows) >= limit:
			break
	if not rows:
		return {"rows": _placeholder_template_rows(), "source": "placeholder"}
	return {"rows": rows, "source": "database"}


@frappe.whitelist()
def parse_import_file(file_name: str):
	_can_import_course_name()
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


def _duplicate_course_names_in_upload(rows: list[dict[str, Any]]) -> set[str]:
	seen: dict[str, int] = {}
	dups: set[str] = set()
	for r in rows:
		cn = (r.get("course_name") or "").strip()
		if not cn:
			continue
		seen[cn] = seen.get(cn, 0) + 1
		if seen[cn] == 2:
			dups.add(cn)
	return dups


def _course_names_already_in_database(rows: list[dict[str, Any]]) -> set[str]:
	found: set[str] = set()
	for r in rows:
		cn = (r.get("course_name") or "").strip()
		if not cn or cn in found:
			continue
		if frappe.db.exists("Course Name", cn):
			found.add(cn)
	return found


def _validate_rows_per_row(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
	name_counts: dict[str, int] = {}
	names_in_upload = _course_names_in_upload(rows)
	for r in rows:
		_sync_row_ranks_and_prereqs_from_slots(r)
		cn = (r.get("course_name") or "").strip()
		if cn:
			name_counts[cn] = name_counts.get(cn, 0) + 1

	out: list[dict[str, Any]] = []
	for r in rows:
		_sync_row_ranks_and_prereqs_from_slots(r)
		row_no = r.get("_row") or "?"
		cn = (r.get("course_name") or "").strip()
		ranks = r.get("ranks") or []
		if isinstance(ranks, str):
			ranks = _split_pipe_values(ranks)
		prereqs = r.get("prerequisites") or []
		if isinstance(prereqs, str):
			prereqs = _split_pipe_values(prereqs)

		messages: list[str] = []
		if not cn:
			messages.append(_("Row {0}, Column 'course_name': course name is required.").format(row_no))

		file_duplicate = bool(cn and name_counts.get(cn, 0) > 1)
		database_duplicate = bool(cn and frappe.db.exists("Course Name", cn))

		if not ranks:
			messages.append(
				_(
					"Row {0}, Column 'rank_1': at least one qualified rank is required (rank_1 … rank_5 or ranks column)."
				).format(row_no)
			)
		else:
			for i in range(1, 6):
				rank_val = (r.get(f"rank_{i}") or "").strip()
				if not rank_val:
					continue
				if not _exists_exact_name("Rank", rank_val):
					col = f"rank_{i}"
					messages.append(
						_("Row {0}, Column '{1}': Rank '{2}' does not exist.").format(row_no, col, rank_val)
					)

		pc = (r.get("parent_course_name") or "").strip()
		if pc and not _exists_exact_name("Course Name", pc):
			messages.append(
				_("Row {0}, Column 'parent_course_name': Parent Course Name '{1}' does not exist.").format(row_no, pc)
			)

		for i in range(1, 6):
			pr = (r.get(f"mandatory_prerequisite_course_{i}") or "").strip()
			if not pr:
				continue
			if pr == cn:
				pcol = f"mandatory_prerequisite_course_{i}"
				messages.append(
					_(
						"Row {0}, Column '{1}': prerequisite cannot be the same as this row's course name."
					).format(row_no, pcol)
				)
				continue
			if _prerequisite_satisfied_by_db_or_upload(pr, names_in_upload):
				continue
			# Otherwise the prerequisite title is missing from the catalogue; submit_import creates a stub
			# Course Name using this row's qualified ranks (requires ranks to be valid above).

		cf = (r.get("course_frequency") or "").strip()
		if cf:
			nf = _normalize_frequency(cf)
			if nf is None:
				messages.append(
					_(
						"Row {0}, Column 'course_frequency': must be Yearly, Quaterly, or One-off."
					).format(row_no)
				)

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


def _augment_validation_for_update(
	rows: list[dict[str, Any]], row_validation: list[dict[str, Any]]
) -> list[dict[str, Any]]:
	"""Add errors for rows whose course_name is not already a Course Name document (update requires an existing record)."""
	out: list[dict[str, Any]] = []
	for i, r in enumerate(rows):
		rv = dict(row_validation[i])
		cn = (r.get("course_name") or "").strip()
		msgs = list(rv.get("messages") or [])
		if cn and not rv.get("database_duplicate"):
			msgs.append(
				_(
					"Row {0}: this course name is not in the database. Remove the row or use Submit import to create it."
				).format(r.get("_row") or "?")
			)
		rv["messages"] = msgs
		out.append(rv)
	return out


def _import_rows_valid_for_update(row_validation: list[dict[str, Any]]) -> bool:
	for rv in row_validation:
		if rv.get("messages"):
			return False
		if rv.get("file_duplicate"):
			return False
		if not rv.get("database_duplicate"):
			return False
	return True


def _apply_import_row_to_course_name_doc(doc: Document, r: dict[str, Any]) -> None:
	"""Set scalar fields and replace Qualified Rank / Mandatory Prerequisite Course children from a preview row."""
	_sync_row_ranks_and_prereqs_from_slots(r)
	ranks = r.get("ranks") or []
	if isinstance(ranks, str):
		ranks = _split_pipe_values(ranks)
	prereqs = r.get("prerequisites") or []
	if isinstance(prereqs, str):
		prereqs = _split_pipe_values(prereqs)
	cf = _normalize_frequency((r.get("course_frequency") or "").strip()) or None
	doc.course_abbreviation = (r.get("course_abbreviation") or "").strip() or None
	doc.parent_course_name = (r.get("parent_course_name") or "").strip() or None
	doc.course_frequency = cf
	for row in list(doc.get("qualified_rank") or []):
		doc.remove(row)
	for x in ranks:
		doc.append("qualified_rank", {"rank": x})
	for row in list(doc.get("mandatory_prerequisite_course") or []):
		doc.remove(row)
	for x in prereqs:
		doc.append("mandatory_prerequisite_course", {"course_name": x})
	doc.save(ignore_permissions=True, ignore_validate=True)


@frappe.whitelist()
def validate_import_rows(rows_json: str):
	_can_import_course_name()
	rows: list[dict[str, Any]] = frappe.parse_json(rows_json)
	row_validation = _validate_rows_per_row(rows)
	rv_update = _augment_validation_for_update(rows, [dict(r) for r in row_validation])
	ok_for_update = _import_rows_valid_for_update(rv_update)
	ok = _import_rows_are_valid(row_validation)
	errors = [m for rv in row_validation for m in rv.get("messages", [])]
	cycle_msg = _import_course_prerequisite_cycle_message(rows)
	if cycle_msg:
		errors.append(cycle_msg)
		ok = False
	file_dups = _duplicate_course_names_in_upload(rows)
	db_dups = _course_names_already_in_database(rows)
	return {
		"ok": ok,
		"ok_for_update": ok_for_update,
		"errors": errors,
		"file_duplicates": list(file_dups),
		"database_duplicates": list(db_dups),
		"row_validation": row_validation,
		"prerequisite_cycle": cycle_msg or "",
	}


@frappe.whitelist()
def submit_import(rows_json: str):
	_can_import_course_name()
	rows: list[dict[str, Any]] = frappe.parse_json(rows_json)
	if not rows:
		frappe.throw(_("No rows to import."))
	row_validation = _validate_rows_per_row(rows)
	structural = [m for rv in row_validation for m in rv.get("messages", [])]
	if structural:
		frappe.throw("\n".join(structural), title=_("Validation failed"))
	if any(rv.get("file_duplicate") for rv in row_validation):
		d = _duplicate_course_names_in_upload(rows)
		frappe.throw(_("Duplicate course name in file: {0}").format(", ".join(sorted(d))))
	if any(rv.get("database_duplicate") for rv in row_validation):
		d = _course_names_already_in_database(rows)
		frappe.throw(_("Already in database: {0}").format(", ".join(sorted(d))))

	cycle_msg = _import_course_prerequisite_cycle_message(rows)
	if cycle_msg:
		frappe.throw(cycle_msg, title=_("Validation failed"))

	batch_id = frappe.generate_hash(length=12)
	names_in_upload = _course_names_in_upload(rows)
	for pr in sorted(_missing_prerequisite_names_for_stub(rows, names_in_upload)):
		ref = _first_row_referencing_prerequisite(rows, pr)
		if not ref:
			continue
		_insert_stub_prerequisite_course_if_missing(pr, _ranks_for_row(ref), batch_id)

	sorted_rows = _topological_sort_import_rows(rows)
	if sorted_rows is None:
		frappe.throw(
			_(
				"Circular prerequisite dependency among courses in this file (each appears as another row's course name). "
				"Remove or change one of the prerequisite links so the chain is not cyclic."
			),
			title=_("Validation failed"),
		)

	created: list[dict[str, str]] = []
	for r in sorted_rows:
		_sync_row_ranks_and_prereqs_from_slots(r)
		cn = (r.get("course_name") or "").strip()
		ranks = r.get("ranks") or []
		if isinstance(ranks, str):
			ranks = _split_pipe_values(ranks)
		prereqs = r.get("prerequisites") or []
		if isinstance(prereqs, str):
			prereqs = _split_pipe_values(prereqs)

		cf = _normalize_frequency((r.get("course_frequency") or "").strip()) or None
		row_payload: dict[str, Any] = {
			"doctype": "Course Name",
			"course_name": cn,
			"course_abbreviation": (r.get("course_abbreviation") or "").strip() or None,
			"parent_course_name": (r.get("parent_course_name") or "").strip() or None,
			"course_frequency": cf,
			"qualified_rank": [{"rank": x} for x in ranks],
			"mandatory_prerequisite_course": [{"course_name": x} for x in prereqs],
			"import_batch": batch_id,
		}
		if _cn_has_import_locked_column():
			row_payload["import_locked"] = 1
		doc = frappe.get_doc(row_payload)
		doc.insert()
		ranks_s = ", ".join(ranks)
		prereqs_s = ", ".join(prereqs)
		created.append(
			{
				"name": doc.name,
				"course_name": doc.course_name or "",
				"course_abbreviation": doc.course_abbreviation or "",
				"parent_course_name": doc.parent_course_name or "",
				"course_frequency": doc.course_frequency or "",
				"ranks": ranks_s,
				"prerequisites": prereqs_s,
			}
		)

	return {
		"import_batch": batch_id,
		"created": created,
		"batch_number": _get_batch_number(batch_id),
		"import_lock_enabled": _cn_has_import_locked_column(),
	}


@frappe.whitelist()
def update_import_rows(rows_json: str):
	"""Overwrite existing Course Name documents from CSV/Excel preview rows (same columns as import)."""
	_can_import_course_name()
	rows: list[dict[str, Any]] = frappe.parse_json(rows_json)
	if not rows:
		frappe.throw(_("No rows to update."))
	row_validation = _validate_rows_per_row(rows)
	row_validation = _augment_validation_for_update(rows, row_validation)
	structural = [m for rv in row_validation for m in rv.get("messages", [])]
	if structural:
		frappe.throw("\n".join(structural), title=_("Validation failed"))
	if any(rv.get("file_duplicate") for rv in row_validation):
		d = _duplicate_course_names_in_upload(rows)
		frappe.throw(_("Duplicate course name in file: {0}").format(", ".join(sorted(d))))
	if not _import_rows_valid_for_update(row_validation):
		frappe.throw(_("Every row must match an existing Course Name in the database."), title=_("Validation failed"))

	names_in_upload = _course_names_in_upload(rows)
	for pr in sorted(_missing_prerequisite_names_for_stub(rows, names_in_upload)):
		ref = _first_row_referencing_prerequisite(rows, pr)
		if not ref:
			continue
		_insert_stub_prerequisite_course_if_missing(
			pr,
			_ranks_for_row(ref),
			"",
			lock_import_row=False,
			_raise_on_empty_ranks=True,
		)

	updated: list[dict[str, str]] = []
	for r in rows:
		_sync_row_ranks_and_prereqs_from_slots(r)
		cn = (r.get("course_name") or "").strip()
		if not cn:
			continue
		doc = frappe.get_doc("Course Name", cn)
		_apply_import_row_to_course_name_doc(doc, r)
		ranks = r.get("ranks") or []
		if isinstance(ranks, str):
			ranks = _split_pipe_values(ranks)
		prereqs = r.get("prerequisites") or []
		if isinstance(prereqs, str):
			prereqs = _split_pipe_values(prereqs)
		updated.append(
			{
				"name": doc.name,
				"course_name": doc.course_name or "",
				"course_abbreviation": doc.course_abbreviation or "",
				"parent_course_name": doc.parent_course_name or "",
				"course_frequency": doc.course_frequency or "",
				"ranks": ", ".join(ranks),
				"prerequisites": ", ".join(prereqs),
			}
		)

	return {"updated": updated, "count": len(updated)}


def _get_batches_ordered_numbered() -> list[dict[str, Any]]:
	rows = frappe.db.sql(
		"""
		SELECT import_batch AS batch, COUNT(*) AS cnt, MAX(modified) AS modified, MIN(creation) AS first_created
		FROM `tabCourse Name`
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
	_can_import_course_name()
	return {"batches": _get_batches_ordered_numbered()}


def _ranks_display_for_parents(names: list[str]) -> dict[str, str]:
	if not names:
		return {}
	placeholders = ", ".join(["%s"] * len(names))
	rows = frappe.db.sql(
		f"""
		SELECT parent, `rank`
		FROM `tabQualified Rank`
		WHERE parenttype = 'Course Name' AND parent IN ({placeholders})
		ORDER BY idx ASC
		""",
		tuple(names),
		as_dict=True,
	)
	acc: dict[str, list[str]] = {}
	for row in rows:
		p = row.parent
		acc.setdefault(p, []).append(row.rank or "")
	return {k: ", ".join(v) for k, v in acc.items()}


def _prerequisites_display_for_parents(names: list[str]) -> dict[str, str]:
	if not names:
		return {}
	placeholders = ", ".join(["%s"] * len(names))
	rows = frappe.db.sql(
		f"""
		SELECT parent, course_name
		FROM `tabMandatory Prerequisite Course`
		WHERE parenttype = 'Course Name' AND parent IN ({placeholders})
		ORDER BY idx ASC
		""",
		tuple(names),
		as_dict=True,
	)
	acc: dict[str, list[str]] = {}
	for row in rows:
		p = row.parent
		cn = row.course_name or ""
		if cn:
			acc.setdefault(p, []).append(cn)
	return {k: ", ".join(v) for k, v in acc.items()}


@frappe.whitelist()
def get_batch_records(import_batch: str):
	_can_import_course_name()
	if not import_batch:
		frappe.throw(_("Import batch is required."))
	fields = [
		"name",
		"course_name",
		"course_abbreviation",
		"parent_course_name",
		"course_frequency",
	]
	if _cn_has_import_locked_column():
		fields.append("import_locked")
	docs = frappe.get_all(
		"Course Name",
		filters={"import_batch": import_batch},
		fields=fields,
		order_by="name asc",
	)
	if not docs:
		frappe.throw(_("No course names found for this batch."))
	if _cn_has_import_locked_column():
		locked_any = any(cint(d.get("import_locked")) for d in docs)
	else:
		locked_any = True
	names = [d.name for d in docs]
	rank_map = _ranks_display_for_parents(names)
	prereq_map = _prerequisites_display_for_parents(names)
	created = []
	for d in docs:
		created.append(
			{
				"name": d.name,
				"course_name": d.course_name or "",
				"course_abbreviation": d.course_abbreviation or "",
				"parent_course_name": d.parent_course_name or "",
				"course_frequency": d.course_frequency or "",
				"ranks": rank_map.get(d.name, ""),
				"prerequisites": prereq_map.get(d.name, ""),
			}
		)
	return {
		"import_batch": import_batch,
		"batch_number": _get_batch_number(import_batch),
		"created": created,
		"rolled_over": not locked_any,
		"import_lock_enabled": _cn_has_import_locked_column(),
	}


@frappe.whitelist()
def delete_import_row(doc_name: str, import_batch: str):
	_can_import_course_name()
	if not doc_name or not import_batch:
		frappe.throw(_("Document and batch are required."))
	doc = frappe.get_doc("Course Name", doc_name)
	if (doc.import_batch or "") != import_batch:
		frappe.throw(_("This record does not belong to the selected import batch."))
	if _cn_has_import_locked_column() and not cint(doc.get("import_locked")):
		frappe.throw(_("Only locked import rows can be removed from this page. Use the form or list to delete."))
	frappe.delete_doc("Course Name", doc_name, ignore_permissions=False)


@frappe.whitelist()
def rollover_import_batch(import_batch: str):
	_can_import_course_name()
	if not import_batch:
		frappe.throw(_("Import batch is required."))
	names = frappe.get_all(
		"Course Name",
		filters={"import_batch": import_batch},
		pluck="name",
	)
	if not names:
		frappe.throw(_("No course names found for this batch."))
	if _cn_has_import_locked_column():
		for name in names:
			frappe.db.set_value("Course Name", name, "import_locked", 0, update_modified=True)
	return {"unlocked": len(names), "import_lock_enabled": _cn_has_import_locked_column()}


@frappe.whitelist()
def delete_import_batch(import_batch: str):
	_can_import_course_name()
	if not import_batch:
		frappe.throw(_("Import batch is required."))
	names = frappe.get_all(
		"Course Name",
		filters={"import_batch": import_batch},
		pluck="name",
	)
	if not names:
		frappe.throw(_("No course names found for this batch."))
	for name in names:
		frappe.delete_doc("Course Name", name, ignore_permissions=False)
	return {"deleted": len(names)}
