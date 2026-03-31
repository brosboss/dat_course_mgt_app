# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import getdate, date_diff


class Mission(Document):
	def validate(self):
		"""Auto-populate mission_authority from reference and date"""
		# Set operator to current user
		if frappe.session.user:
			self.operator = frappe.session.user
		
		# Auto-populate mission_authority from reference and date
		if self.reference and self.date:
			# Format date as "5 Mar 25" (d MMM yy format)
			date_obj = getdate(self.date)
			# Handle Windows compatibility (Windows doesn't support %-d)
			try:
				formatted_date = date_obj.strftime("%-d %b %y")
			except ValueError:
				# Windows doesn't support %-d, use %d and strip leading zero
				formatted_date = date_obj.strftime("%d %b %y").lstrip("0")
			# Construct mission authority: "Reference Dated Date"
			self.mission_authority = self.reference.strip() + " Dated " + formatted_date
		
		# Validate mission dates in mission_list
		self.validate_mission_dates()
	
	def on_submit(self):
		"""Update Personnel records with mission information"""
		# Set auditor to current user and save to database
		if frappe.session.user:
			self.db_set('auditor', frappe.session.user, update_modified=False)
		
		# Get all unique service numbers from this mission's mission list
		service_numbers = set()
		for row in self.mission_list:
			if row.service_number:
				service_numbers.add(row.service_number)
		
		# For each personnel, update their mission history HTML
		for service_number in service_numbers:
			self.update_personnel_mission(service_number)
	
	def update_personnel_mission(self, service_number):
		"""Update personnel's mission history HTML field with all missions"""
		# Get all mission records for this personnel from all submitted Mission documents
		mission_records = frappe.db.sql("""
			SELECT 
				ml.service_number,
				ml.personnel_name,
				ml.mission_start_date,
				ml.mission_end_date,
				m.mission_authority,
				m.mission,
				m.reference,
				m.date as mission_date
			FROM `tabMission List` ml
			INNER JOIN `tabMission` m ON ml.parent = m.name
			WHERE ml.service_number = %s
				AND m.docstatus = 1
				AND ml.mission_start_date IS NOT NULL
				AND ml.mission_end_date IS NOT NULL
			ORDER BY ml.mission_start_date DESC, m.creation DESC
		""", (service_number,), as_dict=True)
		
		if not mission_records:
			# No missions found, set empty HTML
			html = "<p>No mission records found.</p>"
		else:
			# Generate HTML table
			html = """
			<style>
				.mission-history-table {
					width: 100%;
					border-collapse: collapse;
					margin-top: 10px;
				}
				.mission-history-table th {
					background-color: var(--subtle-fg);
					padding: 8px;
					text-align: left;
					border: 1px solid var(--table-border-color);
					font-weight: bold;
				}
				.mission-history-table td {
					padding: 8px;
					border: 1px solid var(--table-border-color);
				}
				.mission-history-table tr:nth-child(even) {
					background-color: var(--fg-color);
				}
			</style>
			<table class="mission-history-table">
				<thead>
					<tr>
						<th>Mission Authority</th>
						<th>Mission Name</th>
						<th>Start Date</th>
						<th>End Date</th>
						<th>Period Spent</th>
					</tr>
				</thead>
				<tbody>
			"""
			
			for record in mission_records:
				# Format dates
				start_date = frappe.format_value(record.mission_start_date, {"fieldtype": "Date"}) if record.mission_start_date else ""
				end_date = frappe.format_value(record.mission_end_date, {"fieldtype": "Date"}) if record.mission_end_date else ""
				
				# Calculate period spent
				period_spent = "N/A"
				if record.mission_start_date and record.mission_end_date:
					start_date_obj = getdate(record.mission_start_date)
					end_date_obj = getdate(record.mission_end_date)
					
					# Calculate difference in days
					days_diff = date_diff(end_date_obj, start_date_obj)
					
					# Convert to years, months, days
					years = days_diff // 365
					remaining_days = days_diff % 365
					months = remaining_days // 30
					days = remaining_days % 30
					
					# Format period string
					period_parts = []
					if years > 0:
						period_parts.append(f"{years} year{'s' if years != 1 else ''}")
					if months > 0:
						period_parts.append(f"{months} month{'s' if months != 1 else ''}")
					if days > 0 or len(period_parts) == 0:
						period_parts.append(f"{days} day{'s' if days != 1 else ''}")
					
					period_spent = ", ".join(period_parts)
				
				html += f"""
					<tr>
						<td><b>{frappe.utils.escape_html(record.mission_authority or "")}</b></td>
						<td>{frappe.utils.escape_html(record.mission or "")}</td>
						<td>{start_date}</td>
						<td>{end_date}</td>
						<td><b>{period_spent}</b></td>
					</tr>
				"""
			
			html += """
				</tbody>
			</table>
			"""
		
		# Note: HTML fields in Frappe don't store values in the database
		# The mission history HTML is generated dynamically via get_personnel_mission_html server method
		# No need to save HTML to the Personnel record - it will be generated on demand
		frappe.msgprint(
			f"Mission records updated for personnel in the mission list",
			indicator="green"
		)
	
	def validate_mission_dates(self):
		"""Validate that mission end date is not less than mission start date"""
		if self.mission_list:
			for idx, row in enumerate(self.mission_list, start=1):
				if row.mission_start_date and row.mission_end_date:
					start_date = getdate(row.mission_start_date)
					end_date = getdate(row.mission_end_date)
					
					if end_date < start_date:
						frappe.throw(
							_("Row {0}: Mission End Date ({1}) cannot be less than Mission Start Date ({2})").format(
								idx,
								frappe.format_value(row.mission_end_date, {"fieldtype": "Date"}),
								frappe.format_value(row.mission_start_date, {"fieldtype": "Date"})
							),
							title=_("Invalid Date Range")
						)
