# Copyright (c) 2026, !! and contributors
# For license information, please see license.txt

import os
import shutil
import subprocess

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_bench_path

APP_NAME = "dat_pm"


class SystemUpdate(Document):
	pass


def _ensure_system_manager():
	frappe.only_for("System Manager")


def _app_repo_path():
	return os.path.join(get_bench_path(), "apps", APP_NAME)


def _bench_cmd(bench_root: str) -> str | None:
	candidate = os.path.join(bench_root, "env", "bin", "bench")
	if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
		return candidate
	return shutil.which("bench")


def _run_git(args: list[str], cwd: str, timeout: int = 300) -> subprocess.CompletedProcess:
	return subprocess.run(
		["git", *args],
		cwd=cwd,
		capture_output=True,
		text=True,
		timeout=timeout,
	)


def _short_rev(app_path: str, rev: str) -> str | None:
	r = _run_git(["rev-parse", "--short", rev], app_path, timeout=30)
	if r.returncode != 0:
		return None
	return (r.stdout or "").strip()


def _get_origin_url(app_path: str) -> str | None:
	r = _run_git(["remote", "get-url", "origin"], app_path, timeout=10)
	if r.returncode != 0:
		return None
	url = (r.stdout or "").strip()
	return url or None


def _summarize_fetch_error(stderr: str, stdout: str) -> str:
	raw = ((stderr or "") + "\n" + (stdout or "")).strip()
	text = " ".join(raw.split())
	low = text.lower()
	if not text:
		return str(_("Could not contact the remote (no details from git)."))
	# HTTPS + no TTY: git tries to prompt for user/password and fails under Frappe/workers
	if "could not read username" in low:
		return str(
			_(
				"GitHub (HTTPS) needs credentials, but the server cannot show a login prompt. "
				"Use an SSH remote instead: git remote set-url origin git@github.com:ORG/REPO.git "
				"and add a deploy key for that repo, or configure a credential helper / token for the OS user that runs bench."
			)
		)
	if "does not appear to be a git repository" in low:
		return str(
			_(
				"Remote «origin» is missing or its URL is not a valid git repository. "
				"On the server, run: git remote -v (in apps/{0}) and fix or add origin."
			).format(APP_NAME)
		)
	if "could not read from remote" in low:
		return str(
			_("Cannot read from the remote — check the URL, network, VPN, and SSH keys (for git@… URLs).")
		)
	if "permission denied" in low:
		return str(_("Permission denied when connecting to the remote (SSH key or credentials)."))
	if "authentication failed" in low or "access denied" in low:
		return str(_("Authentication failed for the remote repository."))
	if "connection timed out" in low or "could not resolve host" in low:
		return str(_("Network error: could not reach the git host."))
	return text[:200] + ("…" if len(text) > 200 else "")


@frappe.whitelist()
def get_update_info():
	"""Installed app version and git state (local vs origin)."""
	_ensure_system_manager()

	try:
		from dat_pm import __version__ as installed_version
	except ImportError:
		installed_version = "?"

	app_path = _app_repo_path()
	if not os.path.isdir(os.path.join(app_path, ".git")):
		return {
			"installed_version": installed_version,
			"branch": None,
			"local_commit": None,
			"remote_commit": None,
			"update_available": False,
			"hint": _("This app is not a git checkout; deploy updates manually."),
		}

	branch_r = _run_git(["rev-parse", "--abbrev-ref", "HEAD"], app_path, timeout=30)
	branch = (branch_r.stdout or "").strip() if branch_r.returncode == 0 else None

	local = _short_rev(app_path, "HEAD")
	origin_url = _get_origin_url(app_path)
	remote = None
	fetch_ok = False
	remote_hint = None

	if not origin_url:
		remote_hint = str(
			_(
				"No git remote named «origin». From the bench machine, run: "
				"cd apps/{0} && git remote add origin <your-repo-url>"
			).format(APP_NAME)
		)
	else:
		fetch_r = _run_git(["fetch", "origin"], app_path, timeout=180)
		if fetch_r.returncode != 0:
			remote_hint = _summarize_fetch_error(fetch_r.stderr or "", fetch_r.stdout or "")
		else:
			fetch_ok = True

	if fetch_ok:
		if branch:
			remote = _short_rev(app_path, f"origin/{branch}")
		if not remote:
			for fb in ("origin/main", "origin/master"):
				remote = _short_rev(app_path, fb)
				if remote:
					break

	update_available = bool(local and remote and local != remote)
	return {
		"installed_version": installed_version,
		"branch": branch,
		"local_commit": local,
		"remote_commit": remote,
		"update_available": update_available,
		"remote_hint": remote_hint,
		"can_pull_from_origin": bool(origin_url),
	}


@frappe.whitelist()
def start_update(docname: str | None = None):
	"""Queue (or run inline) pull, build, migrate for this app."""
	_ensure_system_manager()
	if not docname:
		frappe.throw(_("Save the document first."))

	doc = frappe.get_doc("System Update", docname)
	if doc.status == "Updating":
		frappe.throw(_("An update is already in progress."))

	app_path = _app_repo_path()
	if not _get_origin_url(app_path):
		frappe.throw(
			_(
				"Git remote «origin» is not set for apps/{0}. Add it on the server, then try again. "
				"Example: cd apps/{0} && git remote add origin <repository-url>"
			).format(APP_NAME)
		)

	prefetch = _run_git(["fetch", "origin"], app_path, timeout=120)
	if prefetch.returncode != 0:
		frappe.throw(_summarize_fetch_error(prefetch.stderr or "", prefetch.stdout or ""))

	now = frappe.utils.now()
	doc.db_set("status", "Updating", update_modified=False)
	doc.db_set("update_log", f"{now}\n" + _("Starting update…") + "\n", update_modified=False)
	frappe.db.commit()

	method = "dat_pm.dat_pm.doctype.system_update.system_update.execute_app_update"
	try:
		frappe.enqueue(method, queue="long", timeout=3600, docname=docname)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "System Update: enqueue failed; running inline")
		execute_app_update(docname=docname)

	return {"ok": True}


def execute_app_update(docname: str):
	"""Pull latest dat_pm, rebuild assets, migrate and clear cache for current site."""
	doc = frappe.get_doc("System Update", docname)
	log_parts: list[str] = []

	def log(msg: str):
		log_parts.append(msg.rstrip())
		doc.db_set("update_log", (doc.update_log or "") + "\n" + msg.rstrip(), update_modified=False)
		frappe.db.commit()

	def run_bench(args: list[str], timeout: int = 3600):
		bench_root = get_bench_path()
		cmd = _bench_cmd(bench_root)
		if not cmd:
			raise RuntimeError(_("bench executable not found (expected env/bin/bench under {0})").format(bench_root))
		full = [cmd, *args]
		log("$ " + " ".join(full))
		p = subprocess.run(full, cwd=bench_root, capture_output=True, text=True, timeout=timeout)
		if p.stdout:
			log(p.stdout)
		if p.stderr:
			log(p.stderr)
		if p.returncode != 0:
			raise RuntimeError(_("Command failed with exit code {0}").format(p.returncode))

	try:
		app_path = _app_repo_path()
		if not os.path.isdir(app_path):
			raise RuntimeError(_("App path not found: {0}").format(app_path))

		for desc, gargs, tout in (
			("git fetch origin", ["fetch", "origin"], 300),
			("git pull --ff-only", ["pull", "--ff-only"], 300),
		):
			log(f"$ git (in apps/{APP_NAME}) " + " ".join(gargs))
			p = _run_git(gargs, app_path, timeout=tout)
			if p.stdout:
				log(p.stdout)
			if p.stderr:
				log(p.stderr)
			if p.returncode != 0:
				raise RuntimeError(_("{0} failed (exit {1})").format(desc, p.returncode))

		site = frappe.local.site
		run_bench(["build", "--app", APP_NAME], timeout=3600)
		run_bench(["--site", site, "migrate"], timeout=3600)
		run_bench(["--site", site, "clear-cache"], timeout=600)

		try:
			from dat_pm import __version__ as v
		except ImportError:
			v = "?"
		rev = _short_rev(app_path, "HEAD") or "?"
		summary = _("Completed. App version {0}, commit {1}.").format(v, rev)

		doc.db_set("status", "Completed", update_modified=False)
		doc.db_set("latest_version", f"{v} ({rev})", update_modified=False)
		log("\n" + summary)
		frappe.db.commit()

	except Exception:
		doc.db_set("status", "Failed", update_modified=False)
		log("\n" + frappe.get_traceback())
		frappe.db.commit()
