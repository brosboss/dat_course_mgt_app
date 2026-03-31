# Copyright (c) 2025, !! and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class Personnel(Document):
	def validate(self):
		# Set operator to current user
		if frappe.session.user:
			self.operator = frappe.session.user
		
		# Convert name fields to uppercase
		if self.personnel_name:
			self.personnel_name = self.personnel_name.upper()
		if self.other_names:
			self.other_names = self.other_names.upper()
		if self.first_name:
			self.first_name = self.first_name.upper()
		if self.middle_name:
			self.middle_name = self.middle_name.upper()
		if self.surname:
			self.surname = self.surname.upper()


@frappe.whitelist()
def recalculate_personnel_specialties(service_number):
	"""Whitelisted API to recalculate main_primary_specialty, main_secondary_specialty,
	and main_auxiliary_specialty for a Personnel record on demand.
	
	Delegates to the shared helper in course_attended to keep logic in one place.
	"""
	from dat_pm.nacstnew.doctype.course_attended.course_attended import update_personnel_specialties
	update_personnel_specialties(service_number)
	return {"status": "ok", "servicea_number": service_number}


@frappe.whitelist()
def get_posting_history_html(service_number):
	"""Generate HTML table for posting history from Posting Authority Details"""
	if not service_number:
		return "<p>No service number provided.</p>"
	
	# Query all Posting Authority Details records for this service number
	posting_records = frappe.db.get_all(
		"Posting Authority Details",
		filters={
			"service_number": service_number
		},
		fields=[
			"parent",
			"from_unit",
			"to_unit",
			"appointment",
			"wef_date",
			"gaining_unit_date_tos",
			"posting_status",
			"part_2_order",
			"overstay_in_loosing_unit"
		],
		order_by="wef_date desc, creation desc"
	)
	print(posting_records)
	
	if not posting_records:
		return "<p>No posting history found.</p>"
	
	# Generate HTML table
	html = """
	<style>
		.posting-history-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 10px;
		}
		.posting-history-table th {
			background-color: var(--subtle-fg);
			padding: 8px;
			text-align: left;
			border: 1px solid var(--table-border-color);
			font-weight: bold;
		}
		.posting-history-table td {
			padding: 8px;
			border: 1px solid var(--table-border-color);
		}
		.posting-history-table tr:nth-child(even) {
			background-color: var(--fg-color);
		}
	</style>
	<table class="posting-history-table">
		<thead>
			<tr>
				<th>Posting Authority</th>
				<th>From Unit</th>
				<th>To Unit</th>
				<th>Appointment</th>
				<th>WEF Date</th>
				<th>Date TOS</th>
				<th>Posting Status</th>
				<th>Part 2 Order</th>
				<th>Overstay (Days)</th>
			</tr>
		</thead>
		<tbody>
	"""
	
	for record in posting_records:
		# Get posting authority name (parent)
		posting_authority_name = record.parent or ""
		
		# Format dates
		wef_date = frappe.format_value(record.wef_date, {"fieldtype": "Date"}) if record.wef_date else ""
		date_tos = frappe.format_value(record.gaining_unit_date_tos, {"fieldtype": "Date"}) if record.gaining_unit_date_tos else ""
		
		# Format posting status with color
		posting_status = record.posting_status or ""
		status_color = "green" if posting_status == "Effected" else "orange" if posting_status == "Cancelled" else "gray"
		
		html += f"""
			<tr>
				<td><b>{frappe.utils.escape_html(posting_authority_name)}</b></td>
				<td>{frappe.utils.escape_html(record.from_unit or "")}</td>
				<td><b>{frappe.utils.escape_html(record.to_unit or "")}</b></td>
				<td>{frappe.utils.escape_html(record.appointment or "")}</td>
				<td>{wef_date}</td>
				<td>{date_tos}</td>
				<td><span class="indicator {status_color}">{frappe.utils.escape_html(posting_status)}</span></td>
				<td>{frappe.utils.escape_html(record.part_2_order or "")}</td>
				<td>{record.overstay_in_loosing_unit or 0}</td>
			</tr>
		"""
	
	html += """
		</tbody>
	</table>
	"""
	
	return html

@frappe.whitelist()
def get_personnel_mission_html(service_number):
	"""Generate HTML table for mission history from Mission List child table"""
	if not service_number:
		return "<p>No service number provided.</p>"
	
	# Query all Mission List records for this service number from submitted Mission documents
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
		return "<p>No mission records found.</p>"
	
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
			from frappe.utils import getdate, date_diff
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
	
	return html

@frappe.whitelist()
def get_courses_attended_html(service_number):
	"""Generate HTML table for courses attended from Course Attended doctype"""
	if not service_number:
		return "<p>No service number provided.</p>"
	
	# Query all Course Attended records for this service number
	course_records = frappe.db.get_all(
		"Course Attended",
		filters={
			"service_number": service_number
		},
		fields=[
			"course_name",
			"course_start_date",
			"course_end_date",
			"grade",
			"course_report",
			"specialty",
			"course_status",
			"feedback_collected",
		],
		order_by="course_start_date desc, creation desc"
	)
	
	if not course_records:
		return "<p>No courses attended found.</p>"
	
	# Generate HTML table
	html = """
	<style>
		.courses-attended-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 10px;
		}
		.courses-attended-table th {
			background-color: var(--subtle-fg);
			padding: 8px;
			text-align: left;
			border: 1px solid var(--table-border-color);
			font-weight: bold;
		}
		.courses-attended-table td {
			padding: 8px;
			border: 1px solid var(--table-border-color);
		}
		.courses-attended-table tr:nth-child(even) {
			background-color: var(--fg-color);
		}
		.courses-attended-ok {
			color: var(--green-600, #2e7d32);
			font-weight: 500;
		}
		.courses-attended-missing {
			color: var(--red-600, #c62828);
			font-weight: 500;
		}
	</style>
	<table class="courses-attended-table">
		<thead>
			<tr>
				<th>Course Name</th>
				<th>Start Date</th>
				<th>End Date</th>
				<th>Grade</th>
				<th>Course Status</th>
				<th>Course Report</th>
				<th>Feedback</th>
				<th>Specialty</th>
			</tr>
		</thead>
		<tbody>
	"""
	
	for record in course_records:
		# Format dates
		start_date = frappe.format_value(record.course_start_date, {"fieldtype": "Date"}) if record.course_start_date else ""
		end_date = frappe.format_value(record.course_end_date, {"fieldtype": "Date"}) if record.course_end_date else ""

		course_status = frappe.utils.escape_html(record.course_status or "—")

		# Course report: link when present; label whether it is filed (treated)
		if record.course_report:
			report_url = frappe.utils.escape_html(record.course_report)
			course_report = (
				f'<span class="courses-attended-ok">Provided</span> · '
				f'<a href="{report_url}" target="_blank" rel="noopener noreferrer">View</a>'
			)
		else:
			course_report = '<span class="courses-attended-missing">Not provided</span>'

		# Feedback collected mirrors submitted feedback on Course Attended
		if record.feedback_collected:
			feedback_cell = '<span class="courses-attended-ok">Collected</span>'
		else:
			feedback_cell = '<span class="courses-attended-missing">Not collected</span>'

		html += f"""
			<tr>
				<td>{frappe.utils.escape_html(record.course_name or "")}</td>
				<td>{start_date}</td>
				<td>{end_date}</td>
				<td>{frappe.utils.escape_html(record.grade or "")}</td>
				<td>{course_status}</td>
				<td>{course_report}</td>
				<td>{feedback_cell}</td>
				<td>{frappe.utils.escape_html(record.specialty or "")}</td>
			</tr>
		"""
	
	html += """
		</tbody>
	</table>
	"""
	
	return html

@frappe.whitelist()
def get_promotion_history_html(service_number):
	"""Generate HTML table for promotion history from Promotion List child table"""
	if not service_number:
		return "<p>No service number provided.</p>"
	
	# Query all Promotion List records for this service number
	# Since it's a child table, we query it directly and get the parent
	promotion_records = frappe.db.sql("""
		SELECT 
			pl.name,
			pl.parent,
			pl.service_number,
			pl.personnel_name,
			pl.from_rank,
			pl.to_rank,
			pl.seniority_date,
			p.promotion_authority
		FROM `tabPromotion List` pl
		INNER JOIN `tabPromotion` p ON pl.parent = p.name
		WHERE pl.service_number = %s
		ORDER BY pl.seniority_date DESC, pl.creation DESC
	""", (service_number,), as_dict=True)
	
	if not promotion_records:
		return "<p>No promotion history found.</p>"
	
	# Generate HTML table
	html = """
	<style>
		.promotion-history-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 10px;
		}
		.promotion-history-table th {
			background-color: var(--subtle-fg);
			padding: 8px;
			text-align: left;
			border: 1px solid var(--table-border-color);
			font-weight: bold;
		}
		.promotion-history-table td {
			padding: 8px;
			border: 1px solid var(--table-border-color);
		}
		.promotion-history-table tr:nth-child(even) {
			background-color: var(--fg-color);
		}
	</style>
	<table class="promotion-history-table">
		<thead>
			<tr>
				<th>Promotion Authority</th>
				<th>From Rank</th>
				<th>To Rank</th>
				<th>Seniority Date</th>
			</tr>
		</thead>
		<tbody>
	"""
	
	for record in promotion_records:
		# Format date
		seniority_date = frappe.format_value(record.seniority_date, {"fieldtype": "Date"}) if record.seniority_date else ""
		
		html += f"""
			<tr>
				<td><b>{frappe.utils.escape_html(record.promotion_authority or "")}</b></td>
				<td>{frappe.utils.escape_html(record.from_rank or "")}</td>
				<td><b>{frappe.utils.escape_html(record.to_rank or "")}</b></td>
				<td>{seniority_date}</td>
			</tr>
		"""
	
	html += """
		</tbody>
	</table>
	"""
	
	return html

@frappe.whitelist()
def get_personnel_strength_returns_html(service_number):
	# return "<p>No strength returns records found for this personnel.</p>"
	"""Generate HTML table for strength returns from Strength Returns Details child table"""
	if not service_number:
		return "<p>No service number provided.</p>"
	#check if personnel record exist in strength returns
	exists = frappe.db.exists("Strength Returns Details", {"personnel": service_number})
	if not exists:
		return "<p>No strength returns records found for this personnel.</p>"
	# Query all Strength Returns Details records for this service number from submitted Strength Returns documents
	strength_returns_records = frappe.db.sql("""
		SELECT 
			srd.personnel,
			srd.personnel_name,
			srd.rank,
			srd.trade,
			srd.dob,
			srd.doe,
			srd.dolp,
			srd.current_depl,
			srd.dtos,
			srd.last_unit,
			srd.last_second_unit,
			srd.last_third_unit,
			srd.remarks,
			sr.returns_reference,
			sr.year,
			sr.quarter,
			sr.returns_originator_unit,
			sr.returns_status,
			sr.name as strength_returns_doc
		FROM `tabStrength Returns Details` srd
		INNER JOIN `tabStrength Returns` sr ON srd.parent = sr.name
		WHERE srd.personnel = %s
			AND sr.docstatus = 1
		ORDER BY srd.dtos DESC, sr.creation DESC
	""", (service_number,), as_dict=True)
	
	if not strength_returns_records:
		return "<p>No strength returns records found.</p>"
	
	# Generate HTML table
	html = """
	<style>
		.strength-returns-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 10px;
		}
		.strength-returns-table th {
			background-color: var(--subtle-fg);
			padding: 8px;
			text-align: left;
			border: 1px solid var(--table-border-color);
			font-weight: bold;
		}
		.strength-returns-table td {
			padding: 8px;
			border: 1px solid var(--table-border-color);
		}
		.strength-returns-table tr:nth-child(even) {
			background-color: var(--fg-color);
		}
	</style>
	<table class="strength-returns-table">
		<theadget_personnel_attsdets_html>
			<tr>
				<th>Returns Reference</th>
				<th>Year</th>
				<th>Quarter</th>
				<th>Originator Unit</th>
				<th>Rank</th>
				<th>Trade</th>
				<th>DTOS</th>
				<th>Current Depl</th>
				<th>Last Unit</th>
				<th>Status</th>
			</tr>
		</thead>
		<tbody>
	"""
	
	for record in strength_returns_records:
		# Format dates
		dtos = frappe.format_value(record.dtos, {"fieldtype": "Date"}) if record.dtos else ""
		dob = frappe.format_value(record.dob, {"fieldtype": "Date"}) if record.dob else ""
		doe = frappe.format_value(record.doe, {"fieldtype": "Date"}) if record.doe else ""
		dolp = frappe.format_value(record.dolp, {"fieldtype": "Date"}) if record.dolp else ""
		
		# Format returns status with color
		returns_status = record.returns_status or ""
		status_color = "green" if returns_status == "Processed" else "orange" if returns_status == "Rolled Back" else "gray"
		
		html += f"""
			<tr>
				<td><b>{frappe.utils.escape_html(record.returns_reference or "")}</b></td>
				<td>{frappe.utils.escape_html(record.year or "")}</td>
				<td>{frappe.utils.escape_html(record.quarter or "")}</td>
				<td>{frappe.utils.escape_html(record.returns_originator_unit or "")}</td>
				<td>{frappe.utils.escape_html(record.rank or "")}</td>
				<td>{frappe.utils.escape_html(record.trade or "")}</td>
				<td>{dtos}</td>
				<td><b>{frappe.utils.escape_html(record.current_depl or "")}</b></td>
				<td>{frappe.utils.escape_html(record.last_unit or "")}</td>
				<td><span class="indicator {status_color}">{frappe.utils.escape_html(returns_status)}</span></td>
			</tr>
		"""
	
	html += """
		</tbody>
	</table>
	"""
	
	return html

@frappe.whitelist()
def get_personnel_attsdets_html(service_number):
	"""Generate HTML table for personnel attachments/detachments from Personnel Att and Dets Form"""
	if not service_number:
		return "<p>No service number provided.</p>"
	
	# Query all submitted Personnel Att and Dets Form records for this service number
	attsdets_records = frappe.db.sql("""
		SELECT 
			name,
			personnel_attachment_reference,
			attsdets_type,
			from_unit,
			to_unit,
			date,
			type,
			remarks
		FROM `tabPersonnel Att and Dets Form`
		WHERE personnel = %s
			AND docstatus = 1
		ORDER BY date DESC, creation DESC
	""", (service_number,), as_dict=True)
	
	if not attsdets_records:
		return "<p>No attachment/detachment records found.</p>"
	
	# Generate HTML table
	html = """
	<style>
		.attsdets-history-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 10px;
		}
		.attsdets-history-table th {
			background-color: var(--subtle-fg);
			padding: 8px;
			text-align: left;
			border: 1px solid var(--table-border-color);
			font-weight: bold;
		}
		.attsdets-history-table td {
			padding: 8px;
			border: 1px solid var(--table-border-color);
		}
		.attsdets-history-table tr:nth-child(even) {
			background-color: var(--fg-color);
		}
	</style>
	<table class="attsdets-history-table">
		<thead>
			<tr>
				<th>Reference</th>
				<th>Atts/Dets Type</th>
				<th>From Unit</th>
				<th>To Unit</th>
				<th>Date</th>
				<th>Attachment Type</th>
				<th>Remarks</th>
			</tr>
		</thead>
		<tbody>
	"""
	
	for record in attsdets_records:
		# Format date
		date_formatted = frappe.format_value(record.date, {"fieldtype": "Date"}) if record.date else ""
		
		# Format attsdets type with color
		attsdets_type = record.attsdets_type or ""
		type_color = "blue" if attsdets_type == "Attachment" else "orange" if attsdets_type == "Detachment" else "gray"
		
		html += f"""
			<tr>
				<td><b>{frappe.utils.escape_html(record.personnel_attachment_reference or "")}</b></td>
				<td><span class="indicator {type_color}">{frappe.utils.escape_html(attsdets_type)}</span></td>
				<td>{frappe.utils.escape_html(record.from_unit or "")}</td>
				<td><b>{frappe.utils.escape_html(record.to_unit or "")}</b></td>
				<td>{date_formatted}</td>
				<td>{frappe.utils.escape_html(record.type or "")}</td>
				<td>{frappe.utils.escape_html(record.remarks or "")}</td>
			</tr>
		"""
	
	html += """
		</tbody>
	</table>
	"""
	
	return html

@frappe.whitelist()
def get_personnel_data(service_number):
	"""Get complete personnel data for display page"""
	if not service_number:
		return None
	
	# Get personnel record
	personnel = frappe.get_doc("Personnel", service_number)
	
	# Get posting history
	posting_records = frappe.db.get_all(
		"Posting Authority Details",
		filters={
			"service_number": service_number
		},
		fields=[
			"parent",
			"from_unit",
			"to_unit",
			"appointment",
			"wef_date",
			"gaining_unit_date_tos",
			"posting_status",
			"part_2_order",
			"overstay_in_loosing_unit"
		],
		order_by="wef_date desc, creation desc"
	)
	
	# Format personnel data
	personnel_data = {
		"service_number": personnel.service_number,
		"personnel_name": personnel.personnel_name,
		"first_name": personnel.first_name,
		"last_name": personnel.last_name,
		"surname": personnel.surname,
		"category": personnel.category,
		"current_rank": personnel.current_rank,
		"current_unit": personnel.current_unit,
		"current_unit_location": personnel.current_unit_location,
		"current_deployment": personnel.current_deployment,
		"type_of_commission": personnel.type_of_commission,
		"course": personnel.course,
		"date_of_last_promotion": frappe.format_value(personnel.date_of_last_promotion, {"fieldtype": "Date"}) if personnel.date_of_last_promotion else "",
		"phone_number": personnel.phone_number,
		"remarks": personnel.remarks,
		"personnel_image": personnel.personnel_image,
		"posting_history": [],
		"promotion_history": [],
		"courses_attended": []
	}
	
	# Format posting history
	for record in posting_records:
		wef_date = frappe.format_value(record.wef_date, {"fieldtype": "Date"}) if record.wef_date else ""
		date_tos = frappe.format_value(record.gaining_unit_date_tos, {"fieldtype": "Date"}) if record.gaining_unit_date_tos else ""
		
		personnel_data["posting_history"].append({
			"posting_authority": record.parent or "",
			"from_unit": record.from_unit or "",
			"to_unit": record.to_unit or "",
			"appointment": record.appointment or "",
			"wef_date": wef_date,
			"date_tos": date_tos,
			"posting_status": record.posting_status or "",
			"part_2_order": record.part_2_order or "",
			"overstay_days": record.overstay_in_loosing_unit or 0
		})
	
	# Get promotion history
	promotion_records = frappe.db.sql("""
		SELECT 
			p.promotion_authority,
			pl.from_rank,
			pl.to_rank,
			pl.seniority_date
		FROM `tabPromotion List` pl
		INNER JOIN `tabPromotion` p ON pl.parent = p.name
		WHERE pl.service_number = %s
		ORDER BY pl.seniority_date DESC, pl.creation DESC
	""", (service_number,), as_dict=True)
	
	# Format promotion history
	for record in promotion_records:
		seniority_date = frappe.format_value(record.seniority_date, {"fieldtype": "Date"}) if record.seniority_date else ""
		
		personnel_data["promotion_history"].append({
			"promotion_authority": record.promotion_authority or "",
			"from_rank": record.from_rank or "",
			"to_rank": record.to_rank or "",
			"seniority_date": seniority_date
		})
	
	# Get courses attended
	course_records = frappe.db.get_all(
		"Course Attended",
		filters={
			"service_number": service_number
		},
		fields=[
			"course_name",
			"course_start_date",
			"course_end_date",
			"grade",
			"course_report"
		],
		order_by="course_start_date desc, creation desc"
	)
	
	# Format courses attended
	for record in course_records:
		start_date = frappe.format_value(record.course_start_date, {"fieldtype": "Date"}) if record.course_start_date else ""
		end_date = frappe.format_value(record.course_end_date, {"fieldtype": "Date"}) if record.course_end_date else ""
		
		personnel_data["courses_attended"].append({
			"course_name": record.course_name or "",
			"course_start_date": start_date,
			"course_end_date": end_date,
			"grade": record.grade or "",
			"course_report": record.course_report or ""
		})
	
	return personnel_data

@frappe.whitelist()
def get_personnel_brief_html(service_number):
	"""Generate comprehensive personnel brief HTML from all available data"""
	if not service_number:
		return "<p>No service number provided.</p>"
	
	# Get personnel record
	try:
		personnel = frappe.get_doc("Personnel", service_number)
	except frappe.DoesNotExistError:
		return "<p>Personnel record not found.</p>"
	
	# Start building the brief HTML
	html = """
	<style>
		.personnel-brief {
			font-family: Arial, sans-serif;
			line-height: 1.6;
			color: #333;
		}
		.brief-header {
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			padding: 20px;
			border-radius: 8px;
			margin-bottom: 20px;
		}
		.brief-header h2 {
			margin: 0;
			font-size: 24px;
		}
		.brief-section {
			margin-bottom: 25px;
			padding: 15px;
			background-color: #f8f9fa;
			border-left: 4px solid #667eea;
			border-radius: 4px;
		}
		.brief-section h3 {
			margin-top: 0;
			color: #667eea;
			font-size: 18px;
			border-bottom: 2px solid #667eea;
			padding-bottom: 8px;
		}
		.brief-row {
			display: flex;
			margin-bottom: 10px;
		}
		.brief-label {
			font-weight: bold;
			min-width: 180px;
			color: #555;
		}
		.brief-value {
			color: #333;
		}
		.brief-summary {
			background-color: #e8f4f8;
			padding: 15px;
			border-radius: 4px;
			margin-top: 15px;
		}
		.brief-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 10px;
		}
		.brief-table th {
			background-color: #667eea;
			color: white;
			padding: 10px;
			text-align: left;
			border: 1px solid #ddd;
		}
		.brief-table td {
			padding: 8px;
			border: 1px solid #ddd;
			background-color: white;
		}
		.brief-table tr:nth-child(even) td {
			background-color: #f8f9fa;
		}
	</style>
	<div class="personnel-brief">
	"""
	
	# Header Section
	personnel_name = personnel.personnel_name or f"{personnel.first_name or ''} {personnel.last_name or ''} {personnel.surname or ''}".strip() or "N/A"
	html += f"""
		<div class="brief-header">
			<h2>{frappe.utils.escape_html(personnel_name)}</h2>
			<p style="margin: 5px 0 0 0; opacity: 0.9;">Service Number: {frappe.utils.escape_html(service_number)}</p>
		</div>
	"""
	
	# Personal Information Section
	html += """
		<div class="brief-section">
			<h3>Personal Information</h3>
	"""
	
	# Build personal info rows
	personal_info = []
	if personnel.category:
		personal_info.append(("Category", personnel.category))
	if personnel.current_rank:
		personal_info.append(("Current Rank", personnel.current_rank))
	if personnel.type_of_commission:
		personal_info.append(("Type of Commission", personnel.type_of_commission))
	if personnel.course:
		personal_info.append(("Course", personnel.course))
	if personnel.date_of_last_promotion:
		date_promoted = frappe.format_value(personnel.date_of_last_promotion, {"fieldtype": "Date"})
		personal_info.append(("Date of Last Promotion", date_promoted))
	if personnel.phone_number:
		personal_info.append(("Phone Number", personnel.phone_number))
	
	for label, value in personal_info:
		html += f"""
			<div class="brief-row">
				<span class="brief-label">{label}:</span>
				<span class="brief-value">{frappe.utils.escape_html(str(value))}</span>
			</div>
		"""
	
	html += "</div>"
	
	# Current Assignment Section
	html += """
		<div class="brief-section">
			<h3>Current Assignment</h3>
	"""
	
	current_assignment = []
	if personnel.current_unit:
		current_assignment.append(("Current Unit", personnel.current_unit))
	if personnel.current_unit_location:
		current_assignment.append(("Unit Location", personnel.current_unit_location))
	if personnel.current_deployment:
		current_assignment.append(("Current Deployment", personnel.current_deployment))
	
	if current_assignment:
		for label, value in current_assignment:
			html += f"""
				<div class="brief-row">
					<span class="brief-label">{label}:</span>
					<span class="brief-value">{frappe.utils.escape_html(str(value))}</span>
				</div>
			"""
	else:
		html += "<p>No current assignment information available.</p>"
	
	html += "</div>"
	
	# Posting History Summary
	posting_records = frappe.db.get_all(
		"Posting Authority Details",
		filters={"service_number": service_number},
		fields=["parent", "from_unit", "to_unit", "appointment", "wef_date", "gaining_unit_date_tos", "posting_status"],
		order_by="wef_date desc",
		limit=5
	)
	
	if posting_records:
		html += """
			<div class="brief-section">
				<h3>Recent Posting History</h3>
				<table class="brief-table">
					<thead>
						<tr>
							<th>Posting Authority</th>
							<th>From Unit</th>
							<th>To Unit</th>
							<th>Appointment</th>
							<th>WEF Date</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
		"""
		
		for record in posting_records:
			wef_date = frappe.format_value(record.wef_date, {"fieldtype": "Date"}) if record.wef_date else "N/A"
			status = record.posting_status or "N/A"
			status_color = "green" if status == "TOS" else "orange" if status == "Cancelled" else "gray"
			
			html += f"""
						<tr>
							<td>{frappe.utils.escape_html(record.parent or "N/A")}</td>
							<td>{frappe.utils.escape_html(record.from_unit or "N/A")}</td>
							<td><b>{frappe.utils.escape_html(record.to_unit or "N/A")}</b></td>
							<td>{frappe.utils.escape_html(record.appointment or "N/A")}</td>
							<td>{wef_date}</td>
							<td><span class="indicator {status_color}">{frappe.utils.escape_html(status)}</span></td>
						</tr>
			"""
		
		html += """
					</tbody>
				</table>
			</div>
		"""
	
	# Promotion History Summary
	promotion_records = frappe.db.sql("""
		SELECT 
			p.promotion_authority,
			pl.from_rank,
			pl.to_rank,
			pl.seniority_date
		FROM `tabPromotion List` pl
		INNER JOIN `tabPromotion` p ON pl.parent = p.name
		WHERE pl.service_number = %s
		ORDER BY pl.seniority_date DESC
		LIMIT 5
	""", (service_number,), as_dict=True)
	
	if promotion_records:
		html += """
			<div class="brief-section">
				<h3>Recent Promotion History</h3>
				<table class="brief-table">
					<thead>
						<tr>
							<th>Promotion Authority</th>
							<th>From Rank</th>
							<th>To Rank</th>
							<th>Seniority Date</th>
						</tr>
					</thead>
					<tbody>
		"""
		
		for record in promotion_records:
			seniority_date = frappe.format_value(record.seniority_date, {"fieldtype": "Date"}) if record.seniority_date else "N/A"
			
			html += f"""
						<tr>
							<td>{frappe.utils.escape_html(record.promotion_authority or "N/A")}</td>
							<td>{frappe.utils.escape_html(record.from_rank or "N/A")}</td>
							<td><b>{frappe.utils.escape_html(record.to_rank or "N/A")}</b></td>
							<td>{seniority_date}</td>
						</tr>
			"""
		
		html += """
					</tbody>
				</table>
			</div>
		"""
	
	# Courses Attended Summary
	course_records = frappe.db.get_all(
		"Course Attended",
		filters={"service_number": service_number},
		fields=["course_name", "course_start_date", "course_end_date", "grade"],
		order_by="course_start_date desc",
		limit=5
	)
	
	if course_records:
		html += """
			<div class="brief-section">
				<h3>Recent Courses Attended</h3>
				<table class="brief-table">
					<thead>
						<tr>
							<th>Course Name</th>
							<th>Start Date</th>
							<th>End Date</th>
							<th>Grade</th>
						</tr>
					</thead>
					<tbody>
		"""
		
		for record in course_records:
			start_date = frappe.format_value(record.course_start_date, {"fieldtype": "Date"}) if record.course_start_date else "N/A"
			end_date = frappe.format_value(record.course_end_date, {"fieldtype": "Date"}) if record.course_end_date else "N/A"
			
			html += f"""
						<tr>
							<td>{frappe.utils.escape_html(record.course_name or "N/A")}</td>
							<td>{start_date}</td>
							<td>{end_date}</td>
							<td>{frappe.utils.escape_html(record.grade or "N/A")}</td>
						</tr>
			"""
		
		html += """
					</tbody>
				</table>
			</div>
		"""
	
	# Remarks Section
	if personnel.remarks:
		html += f"""
			<div class="brief-section">
				<h3>Remarks</h3>
				<p>{frappe.utils.escape_html(personnel.remarks)}</p>
			</div>
		"""
	
	# Summary Section
	total_postings = len(posting_records) if posting_records else 0
	total_promotions = len(promotion_records) if promotion_records else 0
	total_courses = len(course_records) if course_records else 0
	
	html += f"""
		<div class="brief-summary">
			<h3 style="margin-top: 0;">Summary</h3>
			<div class="brief-row">
				<span class="brief-label">Total Postings:</span>
				<span class="brief-value">{total_postings}</span>
			</div>
			<div class="brief-row">
				<span class="brief-label">Total Promotions:</span>
				<span class="brief-value">{total_promotions}</span>
			</div>
			<div class="brief-row">
				<span class="brief-label">Total Courses:</span>
				<span class="brief-value">{total_courses}</span>
			</div>
		</div>
	"""
	
	html += """
	</div>
	"""
	
	return html

@frappe.whitelist()
def get_all_service_numbers():
	"""Get all service numbers for dropdown"""
	service_numbers = frappe.db.get_all(
		"Personnel",
		fields=["service_number", "personnel_name"],
		order_by="service_number"
	)
	return service_numbers

@frappe.whitelist()
def get_distinct_units():
	"""Get distinct current units for filter dropdown"""
	units = frappe.db.get_all(
		"Personnel",
		fields=["current_unit"],
		filters={"current_unit": ["!=", ""]},
		distinct=True,
		order_by="current_unit"
	)
	return [u["current_unit"] for u in units if u.get("current_unit")]

@frappe.whitelist()
def get_distinct_ranks():
	"""Get distinct ranks for filter dropdown"""
	ranks = frappe.db.get_all(
		"Personnel",
		fields=["current_rank"],
		filters={"current_rank": ["!=", ""]},
		distinct=True,
		order_by="current_rank"
	)
	return [r["current_rank"] for r in ranks if r.get("current_rank")]

@frappe.whitelist()
def get_units_with_personnel(category=None, page=1, page_length=10):
	"""Get all units with their associated personnel"""
	from frappe.utils import getdate, date_diff, today
	
	page = int(page)
	page_length = int(page_length)
	
	# Build filter for category if provided
	category_condition = ""
	params = []
	if category and category in ['Officer', 'Soldier']:
		category_condition = "AND p.category = %s"
		params.append(category)
	
	# Get all distinct units that have personnel (with category filter)
	sql_query = """
		SELECT DISTINCT 
			p.current_unit as unit_name,
			u.unit_location as unit_location
		FROM `tabPersonnel` p
		LEFT JOIN `tabUnit` u ON p.current_unit = u.name
		WHERE p.current_unit IS NOT NULL AND p.current_unit != ''
		""" + category_condition + """
		ORDER BY p.current_unit
	"""
	units = frappe.db.sql(sql_query, tuple(params), as_dict=True)
	
	# For each unit, get the personnel
	units_data = []
	today_date = getdate(today())
	
	for unit in units:
		unit_name = unit.get("unit_name")
		if not unit_name:
			continue
		
		# Build filters for personnel
		personnel_filters = {
			"current_unit": unit_name
		}
		if category and category in ['Officer', 'Soldier']:
			personnel_filters["category"] = category
		
		# Get personnel for this unit
		personnel_list = frappe.db.get_all(
			"Personnel",
			filters=personnel_filters,
			fields=[
				"service_number",
				"personnel_name",
				"current_rank",
				"personnel_image",
				"phone_number",
				"category"
			],
			order_by="personnel_name"
		)
		
		# Calculate period spent in current unit for each personnel
		personnel_with_period = []
		for person in personnel_list:
			service_number = person.get("service_number")
			
			# Get the TOS date when personnel was posted to current unit
			# Look for the TOS date from Unit TOS Record (from submitted Part 2 Orders only)
			tos_record = frappe.db.sql("""
				SELECT utr.date_tos
				FROM `tabUnit TOS Record` utr
				INNER JOIN `tabPart 2 Order` p2o ON utr.parent = p2o.name
				WHERE utr.service_number = %s
					AND utr.to_unit = %s
					AND utr.parenttype = 'Part 2 Order'
					AND p2o.docstatus = 1
				ORDER BY utr.date_tos DESC
				LIMIT 1
			""", (service_number, unit_name), as_dict=True)
			
			period_spent = "N/A"
			if tos_record and tos_record[0].get("date_tos"):
				tos_date_value = tos_record[0].get("date_tos")
				tos_date = getdate(tos_date_value)
				
				# Calculate difference in days
				days_diff = date_diff(today_date, tos_date)
				
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
			
			# Add period to personnel data
			person["period_in_unit"] = period_spent
			personnel_with_period.append(person)
		
		# Get commander for this unit
		# Commander is personnel whose current_unit matches and appointment is in Commander Appointment doctype
		commander = frappe.db.sql("""
			SELECT 
				p.service_number,
				p.personnel_name,
				p.phone_number,
				p.current_rank,
				pad.appointment
			FROM `tabPersonnel` p
			INNER JOIN `tabPosting Authority Details` pad ON p.service_number = pad.service_number
			INNER JOIN `tabCommander Appointment` ca ON pad.appointment = ca.appointment
			WHERE p.current_unit = %s
				AND pad.to_unit = %s
			ORDER BY pad.wef_date DESC, pad.creation DESC
			LIMIT 1
		""", (unit_name, unit_name), as_dict=True)
		
		commander_info = None
		if commander and len(commander) > 0:
			commander_info = {
				"name": commander[0].get("personnel_name") or "",
				"phone_number": commander[0].get("phone_number") or "",
				"rank": commander[0].get("current_rank") or "",
				"service_number": commander[0].get("service_number") or "",
				"appointment": commander[0].get("appointment") or ""
			}
		
		units_data.append({
			"unit_name": unit_name,
			"unit_location": unit.get("unit_location") or "",
			"personnel_count": len(personnel_with_period),
			"personnel": personnel_with_period,
			"commander": commander_info
		})
	
	# Add "No Unit Assigned" group for personnel without current_unit
	# Use SQL to get personnel where current_unit is NULL or empty
	category_sql = ""
	category_params = []
	if category and category in ['Officer', 'Soldier']:
		category_sql = "AND p.category = %s"
		category_params.append(category)
	
	no_unit_sql = """
		SELECT 
			p.service_number,
			p.personnel_name,
			p.current_rank,
			p.personnel_image,
			p.phone_number,
			p.category
		FROM `tabPersonnel` p
		WHERE (p.current_unit IS NULL OR p.current_unit = '')
		""" + category_sql + """
		ORDER BY p.personnel_name
	"""
	
	no_unit_personnel_list = frappe.db.sql(no_unit_sql, tuple(category_params), as_dict=True)
	
	# Add period as "N/A" for personnel without unit
	no_unit_personnel_with_period = []
	for person in no_unit_personnel_list:
		person["period_in_unit"] = "N/A"
		no_unit_personnel_with_period.append(person)
	
	# Add "No Unit Assigned" group if there are personnel without unit
	if no_unit_personnel_with_period:
		units_data.append({
			"unit_name": "No Unit Assigned",
			"unit_location": "",
			"personnel_count": len(no_unit_personnel_with_period),
			"personnel": no_unit_personnel_with_period
		})
	
	# Create summary data for ALL units (regardless of filter) - get counts for all units
	all_units_for_summary = frappe.db.sql("""
		SELECT DISTINCT 
			p.current_unit as unit_name,
			u.unit_location as unit_location
		FROM `tabPersonnel` p
		LEFT JOIN `tabUnit` u ON p.current_unit = u.name
		WHERE p.current_unit IS NOT NULL AND p.current_unit != ''
		ORDER BY p.current_unit
	""", as_dict=True)
	
	units_summary = []
	for unit in all_units_for_summary:
		unit_name = unit.get("unit_name")
		if not unit_name:
			continue
		
		# Get counts for this unit (all categories)
		all_personnel = frappe.db.get_all(
			"Personnel",
			filters={"current_unit": unit_name},
			fields=["category"]
		)
		
		officers_count = sum(1 for p in all_personnel if p.get("category") == "Officer")
		soldiers_count = sum(1 for p in all_personnel if p.get("category") == "Soldier")
		total_count = len(all_personnel)
		
		units_summary.append({
			"unit_name": unit_name,
			"unit_location": unit.get("unit_location") or "",
			"officers_count": officers_count,
			"soldiers_count": soldiers_count,
			"total_count": total_count
		})
	
	# Add "No Unit Assigned" to summary
	no_unit_summary_sql = """
		SELECT category
		FROM `tabPersonnel`
		WHERE (current_unit IS NULL OR current_unit = '')
	"""
	no_unit_all_personnel = frappe.db.sql(no_unit_summary_sql, as_dict=True)
	
	if no_unit_all_personnel:
		no_unit_officers_count = sum(1 for p in no_unit_all_personnel if p.get("category") == "Officer")
		no_unit_soldiers_count = sum(1 for p in no_unit_all_personnel if p.get("category") == "Soldier")
		no_unit_total_count = len(no_unit_all_personnel)
		
		units_summary.append({
			"unit_name": "No Unit Assigned",
			"unit_location": "",
			"officers_count": no_unit_officers_count,
			"soldiers_count": no_unit_soldiers_count,
			"total_count": no_unit_total_count
		})
	
	# Sort units: regular units first (alphabetically), then "No Unit Assigned" at the end
	units_data.sort(key=lambda x: (x["unit_name"] == "No Unit Assigned", x["unit_name"]))
	
	# Pagination
	total_units = len(units_data)
	start_idx = (page - 1) * page_length
	end_idx = start_idx + page_length
	paginated_units = units_data[start_idx:end_idx]
	
	return {
		"units": paginated_units,
		"units_summary": units_summary,  # All units for summary table (unfiltered)
		"total_units": total_units,
		"page": page,
		"page_length": page_length,
		"total_pages": (total_units + page_length - 1) // page_length if total_units > 0 else 1
	}

@frappe.whitelist()
def get_personnel_list(page=1, page_length=20, current_unit=None, rank=None, date_tos=None, personnel_name=None, category=None):
	"""Get paginated list of personnel with current unit, rank, date TOS, and period spent"""
	from frappe.utils import getdate, date_diff, today
	from datetime import datetime
	
	page = int(page)
	page_length = int(page_length)
	limit_start = (page - 1) * page_length
	
	# Build filters
	filters = {}
	if current_unit:
		filters["current_unit"] = current_unit
	if rank:
		filters["current_rank"] = rank
	if personnel_name:
		filters["personnel_name"] = ["like", f"%{personnel_name}%"]
	if category:
		filters["category"] = category
	
	# Parse date_tos filter
	date_tos_filter = None
	if date_tos:
		try:
			date_tos_filter = getdate(date_tos)
		except:
			date_tos_filter = None
	
	# Get total count with filters (will be recalculated after date filtering)
	total_count = frappe.db.count("Personnel", filters=filters)
	
	# Get paginated personnel records with filters
	personnel_list = frappe.db.get_all(
		"Personnel",
		filters=filters,
		fields=[
			"service_number",
			"personnel_name",
			"current_unit",
			"current_rank",
			"category",
			"date_of_enlistment",
			"date_of__commission"
		],
		order_by="personnel_name",
		limit_start=limit_start,
		limit_page_length=page_length
	)
	
	# For each personnel, get the latest Date TOS and calculate period spent
	result = []
	for personnel in personnel_list:
		service_number = personnel.service_number
		
		# Get the latest Date TOS from Unit TOS Record (from submitted Part 2 Orders only)
		# Use SQL to join with Part 2 Order to check docstatus
		latest_tos_sql = frappe.db.sql("""
			SELECT utr.date_tos, utr.to_unit
			FROM `tabUnit TOS Record` utr
			INNER JOIN `tabPart 2 Order` p2o ON utr.parent = p2o.name
			WHERE utr.service_number = %s
				AND utr.parenttype = 'Part 2 Order'
				AND p2o.docstatus = 1
			ORDER BY utr.date_tos DESC
			LIMIT 1
		""", (service_number,), as_dict=True)
		
		latest_tos = latest_tos_sql if latest_tos_sql else None
		
		date_tos = None
		period_spent = ""
		
		if latest_tos and latest_tos[0].get("date_tos"):
			date_tos = latest_tos[0].get("date_tos")
			date_tos_formatted = frappe.format_value(date_tos, {"fieldtype": "Date"})
			
			# Calculate period spent
			today_date = getdate(today())
			tos_date = getdate(date_tos)
			
			# Calculate difference in days
			days_diff = date_diff(today_date, tos_date)
			
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
			period_years = years + (months / 12.0) + (days / 365.0)  # Decimal years for color coding
		else:
			date_tos_formatted = "N/A"
			period_spent = "N/A"
			period_years = None
		
		# Filter by date_tos if provided
		if date_tos_filter:
			if date_tos_formatted == "N/A" or not date_tos:
				continue  # Skip records without date_tos when filter is set
			filter_date = getdate(date_tos_filter)
			tos_date_check = getdate(date_tos)
			if filter_date != tos_date_check:
				continue  # Skip this record if date doesn't match
		
		# Get date of enlistment and commission
		date_of_enlistment = personnel.get("date_of_enlistment")
		date_of_commission = personnel.get("date_of__commission")
		
		# Format dates
		date_of_enlistment_formatted = frappe.format_value(date_of_enlistment, {"fieldtype": "Date"}) if date_of_enlistment else "N/A"
		date_of_commission_formatted = frappe.format_value(date_of_commission, {"fieldtype": "Date"}) if date_of_commission else "N/A"
		
		# Calculate years in service from the earliest available date
		years_in_service = None
		years_in_service_formatted = "N/A"
		
		# Determine the service start date (use the earliest of enlistment or commission)
		service_start_date = None
		if date_of_enlistment:
			service_start_date = getdate(date_of_enlistment)
		if date_of_commission:
			commission_date = getdate(date_of_commission)
			if service_start_date is None or commission_date < service_start_date:
				service_start_date = commission_date
		
		if service_start_date:
			today_date = getdate(today())
			days_diff = date_diff(today_date, service_start_date)
			
			# Convert to years (decimal for precise calculation)
			years_in_service = days_diff / 365.0
			
			# Format as years and months for display
			years = days_diff // 365
			remaining_days = days_diff % 365
			months = remaining_days // 30
			
			if years > 0:
				years_in_service_formatted = f"{years} year{'s' if years != 1 else ''}"
				if months > 0:
					years_in_service_formatted += f" {months} month{'s' if months != 1 else ''}"
			elif months > 0:
				years_in_service_formatted = f"{months} month{'s' if months != 1 else ''}"
			else:
				years_in_service_formatted = f"{days_diff} day{'s' if days_diff != 1 else ''}"
		
		result.append({
			"service_number": service_number,
			"personnel_name": personnel.personnel_name or "N/A",
			"current_unit": personnel.current_unit or "N/A",
			"current_rank": personnel.current_rank or "N/A",
			"category": personnel.category or "N/A",
			"date_tos": date_tos_formatted,
			"period_spent": period_spent,
			"period_years": period_years,  # For color coding
			"date_of_enlistment": date_of_enlistment_formatted,
			"date_of_commission": date_of_commission_formatted,
			"years_in_service": years_in_service_formatted,
			"years_in_service_decimal": years_in_service  # For sorting/filtering if needed
		})
	
	# Recalculate total count if date filter was applied (since we filtered in Python)
	if date_tos_filter:
		total_count = len(result) if page == 1 else total_count  # Approximate for other pages
	
	return {
		"data": result,
		"total_count": total_count,
		"page": page,
		"page_length": page_length,
		"total_pages": (total_count + page_length - 1) // page_length if total_count > 0 else 1
	}

@frappe.whitelist()
def export_personnel_list_to_excel(current_unit=None, rank=None, date_tos=None, personnel_name=None, category=None):
	"""Export all filtered personnel list to Excel"""
	from frappe.utils import getdate, date_diff, today
	from frappe.utils.xlsxutils import make_xlsx
	from frappe.desk.utils import provide_binary_file
	
	# Build filters (same as get_personnel_list)
	filters = {}
	if current_unit:
		filters["current_unit"] = current_unit
	if rank:
		filters["current_rank"] = rank
	if personnel_name:
		filters["personnel_name"] = ["like", f"%{personnel_name}%"]
	if category:
		filters["category"] = category
	
	# Parse date_tos filter
	date_tos_filter = None
	if date_tos:
		try:
			date_tos_filter = getdate(date_tos)
		except:
			date_tos_filter = None
	
	# Get all personnel records with filters (no pagination)
	personnel_list = frappe.db.get_all(
		"Personnel",
		filters=filters,
		fields=[
			"service_number",
			"personnel_name",
			"current_unit",
			"current_rank",
			"category",
			"date_of_enlistment",
			"date_of__commission"
		],
		order_by="personnel_name"
	)
	
	# Prepare data for export
	data = []
	headers = ["Service Number", "Personnel Name", "Category", "Current Unit", "Current Rank", "Date of Enlistment", "Date of Commission", "Years in Service", "Date TOS", "Period Spent"]
	data.append(headers)
	
	for personnel in personnel_list:
		service_number = personnel.service_number
		
		# Get the latest Date TOS from Unit TOS Record (from submitted Part 2 Orders only)
		latest_tos_sql = frappe.db.sql("""
			SELECT utr.date_tos, utr.to_unit
			FROM `tabUnit TOS Record` utr
			INNER JOIN `tabPart 2 Order` p2o ON utr.parent = p2o.name
			WHERE utr.service_number = %s
				AND utr.parenttype = 'Part 2 Order'
				AND p2o.docstatus = 1
			ORDER BY utr.date_tos DESC
			LIMIT 1
		""", (service_number,), as_dict=True)
		
		latest_tos = latest_tos_sql if latest_tos_sql else None
		
		date_tos = None
		period_spent = "N/A"
		
		if latest_tos and latest_tos[0].get("date_tos"):
			date_tos = latest_tos[0].get("date_tos")
			date_tos_formatted = frappe.format_value(date_tos, {"fieldtype": "Date"})
			
			# Calculate period spent
			today_date = getdate(today())
			tos_date = getdate(date_tos)
			days_diff = date_diff(today_date, tos_date)
			
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
		else:
			date_tos_formatted = "N/A"
			period_spent = "N/A"
		
		# Filter by date_tos if provided
		if date_tos_filter:
			if date_tos_formatted == "N/A" or not date_tos:
				continue  # Skip records without date_tos when filter is set
			filter_date = getdate(date_tos_filter)
			tos_date_check = getdate(date_tos)
			if filter_date != tos_date_check:
				continue  # Skip this record if date doesn't match
		
		# Get date of enlistment and commission
		date_of_enlistment = personnel.get("date_of_enlistment")
		date_of_commission = personnel.get("date_of__commission")
		
		# Format dates
		date_of_enlistment_formatted = frappe.format_value(date_of_enlistment, {"fieldtype": "Date"}) if date_of_enlistment else "N/A"
		date_of_commission_formatted = frappe.format_value(date_of_commission, {"fieldtype": "Date"}) if date_of_commission else "N/A"
		
		# Calculate years in service from the earliest available date
		years_in_service_formatted = "N/A"
		
		# Determine the service start date (use the earliest of enlistment or commission)
		service_start_date = None
		if date_of_enlistment:
			service_start_date = getdate(date_of_enlistment)
		if date_of_commission:
			commission_date = getdate(date_of_commission)
			if service_start_date is None or commission_date < service_start_date:
				service_start_date = commission_date
		
		if service_start_date:
			today_date = getdate(today())
			days_diff = date_diff(today_date, service_start_date)
			
			# Format as years and months for display
			years = days_diff // 365
			remaining_days = days_diff % 365
			months = remaining_days // 30
			
			if years > 0:
				years_in_service_formatted = f"{years} year{'s' if years != 1 else ''}"
				if months > 0:
					years_in_service_formatted += f" {months} month{'s' if months != 1 else ''}"
			elif months > 0:
				years_in_service_formatted = f"{months} month{'s' if months != 1 else ''}"
			else:
				years_in_service_formatted = f"{days_diff} day{'s' if days_diff != 1 else ''}"
		
		# Add row to data
		data.append([
			personnel.service_number or "",
			personnel.personnel_name or "N/A",
			personnel.category or "N/A",
			personnel.current_unit or "N/A",
			personnel.current_rank or "N/A",
			date_of_enlistment_formatted,
			date_of_commission_formatted,
			years_in_service_formatted,
			date_tos_formatted,
			period_spent
		])
	
	# Create Excel file
	xlsx_file = make_xlsx(data, "Personnel List")
	file_content = xlsx_file.getvalue()
	
	# Generate filename with timestamp
	from frappe.utils import now_datetime
	timestamp = now_datetime().strftime("%Y%m%d_%H%M%S")
	file_name = f"Personnel_List_Export_{timestamp}.xlsx"
	
	# Use provide_binary_file to download directly
	provide_binary_file(file_name, "xlsx", file_content)

@frappe.whitelist()
def download_personnel_import_template(file_format='xlsx'):
	"""Download a template file for personnel import"""
	from frappe.desk.utils import provide_binary_file
	import csv
	import io
	
	# Get mandatory fields dynamically from the doctype
	doctype_meta = frappe.get_meta("Personnel")
	mandatory_fields = [field.fieldname for field in doctype_meta.fields if field.reqd]
	
	# Ensure data_import_reference is not in mandatory fields (it's optional)
	if 'data_import_reference' in mandatory_fields:
		mandatory_fields.remove('data_import_reference')
	
	# Add data_import_reference as optional field
	template_fields = mandatory_fields + ['data_import_reference']
	
	# Get field labels for better readability
	field_labels = []
	for fieldname in template_fields:
		field = doctype_meta.get_field(fieldname)
		if field:
			field_labels.append(field.label or fieldname)
		else:
			field_labels.append(fieldname)
	
	if file_format.lower() == 'csv':
		# Generate CSV template
		output = io.StringIO()
		writer = csv.writer(output)
		
		# Write headers
		writer.writerow(template_fields)
		
		# Write example row (empty values) - users can fill this in
		writer.writerow([''] * len(template_fields))
		
		csv_content = output.getvalue()
		file_content = csv_content.encode('utf-8')
		file_name = "Personnel_Import_Template.csv"
		
		provide_binary_file(file_name, "csv", file_content)
	else:
		# Generate Excel template
		try:
			from openpyxl import Workbook
			from openpyxl.styles import Font, PatternFill, Alignment
		except ImportError:
			frappe.throw("openpyxl is required for Excel template generation. Please install it: pip install openpyxl")
		
		wb = Workbook()
		ws = wb.active
		ws.title = "Personnel Import Template"
		
		# Header row with field names
		header_row = template_fields
		ws.append(header_row)
		
		# Style the header row
		header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
		header_font = Font(bold=True, color="FFFFFF")
		
		for cell in ws[1]:
			cell.fill = header_fill
			cell.font = header_font
			cell.alignment = Alignment(horizontal="center", vertical="center")
		
		# Add field labels row (row 2)
		label_row = field_labels
		ws.append(label_row)
		
		# Style the label row
		label_font = Font(italic=True, color="666666")
		for cell in ws[2]:
			cell.font = label_font
			cell.alignment = Alignment(horizontal="left", vertical="center")
		
		# Add example row with empty values (row 3)
		example_row = [''] * len(template_fields)
		ws.append(example_row)
		
		# Add instructions row (row 4)
		from openpyxl.utils import get_column_letter
		instruction_text = "Instructions: 1) Fill in the mandatory fields (service_number, category, personnel_name). 2) data_import_reference is optional - used for rollback. 3) Delete this instruction row before importing. 4) Save the file and upload it using the import page."
		ws.append([instruction_text] + [''] * (len(template_fields) - 1))
		
		# Merge cells for instructions (merge all columns)
		last_col = get_column_letter(len(template_fields))
		ws.merge_cells(f'A4:{last_col}4')
		instruction_cell = ws['A4']
		instruction_cell.font = Font(italic=True, color="0066CC")
		instruction_cell.alignment = Alignment(wrap_text=True, horizontal="left", vertical="center")
		
		# Auto-adjust column widths
		for column in ws.columns:
			max_length = 0
			column_letter = column[0].column_letter
			for cell in column:
				try:
					if len(str(cell.value)) > max_length:
						max_length = len(str(cell.value))
				except:
					pass
			adjusted_width = min(max_length + 2, 50)
			ws.column_dimensions[column_letter].width = adjusted_width
		
		# Save to BytesIO
		from io import BytesIO
		output = BytesIO()
		wb.save(output)
		file_content = output.getvalue()
		file_name = "Personnel_Import_Template.xlsx"
		
		provide_binary_file(file_name, "xlsx", file_content)

@frappe.whitelist()
def validate_preview_data(rows_data):
	"""Validate preview data and check for existing records"""
	# Get mandatory fields dynamically from the doctype
	doctype_meta = frappe.get_meta("Personnel")
	mandatory_fields = [field.fieldname for field in doctype_meta.fields if field.reqd]
	
	# Ensure data_import_reference is not in mandatory fields (it's optional)
	if 'data_import_reference' in mandatory_fields:
		mandatory_fields.remove('data_import_reference')
	
	# Normalize header names (remove spaces, underscores, convert to lowercase)
	def normalize_header_name(header):
		return str(header).strip().lower().replace(' ', '').replace('_', '').replace('-', '')
	
	# Get field definitions for link validation
	field_definitions = {}
	field_labels_map = {}  # Map label -> fieldname
	for field in doctype_meta.fields:
		field_label = field.label if hasattr(field, 'label') and field.label else field.fieldname
		field_definitions[field.fieldname] = {
			'fieldtype': field.fieldtype,
			'options': field.options if hasattr(field, 'options') else None,
			'reqd': field.reqd,
			'label': field_label
		}
		# Map label to fieldname (case-insensitive)
		if hasattr(field, 'label') and field.label:
			label_normalized = normalize_header_name(field.label)
			field_labels_map[label_normalized] = field.fieldname
	
	validation_results = []
	
	if not rows_data or len(rows_data) < 2:
		return {'validations': []}
	
	headers = rows_data[0]
	data_rows = rows_data[1:]
	
	# Find the last row with actual content (stop processing empty rows)
	last_row_with_content = -1
	for i in range(len(data_rows) - 1, -1, -1):
		row = data_rows[i]
		if row and any(str(cell).strip() if cell is not None else '' for cell in row):
			last_row_with_content = i
			break
	
	# Only process rows up to the last row with content
	if last_row_with_content >= 0:
		data_rows = data_rows[:last_row_with_content + 1]
	else:
		data_rows = []
	
	# Create mapping from header names to field names (case-insensitive, handle variations)
	# Map header -> (field_name, column_index)
	header_to_field_map = {}
	
	# Create a list of all possible field name variations
	all_fields = list(field_definitions.keys()) + mandatory_fields
	field_variations = {}
	for field in all_fields:
		# Get field label if available
		field_label = field_definitions[field].get('label', field)
		
		# Create variations: fieldname, field_name, Field Name, label, etc.
		variations = [
			field.lower(),
			field.lower().replace('_', ''),
			field.lower().replace('_', ' '),
			field_label.lower(),
			field_label.lower().replace(' ', ''),
			field_label.lower().replace(' ', '_'),
			field
		]
		for variation in variations:
			normalized = normalize_header_name(variation)
			if normalized not in field_variations:
				field_variations[normalized] = field
	
	# Map each header to its corresponding field
	for idx, header in enumerate(headers):
		header_str = str(header).strip() if header else ''
		if not header_str:
			continue
		
		# Try to find matching field - try direct match first (most common case)
		matched_field = None
		header_lower = header_str.lower().strip()
		
		# First try exact match (case-insensitive) with field names - this handles most cases
		for field in all_fields:
			if field.lower() == header_lower:
				matched_field = field
				break
		
		# If no exact match, try with field labels
		if not matched_field:
			for field in all_fields:
				field_label = field_definitions[field].get('label', field)
				if field_label and field_label.lower().strip() == header_lower:
					matched_field = field
					break
		
		# If still no match, try normalized match
		if not matched_field:
			normalized_header = normalize_header_name(header_str)
			if normalized_header in field_variations:
				matched_field = field_variations[normalized_header]
			elif normalized_header in field_labels_map:
				matched_field = field_labels_map[normalized_header]
		
		if matched_field:
			header_to_field_map[matched_field] = idx
	
	# Debug: Check if all mandatory fields are mapped
	missing_mappings = [f for f in mandatory_fields if f not in header_to_field_map]
	if missing_mappings:
		# Log warning if mandatory fields are not found in headers
		frappe.log_error(f"Missing header mappings for mandatory fields: {missing_mappings}. Headers: {headers}. Mapping: {header_to_field_map}", "Preview Validation Warning")
	
	for row_idx, row in enumerate(data_rows):
		# Skip empty rows
		if not row or not any(str(cell).strip() if cell is not None else '' for cell in row):
			continue
		
		row_result = {
			'row_index': row_idx + 2,  # +2 because row 1 is header, and we start from 2
			'exists': False,
			'errors': [],
			'warnings': [],
			'debug_data': {}  # For debugging - will be removed or can be filtered out
		}
		
		# Extract data by field name (not header name)
		row_data_by_field = {}
		for field_name, col_idx in header_to_field_map.items():
			if col_idx < len(row):
				value = row[col_idx]
				# Handle different value types - be more lenient with what counts as "empty"
				if value is None:
					row_data_by_field[field_name] = ''
				elif isinstance(value, (int, float)):
					# Convert numbers to string (preserve the value)
					if isinstance(value, float) and value.is_integer():
						row_data_by_field[field_name] = str(int(value))
					else:
						row_data_by_field[field_name] = str(value)
				elif isinstance(value, bool):
					row_data_by_field[field_name] = str(value)
				else:
					# String value - preserve the value, only strip whitespace
					value_str = str(value) if value is not None else ''
					# Don't treat 'None' string as empty - it's actual data
					if value_str.lower() == 'none':
						row_data_by_field[field_name] = ''
					else:
						row_data_by_field[field_name] = value_str.strip()
			else:
				row_data_by_field[field_name] = ''
		
		# Initialize all mandatory fields (set to empty if not found in header mapping)
		for field in mandatory_fields:
			if field not in row_data_by_field:
				row_data_by_field[field] = ''
		
		# Check for service_number
		service_number = row_data_by_field.get('service_number', '')
		
		# Check if record exists
		if service_number:
			if frappe.db.exists("Personnel", service_number):
				row_result['exists'] = True
		
		# Store debug data (extracted values for troubleshooting)
		row_result['debug_data'] = {
			'header_mapping': header_to_field_map,
			'row_length': len(row) if row else 0,
			'extracted_values': {k: v for k, v in row_data_by_field.items() if k in mandatory_fields},
			'raw_row_sample': [str(cell)[:50] if cell is not None else 'None' for cell in (row[:10] if row else [])]  # First 10 cells for debugging
		}
		
		# Validate mandatory fields
		for field in mandatory_fields:
			value = row_data_by_field.get(field, '')
			
			if not value:
				row_result['errors'].append(f"Missing mandatory field: {field}")
		
		# Validate link fields
		for field_name, field_info in field_definitions.items():
			if field_info['fieldtype'] == 'Link' and field_name in row_data_by_field:
				value = row_data_by_field[field_name]
				if value:  # Only validate if value is provided
					options = field_info.get('options')
					if options:
						# Check if the link value exists
						if not frappe.db.exists(options, value):
							row_result['errors'].append(f"Invalid {field_name}: '{value}' not found in {options}")
		
		validation_results.append(row_result)
	
	# Return validation results with debug info (header mapping for troubleshooting)
	return {
		'validations': validation_results,
		'header_mapping': header_to_field_map,  # Debug info
		'mandatory_fields': mandatory_fields  # Debug info
	}

@frappe.whitelist()
def preview_excel_file(file_content):
	"""Preview Excel file data for frontend display"""
	import base64
	import io
	try:
		from openpyxl import load_workbook
	except ImportError:
		return {'error': 'openpyxl is required for Excel file preview'}
	
	try:
		# Decode base64 content
		file_bytes = base64.b64decode(file_content)
		
		# Load workbook
		wb = load_workbook(filename=io.BytesIO(file_bytes), read_only=True, data_only=True)
		ws = wb.active
		
		# Get headers from first row
		headers = []
		for cell in ws[1]:
			if cell.value:
				headers.append(str(cell.value).strip())
			else:
				headers.append('')
		
		# Get data rows - find the last row with content first
		# First, scan to find the last row with content
		last_row_with_content = 1  # Start from row 1 (header)
		max_row_to_check = min(ws.max_row, 1000)  # Limit check to 1000 rows max
		
		for row_num in range(2, max_row_to_check + 1):
			row = ws[row_num]
			has_content = False
			for cell in row:
				if cell.value is not None and str(cell.value).strip():
					has_content = True
					break
			if has_content:
				last_row_with_content = row_num
			elif row_num > last_row_with_content + 10:  # Stop if we've gone 10 rows without content
				break
		
		# Get data rows up to the last row with content (limit to 10 for preview)
		rows = [headers]
		max_preview_row = min(last_row_with_content, 11)  # Header + 10 data rows
		
		for row in ws.iter_rows(min_row=2, max_row=max_preview_row, values_only=False):
			row_data = []
			for idx, cell in enumerate(row):
				if idx < len(headers):
					value = cell.value
					if value is not None:
						# Preserve the actual value
						row_data.append(str(value).strip())
					else:
						row_data.append('')
			# Only add row if it has at least one non-empty value
			if any(v for v in row_data):
				rows.append(row_data)
		
		return {'rows': rows}
	except Exception as e:
		return {'error': str(e)}

@frappe.whitelist()
def import_personnel_data(file_name, file_content, file_extension, import_reference=None):
	"""Import personnel data from CSV or Excel file"""
	import csv
	import io
	import base64
	from frappe.utils import now_datetime, getdate
	try:
		from openpyxl import load_workbook
	except ImportError:
		frappe.throw("openpyxl is required for Excel file import. Please install it: pip install openpyxl")
	
	# Generate import reference if not provided
	if not import_reference:
		import_reference = f"IMPORT_{now_datetime().strftime('%Y%m%d_%H%M%S')}"
	
	# Get mandatory fields dynamically from the doctype
	doctype_meta = frappe.get_meta("Personnel")
	mandatory_fields = [field.fieldname for field in doctype_meta.fields if field.reqd]
	
	# Ensure data_import_reference is not in mandatory fields (it's optional)
	if 'data_import_reference' in mandatory_fields:
		mandatory_fields.remove('data_import_reference')
	
	results = {
		'success': False,
		'total_rows': 0,
		'created': 0,
		'updated': 0,
		'failed': 0,
		'errors': [],
		'import_reference': import_reference
	}
	
	try:
		# Parse file based on extension
		rows = []
		
		if file_extension == 'csv':
			# Parse CSV - file_content is base64 encoded
			try:
				decoded_content = base64.b64decode(file_content).decode('utf-8')
			except UnicodeDecodeError:
				# Try with different encoding
				try:
					decoded_content = base64.b64decode(file_content).decode('latin-1')
				except:
					decoded_content = base64.b64decode(file_content).decode('utf-8', errors='ignore')
			except:
				# Try without base64 decoding (in case it's already text)
				decoded_content = file_content
			
			try:
				csv_reader = csv.DictReader(io.StringIO(decoded_content))
				rows = list(csv_reader)
			except Exception as e:
				results['errors'].append(f"Error parsing CSV file: {str(e)}")
				return results
		elif file_extension in ['xlsx', 'xls']:
			# Parse Excel - file_content is base64 encoded
			try:
				file_bytes = base64.b64decode(file_content)
			except:
				# If decoding fails, try using as-is
				if isinstance(file_content, bytes):
					file_bytes = file_content
				else:
					file_bytes = file_content.encode('utf-8')
			
			# Load workbook
			try:
				wb = load_workbook(filename=io.BytesIO(file_bytes), read_only=True, data_only=True)
				ws = wb.active
			except Exception as e:
				results['errors'].append(f"Error reading Excel file: {str(e)}")
				return results
			
			# Get headers from first row
			headers = []
			for cell in ws[1]:
				if cell.value:
					headers.append(str(cell.value).strip())
			
			if not headers:
				results['errors'].append("No headers found in Excel file")
				return results
			
			# Read data rows
			for row in ws.iter_rows(min_row=2, values_only=False):
				row_data = {}
				for idx, cell in enumerate(row):
					if idx < len(headers) and headers[idx]:
						value = cell.value
						# Convert to string if not None
						if value is not None:
							row_data[headers[idx]] = str(value).strip()
						else:
							row_data[headers[idx]] = None
				# Only add row if it has at least one non-empty value
				if any(v for v in row_data.values() if v):
					rows.append(row_data)
		else:
			results['errors'].append(f"Unsupported file format: {file_extension}")
			return results
		
		results['total_rows'] = len(rows)
		
		if not rows:
			results['errors'].append("No data rows found in file")
			return results
		
		# Validate headers
		first_row = rows[0]
		file_headers = [str(k).strip().lower() for k in first_row.keys()]
		
		missing_fields = []
		for field in mandatory_fields:
			if field.lower() not in file_headers:
				missing_fields.append(field)
		
		if missing_fields:
			results['errors'].append(f"Missing mandatory columns: {', '.join(missing_fields)}")
			return results
		
		# Process each row
		for row_idx, row_data in enumerate(rows, start=2):  # Start at 2 (row 1 is header)
			try:
				# Normalize field names (case-insensitive)
				normalized_data = {}
				for key, value in row_data.items():
					normalized_key = str(key).strip().lower()
					normalized_data[normalized_key] = value
				
				# Extract mandatory fields
				personnel_data = {}
				for field in mandatory_fields:
					field_lower = field.lower()
					if field_lower in normalized_data:
						value = normalized_data[field_lower]
						# Convert to string and strip whitespace
						if value is not None:
							personnel_data[field] = str(value).strip()
						else:
							personnel_data[field] = None
					else:
						personnel_data[field] = None
				
				# Validate mandatory fields are not empty
				missing_values = []
				for field in mandatory_fields:
					if not personnel_data.get(field):
						missing_values.append(field)
				
				if missing_values:
					results['errors'].append(f"Row {row_idx}: Missing values for: {', '.join(missing_values)}")
					results['failed'] += 1
					continue
				
				# Set import reference - always use the page field value, ignore CSV column
				personnel_data['data_import_reference'] = import_reference
				
				# Check if record exists
				service_number = personnel_data['service_number']
				exists = frappe.db.exists("Personnel", service_number)
				
				if exists:
					# Update existing record
					doc = frappe.get_doc("Personnel", service_number)
					
					# Update only mandatory fields
					for field in mandatory_fields:
						if field in personnel_data:
							doc.set(field, personnel_data[field])
					
					# Update import reference
					doc.set('data_import_reference', personnel_data['data_import_reference'])
					
					doc.save(ignore_permissions=True)
					results['updated'] += 1
				else:
					# Create new record
					doc = frappe.get_doc({
						'doctype': 'Personnel',
						**personnel_data
					})
					doc.insert(ignore_permissions=True)
					results['created'] += 1
				
				frappe.db.commit()
				
			except frappe.UniqueValidationError as e:
				results['errors'].append(f"Row {row_idx}: Duplicate service number - {str(e)}")
				results['failed'] += 1
				frappe.db.rollback()
			except frappe.LinkValidationError as e:
				results['errors'].append(f"Row {row_idx}: Invalid link value - {str(e)}")
				results['failed'] += 1
				frappe.db.rollback()
			except Exception as e:
				results['errors'].append(f"Row {row_idx}: {str(e)}")
				results['failed'] += 1
				frappe.db.rollback()
		
		results['success'] = True
		
	except Exception as e:
		results['errors'].append(f"Import error: {str(e)}")
		frappe.log_error(f"Personnel import error: {str(e)}", "Personnel Import")
	
	return results

@frappe.whitelist()
def rollback_personnel_import(import_reference):
	"""Rollback all personnel records imported with a specific import reference"""
	if not import_reference:
		return {
			'success': False,
			'error': 'Import reference is required'
		}
	
	results = {
		'success': False,
		'deleted': 0,
		'import_reference': import_reference,
		'error': None
	}
	
	try:
		# Find all personnel records with this import reference
		personnel_list = frappe.db.get_all(
			"Personnel",
			filters={'data_import_reference': import_reference},
			fields=['name', 'service_number']
		)
		
		if not personnel_list:
			results['error'] = f"No records found with import reference: {import_reference}"
			return results
		
		# Delete each record
		for personnel in personnel_list:
			try:
				frappe.delete_doc("Personnel", personnel.name, force=1, ignore_permissions=True)
				results['deleted'] += 1
			except Exception as e:
				frappe.log_error(f"Error deleting personnel {personnel.service_number}: {str(e)}", "Personnel Rollback")
		
		frappe.db.commit()
		results['success'] = True
		
	except Exception as e:
		results['error'] = str(e)
		frappe.log_error(f"Personnel rollback error: {str(e)}", "Personnel Rollback")
		frappe.db.rollback()
	
	return results

@frappe.whitelist()
def get_personnel_unit_mismatches():
	"""Get personnel where current_unit != personnel_unit_from_returns with date information"""
	from frappe.utils import getdate
	
	# Query personnel where current_unit and personnel_unit_from_returns are different and both exist
	personnel_list = frappe.db.sql("""
		SELECT 
			p.service_number,
			p.personnel_name,
			p.current_unit,
			p.personnel_unit_from_returns,
			p.dtos,
			p.strength_returns
		FROM `tabPersonnel` p
		WHERE p.current_unit IS NOT NULL 
			AND p.current_unit != ''
			AND p.personnel_unit_from_returns IS NOT NULL
			AND p.personnel_unit_from_returns != ''
			AND p.current_unit != p.personnel_unit_from_returns
		ORDER BY p.personnel_name
	""", as_dict=True)
	
	results = []
	
	for personnel in personnel_list:
		# Get latest date_tos from Posting Authority Details for current_unit
		latest_posting = frappe.db.sql("""
			SELECT 
				pad.gaining_unit_date_tos,
				pad.part_2_order,
				pad.wef_date
			FROM `tabPosting Authority Details` pad
			WHERE pad.service_number = %s
				AND pad.to_unit = %s
				AND pad.gaining_unit_date_tos IS NOT NULL
				AND pad.posting_status = 'TOS'
			ORDER BY pad.gaining_unit_date_tos DESC, pad.creation DESC
			LIMIT 1
		""", (personnel.service_number, personnel.current_unit), as_dict=True)
		
		current_unit_date = None
		part_2_order = None
		if latest_posting:
			current_unit_date = latest_posting[0].gaining_unit_date_tos
			part_2_order = latest_posting[0].part_2_order
		
		# Get dtos from Strength Returns (already stored in personnel.dtos)
		returns_date = personnel.dtos
		
		# Determine which is latest
		latest_source = None
		if current_unit_date and returns_date:
			current_date_obj = getdate(current_unit_date)
			returns_date_obj = getdate(returns_date)
			if current_date_obj > returns_date_obj:
				latest_source = "current_unit"
			elif returns_date_obj > current_date_obj:
				latest_source = "personnel_unit_from_returns"
			else:
				latest_source = "equal"
		elif current_unit_date:
			latest_source = "current_unit"
		elif returns_date:
			latest_source = "personnel_unit_from_returns"
		
		results.append({
			"service_number": personnel.service_number,
			"personnel_name": personnel.personnel_name,
			"current_unit": personnel.current_unit,
			"personnel_unit_from_returns": personnel.personnel_unit_from_returns,
			"current_unit_date": current_unit_date,
			"returns_date": returns_date,
			"part_2_order": part_2_order,
			"strength_returns": personnel.strength_returns,
			"latest_source": latest_source
		})
	
	return results


@frappe.whitelist()
def get_personnel_without_strength_returns(
	page=1,
	page_length=50,
	category=None,
	year=None,
	quarter=None,
	returns_originator_unit=None,
	personnel_category=None,
):
	"""Get paginated list of personnel that have no Strength Returns record
	for the given filters.

	The filters apply to submitted Strength Returns documents (`tabStrength Returns`)
	and their child table (`tabStrength Returns Details`):
	- year (sr.year)
	- quarter (sr.quarter)
	- returns_originator_unit (sr.returns_originator_unit)
	- personnel_category (sr.personnel_category)

	`category` filters on the Personnel doctype (Officer / Soldier).

	Logic:
	1. Take all Personnel (optionally filtered by category).
	2. From them, mark those that appear in any submitted Strength Returns row
	   matching the filters above as "with returns".
	3. Everyone else is "without returns" for this filter context.
	"""
	page = int(page) if page else 1
	page_length = int(page_length) if page_length else 50
	if page < 1:
		page = 1
	if page_length < 1:
		page_length = 50
	limit_start = (page - 1) * page_length

	# Personnel-level filter (Officer / Soldier)
	personnel_where = ["1=1"]
	personnel_params: list[object] = []
	if category:
		personnel_where.append("p.category = %s")
		personnel_params.append(category)
	personnel_where_sql = " AND ".join(personnel_where)

	# Strength Returns–level filters (apply consistently everywhere)
	sr_where = ["sr.docstatus = 1", "srd.personnel IS NOT NULL"]
	sr_params: list[object] = []

	if year:
		sr_where.append("sr.year = %s")
		sr_params.append(year)
	if quarter:
		sr_where.append("sr.quarter = %s")
		sr_params.append(quarter)
	if returns_originator_unit:
		sr_where.append("sr.returns_originator_unit = %s")
		sr_params.append(returns_originator_unit)
	if personnel_category:
		# Filter by Strength Returns' Personnel Category
		sr_where.append("sr.personnel_category = %s")
		sr_params.append(personnel_category)

	sr_where_sql = " AND ".join(sr_where)

	# 1) Total personnel in scope (respecting Personnel.category filter only)
	total_personnel_row = frappe.db.sql(
		f"""
		SELECT COUNT(*) AS cnt
		FROM `tabPersonnel` p
		WHERE {personnel_where_sql}
		""",
		tuple(personnel_params),
		as_dict=True,
	)
	total_personnel = total_personnel_row[0].cnt if total_personnel_row else 0

	# 2) Personnel that HAVE at least one Strength Returns row matching filters
	# Join with Personnel to respect Personnel.category filter as well
	total_with_returns_row = frappe.db.sql(
		f"""
		SELECT COUNT(DISTINCT srd.personnel) AS cnt
		FROM `tabStrength Returns Details` srd
		INNER JOIN `tabStrength Returns` sr ON srd.parent = sr.name
		INNER JOIN `tabPersonnel` p ON p.service_number = srd.personnel
		WHERE {sr_where_sql}
		  AND {personnel_where_sql}
		""",
		tuple(sr_params + personnel_params),
		as_dict=True,
	)
	total_with_returns = (
		total_with_returns_row[0].cnt if total_with_returns_row else 0
	)

	# 3) Personnel WITHOUT any Strength Returns row matching the filters
	total_without_returns = max(total_personnel - total_with_returns, 0)

	# 4) By-category breakdown among personnel WITHOUT returns
	by_category_rows = frappe.db.sql(
		f"""
		SELECT p.category, COUNT(*) AS cnt
		FROM `tabPersonnel` p
		WHERE {personnel_where_sql}
		  AND NOT EXISTS (
			SELECT 1
			FROM `tabStrength Returns Details` srd
			INNER JOIN `tabStrength Returns` sr ON srd.parent = sr.name
			WHERE {sr_where_sql}
			  AND srd.personnel = p.service_number
		  )
		GROUP BY p.category
		""",
		tuple(personnel_params + sr_params),
		as_dict=True,
	)
	by_category = {
		(row.category or "Unknown"): row.cnt for row in by_category_rows
	}

	# 5) Paginated data – only personnel WITHOUT returns in this filter context
	data_rows = frappe.db.sql(
		f"""
		SELECT
			p.service_number,
			p.personnel_name,
			p.category,
			p.current_rank,
			p.current_unit,
			p.current_deployment,
			p.personnel_unit_from_returns,
			p.dtos
		FROM `tabPersonnel` p
		WHERE {personnel_where_sql}
		  AND NOT EXISTS (
			SELECT 1
			FROM `tabStrength Returns Details` srd
			INNER JOIN `tabStrength Returns` sr ON srd.parent = sr.name
			WHERE {sr_where_sql}
			  AND srd.personnel = p.service_number
		  )
		ORDER BY p.personnel_name
		LIMIT %s OFFSET %s
		""",
		tuple(personnel_params + sr_params + [page_length, limit_start]),
		as_dict=True,
	)

	formatted = []
	for row in data_rows:
		formatted.append(
			{
				"service_number": row.service_number,
				"personnel_name": row.personnel_name,
				"category": row.category,
				"current_rank": row.current_rank,
				"current_unit": row.current_unit,
				"current_deployment": row.current_deployment,
				"personnel_unit_from_returns": row.personnel_unit_from_returns,
				"dtos": frappe.format_value(
					row.dtos, {"fieldtype": "Date"}
				)
				if row.dtos
				else "",
			}
		)

	total_pages = (
		(total_without_returns + page_length - 1) // page_length
		if total_without_returns > 0
		else 1
	)

	return {
		"data": formatted,
		"total_without_returns": total_without_returns,
		"total_personnel": total_personnel,
		"total_with_returns": total_with_returns,
		"stats": {
			"total_personnel": total_personnel,
			"total_with_returns": total_with_returns,
			"total_without_returns": total_without_returns,
			"percent_without_returns": round(
				(total_without_returns / total_personnel) * 100, 2
			)
			if total_personnel
			else 0,
			"by_category": by_category,
		},
		"page": page,
		"page_length": page_length,
		"total_pages": total_pages,
	}
