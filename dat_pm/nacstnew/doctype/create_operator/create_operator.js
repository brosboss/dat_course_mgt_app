// Copyright (c) 2025, !! and contributors
// For license information, please see license.txt

frappe.ui.form.on("Create Operator", {
	refresh(frm) {
		// Update enabled field status based on email (make read-only for Administrator)
		frm.trigger("update_enabled_field_status");
		
		// Sync enabled status from User if document is not new and user exists
		if (!frm.is_new() && frm.doc.email) {
			frappe.call({
				method: "frappe.client.get_value",
				args: {
					doctype: "User",
					filters: {
						name: frm.doc.email
					},
					fieldname: "enabled"
				},
				callback: function(r) {
					if (r.message && r.message.enabled !== undefined) {
						// Only update if the field exists and value is different
						if (frm.doc.enabled !== r.message.enabled) {
							frm.set_value("enabled", r.message.enabled);
						}
					}
				},
				error: function() {
					// User doesn't exist yet, keep current enabled value or default to 1
					if (frm.doc.enabled === undefined || frm.doc.enabled === null) {
						frm.set_value("enabled", 1);
					}
				}
			});
		} else if (frm.is_new()) {
			// For new documents, default enabled to 1 if not set
			if (frm.doc.enabled === undefined || frm.doc.enabled === null) {
				frm.set_value("enabled", 1);
			}
		}
		
		// Add custom button to check if user exists
		if (!frm.is_new()) {
			frm.add_custom_button(__("Check User"), function() {
				frappe.call({
					method: "frappe.client.get",
					args: {
						doctype: "User",
						name: frm.doc.email
					},
					callback: function(r) {
						if (r.message) {
							frappe.show_alert({
								message: __("User already exists"),
								indicator: "orange"
							});
						} else {
							frappe.show_alert({
								message: __("User does not exist"),
								indicator: "green"
							});
						}
					},
					error: function() {
						frappe.show_alert({
							message: __("User does not exist"),
							indicator: "green"
						});
					}
				});
			});
		}
		
		// Ensure mandatory roles (or feedback-only role) on load
		if (!cint(frm.doc.access_feedback_only)) {
			frm.trigger("ensure_can_view_dashboard");
			frm.trigger("ensure_personnel_reader");
		}
		
		// Populate roles HTML with checkboxes
		frm.trigger("populate_roles_html");
		
		// Sync child table with checkboxes after a short delay to ensure HTML is rendered
		setTimeout(function() {
			if (!cint(frm.doc.access_feedback_only)) {
				frm.trigger("sync_child_table_with_checkboxes");
				setTimeout(function() {
					frm.trigger("ensure_can_view_dashboard");
					frm.trigger("ensure_personnel_reader");
				}, 100);
			} else {
				frm.trigger("update_roles_interaction_state");
			}
		}, 500);
	},

	access_feedback_only(frm) {
		if (cint(frm.doc.access_feedback_only)) {
			frm.trigger("ensure_feedback_only_role");
		} else {
			frm.trigger("restore_standard_roles_after_feedback_only");
		}
	},

	ensure_feedback_only_role(frm) {
		frappe.call({
			method: "frappe.client.get_value",
			args: {
				doctype: "App Role List",
				filters: { app_role: "Can Only Access Feedback" },
				fieldname: "name",
			},
			callback: function (r) {
				if (!r.message || !r.message.name) {
					frappe.msgprint({
						title: __("Missing Role"),
						message: __(
							"'Can Only Access Feedback' role must exist in App Role List. Please create it first."
						),
						indicator: "red",
					});
					frm.set_value("access_feedback_only", 0);
					return;
				}
				frm.clear_table("app_roles_assigned_list");
				let row = frm.add_child("app_roles_assigned_list");
				row.app_role = r.message.name;
				frm.refresh_field("app_roles_assigned_list");
				frm.trigger("populate_roles_html");
				frm.dirty();
			},
		});
	},

	restore_standard_roles_after_feedback_only(frm) {
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "App Role List",
				filters: { app_role: ["in", ["Can View Dashboard", "Personnel Reader"]] },
				fields: ["name", "app_role"],
				limit_page_length: 10,
			},
			callback: function (r) {
				if (!r.message || r.message.length < 2) {
					frappe.msgprint({
						title: __("Missing Role"),
						message: __(
							"'Can View Dashboard' and 'Personnel Reader' must exist in App Role List."
						),
						indicator: "red",
					});
					return;
				}
				let by_app_role = {};
				r.message.forEach((row) => {
					by_app_role[row.app_role] = row.name;
				});
				frm.clear_table("app_roles_assigned_list");
				["Can View Dashboard", "Personnel Reader"].forEach(function (label) {
					if (by_app_role[label]) {
						let child = frm.add_child("app_roles_assigned_list");
						child.app_role = by_app_role[label];
					}
				});
				frm.refresh_field("app_roles_assigned_list");
				frm.trigger("populate_roles_html");
				frm.dirty();
			},
		});
	},

	update_roles_interaction_state(frm) {
		if (!frm.fields_dict.roles_html || !frm.fields_dict.roles_html.$wrapper) {
			return;
		}
		let $wrap = frm.fields_dict.roles_html.$wrapper;
		let feedback_only = cint(frm.doc.access_feedback_only);
		if (feedback_only) {
			let assigned = (frm.doc.app_roles_assigned_list || []).map((row) => row.app_role);
			$wrap.find(".role-checkbox").each(function () {
				let $cb = $(this);
				let role_name = $cb.data("role-name");
				$cb.prop("checked", assigned.includes(role_name));
				$cb.prop("disabled", true);
			});
			$wrap
				.find(".role-item label")
				.css({ cursor: "not-allowed", opacity: 0.95 });
			$(".role-selection-buttons button")
				.prop("disabled", true)
				.addClass("disabled");
			$wrap.find(".roles-checklist").css("opacity", "0.88");
		} else {
			$wrap.find(".role-checkbox").each(function () {
				let $cb = $(this);
				let is_mandatory = $cb.data("mandatory") === true;
				$cb.prop("disabled", is_mandatory);
			});
			$wrap
				.find(".role-item label")
				.css({ cursor: "", opacity: "" });
			$(".role-selection-buttons button")
				.prop("disabled", false)
				.removeClass("disabled");
			$wrap.find(".roles-checklist").css("opacity", "1");
		}
	},
	
	populate_roles_html(frm) {
		// Fetch only active App Role List records with owner_doctype
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "App Role List",
				fields: ["name", "owner_doctype", "app_role"],
				filters: {
					active: 1
				},
				order_by: "owner_doctype asc, name asc",
				limit_page_length: 1000  // Get all records (default is 20)
			},
			callback: function(r) {
				console.log("App Role List response:", r);
				let feedback_only = cint(frm.doc.access_feedback_only);
				
				if (r.message && r.message.length > 0) {
					// Get currently assigned roles
					let assigned_roles = [];
					if (frm.doc.app_roles_assigned_list) {
						assigned_roles = frm.doc.app_roles_assigned_list.map(row => row.app_role);
					}
					
					// Group roles by owner_doctype
					let grouped_roles = {};
					r.message.forEach(function(role) {
						let doctype = role.owner_doctype || 'Other';
						if (!grouped_roles[doctype]) {
							grouped_roles[doctype] = [];
						}
						grouped_roles[doctype].push(role);
					});
					
					// Create HTML with grouped checkboxes in columns
					let html = `
						<div class="roles-checklist" style="
							max-height: 550px; 
							overflow-y: auto; 
							padding: 12px; 
							border: 1px solid #d1d8dd; 
							border-radius: 6px; 
							background: #ffffff;
							box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
						">
					`;
					
					// Sort doctypes for consistent display
					let sorted_doctypes = Object.keys(grouped_roles).sort();
					
					if (sorted_doctypes.length === 0) {
						html += `
							<div style="
								padding: 20px 15px; 
								text-align: center; 
								color: #8d99a6;
								background: #f8f9fa;
								border-radius: 4px;
							">
								<p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 500;">No roles found in App Role List</p>
								<p style="margin: 0; font-size: 11px; color: #6c757d;">Please run the role creation script first.</p>
							</div>
						`;
					} else {
						// Create table-like layout with aligned headers
						sorted_doctypes.forEach(function(doctype, doctypeIndex) {
							let roles = grouped_roles[doctype];
							
							// Create header - spans full width
							html += `
								<div style="
									margin-top: ${doctypeIndex === 0 ? '0' : '12px'};
									margin-bottom: 6px;
									padding: 6px 10px;
									background: linear-gradient(to right, #f8f9fa, #ffffff);
									border-left: 3px solid #007bff;
									border-bottom: 1px solid #dee2e6;
									border-radius: 3px;
									width: 100%;
								">
									<strong style="
										font-size: 12px; 
										color: #212529; 
										font-weight: 600;
										letter-spacing: 0.2px;
										text-transform: uppercase;
									">${frappe.utils.escape_html(doctype)}</strong>
								</div>
							`;
							
							// Create 4-column flex container for roles
							html += `
								<div style="
									display: flex;
									gap: 15px;
									margin-bottom: 8px;
								">
							`;
							
							// Distribute roles across 4 columns (round-robin)
							let columns = [[], [], [], []];
							roles.forEach(function(role, index) {
								columns[index % 4].push(role);
							});
							
							// Render each column as a flex column
							for (let colIndex = 0; colIndex < 4; colIndex++) {
								html += `<div style="flex: 1; min-width: 0;">`;
								
								columns[colIndex].forEach(function(role) {
									let checked = assigned_roles.includes(role.name) ? 'checked' : '';
									let role_display = role.app_role || role.name;
									let is_mandatory = role.app_role === "Can View Dashboard" || role.app_role === "Personnel Reader";
									let mandatory_attr = is_mandatory ? 'data-mandatory="true"' : '';
									let is_disabled = is_mandatory || feedback_only;
									
									html += `
										<div class="checkbox role-item" style="
											margin: 3px 0;
											padding: 4px 6px;
											border-radius: 3px;
											transition: background-color 0.2s ease;
										" onmouseover="this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.backgroundColor='transparent'">
											<label style="
												cursor: ${is_disabled ? 'not-allowed' : 'pointer'}; 
												font-weight: normal; 
												display: flex; 
												align-items: center; 
												font-size: 12px;
												color: #495057;
												margin: 0;
												line-height: 1.3;
											">
												<input type="checkbox" class="role-checkbox" 
													data-role-name="${frappe.utils.escape_html(role.name)}" 
													${mandatory_attr}
													${checked} 
													${is_disabled ? 'disabled' : ''}
													style="
														margin-right: 8px; 
														margin-top: 0; 
														cursor: ${is_disabled ? 'not-allowed' : 'pointer'};
														width: 14px;
														height: 14px;
														accent-color: #007bff;
													">
												<span style="
													flex: 1;
													line-height: 1.3;
													${is_mandatory ? 'font-weight: 500; color: #007bff;' : ''}
												">${frappe.utils.escape_html(role_display)}${is_mandatory ? ' <span style="font-size: 10px; color: #6c757d;">(Required)</span>' : ''}</span>
											</label>
										</div>
									`;
								});
								
								html += `</div>`; // Close column
							}
							
							html += '</div>'; // Close flex container for this doctype
						});
					}
					
					html += '</div>';
					
					// Set HTML content
					if (frm.fields_dict.roles_html) {
						frm.fields_dict.roles_html.$wrapper.html(html);
						
						// Add Select All / Unselect All buttons if they don't exist
						setup_role_selection_buttons(frm);
						
						// Sync child table with checkboxes on initial load
						frm.trigger("sync_child_table_with_checkboxes");
						frm.trigger("update_roles_interaction_state");
						
						// Bind checkbox change events
						frm.fields_dict.roles_html.$wrapper.find('.role-checkbox').on('change', function() {
							if (cint(frm.doc.access_feedback_only)) {
								return;
							}
							let $checkbox = $(this);
							let role_name = $checkbox.data('role-name');
							let is_checked = $checkbox.is(':checked');
							let is_mandatory = $checkbox.data('mandatory') === true;
							
							// Prevent unchecking mandatory roles
							if (is_mandatory && !is_checked) {
								$checkbox.prop('checked', true);
								// Get role display name for the message
								let role_display = $checkbox.closest('.role-item').find('span').first().text().replace(' (Required)', '');
								frappe.show_alert({
									message: __("'{0}' role is mandatory and cannot be removed", [role_display]),
									indicator: "orange"
								});
								return;
							}
							
							if (is_checked) {
								// Add role to child table if it doesn't exist
								let exists = false;
								if (frm.doc.app_roles_assigned_list) {
									exists = frm.doc.app_roles_assigned_list.some(row => row.app_role === role_name);
								}
								
								if (!exists) {
									let child_row = frm.add_child('app_roles_assigned_list');
									child_row.app_role = role_name;
									frm.refresh_field('app_roles_assigned_list');
								}
							} else {
								// Remove role from child table
								if (frm.doc.app_roles_assigned_list) {
									let row_to_remove = frm.doc.app_roles_assigned_list.find(row => row.app_role === role_name);
									if (row_to_remove) {
										frappe.model.clear_doc(row_to_remove.doctype, row_to_remove.name);
										frm.refresh_field('app_roles_assigned_list');
									}
								}
							}
							frm.dirty();
						});
					} else {
						console.error("roles_html field not found");
					}
				} else {
					// No roles found
					let html = `
						<div class="roles-checklist" style="
							max-height: 400px; 
							overflow-y: auto; 
							padding: 30px 20px; 
							border: 1px solid #d1d8dd; 
							border-radius: 6px; 
							text-align: center; 
							background: #ffffff;
							box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
						">
							<div style="
								padding: 30px;
								background: #f8f9fa;
								border-radius: 4px;
								border: 1px dashed #dee2e6;
							">
								<p style="
									margin: 0 0 15px 0; 
									font-size: 15px; 
									font-weight: 500;
									color: #495057;
								">No roles found in App Role List</p>
								<p style="
									font-size: 13px; 
									margin: 0 0 20px 0;
									color: #6c757d;
								">Please contact admin</p>
								<code style="
									font-size: 12px; 
									font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
									background: #ffffff; 
									padding: 12px 16px; 
									border-radius: 4px; 
									border: 1px solid #dee2e6;
									display: inline-block;
									color: #212529;
									box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
								"> No roles found</code>
							</div>
						</div>
					`;
					
					if (frm.fields_dict.roles_html) {
						frm.fields_dict.roles_html.$wrapper.html(html);
						// Add buttons if roles are available
						setup_role_selection_buttons(frm);
						frm.trigger("update_roles_interaction_state");
					}
				}
			},
			error: function(r) {
				console.error("Error fetching App Role List:", r);
				let html = `
					<div class="roles-checklist" style="
						max-height: 400px; 
						overflow-y: auto; 
						padding: 30px 20px; 
						border: 1px solid #f5c6cb; 
						border-radius: 6px; 
						text-align: center; 
						background: #fff5f5;
						box-shadow: 0 1px 3px rgba(220, 53, 69, 0.1);
					">
						<div style="
							padding: 20px;
							background: #ffffff;
							border-radius: 4px;
							border: 1px solid #f5c6cb;
						">
							<p style="
								margin: 0; 
								font-size: 14px; 
								font-weight: 500;
								color: #dc3545;
							">⚠ Error loading roles</p>
							<p style="
								margin: 10px 0 0 0;
								font-size: 12px;
								color: #721c24;
							">Please check the console for details.</p>
						</div>
					</div>
				`;
				
				if (frm.fields_dict.roles_html) {
					frm.fields_dict.roles_html.$wrapper.html(html);
					// Don't add buttons on error - no roles to select
				}
			}
		});
	},
	
	sync_child_table_with_checkboxes(frm) {
		if (cint(frm.doc.access_feedback_only)) {
			return;
		}
		// Ensure child table matches checked roles in HTML
		if (!frm.fields_dict.roles_html || !frm.fields_dict.roles_html.$wrapper) {
			return;
		}
		
		// Get all checked roles from HTML
		let checked_roles = [];
		frm.fields_dict.roles_html.$wrapper.find('.role-checkbox:checked').each(function() {
			checked_roles.push($(this).data('role-name'));
		});
		
		// Get current roles in child table
		let current_child_roles = [];
		if (frm.doc.app_roles_assigned_list) {
			current_child_roles = frm.doc.app_roles_assigned_list.map(row => row.app_role);
		}
		
		// Add missing roles to child table
		checked_roles.forEach(function(role_name) {
			if (!current_child_roles.includes(role_name)) {
				let child_row = frm.add_child('app_roles_assigned_list');
				child_row.app_role = role_name;
			}
		});
		
		// Remove unchecked roles from child table
		if (frm.doc.app_roles_assigned_list) {
			let rows_to_remove = [];
			frm.doc.app_roles_assigned_list.forEach(function(row) {
				if (!checked_roles.includes(row.app_role)) {
					rows_to_remove.push(row);
				}
			});
			
			rows_to_remove.forEach(function(row) {
				frappe.model.clear_doc(row.doctype, row.name);
			});
		}
		
		// Refresh if changes were made
		if (checked_roles.length !== current_child_roles.length || 
			checked_roles.some(role => !current_child_roles.includes(role))) {
			frm.refresh_field('app_roles_assigned_list');
		}
	},
	
	app_roles_assigned_list(frm) {
		if (cint(frm.doc.access_feedback_only)) {
			if (frm.fields_dict.roles_html && frm.fields_dict.roles_html.$wrapper) {
				let assigned_roles = [];
				if (frm.doc.app_roles_assigned_list) {
					assigned_roles = frm.doc.app_roles_assigned_list.map(row => row.app_role);
				}
				frm.fields_dict.roles_html.$wrapper.find('.role-checkbox').each(function() {
					let $checkbox = $(this);
					let role_name = $checkbox.data('role-name');
					let should_be_checked = assigned_roles.includes(role_name);
					if ($checkbox.is(':checked') !== should_be_checked) {
						$checkbox.prop('checked', should_be_checked);
					}
				});
			}
			return;
		}
		// Prevent removal of mandatory roles ("Can View Dashboard" and "Personnel Reader")
		let mandatory_roles = ["Can View Dashboard", "Personnel Reader"];
		let roles_to_check = [];
		
		// Check each mandatory role
		mandatory_roles.forEach(function(role_name) {
			frappe.call({
				method: "frappe.client.get_value",
				args: {
					doctype: "App Role List",
					filters: {
						app_role: role_name
					},
					fieldname: "name"
				},
				callback: function(r) {
					if (r.message && r.message.name) {
						let app_role_name = r.message.name;
						
						// Check if the role was removed
						let has_role = false;
						if (frm.doc.app_roles_assigned_list) {
							has_role = frm.doc.app_roles_assigned_list.some(
								row => row.app_role === app_role_name
							);
						}
						
						// Auto-add if missing
						if (!has_role) {
							let child_row = frm.add_child('app_roles_assigned_list');
							child_row.app_role = app_role_name;
							frm.refresh_field('app_roles_assigned_list');
							frappe.show_alert({
								message: __("'{0}' role is mandatory and has been automatically added", [role_name]),
								indicator: "orange"
							});
						}
					}
				}
			});
		});
		
		// Update checkbox states when child table changes (bidirectional sync)
		if (frm.fields_dict.roles_html && frm.fields_dict.roles_html.$wrapper) {
			let assigned_roles = [];
			if (frm.doc.app_roles_assigned_list) {
				assigned_roles = frm.doc.app_roles_assigned_list.map(row => row.app_role);
			}
			
			// Update checkbox states to match child table
			frm.fields_dict.roles_html.$wrapper.find('.role-checkbox').each(function() {
				let $checkbox = $(this);
				let role_name = $checkbox.data('role-name');
				let should_be_checked = assigned_roles.includes(role_name);
				
				// Only update if state is different to avoid infinite loops
				if ($checkbox.is(':checked') !== should_be_checked) {
					$checkbox.prop('checked', should_be_checked);
				}
			});
		}
	},
	
	email(frm) {
		// Validate email format
		if (frm.doc.email && !frappe.utils.validate_email(frm.doc.email)) {
			frappe.msgprint(__("Please enter a valid email address"));
			frm.set_value("email", "");
		}
		
		// Update enabled field read-only status based on email
		frm.trigger("update_enabled_field_status");
	},
	
	enabled(frm) {
		// Prevent disabling Administrator
		if (frm.doc.email === "Administrator" && frm.doc.enabled === 0) {
			frappe.msgprint({
				title: __("Invalid Operation"),
				message: __("Administrator user cannot be disabled"),
				indicator: "red"
			});
			frm.set_value("enabled", 1);
		}
	},
	
	update_enabled_field_status(frm) {
		// Make enabled field read-only for Administrator
		if (frm.doc.email === "Administrator") {
			frm.set_df_property("enabled", "read_only", 1);
			frm.set_df_property("enabled", "description", __("Administrator user cannot be disabled"));
		} else {
			frm.set_df_property("enabled", "read_only", 0);
			frm.set_df_property("enabled", "description", "");
		}
	},
	
	validate(frm) {
		// Ensure email is provided
		if (!frm.doc.email) {
			frappe.msgprint(__("Email is required"));
			frappe.validated = false;
		}
		
		// Ensure first name is provided
		if (!frm.doc.first_name) {
			frappe.msgprint(__("First Name is required"));
			frappe.validated = false;
		}
		
		// Ensure mandatory roles are assigned (feedback-only mode enforced on server)
		if (!cint(frm.doc.access_feedback_only)) {
			frm.trigger("ensure_can_view_dashboard");
			frm.trigger("ensure_personnel_reader");
		}
	},
	
	ensure_can_view_dashboard(frm) {
		if (cint(frm.doc.access_feedback_only)) {
			return;
		}
		// Find "Can View Dashboard" role in App Role List
		frappe.call({
			method: "frappe.client.get_value",
			args: {
				doctype: "App Role List",
				filters: {
					app_role: "Can View Dashboard"
				},
				fieldname: "name"
			},
			callback: function(r) {
				if (r.message && r.message.name) {
					let can_view_dashboard_app_role = r.message.name;
					
					// Check if it's in the child table
					let has_can_view_dashboard = false;
					if (frm.doc.app_roles_assigned_list) {
						has_can_view_dashboard = frm.doc.app_roles_assigned_list.some(
							row => row.app_role === can_view_dashboard_app_role
						);
					}
					
					// Auto-add if missing
					if (!has_can_view_dashboard) {
						let child_row = frm.add_child('app_roles_assigned_list');
						child_row.app_role = can_view_dashboard_app_role;
						frm.refresh_field('app_roles_assigned_list');
						
						// Also check the checkbox in HTML if it exists
						if (frm.fields_dict.roles_html && frm.fields_dict.roles_html.$wrapper) {
							let $checkbox = frm.fields_dict.roles_html.$wrapper.find(
								`.role-checkbox[data-role-name="${can_view_dashboard_app_role}"]`
							);
							if ($checkbox.length) {
								$checkbox.prop('checked', true);
							}
						}
					}
				} else {
					// Role doesn't exist in App Role List
					frappe.msgprint({
						title: __("Missing Role"),
						message: __("'Can View Dashboard' role must exist in App Role List. Please create it first."),
						indicator: "red"
					});
					frappe.validated = false;
				}
			}
		});
	},
	
	ensure_personnel_reader(frm) {
		if (cint(frm.doc.access_feedback_only)) {
			return;
		}
		// Find "Personnel Reader" role in App Role List
		frappe.call({
			method: "frappe.client.get_value",
			args: {
				doctype: "App Role List",
				filters: {
					app_role: "Personnel Reader"
				},
				fieldname: "name"
			},
			callback: function(r) {
				if (r.message && r.message.name) {
					let personnel_reader_app_role = r.message.name;
					
					// Check if it's in the child table
					let has_personnel_reader = false;
					if (frm.doc.app_roles_assigned_list) {
						has_personnel_reader = frm.doc.app_roles_assigned_list.some(
							row => row.app_role === personnel_reader_app_role
						);
					}
					
					// Auto-add if missing
					if (!has_personnel_reader) {
						let child_row = frm.add_child('app_roles_assigned_list');
						child_row.app_role = personnel_reader_app_role;
						frm.refresh_field('app_roles_assigned_list');
						
						// Also check the checkbox in HTML if it exists
						if (frm.fields_dict.roles_html && frm.fields_dict.roles_html.$wrapper) {
							let $checkbox = frm.fields_dict.roles_html.$wrapper.find(
								`.role-checkbox[data-role-name="${personnel_reader_app_role}"]`
							);
							if ($checkbox.length) {
								$checkbox.prop('checked', true);
							}
						}
					}
				} else {
					// Role doesn't exist in App Role List
					frappe.msgprint({
						title: __("Missing Role"),
						message: __("'Personnel Reader' role must exist in App Role List. Please create it first."),
						indicator: "red"
					});
					frappe.validated = false;
				}
			}
		});
	}
});

// Setup role selection buttons
function setup_role_selection_buttons(frm) {
	if (!frm.fields_dict.roles_html || !frm.fields_dict.roles_html.$wrapper) {
		return;
	}
	
	// Remove existing buttons if any
	$('.role-selection-buttons').remove();
	
	// Add buttons container before roles_html field
	let buttons_html = `
		<div class="role-selection-buttons" style="
			display: flex;
			gap: 10px;
			margin-bottom: 10px;
			padding: 10px;
			background: #f8f9fa;
			border-radius: 6px;
			border: 1px solid #dee2e6;
		">
			<button type="button" class="btn btn-sm btn-primary select-all-roles-btn" style="
				padding: 6px 16px;
				font-size: 12px;
				font-weight: 600;
			">
				<i class="fa fa-check-square"></i> ${__("Select All Roles")}
			</button>
			<button type="button" class="btn btn-sm btn-secondary unselect-all-roles-btn" style="
				padding: 6px 16px;
				font-size: 12px;
				font-weight: 600;
			">
				<i class="fa fa-square"></i> ${__("Unselect All Roles")}
			</button>
		</div>
	`;
	
	// Insert buttons before roles_html field
	frm.fields_dict.roles_html.$wrapper.before(buttons_html);
	
	// Bind button click events
	$('.select-all-roles-btn').off('click').on('click', function() {
		select_all_roles(frm);
	});
	
	$('.unselect-all-roles-btn').off('click').on('click', function() {
		unselect_all_roles(frm);
	});
}

// Select All Roles function
function select_all_roles(frm) {
	if (cint(frm.doc.access_feedback_only)) {
		return;
	}
	if (!frm.fields_dict.roles_html || !frm.fields_dict.roles_html.$wrapper) {
		return;
	}
	
	// Get all checkboxes
	let $checkboxes = frm.fields_dict.roles_html.$wrapper.find('.role-checkbox');
	
	// Check all checkboxes
	$checkboxes.each(function() {
		let $checkbox = $(this);
		let role_name = $checkbox.data('role-name');
		let is_checked = $checkbox.is(':checked');
		
		if (!is_checked) {
			$checkbox.prop('checked', true);
			
			// Add to child table if not exists
			let exists = false;
			if (frm.doc.app_roles_assigned_list) {
				exists = frm.doc.app_roles_assigned_list.some(row => row.app_role === role_name);
			}
			
			if (!exists) {
				let child_row = frm.add_child('app_roles_assigned_list');
				child_row.app_role = role_name;
			}
		}
	});
	
	frm.refresh_field('app_roles_assigned_list');
	frm.dirty();
	
	frappe.show_alert({
		message: __("All roles selected"),
		indicator: "green"
	});
}

// Unselect All Roles function (keeps mandatory roles selected)
function unselect_all_roles(frm) {
	if (cint(frm.doc.access_feedback_only)) {
		return;
	}
	if (!frm.fields_dict.roles_html || !frm.fields_dict.roles_html.$wrapper) {
		return;
	}
	
	// Get all checkboxes
	let $checkboxes = frm.fields_dict.roles_html.$wrapper.find('.role-checkbox');
	let roles_to_remove = [];
	
	// Uncheck all non-mandatory checkboxes
	$checkboxes.each(function() {
		let $checkbox = $(this);
		let role_name = $checkbox.data('role-name');
		let is_mandatory = $checkbox.data('mandatory') === true;
		let is_checked = $checkbox.is(':checked');
		
		if (is_checked && !is_mandatory) {
			$checkbox.prop('checked', false);
			roles_to_remove.push(role_name);
		}
	});
	
	// Remove from child table
	if (frm.doc.app_roles_assigned_list && roles_to_remove.length > 0) {
		roles_to_remove.forEach(function(role_name) {
			let row_to_remove = frm.doc.app_roles_assigned_list.find(row => row.app_role === role_name);
			if (row_to_remove) {
				frappe.model.clear_doc(row_to_remove.doctype, row_to_remove.name);
			}
		});
	}
	
	frm.refresh_field('app_roles_assigned_list');
	frm.dirty();
	
	frappe.show_alert({
		message: __("All roles unselected (mandatory roles remain selected)"),
		indicator: "blue"
	});
}
