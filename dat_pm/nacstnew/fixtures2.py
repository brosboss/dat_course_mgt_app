# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

"""
DEVELOPMENT/DEMO ONLY - REMOVE THIS FILE BEFORE DEPLOYING TO PRODUCTION

This file contains sample/demo data insertion functions for development and demonstration purposes.
This file should be removed or excluded when deploying the app to production environments.
"""

import frappe
import random


def insert_sample_personnel():
	"""Insert 40 sample personnel records for demonstration purposes"""
	
	# Ensure we have at least one category
	ensure_basic_personnel_data()
	
	# Get available data
	# Get Officer and Soldier categories specifically
	officer_category = frappe.db.exists("Personnel Category", "Officer")
	soldier_category = frappe.db.exists("Personnel Category", "Soldier")
	
	if not officer_category:
		print("Warning: 'Officer' Personnel Category not found. Skipping sample personnel insertion.")
		return
	if not soldier_category:
		print("Warning: 'Soldier' Personnel Category not found. Skipping sample personnel insertion.")
		return
	
	commission_types = frappe.get_all("Type of Commission", limit=10)
	courses = frappe.get_all("Course", limit=100)
	
	if not commission_types:
		print("Warning: No Type of Commission found. Skipping sample personnel insertion.")
		return
	if not courses:
		print("Warning: No Course found. Skipping sample personnel insertion.")
		return
	
	# Sample Nigerian names
	first_names = [
		"Chukwuemeka", "Adebayo", "Ibrahim", "Musa", "Emeka", "Olumide", "Ahmad", "Yusuf",
		"Chinedu", "Oluwaseun", "Mohammed", "Abdullahi", "Ifeanyi", "Tunde", "Hassan",
		"Babatunde", "Chidi", "Segun", "Aliyu", "Femi", "Kolawole", "Nnamdi", "Sani",
		"Obinna", "Kayode", "Umar", "Victor", "Daniel", "James", "Michael"
	]
	
	last_names = [
		"Adebayo", "Okafor", "Mohammed", "Ibrahim", "Okoro", "Adekunle", "Aliyu", "Nwankwo",
		"Oluwaseyi", "Bello", "Adeyemi", "Obi", "Musa", "Adeleke", "Yusuf", "Okafor",
		"Chukwu", "Adebisi", "Sani", "Nwosu", "Adegboye", "Bello", "Okafor", "Adeyinka",
		"Oluwafemi", "Nwosu", "Adekunle", "Ibrahim", "Okafor", "Adebayo"
	]
	
	surnames = [
		"Adebayo", "Okafor", "Mohammed", "Ibrahim", "Okoro", "Adekunle", "Aliyu", "Nwankwo",
		"Oluwaseyi", "Bello", "Adeyemi", "Obi", "Musa", "Adeleke", "Yusuf", "Okafor",
		"Chukwu", "Adebisi", "Sani", "Nwosu", "Adegboye", "Bello", "Okafor", "Adeyinka",
		"Oluwafemi", "Nwosu", "Adekunle", "Ibrahim", "Okafor", "Adebayo"
	]
	
	# Generate 40 personnel records
	# Mix of officers (N/#####) and soldiers (##NA/##/####)
	personnel_data = []
	
	# 15 Officers (N/##### format)
	for i in range(15):
		service_num = f"N/{14000 + i}"
		first = random.choice(first_names)
		last = random.choice(last_names)
		surname = random.choice(surnames)
		# Format: [First Initial][Last Initial] [Surname] (e.g., "HC Nwabunike")
		personnel_name = f"{first[0]}{last[0]} {surname}"
		
		personnel_data.append({
			"service_number": service_num,
			"first_name": first,
			"last_name": last,
			"surname": surname,
			"personnel_name": personnel_name,
			"category": "Officer",  # N/##### format = Officer
			"type_of_commission": random.choice(commission_types).name if commission_types else None,
			"course": random.choice(courses).name if courses else None,
			"phone_number": f"080{random.randint(10000000, 99999999)}",
			"is_officer": True
		})
	
	# 25 Soldiers (##NA/##/#### format)
	for i in range(25):
		# Format: ##NA/##/####
		year = random.randint(90, 99)
		month = random.randint(10, 24)
		number = random.randint(1000, 9999)
		service_num = f"{year}NA/{month}/{number}"
		
		first = random.choice(first_names)
		last = random.choice(last_names)
		surname = random.choice(surnames)
		# Format: [First Initial][Last Initial] [Surname] (e.g., "HC Nwabunike")
		personnel_name = f"{first[0]}{last[0]} {surname}"
		
		personnel_data.append({
			"service_number": service_num,
			"first_name": first,
			"last_name": last,
			"surname": surname,
			"personnel_name": personnel_name,
			"category": "Soldier",  # ##NA/##/#### format = Soldier
			"type_of_commission": random.choice(commission_types).name if commission_types else None,
			"course": random.choice(courses).name if courses else None,
			"phone_number": f"080{random.randint(10000000, 99999999)}",
			"is_officer": False
		})
	
	# Shuffle to mix officers and soldiers
	random.shuffle(personnel_data)
	
	inserted_count = 0
	skipped_count = 0
	
	for person in personnel_data:
		# Check if service number already exists
		if frappe.db.exists("Personnel", person["service_number"]):
			skipped_count += 1
			continue
		
		# Create personnel document with only the specified fields
		personnel_doc = frappe.get_doc({
			"doctype": "Personnel",
			"service_number": person["service_number"],
			"first_name": person["first_name"],
			"last_name": person["last_name"],
			"surname": person["surname"],
			"personnel_name": person["personnel_name"],
			"category": person["category"],
			"phone_number": person["phone_number"]
		})
		
		# Add type_of_commission if available
		if person.get("type_of_commission") and frappe.db.exists("Type of Commission", person["type_of_commission"]):
			personnel_doc.type_of_commission = person["type_of_commission"]
		
		# Add course if available
		if person.get("course") and frappe.db.exists("Course", person["course"]):
			personnel_doc.course = person["course"]
		
		personnel_doc.insert(ignore_permissions=True)
		inserted_count += 1
	
	if inserted_count > 0:
		frappe.db.commit()
		print(f"Inserted {inserted_count} sample personnel records. {skipped_count} already existed.")


def ensure_basic_personnel_data():
	"""Ensure basic Personnel Category exists for sample data"""
	
	# Create a default Personnel Category if none exists
	if not frappe.db.exists("Personnel Category", "Officer"):
		try:
			category_doc = frappe.get_doc({
				"doctype": "Personnel Category",
				"personnel_category": "Officer"
			})
			category_doc.insert(ignore_permissions=True)
		except:
			pass
	
	if not frappe.db.exists("Personnel Category", "Soldier"):
		try:
			category_doc = frappe.get_doc({
				"doctype": "Personnel Category",
				"personnel_category": "Soldier"
			})
			category_doc.insert(ignore_permissions=True)
		except:
			pass
	
	frappe.db.commit()


def delete_sample_personnel():
	"""Delete existing sample personnel records"""
	
	# Delete officers (N/##### format)
	deleted_count = 0
	for i in range(15):
		service_num = f"N/{14000 + i}"
		if frappe.db.exists("Personnel", service_num):
			frappe.delete_doc("Personnel", service_num, ignore_permissions=True, force=True)
			deleted_count += 1
	
	# Delete soldiers (##NA/##/#### format) - we need to find them
	# Get all personnel and check if they match the pattern
	all_personnel = frappe.get_all("Personnel", fields=["name", "service_number"])
	
	for person in all_personnel:
		service_num = person.service_number
		# Check if it matches soldier pattern (##NA/##/####)
		import re
		if re.match(r'^\d{2}NA/\d{2}/\d{4}$', service_num):
			frappe.delete_doc("Personnel", person.name, ignore_permissions=True, force=True)
			deleted_count += 1
	
	frappe.db.commit()
	print(f"Deleted {deleted_count} sample personnel records")
	return deleted_count


@frappe.whitelist()
def insert_sample_personnel_records():
	"""
	Whitelisted function to insert 40 sample personnel records.
	Can be called manually via bench execute or API.
	
	DEVELOPMENT/DEMO ONLY - This function should not be available in production.
	"""
	insert_sample_personnel()
	return {
		"message": "Sample personnel records inserted successfully",
		"status": "success"
	}


@frappe.whitelist()
def reinsert_sample_personnel_records():
	"""
	Delete existing sample personnel and re-insert them with updated format.
	Can be called manually via bench execute or API.
	
	DEVELOPMENT/DEMO ONLY - This function should not be available in production.
	"""
	deleted_count = delete_sample_personnel()
	insert_sample_personnel()
	return {
		"message": f"Deleted {deleted_count} existing records and inserted new sample personnel records successfully",
		"deleted": deleted_count,
		"status": "success"
	}


@frappe.whitelist()
def verify_sample_personnel():
	"""Verify sample personnel records were inserted correctly"""
	personnel = frappe.get_all(
		"Personnel",
		fields=["service_number", "personnel_name", "category", "type_of_commission", "course", "phone_number"],
		limit=10,
		order_by="creation desc"
	)
	
	officers = [p for p in personnel if p.service_number.startswith("N/")]
	soldiers = [p for p in personnel if "NA/" in p.service_number]
	
	return {
		"total_sample": len(personnel),
		"officers": len(officers),
		"soldiers": len(soldiers),
		"sample_records": [
			{
				"service_number": p.service_number,
				"name": p.personnel_name,
				"category": p.category,
				"type_of_commission": p.type_of_commission,
				"course": p.course,
				"phone_number": p.phone_number
			}
			for p in personnel[:5]
		]
	}


@frappe.whitelist()
def delete_all_personnel_and_ranks():
	"""
	Delete all Personnel and Rank records.
	DEVELOPMENT/DEMO ONLY - This function should not be available in production.
	"""
	# Delete all Personnel records
	personnel_records = frappe.get_all("Personnel", fields=["name"])
	personnel_count = len(personnel_records)
	
	for person in personnel_records:
		try:
			frappe.delete_doc("Personnel", person.name, ignore_permissions=True, force=True)
		except Exception as e:
			print(f"Error deleting Personnel {person.name}: {str(e)}")
	
	# Delete all Rank records
	rank_records = frappe.get_all("Rank", fields=["name"])
	rank_count = len(rank_records)
	
	for rank in rank_records:
		try:
			frappe.delete_doc("Rank", rank.name, ignore_permissions=True, force=True)
		except Exception as e:
			print(f"Error deleting Rank {rank.name}: {str(e)}")
	
	frappe.db.commit()
	
	return {
		"message": f"Deleted {personnel_count} Personnel records and {rank_count} Rank records",
		"personnel_deleted": personnel_count,
		"ranks_deleted": rank_count,
		"status": "success"
	}


@frappe.whitelist()
def delete_all_part2_orders_and_units():
	"""
	Delete all Part 2 Order and Unit records.
	DEVELOPMENT/DEMO ONLY - This function should not be available in production.
	"""
	# Delete all Part 2 Order records
	part2_order_records = frappe.get_all("Part 2 Order", fields=["name", "docstatus"])
	part2_order_count = 0
	cancelled_count = 0
	
	for order in part2_order_records:
		try:
			# If document is submitted (docstatus = 1), cancel it first
			if order.docstatus == 1:
				order_doc = frappe.get_doc("Part 2 Order", order.name)
				order_doc.cancel()
				frappe.db.commit()
				cancelled_count += 1
			# Then delete
			frappe.delete_doc("Part 2 Order", order.name, ignore_permissions=True, force=True)
			part2_order_count += 1
		except Exception as e:
			print(f"Error deleting Part 2 Order {order.name}: {str(e)}")
	
	# Delete all Unit records
	unit_records = frappe.get_all("Unit", fields=["name"])
	unit_count = len(unit_records)
	
	for unit in unit_records:
		try:
			frappe.delete_doc("Unit", unit.name, ignore_permissions=True, force=True)
		except Exception as e:
			print(f"Error deleting Unit {unit.name}: {str(e)}")
	
	frappe.db.commit()
	
	return {
		"message": f"Deleted {part2_order_count} Part 2 Order records (cancelled {cancelled_count} submitted records) and {unit_count} Unit records",
		"part2_orders_deleted": part2_order_count,
		"part2_orders_cancelled": cancelled_count,
		"units_deleted": unit_count,
		"status": "success"
	}


@frappe.whitelist()
def delete_all_posting_promotion_course_records():
	"""
	Delete all records from Posting Authority, Promotion, Course, Appointment, Course Attended, and Course Name.
	DEVELOPMENT/DEMO ONLY - This function should not be available in production.
	"""
	doctypes_to_delete = [
		"Posting Authority",
		"Promotion",
		"Course",
		"Appointment",
		"Course Attended",
		"Course Name"
	]
	
	deletion_results = {}
	
	for doctype in doctypes_to_delete:
		try:
			records = frappe.get_all(doctype, fields=["name", "docstatus"])
			deleted_count = 0
			cancelled_count = 0
			
			for record in records:
				try:
					# If document is submitted (docstatus = 1), cancel it first
					if hasattr(record, 'docstatus') and record.docstatus == 1:
						doc = frappe.get_doc(doctype, record.name)
						doc.cancel()
						frappe.db.commit()
						cancelled_count += 1
					# Then delete
					frappe.delete_doc(doctype, record.name, ignore_permissions=True, force=True)
					deleted_count += 1
				except Exception as e:
					print(f"Error deleting {doctype} {record.name}: {str(e)}")
			
			deletion_results[doctype] = {
				"deleted": deleted_count,
				"cancelled": cancelled_count
			}
		except Exception as e:
			print(f"Error processing {doctype}: {str(e)}")
			deletion_results[doctype] = {
				"deleted": 0,
				"cancelled": 0,
				"error": str(e)
			}
	
	frappe.db.commit()
	
	total_deleted = sum(r.get("deleted", 0) for r in deletion_results.values())
	total_cancelled = sum(r.get("cancelled", 0) for r in deletion_results.values())
	
	return {
		"message": f"Deleted {total_deleted} records (cancelled {total_cancelled} submitted records) across {len(doctypes_to_delete)} doctypes",
		"total_deleted": total_deleted,
		"total_cancelled": total_cancelled,
		"details": deletion_results,
		"status": "success"
	}

