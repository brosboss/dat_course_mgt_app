# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class State(Document):
	def before_save(self):
		"""Auto-populate geopolitical zone abbreviation based on the geopolitical zone"""
		if self.geopolitical_zone:
			abbrev_map = {
				"North West": "NW",
				"North East": "NE",
				"North Central": "NC",
				"South West": "SW",
				"South East": "SE",
				"South South": "SS"
			}
			self.geopolitical_zone_abbrev = abbrev_map.get(self.geopolitical_zone, "")


@frappe.whitelist()
def insert_nigeria_states():
	"""Insert all 36 Nigerian states and their geopolitical zones"""
	
	# Define all 6 geopolitical zones
	geopolitical_zones = [
		"North West",
		"North East",
		"North Central",
		"South West",
		"South East",
		"South South"
	]
	
	# Define all 36 states with their geopolitical zones
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
	
	# First, ensure all geopolitical zones exist
	for zone_name in geopolitical_zones:
		if not frappe.db.exists("Geopolitical Zone", zone_name):
			zone_doc = frappe.get_doc({
				"doctype": "Geopolitical Zone",
				"geopolitical_zone": zone_name
			})
			zone_doc.insert(ignore_permissions=True)
			frappe.db.commit()
	
	# Insert all states
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
		state_doc = frappe.get_doc({
			"doctype": "State",
			"state": state_name,
			"geopolitical_zone": zone_name
		})
		state_doc.save(ignore_permissions=True)  # Use save to trigger before_save hook
		inserted_count += 1
	
	frappe.db.commit()
	
	return {
		"message": f"Successfully inserted {inserted_count} states. {skipped_count} states already existed.",
		"inserted": inserted_count,
		"skipped": skipped_count,
		"total": len(states_data)
	}


@frappe.whitelist()
def update_existing_states_abbrev():
	"""Update existing states with geopolitical zone abbreviations"""
	
	abbrev_map = {
		"North West": "NW",
		"North East": "NE",
		"North Central": "NC",
		"South West": "SW",
		"South East": "SE",
		"South South": "SS"
	}
	
	# Get all states - only get name and geopolitical_zone to avoid field errors
	all_states = frappe.get_all("State", fields=["name", "geopolitical_zone"])
	
	updated_count = 0
	
	for state in all_states:
		if state.geopolitical_zone and state.geopolitical_zone in abbrev_map:
			abbrev = abbrev_map[state.geopolitical_zone]
			# Load the document and update
			state_doc = frappe.get_doc("State", state.name)
			state_doc.geopolitical_zone_abbrev = abbrev
			state_doc.save(ignore_permissions=True)
			updated_count += 1
	
	frappe.db.commit()
	
	return {
		"message": f"Successfully updated {updated_count} states with abbreviations.",
		"updated": updated_count,
		"total": len(all_states)
	}


@frappe.whitelist()
def verify_states_abbrev():
	"""Verify that all states have abbreviations"""
	all_states = frappe.get_all("State", fields=["name", "geopolitical_zone", "geopolitical_zone_abbrev"])
	
	missing = [s for s in all_states if not s.geopolitical_zone_abbrev]
	sample = all_states[:5]
	
	return {
		"total": len(all_states),
		"missing_count": len(missing),
		"missing": [{"name": s.name, "zone": s.geopolitical_zone} for s in missing],
		"sample": [{"name": s.name, "zone": s.geopolitical_zone, "abbrev": s.geopolitical_zone_abbrev} for s in sample]
	}
