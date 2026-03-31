# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

"""
Fixtures module for inserting initial data into doctypes when the app is installed.
This module contains all the data that should be populated automatically during app installation.
"""

import frappe


@frappe.whitelist()
def install_fixtures():
	"""
	Main function to install all fixtures.
	This function is called after app installation via the after_install hook.
	Can also be run manually after installation to add missing fixtures.
	
	Returns a summary of what was inserted, skipped, and failed.
	"""
	print("\n" + "="*70)
	print("Installing Initial Data Fixtures...")
	print("="*70)
	
	results = []
	total_inserted = 0
	total_skipped = 0
	total_errors = 0
	
	# Define all fixture functions to run
	fixture_functions = [
		("Geopolitical Zones", insert_geopolitical_zones),
		("Nigeria States", insert_nigeria_states),
		("Personnel Categories", ensure_personnel_categories),
		("Ranks", insert_ranks),
		("Managed Data Import Documents", insert_managed_data_import_documents),
		("Role Permissions for Can Import Data", insert_role_permissions_can_import_data),
		("Types of Commission", insert_types_of_commission),
		("Courses", insert_courses),
		("Course Names", insert_course_names),
		("Appointments", insert_appointments),
		("Commander Appointments", insert_commander_appointments),
		("Units", insert_all_units),
		("Grades", insert_grades),
		("Module Profiles", insert_module_profiles),
		("App Role List", insert_app_role_list),
		("Attachment Types", insert_attachment_types),
	]
	
	# Run each fixture function independently
	for name, func in fixture_functions:
		try:
			print(f"\n[{name}] Processing...")
			result = func()
			frappe.db.commit()
			
			# Extract results (functions return dict with inserted/skipped/errors)
			if isinstance(result, dict):
				inserted = result.get("inserted", 0)
				skipped = result.get("skipped", 0)
				errors = result.get("errors", 0)
				error_details = result.get("error_details", [])
			else:
				# For functions that don't return detailed results
				inserted = 0
				skipped = 0
				errors = 0
				error_details = []
			
			total_inserted += inserted
			total_skipped += skipped
			total_errors += errors
			
			status_msg = []
			if inserted > 0:
				status_msg.append(f"Inserted: {inserted}")
			if skipped > 0:
				status_msg.append(f"Already existed (skipped): {skipped}")
			if errors > 0:
				status_msg.append(f"Errors: {errors}")
			
			status = " | ".join(status_msg) if status_msg else "No action needed"
			print(f"  ✓ {status}")
			
			results.append({
				"name": name,
				"inserted": inserted,
				"skipped": skipped,
				"errors": errors,
				"error_details": error_details,
				"status": "success" if errors == 0 else "partial" if inserted > 0 else "failed"
			})
			
		except Exception as e:
			frappe.db.rollback()
			error_msg = str(e)
			traceback_str = frappe.get_traceback()
			frappe.log_error(traceback_str, f"Fixtures Installation Error - {name}")
			
			total_errors += 1
			print(f"  ✗ Error: {error_msg}")
			
			results.append({
				"name": name,
				"inserted": 0,
				"skipped": 0,
				"errors": 1,
				"error_details": [error_msg],
				"status": "failed"
			})
	
	# Print detailed summary
	print("\n" + "="*70)
	print("FIXTURES INSTALLATION SUMMARY")
	print("="*70)
	
	# Show successful/partial results
	successful = [r for r in results if r["status"] == "success" and r["inserted"] > 0]
	partial = [r for r in results if r["status"] == "partial"]
	no_action = [r for r in results if r["status"] == "success" and r["inserted"] == 0 and r["skipped"] > 0]
	failed = [r for r in results if r["status"] == "failed"]
	
	if successful:
		print(f"\n✓ Successfully Inserted ({len(successful)}):")
		for r in successful:
			print(f"  • {r['name']}: {r['inserted']} items inserted, {r['skipped']} already existed")
	
	if no_action:
		print(f"\n○ Already Complete ({len(no_action)}):")
		for r in no_action:
			print(f"  • {r['name']}: All items already exist ({r['skipped']} skipped)")
	
	if partial:
		print(f"\n⚠ Partial Success ({len(partial)}):")
		for r in partial:
			print(f"  • {r['name']}: {r['inserted']} inserted, {r['skipped']} skipped, {r['errors']} errors")
			if r.get("error_details"):
				for detail in r["error_details"][:3]:  # Show first 3 errors
					print(f"    - {detail}")
	
	if failed:
		print(f"\n✗ Failed ({len(failed)}):")
		for r in failed:
			print(f"  • {r['name']}")
			if r.get("error_details"):
				for detail in r["error_details"][:3]:  # Show first 3 errors
					print(f"    - {detail}")
	
	# Overall summary
	print("\n" + "-"*70)
	print(f"TOTAL: {total_inserted} inserted | {total_skipped} skipped | {total_errors} errors")
	
	if total_errors > 0:
		print("\n⚠ Some fixtures had errors. Check Error Log for detailed tracebacks.")
		print("   You can run this function again - it will skip existing items.")
	else:
		print("\n✓ All fixtures processed successfully!")
	
	print("="*70 + "\n")
	
	# Return results for programmatic access
	return {
		"total_inserted": total_inserted,
		"total_skipped": total_skipped,
		"total_errors": total_errors,
		"results": results,
		"success": total_errors == 0
	}


def insert_geopolitical_zones():
	"""Insert all 6 Nigerian geopolitical zones"""
	
	geopolitical_zones = [
		"North West",
		"North East",
		"North Central",
		"South West",
		"South East",
		"South South"
	]
	
	inserted_count = 0
	skipped_count = 0
	error_count = 0
	error_details = []
	
	for zone_name in geopolitical_zones:
		if frappe.db.exists("Geopolitical Zone", zone_name):
			skipped_count += 1
			continue
		
		try:
			zone_doc = frappe.get_doc({
				"doctype": "Geopolitical Zone",
				"geopolitical_zone": zone_name
			})
			zone_doc.insert(ignore_permissions=True)
			inserted_count += 1
		except Exception as e:
			error_count += 1
			error_details.append(f"{zone_name}: {str(e)}")
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": error_count,
		"error_details": error_details
	}


def insert_nigeria_states():
	"""Insert all 37 Nigerian states (36 states + FCT) with their geopolitical zones"""
	
	# Define all states with their geopolitical zones
	states_data = [
		# North West (7 states)
		{"state": "Jigawa", "geopolitical_zone": "North West"},
		{"state": "Kaduna", "geopolitical_zone": "North West"},
		{"state": "Kano", "geopolitical_zone": "North West"},
		{"state": "Katsina", "geopolitical_zone": "North West"},
		{"state": "Kebbi", "geopolitical_zone": "North West"},
		{"state": "Sokoto", "geopolitical_zone": "North West"},
		{"state": "Zamfara", "geopolitical_zone": "North West"},
		
		# North East (6 states)
		{"state": "Adamawa", "geopolitical_zone": "North East"},
		{"state": "Bauchi", "geopolitical_zone": "North East"},
		{"state": "Borno", "geopolitical_zone": "North East"},
		{"state": "Gombe", "geopolitical_zone": "North East"},
		{"state": "Taraba", "geopolitical_zone": "North East"},
		{"state": "Yobe", "geopolitical_zone": "North East"},
		
		# North Central (7 states including FCT)
		{"state": "Benue", "geopolitical_zone": "North Central"},
		{"state": "Kogi", "geopolitical_zone": "North Central"},
		{"state": "Kwara", "geopolitical_zone": "North Central"},
		{"state": "Nasarawa", "geopolitical_zone": "North Central"},
		{"state": "Niger", "geopolitical_zone": "North Central"},
		{"state": "Plateau", "geopolitical_zone": "North Central"},
		{"state": "Federal Capital Territory", "geopolitical_zone": "North Central"},
		
		# South West (6 states)
		{"state": "Ekiti", "geopolitical_zone": "South West"},
		{"state": "Lagos", "geopolitical_zone": "South West"},
		{"state": "Ogun", "geopolitical_zone": "South West"},
		{"state": "Ondo", "geopolitical_zone": "South West"},
		{"state": "Osun", "geopolitical_zone": "South West"},
		{"state": "Oyo", "geopolitical_zone": "South West"},
		
		# South East (5 states)
		{"state": "Abia", "geopolitical_zone": "South East"},
		{"state": "Anambra", "geopolitical_zone": "South East"},
		{"state": "Ebonyi", "geopolitical_zone": "South East"},
		{"state": "Enugu", "geopolitical_zone": "South East"},
		{"state": "Imo", "geopolitical_zone": "South East"},
		
		# South South (6 states)
		{"state": "Akwa Ibom", "geopolitical_zone": "South South"},
		{"state": "Bayelsa", "geopolitical_zone": "South South"},
		{"state": "Cross River", "geopolitical_zone": "South South"},
		{"state": "Delta", "geopolitical_zone": "South South"},
		{"state": "Edo", "geopolitical_zone": "South South"},
		{"state": "Rivers", "geopolitical_zone": "South South"}
	]
	
	inserted_count = 0
	skipped_count = 0
	
	for state_info in states_data:
		state_name = state_info["state"]
		zone_name = state_info["geopolitical_zone"]
		
		# Check if state already exists
		if frappe.db.exists("State", state_name):
			skipped_count += 1
			continue
		
		# Create state document
		# The before_save hook will automatically populate the abbreviation
		state_doc = frappe.get_doc({
			"doctype": "State",
			"state": state_name,
			"geopolitical_zone": zone_name
		})
		state_doc.save(ignore_permissions=True)  # Use save to trigger before_save hook
		inserted_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": 0,
		"error_details": []
	}


def ensure_personnel_categories():
	"""Ensure Officer and Soldier personnel categories exist"""
	
	categories = [
		{"name": "Officer", "category": "Officer"},
		{"name": "Soldier", "category": "Soldier"}
	]
	
	inserted_count = 0
	skipped_count = 0
	error_count = 0
	error_details = []
	
	for cat_info in categories:
		if frappe.db.exists("Personnel Category", cat_info["name"]):
			skipped_count += 1
			continue
		
		try:
			category_doc = frappe.get_doc({
				"doctype": "Personnel Category",
				"personnel_category": cat_info["category"]
			})
			category_doc.insert(ignore_permissions=True)
			inserted_count += 1
		except Exception as e:
			error_msg = f"Could not create Personnel Category '{cat_info['name']}': {str(e)}"
			error_details.append(error_msg)
			error_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": error_count,
		"error_details": error_details
	}


def insert_ranks():
	"""Insert all ranks for officers and soldiers"""
	error_count = 0
	# Ensure personnel categories exist first
	ensure_personnel_categories()
	
	# Officer ranks
	officer_ranks = [
		{"rank": "FM", "rank_in_full": "Field Marshal", "personnel_category": "Officer"},
		{"rank": "GEN", "rank_in_full": "General", "personnel_category": "Officer"},
		{"rank": "LT GEN", "rank_in_full": "Lieutenant General", "personnel_category": "Officer"},
		{"rank": "MAJ GEN", "rank_in_full": "Major General", "personnel_category": "Officer"},
		{"rank": "BRIG GEN", "rank_in_full": "Brigadier General", "personnel_category": "Officer"},
		{"rank": "COL", "rank_in_full": "Colonel", "personnel_category": "Officer"},
		{"rank": "LT COL", "rank_in_full": "Lieutenant Colonel", "personnel_category": "Officer"},
		{"rank": "MAJ", "rank_in_full": "Major", "personnel_category": "Officer"},
		{"rank": "CAPT", "rank_in_full": "Captain", "personnel_category": "Officer"},
		{"rank": "LT", "rank_in_full": "Lieutenant", "personnel_category": "Officer"},
		{"rank": "2LT", "rank_in_full": "Second Lieutenant", "personnel_category": "Officer"},
		{"rank": "OCDT", "rank_in_full": "Officer Cadet", "personnel_category": "Officer"}
	]
	
	# Soldier ranks
	soldier_ranks = [
		{"rank": "AWO", "rank_in_full": "Army Warrant Officer", "personnel_category": "Soldier"},
		{"rank": "MWO", "rank_in_full": "Master Warrant Officer", "personnel_category": "Soldier"},
		{"rank": "WO", "rank_in_full": "Warrant Officer", "personnel_category": "Soldier"},
		{"rank": "SSGT", "rank_in_full": "Staff Sergeant", "personnel_category": "Soldier"},
		{"rank": "SGT", "rank_in_full": "Sergeant", "personnel_category": "Soldier"},
		{"rank": "CPL", "rank_in_full": "Corporal", "personnel_category": "Soldier"},
		{"rank": "LCPL", "rank_in_full": "Lance Corporal", "personnel_category": "Soldier"},
		{"rank": "PTE", "rank_in_full": "Private", "personnel_category": "Soldier"},
		{"rank": "REC", "rank_in_full": "Recruit", "personnel_category": "Soldier"}
	]
	
	all_ranks = officer_ranks + soldier_ranks
	
	inserted_count = 0
	skipped_count = 0
	
	for rank_info in all_ranks:
		rank_abbrev = rank_info["rank"]
		
		# Check if rank already exists
		if frappe.db.exists("Rank", rank_abbrev):
			skipped_count += 1
			continue
		
		# Verify personnel category exists
		if not frappe.db.exists("Personnel Category", rank_info["personnel_category"]):
			print(f"Warning: Personnel Category '{rank_info['personnel_category']}' does not exist. Skipping rank {rank_abbrev}")
			skipped_count += 1
			continue
		
		# Create rank document
		rank_doc = frappe.get_doc({
			"doctype": "Rank",
			"rank": rank_abbrev,
			"rank_in_full": rank_info["rank_in_full"],
			"personnel_category": rank_info["personnel_category"]
		})
		rank_doc.insert(ignore_permissions=True)
		inserted_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": error_count,
		"error_details": []
	}


def insert_types_of_commission():
	"""Insert all types of commission"""
	
	commission_types = [
		"RC",
		"SSC",
		"DSSC",
		"EC"
	]
	
	inserted_count = 0
	skipped_count = 0
	
	for commission_type in commission_types:
		# Check if commission type already exists
		if frappe.db.exists("Type of Commission", commission_type):
			skipped_count += 1
			continue
		
		# Create commission type document
		commission_doc = frappe.get_doc({
			"doctype": "Type of Commission",
			"type_of_commission": commission_type
		})
		commission_doc.insert(ignore_permissions=True)
		inserted_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": 0,
		"error_details": []
	}


def insert_courses():
	"""Insert courses from 1RC to 100RC"""
	
	inserted_count = 0
	skipped_count = 0
	
	for i in range(1, 101):  # 1 to 100
		course_name = f"{i}RC"
		
		# Check if course already exists
		if frappe.db.exists("Course", course_name):
			skipped_count += 1
			continue
		
		# Create course document
		# added personnel category to the course
		course_doc = frappe.get_doc({
			"doctype": "Course",
			"course": course_name,
			"personnel_category": "Officer"
		})
		course_doc.insert(ignore_permissions=True)
		inserted_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": 0,
		"error_details": []
	}


def insert_course_names():
	"""Insert course names with their abbreviations"""
	
	course_names_data = [
		{"course_name": "Driving Basic Course", "course_abbreviation": "Dvr B3"},
		{"course_name": "Driving Upgrading B2 Course", "course_abbreviation": "Dvr B2"},
		{"course_name": "Driving Upgrading B1 Course", "course_abbreviation": "Dvr B1"},
		{"course_name": "Catering Basic Course", "course_abbreviation": "Cat B3"},
		{"course_name": "Catering Upgrading B2 Course", "course_abbreviation": "Cat B2"},
		{"course_name": "Catering Upgrading B1 Course", "course_abbreviation": "Cat B1"},
		{"course_name": "Supply/Storeman Basic Course", "course_abbreviation": "Sup/Stmn B3"},
		{"course_name": "Supply/Storeman Upgrading B2 Course", "course_abbreviation": "Sup/Stmn B2"},
		{"course_name": "Supply/Storeman Upgrading B1 Course", "course_abbreviation": "Sup/Stmn B1"},
		{"course_name": "Fire and Safety Basic Course", "course_abbreviation": "FS X2"},
		{"course_name": "Fire and Safety Intermediate Course", "course_abbreviation": "FS X1"},
		{"course_name": "Tank Transporter Course", "course_abbreviation": "Tk Tptr X1"},
		{"course_name": "Instructors Course", "course_abbreviation": "Instr Cse"},
		{"course_name": "Supply and Transport Combat Cook Course", "course_abbreviation": "ST Combat Cook X1"}
	]
	
	inserted_count = 0
	skipped_count = 0
	
	for course_info in course_names_data:
		course_name = course_info["course_name"]
		course_abbrev = course_info.get("course_abbreviation", "")
		
		# Check if course name already exists
		if frappe.db.exists("Course Name", course_name):
			skipped_count += 1
			continue
		
		# Create course name document
		course_name_doc = frappe.get_doc({
			"doctype": "Course Name",
			"course_name": course_name,
			"course_abbreviation": course_abbrev
		})
		course_name_doc.insert(ignore_permissions=True)
		inserted_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": 0,
		"error_details": []
	}


@frappe.whitelist()
def verify_course_names():
	"""Verify that all course names were inserted correctly"""
	course_names = frappe.get_all("Course Name", fields=["course_name", "course_abbreviation"], order_by="course_name")
	
	return {
		"total": len(course_names),
		"course_names": [
			{
				"course_name": cn.course_name,
				"course_abbreviation": cn.course_abbreviation
			}
			for cn in course_names
		]
	}


def insert_appointments():
	"""Insert all appointments"""
	
	appointments = [
		"Instructor",
		"Platoon Trainer",
		"Company Trainer",
		"Directing Staff (DS)",
		"Senior Directing Staff (SDS)",
		"Chief Instructor",
		"Commandant (Training Institution)",
		"Deputy Commandant",
		"Operations Officer",
		"Intelligence Officer",
		"Plans Officer",
		"Training Officer",
		"Logistics Officer",
		"Civil–Military Cooperation (CIMIC) Officer",
		"Public Relations Officer",
		"Staff Officer Grade 3 (SO3)",
		"Staff Officer Grade 2 (SO2)",
		"Staff Officer Grade 1 (SO1)",
		"Director (at Army HQ level)",
		"Section Commander",
		"Platoon Commander",
		"Company Commander",
		"Battalion Commander",
		"Brigade Commander",
		"Garrison Commander",
		"Divisional Commander",
		"Corps Commander",
		"Theatre Commander",
		"General Officer Commanding (GOC)",
		"Chief of Army Staff (COAS)"
	]
	
	inserted_count = 0
	skipped_count = 0
	
	for appointment_name in appointments:
		# Check if appointment already exists
		if frappe.db.exists("Appointment", appointment_name):
			skipped_count += 1
			continue
		
		# Create appointment document
		appointment_doc = frappe.get_doc({
			"doctype": "Appointment",
			"appointment": appointment_name
		})
		appointment_doc.insert(ignore_permissions=True)
		inserted_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": 0,
		"error_details": []
	}


def insert_commander_appointments():
	"""Insert commander appointments - appointments that are categorized as commanders"""
	
	# Commander appointments that should be marked as commanders
	commander_appointments = [
		"Battalion Commander",
		"Brigade Commander",
		"Garrison Commander"
	]
	
	inserted_count = 0
	skipped_count = 0
	error_count = 0
	error_details = []
	
	for appointment_name in commander_appointments:
		# Check if the appointment exists first, if not create it
		if not frappe.db.exists("Appointment", appointment_name):
			try:
				appointment_doc = frappe.get_doc({
					"doctype": "Appointment",
					"appointment": appointment_name
				})
				appointment_doc.insert(ignore_permissions=True)
			except Exception as e:
				error_msg = f"Could not create appointment '{appointment_name}': {str(e)}"
				error_details.append(error_msg)
				error_count += 1
				continue
		
		# Check if commander appointment already exists
		if frappe.db.exists("Commander Appointment", appointment_name):
			skipped_count += 1
			continue
		
		# Create commander appointment document
		try:
			commander_appointment_doc = frappe.get_doc({
				"doctype": "Commander Appointment",
				"appointment": appointment_name
			})
			commander_appointment_doc.insert(ignore_permissions=True)
			inserted_count += 1
		except Exception as e:
			error_msg = f"Error creating commander appointment '{appointment_name}': {str(e)}"
			error_details.append(error_msg)
			error_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": error_count,
		"error_details": error_details
	}


@frappe.whitelist()
def verify_appointments():
	"""Verify that all appointments were inserted correctly"""
	appointments = frappe.get_all("Appointment", fields=["appointment"], order_by="appointment")
	
	return {
		"total": len(appointments),
		"appointments": [a.appointment for a in appointments]
	}


@frappe.whitelist()
def verify_courses():
	"""Verify that all courses were inserted correctly"""
	courses = frappe.get_all("Course", fields=["course"], order_by="course")
	
	# Get first 5 and last 5 for verification
	first_five = [c.course for c in courses[:5]]
	last_five = [c.course for c in courses[-5:]] if len(courses) >= 5 else []
	
	return {
		"total": len(courses),
		"first_five": first_five,
		"last_five": last_five,
		"all_courses": [c.course for c in courses]
	}


@frappe.whitelist()
def verify_types_of_commission():
	"""Verify that all types of commission were inserted correctly"""
	commissions = frappe.get_all("Type of Commission", fields=["type_of_commission"], order_by="type_of_commission")
	
	return {
		"total": len(commissions),
		"types": [c.type_of_commission for c in commissions]
	}


@frappe.whitelist()
def verify_ranks():
	"""Verify that all ranks were inserted correctly"""
	ranks = frappe.get_all("Rank", fields=["rank", "rank_in_full", "personnel_category"], order_by="personnel_category, rank")
	
	officer_ranks = [r for r in ranks if r.personnel_category == "Officer"]
	soldier_ranks = [r for r in ranks if r.personnel_category == "Soldier"]
	
	return {
		"total": len(ranks),
		"officers": len(officer_ranks),
		"soldiers": len(soldier_ranks),
		"officer_ranks": [{"rank": r.rank, "rank_in_full": r.rank_in_full} for r in officer_ranks],
		"soldier_ranks": [{"rank": r.rank, "rank_in_full": r.rank_in_full} for r in soldier_ranks]
	}


def get_state_from_location(location):
	"""
	Map a location (city or state name) to its corresponding Nigerian state.
	Returns the state name if found, otherwise returns the location as-is.
	"""
	# Nigerian states list
	nigerian_states = [
		"Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
		"Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
		"Ekiti", "Enugu", "Federal Capital Territory", "Gombe", "Imo",
		"Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
		"Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
		"Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
	]
	
	# If location is already a state, return it
	if location in nigerian_states:
		return location
	
	# Map of major cities to their states
	city_to_state = {
		# Major cities
		"Abuja": "Federal Capital Territory",
		"Lagos": "Lagos",
		"Kano": "Kano",
		"Ibadan": "Oyo",
		"Port Harcourt": "Rivers",
		"Benin City": "Edo",
		"Kaduna": "Kaduna",
		"Aba": "Abia",
		"Maiduguri": "Borno",
		"Zaria": "Kaduna",
		"Ilorin": "Kwara",
		"Jos": "Plateau",
		"Warri": "Delta",
		"Onitsha": "Anambra",
		"Akure": "Ondo",
		"Enugu": "Enugu",
		"Abeokuta": "Ogun",
		"Calabar": "Cross River",
		"Uyo": "Akwa Ibom",
		"Owerri": "Imo",
		"Minna": "Niger",
		"Lokoja": "Kogi",
		"Ado Ekiti": "Ekiti",
		"Osogbo": "Osun",
		"Makurdi": "Benue",
		"Bauchi": "Bauchi",
		"Gombe": "Gombe",
		"Yola": "Adamawa",
		"Jalingo": "Taraba",
		"Sokoto": "Sokoto",
		"Birnin Kebbi": "Kebbi",
		"Gusau": "Zamfara",
		"Dutse": "Jigawa",
		"Damaturu": "Yobe",
		"Asaba": "Delta",
		"Yenagoa": "Bayelsa",
		"Abakaliki": "Ebonyi",
		"Umuahia": "Abia",
		"Awka": "Anambra",
		"Ogoja": "Cross River",
		"Katsina": "Katsina",
		"Keffi": "Nasarawa"
	}
	
	# Check if location is a known city
	if location in city_to_state:
		return city_to_state[location]
	
	# If not found, return the location as-is (user will need to correct it)
	return location


def insert_units(units_data):
	"""
	Insert units into the Unit doctype.
	
	Args:
		units_data: List of dictionaries, each containing:
			- "unit": Unit name (required)
			- "location": Location (city or state name) (required)
	
	Example:
		units_data = [
			{"unit": "1st Division", "location": "Kaduna"},
			{"unit": "2nd Division", "location": "Ibadan"},
			{"unit": "3rd Armoured Division", "location": "Jos"}
		]
	"""
	inserted_count = 0
	skipped_count = 0
	error_count = 0
	error_details = []
	
	for unit_info in units_data:
		unit_name = unit_info.get("unit")
		location = unit_info.get("location")
		
		if not unit_name:
			error_msg = f"Unit with missing name: {unit_info}"
			error_details.append(error_msg)
			error_count += 1
			continue
		
		# Skip units with "Not stated" location
		if not location or location.strip() == "Not stated":
			error_msg = f"Unit '{unit_name}' has 'Not stated' location - skipped"
			error_details.append(error_msg)
			error_count += 1
			continue
		
		# Check if unit already exists
		if frappe.db.exists("Unit", unit_name):
			skipped_count += 1
			continue
		
		# Get state from location - ensure it matches exactly with State doctype
		state = get_state_from_location(location.strip())
		
		# Verify state exists in database
		if not frappe.db.exists("State", state):
			error_msg = f"Unit '{unit_name}': State '{state}' not found in database"
			error_details.append(error_msg)
			error_count += 1
			continue
		
		# Create unit document
		# The region field will be auto-populated via fetch_from from the state's geopolitical zone
		try:
			unit_doc = frappe.get_doc({
				"doctype": "Unit",
				"unit": unit_name,
				"unit_location": state
			})
			unit_doc.insert(ignore_permissions=True)
			inserted_count += 1
		except Exception as e:
			error_msg = f"Unit '{unit_name}': {str(e)}"
			error_details.append(error_msg)
			error_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": error_count,
		"error_details": error_details
	}


def insert_all_units():
	"""Insert all NACST units into the Unit doctype"""
	
	units_data = [
		{"unit": "Office of the COAS ST Bn", "location": "Federal Capital Territory"},
		{"unit": "AHQ Gar ST Bde", "location": "Federal Capital Territory"},
		{"unit": "AHQ Gar Tpt Bn", "location": "Federal Capital Territory"},
		{"unit": "HQ NACST", "location": "Lagos"},
		{"unit": "HQ NACST – Dir of Tpt", "location": "Lagos"},
		{"unit": "HQ NACST – Dir of Sup/Utilities", "location": "Lagos"},
		{"unit": "HQ NACST – Dir of Fire and Safety", "location": "Lagos"},
		{"unit": "HQ NACST – Dir of Inspection", "location": "Lagos"},
		{"unit": "HQ NACST – Directorate of Cat and Hosp Svcs", "location": "Lagos"},
		{"unit": "HQ NACST Admin Bn", "location": "Lagos"},
		{"unit": "NASST", "location": "Edo"},
		{"unit": "NASST Demo Bn", "location": "Edo"},
		{"unit": "NAFRL ST", "location": "Federal Capital Territory"},
		{"unit": "NAPEX", "location": "Lagos"},
		{"unit": "STDS", "location": "Federal Capital Territory"},
		{"unit": "ST Foods Ltd", "location": "Federal Capital Territory"},
		{"unit": "70 Comd ST", "location": "Lagos"},
		{"unit": "701 Tpt Bn", "location": "Lagos"},
		{"unit": "702 Tpt", "location": "Federal Capital Territory"},
		{"unit": "703 ST PC Bn", "location": "Lagos"},
		{"unit": "704 ST Boat Bn", "location": "Cross River"},
		{"unit": "70 ST Admin Bn", "location": "Lagos"},
		{"unit": "71 ST Bde", "location": "Kaduna"},
		{"unit": "71 PRD", "location": "Kaduna"},
		{"unit": "710 Tpt Bn", "location": "Kaduna"},
		{"unit": "711 ST Bn", "location": "Kano"},
		{"unit": "712 ST Bn", "location": "Niger"},
		{"unit": "713 ST Bn", "location": "Jigawa"},
		{"unit": "72 ST Bde", "location": "Oyo"},
		{"unit": "72 PRD", "location": "Oyo"},
		{"unit": "720 Tpt Bn", "location": "Oyo"},
		{"unit": "721 ST Bn", "location": "Edo"},
		{"unit": "722 ST Bn", "location": "Kwara"},
		{"unit": "723 ST Bn", "location": "Kogi"},
		{"unit": "73 ST Bde", "location": "Plateau"},
		{"unit": "73 PRD", "location": "Plateau"},
		{"unit": "730 Tpt Bn", "location": "Plateau"},
		{"unit": "731 ST Bn", "location": "Adamawa"},
		{"unit": "732 ST Bn", "location": "Taraba"},
		{"unit": "733 ST Bn", "location": "Yobe"},
		{"unit": "74 ST Bde", "location": "Enugu"},
		{"unit": "74 PRD", "location": "Ebonyi"},
		{"unit": "740 Tpt Bn", "location": "Enugu"},
		{"unit": "741 ST Bn", "location": "Cross River"},
		{"unit": "742 ST Bn", "location": "Abia"},
	
		{"unit": "75 ST Bde", "location": "Lagos"},
		{"unit": "750 Tpt Bn", "location": "Lagos"},
		{"unit": "751 ST Bn", "location": "Lagos"},
		{"unit": "753 ST Bn", "location": "Borno"},
		{"unit": "76 ST Bde", "location": "Rivers"},
		{"unit": "760 Tpt Bn", "location": "Rivers"},
		{"unit": "761 ST Bn", "location": "Akwa Ibom"},
		{"unit": "762 ST Bn", "location": "Bayelsa"},
		{"unit": "763 ST Bn", "location": "Delta"},
		{"unit": "764 ST Bn", "location": "Borno"},
		{"unit": "77 ST Bde", "location": "Borno"},
		{"unit": "770 Tpt Bn", "location": "Borno"},
		{"unit": "771 ST Bn", "location": "Borno"},
		{"unit": "772 ST Bn", "location": "Borno"},
		{"unit": "773 ST Bn", "location": "Borno"},
		{"unit": "78 ST Bde", "location": "Sokoto"},
		{"unit": "780 Tpt Bn", "location": "Sokoto"},
		{"unit": "781 ST Bn", "location": "Zamfara"},
		{"unit": "782 ST Bn", "location": "Katsina"},
		{"unit": "79 ST Bde", "location": "Nasarawa"},
		{"unit": "79 Tpt Bn", "location": "Nasarawa"},
		{"unit": "791 ST Bn", "location": "Benue"},
		{"unit": "792 ST Bn", "location": "Borno"},
		{"unit": "403 Amph Bde ST", "location": "Borno"},
		{"unit": "Gds Bde ST Bn", "location": "Federal Capital Territory"},
		{"unit": "Sect 2 ST Bde OPHK", "location": "Yobe"},
		{"unit": "Sect 3 ST Bde OPHK", "location": "Borno"},
		{"unit": "25 TF ST Bn", "location": "Borno"},
		{"unit": "26 TF ST Bn", "location": "Borno"},
		{"unit": "27 TF ST Bn", "location": "Yobe"},
		{"unit": "28 TF ST Bn", "location": "Borno"},
		{"unit": "29 TF ST Bn", "location": "Borno"},
		{"unit": "AHQ Log Base I ST", "location": "Borno"},
		{"unit": "AHQ Log Base II ST", "location": "Yobe"},
		{"unit": "AHQ Log Base III ST", "location": "Adamawa"},
		{"unit": "AHQ Log Base IV ST", "location": "Borno"},
		{"unit": "DHQ ST", "location": "Federal Capital Territory"},
		{"unit": "NDA ST Bn", "location": "Kaduna"},
		{"unit": "AFCSC ST", "location": "Kaduna"},
		{"unit": "NDC ST", "location": "Federal Capital Territory"},
		{"unit": "JTF (OPDS) ST", "location": "Bayelsa"},
		{"unit": "DIA ST", "location": "Federal Capital Territory"},
		{"unit": "DSA ST", "location": "Federal Capital Territory"},
		{"unit": "NAFRC ST", "location": "Lagos"},
		{"unit": "DICON ST", "location": "Kaduna"},
		{"unit": "DEPOT NA ST", "location": "Kaduna"},
		{"unit": "DEPOT NA ST (Osun)", "location": "Osun"},
		{"unit": "NATRAC ST", "location": "Niger"},
		{"unit": "MLAILPKC ST", "location": "Kaduna"},
		{"unit": "NACOLM ST", "location": "Lagos"},
		{"unit": "TRADOC ST", "location": "Niger"},
		{"unit": "DPM ST", "location": "Federal Capital Territory"},
		{"unit": "NMS ST", "location": "Kaduna"},
		{"unit": "ICC/NASI ST", "location": "Kaduna"},
		{"unit": "NAAS ST", "location": "Bauchi"},
		{"unit": "NASA ST", "location": "Kaduna"},
		{"unit": "NASME ST", "location": "Benue"},
		{"unit": "NASS ST", "location": "Lagos"},
		{"unit": "NASMP ST", "location": "Kaduna"},
		{"unit": "NACOE ST", "location": "Kwara"},
		{"unit": "NASLS ST", "location": "Kaduna"},
		{"unit": "NACON ST", "location": "Lagos"},
		{"unit": "WOA ST", "location": "Kaduna"},
		{"unit": "NASFA ST", "location": "Lagos"},
		{"unit": "NADC ST", "location": "Lagos"},
		{"unit": "NALI ST", "location": "Abia"},
		{"unit": "AWCN ST", "location": "Federal Capital Territory"},
		{"unit": "NARC ST", "location": "Federal Capital Territory"},
		{"unit": "NAWC ST", "location": "Federal Capital Territory"},
		{"unit": "PMTL", "location": "Lagos"},
		{"unit": "CSS Suleja ST", "location": "Niger"},
		{"unit": "CSS Mbiri ST", "location": "Delta"},
		{"unit": "CSS Lafiya ST", "location": "Nasarawa"},
		{"unit": "CSSS Boys Jega ST", "location": "Kebbi"},
		{"unit": "CSSS Girls Sokoto ST", "location": "Sokoto"},
		{"unit": "CSSS Girls Gusau ST", "location": "Zamfara"},
		{"unit": "CSSS Boys Mafara ST", "location": "Zamfara"},
		{"unit": "CSSS Orlu ST", "location": "Imo"},
		{"unit": "CSSS Girls Barkiya ST", "location": "Katsina"},
		{"unit": "CSSS Girls Miriga ST", "location": "Niger"},
		{"unit": "CSSS Boys Auno ST", "location": "Borno"},
		{"unit": "CSSS Anbursa ST", "location": "Kebbi"},
		{"unit": "CSSS Shagari ST", "location": "Sokoto"},
		{"unit": "CSSS Numan ST", "location": "Adamawa"},
		{"unit": "CSSS Effa-Etenen ST", "location": "Akwa Ibom"},
		{"unit": "CSSS Akada ST", "location": "Nasarawa"},
		{"unit": "CTSS Akwanga ST", "location": "Nasarawa"},
		{"unit": "CSS Ipaja ST", "location": "Lagos"},
		{"unit": "CSS Kaduna ST", "location": "Kaduna"},
		{"unit": "CSS Jos ST", "location": "Plateau"},
		{"unit": "CSS Apata Ibadan ST", "location": "Oyo"},
		{"unit": "CSS Abakaliki ST", "location": "Ebonyi"}
	]
	
	return insert_units(units_data)


def insert_grades():
	"""Insert all grades for course grading"""
	
	# Common military course grades
	grades = [
		"A",
		"B",
		"C",
		"D",
		"E",
		"F",
		"Pass",
		"Fail",
		"Excellent",
		"Good",
		"Satisfactory",
		"Fair",
		"Poor",
		"Distinction",
		"Credit",
		"Merit"
	]
	
	inserted_count = 0
	skipped_count = 0
	
	for grade_name in grades:
		# Check if grade already exists
		if frappe.db.exists("Grade", grade_name):
			skipped_count += 1
			continue
		
		# Create grade document
		grade_doc = frappe.get_doc({
			"doctype": "Grade",
			"grade": grade_name
		})
		grade_doc.insert(ignore_permissions=True)
		inserted_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": 0,
		"error_details": []
	}


@frappe.whitelist()
def verify_grades():
	"""Verify that all grades were inserted correctly"""
	grades = frappe.get_all("Grade", fields=["grade"], order_by="grade")
	
	return {
		"total": len(grades),
		"grades": [g.grade for g in grades]
	}


@frappe.whitelist()
def export_app_role_list_for_fixtures():
	"""
	Export current App Role List entries in a format suitable for fixtures.
	Run this function on your current instance to get the fixture data.
	Returns a Python list format that can be copied directly into fixtures.
	"""
	app_role_list_entries = frappe.get_all(
		"App Role List",
		fields=["app_role", "owner_doctype"],
		order_by="app_role"
	)
	
	# Format as Python list for fixtures
	fixture_data = []
	for entry in app_role_list_entries:
		entry_dict = {"app_role": entry.app_role}
		if entry.owner_doctype:
			entry_dict["owner_doctype"] = entry.owner_doctype
		else:
			entry_dict["owner_doctype"] = None
		fixture_data.append(entry_dict)
	
	# Also print in Python code format for easy copy-paste
	print("\n=== App Role List Fixture Data ===\n")
	print("app_role_entries = [")
	for entry in fixture_data:
		owner_doctype_str = f'"{entry["owner_doctype"]}"' if entry["owner_doctype"] else "None"
		print(f'\t{{"app_role": "{entry["app_role"]}", "owner_doctype": {owner_doctype_str}}},')
	print("]\n")
	
	return {
		"total": len(fixture_data),
		"entries": fixture_data,
		"python_code": fixture_data
	}


@frappe.whitelist()
def export_managed_data_import_documents_for_fixtures():
	"""
	Export current Managed Data Import Document entries in a format suitable for fixtures.
	Run this on an instance where you've already configured the managed doctypes.
	The printed Python list can be copied into insert_managed_data_import_documents().
	"""
	entries = frappe.get_all(
		"Managed Data Import Document",
		fields=["managed_doctype"],
		order_by="managed_doctype",
	)

	fixture_data = [{"managed_doctype": e.managed_doctype} for e in entries]

	print("\n=== Managed Data Import Document Fixture Data ===\n")
	print("managed_data_import_entries = [")
	for entry in fixture_data:
		print(f'\t{{"managed_doctype": "{entry["managed_doctype"]}"}},')
	print("]\n")

	return {
		"total": len(fixture_data),
		"entries": fixture_data,
		"python_code": fixture_data,
	}


@frappe.whitelist()
def export_module_profiles_for_fixtures():
	"""
	Export current Module Profile entries in a format suitable for fixtures.
	Run this function on your current instance to get the fixture data.
	Returns a Python list format that can be copied directly into fixtures.
	"""
	module_profiles = frappe.get_all(
		"Module Profile",
		fields=["module_profile_name"],
		order_by="module_profile_name"
	)
	
	# Format as Python list for fixtures
	fixture_data = []
	for profile in module_profiles:
		fixture_data.append({"module_profile_name": profile.module_profile_name})
	
	# Also print in Python code format for easy copy-paste
	print("\n=== Module Profile Fixture Data ===\n")
	print("module_profile_entries = [")
	for entry in fixture_data:
		print(f'\t{{"module_profile_name": "{entry["module_profile_name"]}"}},')
	print("]\n")
	
	return {
		"total": len(fixture_data),
		"entries": fixture_data,
		"python_code": fixture_data
	}


def insert_module_profiles():
	"""Insert Module Profile entries"""
	
	# Module Profile entries extracted from current instance
	module_profile_entries = [
		{"module_profile_name": "No Module"},
	]
	
	inserted_count = 0
	skipped_count = 0
	error_count = 0
	error_details = []
	
	for entry in module_profile_entries:
		module_profile_name = entry["module_profile_name"]
		
		# Check if module profile already exists
		if frappe.db.exists("Module Profile", module_profile_name):
			skipped_count += 1
			continue
		
		try:
			# Create Module Profile document
			# Note: block_modules table is auto-managed by the system via on_update hook
			module_profile_doc = frappe.get_doc({
				"doctype": "Module Profile",
				"module_profile_name": module_profile_name
			})
			module_profile_doc.insert(ignore_permissions=True)
			inserted_count += 1
		except Exception as e:
			error_msg = f"Error inserting Module Profile '{module_profile_name}': {str(e)}"
			error_details.append(error_msg)
			error_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": error_count,
		"error_details": error_details
	}


def insert_managed_data_import_documents():
	"""Insert Managed Data Import Document records for managed doctypes.

	The actual list of managed doctypes should mirror what you are currently using
	on your main instance. To generate it, run:

	    frappe.call("nacstnew.nacstnew.nacstnew.fixtures.export_managed_data_import_documents_for_fixtures")

	on the configured site and copy the printed `managed_data_import_entries` list
	into `managed_entries` below.
	"""

	managed_entries = [
		{"managed_doctype": "Strength Returns"},
		{"managed_doctype": "Personnel"},
	]

	inserted_count = 0
	skipped_count = 0
	error_count = 0
	error_details = []

	for entry in managed_entries:
		managed_doctype = entry["managed_doctype"]

		# Ensure the target DocType exists
		if not frappe.db.exists("DocType", managed_doctype):
			error_details.append(f"DocType '{managed_doctype}' not found; skipping.")
			error_count += 1
			continue

		# Check if Managed Data Import Document already exists (autoname = managed_doctype)
		if frappe.db.exists("Managed Data Import Document", managed_doctype):
			skipped_count += 1
			continue

		try:
			doc = frappe.get_doc(
				{
					"doctype": "Managed Data Import Document",
					"managed_doctype": managed_doctype,
				}
			)
			doc.insert(ignore_permissions=True)
			inserted_count += 1
		except Exception as e:
			error_details.append(f"{managed_doctype}: {str(e)}")
			error_count += 1

	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": error_count,
		"error_details": error_details,
	}


def _ensure_role_permission(doctype, role, permlevel=0, **flags):
	"""
	Internal helper to ensure a DocType has a permission row for a given role.
	If a row exists, it is updated with the provided flags; otherwise a new row is added.
	"""
	# Make sure the DocType exists
	if not frappe.db.exists("DocType", doctype):
		return False, f"DocType '{doctype}' not found"

	dt = frappe.get_doc("DocType", doctype)

	perm_row = None
	for p in dt.permissions:
		if p.role == role and int(p.permlevel or 0) == int(permlevel):
			perm_row = p
			break

	created = False
	if not perm_row:
		perm_row = dt.append("permissions", {})
		perm_row.role = role
		perm_row.permlevel = permlevel
		created = True

	# Apply all provided flags (read, write, create, delete, report, export, etc.)
	for key, val in flags.items():
		if hasattr(perm_row, key):
			setattr(perm_row, key, 1 if val else 0)

	dt.save(ignore_permissions=True)
	return created, None


def insert_role_permissions_can_import_data():
	"""
	Ensure Role Permission Manager configuration for role 'Can Import Data'
	on doctypes 'Data Import' and 'Error Log'.
	"""

	role_name = "Can Import Data"

	# If role doesn't exist yet, skip gracefully (fixtures for Role/App Role List handle it)
	if not frappe.db.exists("Role", role_name):
		return {
			"inserted": 0,
			"skipped": 1,
			"errors": 0,
			"error_details": [f"Role '{role_name}' not found; skipped permission setup."],
		}

	inserted_count = 0
	skipped_count = 0
	error_count = 0
	error_details = []

	# Permissions for Data Import
	# Allow this role to manage Data Import documents (no delete by default).
	created, err = _ensure_role_permission(
		"Data Import",
		role_name,
		permlevel=0,
		read=True,
		write=True,
		create=True,
		delete=False,
		report=True,
		export=True,
		email=True,
		print=True,
		share=True,
	)
	if err:
		error_details.append(err)
		error_count += 1
	else:
		if created:
			inserted_count += 1
		else:
			skipped_count += 1

	# Permissions for Error Log
	# Mirror what you already have in the DocType JSON: read/write/create, export, etc.
	created, err = _ensure_role_permission(
		"Error Log",
		role_name,
		permlevel=0,
		read=True,
		write=True,
		create=True,
		delete=False,
		report=True,
		export=True,
		email=True,
		print=True,
		share=True,
	)
	if err:
		error_details.append(err)
		error_count += 1
	else:
		if created:
			inserted_count += 1
		else:
			skipped_count += 1

	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": error_count,
		"error_details": error_details,
	}


def insert_app_role_list():
	"""Insert App Role List entries for roles that exist in the system"""
	
	# App Role List entries extracted from current instance
	# Format: {"app_role": role_name, "owner_doctype": doctype_name}
	# Note: owner_doctype can be None if not applicable
	app_role_entries = [
		{"app_role": "Can View Dashboard", "owner_doctype": None},
		{"app_role": "Can View Real-Time Audit Log", "owner_doctype": None},
		{"app_role": "Course Attended Amender", "owner_doctype": "Course Attended"},
		{"app_role": "Course Attended Canceller", "owner_doctype": "Course Attended"},
		{"app_role": "Course Attended Creator", "owner_doctype": "Course Attended"},
		{"app_role": "Course Attended Deleter", "owner_doctype": "Course Attended"},
		{"app_role": "Course Attended Editor", "owner_doctype": "Course Attended"},
		{"app_role": "Course Attended Reader", "owner_doctype": "Course Attended"},
		{"app_role": "Course Attended Submitter", "owner_doctype": "Course Attended"},
		{"app_role": "Data Viewer", "owner_doctype": None},
		{"app_role": "Can Import Data", "owner_doctype": None},
		{"app_role": "Can Backup NAS", "owner_doctype": None},
		{"app_role": "Database Operator Manager", "owner_doctype": "Create Operator"},
		{"app_role": "Mission Amender", "owner_doctype": "Mission"},
		{"app_role": "Mission Canceller", "owner_doctype": "Mission"},
		{"app_role": "Mission Creator", "owner_doctype": "Mission"},
		{"app_role": "Mission Deleter", "owner_doctype": "Mission"},
		{"app_role": "Mission Editor", "owner_doctype": "Mission"},
		{"app_role": "Mission Reader", "owner_doctype": "Mission"},
		{"app_role": "Mission Submitter", "owner_doctype": "Mission"},
		{"app_role": "Part 2 Order Amender", "owner_doctype": "Part 2 Order"},
		{"app_role": "Part 2 Order Canceller", "owner_doctype": "Part 2 Order"},
		{"app_role": "Part 2 Order Creator", "owner_doctype": "Part 2 Order"},
		{"app_role": "Part 2 Order Deleter", "owner_doctype": "Part 2 Order"},
		{"app_role": "Part 2 Order Editor", "owner_doctype": "Part 2 Order"},
		{"app_role": "Part 2 Order Reader", "owner_doctype": "Part 2 Order"},
		{"app_role": "Part 2 Order Submitter", "owner_doctype": "Part 2 Order"},
		{"app_role": "Personnel Creator", "owner_doctype": "Personnel"},
		{"app_role": "Personnel Deleter", "owner_doctype": "Personnel"},
		{"app_role": "Personnel Editor", "owner_doctype": "Personnel"},
		{"app_role": "Personnel Reader", "owner_doctype": "Personnel"},
		{"app_role": "Posting Authority Amender", "owner_doctype": "Posting Authority"},
		{"app_role": "Posting Authority Canceller", "owner_doctype": "Posting Authority"},
		{"app_role": "Posting Authority Creator", "owner_doctype": "Posting Authority"},
		{"app_role": "Posting Authority Deleter", "owner_doctype": "Posting Authority"},
		{"app_role": "Posting Authority Editor", "owner_doctype": "Posting Authority"},
		{"app_role": "Posting Authority Reader", "owner_doctype": "Posting Authority"},
		{"app_role": "Posting Authority Submitter", "owner_doctype": "Posting Authority"},
		{"app_role": "Promotion Amender", "owner_doctype": "Promotion"},
		{"app_role": "Promotion Canceller", "owner_doctype": "Promotion"},
		{"app_role": "Promotion Creator", "owner_doctype": "Promotion"},
		{"app_role": "Promotion Deleter", "owner_doctype": "Promotion"},
		{"app_role": "Promotion Editor", "owner_doctype": "Promotion"},
		{"app_role": "Promotion Reader", "owner_doctype": "Promotion"},
		{"app_role": "Promotion Submitter", "owner_doctype": "Promotion"},
		{"app_role": "Reference Data Creator", "owner_doctype": "Reference Data"},
		{"app_role": "Reference Data Deleter", "owner_doctype": "Reference Data"},
		{"app_role": "Reference Data Editor", "owner_doctype": "Reference Data"},
		{"app_role": "Reference Data Reader", "owner_doctype": "Reference Data"},
		{"app_role": "Strength Returns Amender", "owner_doctype": "Strength Returns"},
		{"app_role": "Strength Returns Canceller", "owner_doctype": "Strength Returns"},
		{"app_role": "Strength Returns Creator", "owner_doctype": "Strength Returns"},
		{"app_role": "Strength Returns Deleter", "owner_doctype": "Strength Returns"},
		{"app_role": "Strength Returns Editor", "owner_doctype": "Strength Returns"},
		{"app_role": "Strength Returns Reader", "owner_doctype": "Strength Returns"},
		{"app_role": "Strength Returns Submitter", "owner_doctype": "Strength Returns"},
		{"app_role": "Atts and Dets Creator", "owner_doctype": "Personnel Att and Dets Form"},
		{"app_role": "Atts and Dets  Amender", "owner_doctype": "Personnel Att and Dets Form"},
		{"app_role": "Atts and Dets Canceller", "owner_doctype": "Personnel Att and Dets Form"},
		{"app_role": "Atts and Dets Editor", "owner_doctype": "Personnel Att and Dets Form"},
		{"app_role": "Atts and Dets Reader", "owner_doctype": "Personnel Att and Dets Form"},
		{"app_role": "Atts and Dets Submitter", "owner_doctype": "Personnel Att and Dets Form"},
		{"app_role": "Atts and Dets Deleter", "owner_doctype": "Personnel Att and Dets Form"},
	]
	
	inserted_count = 0
	skipped_count = 0
	error_count = 0
	error_details = []
	
	for entry in app_role_entries:
		role_name = entry["app_role"]
		owner_doctype = entry.get("owner_doctype")
		
		# Check if role exists in Role doctype
		# If role doesn't exist, skip it (not an error - roles may be created separately)
		if not frappe.db.exists("Role", role_name):
			skipped_count += 1
			continue
		
		# Check if App Role List entry already exists
		# The autoname is based on app_role field, so we check by app_role
		existing_entry = frappe.db.get_value("App Role List", {"app_role": role_name}, "name")
		
		if existing_entry:
			# Update owner_doctype if it's different and provided
			if owner_doctype:
				try:
					existing_doc = frappe.get_doc("App Role List", existing_entry)
					if existing_doc.owner_doctype != owner_doctype:
						existing_doc.owner_doctype = owner_doctype
						existing_doc.save(ignore_permissions=True)
				except Exception as e:
					error_msg = f"Error updating '{role_name}': {str(e)}"
					error_details.append(error_msg)
					error_count += 1
			skipped_count += 1
			continue
		
		try:
			# Create App Role List entry
			app_role_list_doc = frappe.get_doc({
				"doctype": "App Role List",
				"app_role": role_name,
				"owner_doctype": owner_doctype
			})
			app_role_list_doc.insert(ignore_permissions=True)
			inserted_count += 1
		except Exception as e:
			error_msg = f"Error inserting '{role_name}': {str(e)}"
			error_details.append(error_msg)
			error_count += 1
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": error_count,
		"error_details": error_details
	}


def insert_attachment_types():
	"""Insert default attachment types used in personnel attachments"""
	
	attachment_types = [
		"Mission",
		"Principal",
	]
	
	inserted_count = 0
	skipped_count = 0
	error_count = 0
	error_details = []
	
	for att_type in attachment_types:
		# Check if attachment type already exists
		if frappe.db.exists("Attachment Type", att_type):
			skipped_count += 1
			continue
		
		try:
			att_doc = frappe.get_doc({
				"doctype": "Attachment Type",
				"attachment_type": att_type
			})
			att_doc.insert(ignore_permissions=True)
			inserted_count += 1
		except Exception as e:
			error_count += 1
			error_details.append(f"{att_type}: {str(e)}")
	
	return {
		"inserted": inserted_count,
		"skipped": skipped_count,
		"errors": error_count,
		"error_details": error_details
	}


# Add more fixture functions here as needed

