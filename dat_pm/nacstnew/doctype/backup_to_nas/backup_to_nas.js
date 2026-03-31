// Copyright (c) 2026, !! and contributors
// For license information, please see license.txt

function set_html_content(frm, htmlContent) {
    // Try multiple methods to ensure HTML is set
    if (frm.fields_dict.nas_html) {
        // Method 1: Direct field control
        frm.fields_dict.nas_html.set_value(htmlContent);
    } else {
        // Method 2: Using set_value
        frm.set_value("nas_html", htmlContent).then(() => {
            frm.refresh_field("nas_html");
        });
    }
    
    // Method 3: Direct DOM manipulation as fallback
    setTimeout(() => {
        const field_wrapper = $(frm.wrapper).find('[data-fieldname="nas_html"]');
        if (field_wrapper.length) {
            const html_wrapper = field_wrapper.find('.control-value-wrapper, .html-control');
            if (html_wrapper.length) {
                html_wrapper.html(htmlContent);
            } else {
                field_wrapper.find('.control-input-wrapper').html(htmlContent);
            }
        }
    }, 100);
}

function formatDateTime(dt) {
    if (!dt) return "Never";
    try {
        return frappe.datetime.str_to_user(dt);
    } catch (e) {
        try {
            return new Date(dt).toLocaleString();
        } catch (err) {
            return dt;
        }
    }
}

function generate_html_content(isConnected, lastBackupAt, reminderDays) {
    const statusIcon = isConnected 
        ? '<i class="fa fa-circle" style="color: green; font-size: 16px; margin-right: 5px;" title="NAS Connected"></i>'
        : '<i class="fa fa-circle" style="color: red; font-size: 16px; margin-right: 5px;" title="NAS Disconnected"></i>';
    const statusText = isConnected ? "NAS Connected" : "NAS Disconnected";
    const lastBackupLabel = formatDateTime(lastBackupAt);
    const reminderValue = (reminderDays || reminderDays === 0) ? reminderDays : "";
    
    return `
        <div style="padding: 15px; border: 1px solid #d1d8dd; border-radius: 4px; background: #fafbfc;">
            <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                ${statusIcon}
                <span style="font-weight: 500; font-size: 14px;">${statusText}</span>
            </div>
            <div style="margin-bottom: 10px; font-size: 12px; color: #6c757d;">
                Last backup: <span style="font-weight: 600;">${lastBackupLabel}</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <label style="margin: 0; font-size: 12px;">Remind every (days):</label>
                <input type="number" min="0" class="form-control input-sm" id="backup-reminder-days" value="${reminderValue}" style="max-width: 120px;" />
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-primary btn-sm backup-nas-btn" style="flex: 1;">
                    <i class="fa fa-upload"></i> Backup to NAS
                </button>
                <button class="btn btn-default btn-sm view-nas-backups-btn" style="flex: 1;">
                    <i class="fa fa-list"></i> View NAS Backups
                </button>
            </div>
        </div>
    `;
}

function check_and_update_connection_status(frm, callback) {
    frappe.call({
        method: "nacstnew.api.backup.check_nas_connection",
        callback: (r) => {
            if (r.exc) {
                console.error("Error checking NAS connection:", r.exc);
                const isConnected = false;
                set_html_content(frm, generate_html_content(isConnected, frm.doc.last_backup_at, frm.doc.backup_reminder_days));
                if (callback) callback(isConnected);
                return;
            }
            
            const isConnected = r.message?.connected || false;
            set_html_content(frm, generate_html_content(isConnected, frm.doc.last_backup_at, frm.doc.backup_reminder_days));
            
            // Reattach event handlers after updating HTML
            setTimeout(() => {
                attach_event_handlers(frm);
            }, 200);
            
            if (callback) callback(isConnected);
        },
        error: (r) => {
            console.error("Error checking NAS connection:", r);
            const isConnected = false;
            set_html_content(frm, generate_html_content(isConnected, frm.doc.last_backup_at, frm.doc.backup_reminder_days));
            setTimeout(() => {
                attach_event_handlers(frm);
            }, 200);
            if (callback) callback(isConnected);
        }
    });
}

function attach_event_handlers(frm) {
    // Use event delegation on the form wrapper for reliable event handling
    $(frm.wrapper).off('click', '.backup-nas-btn').on('click', '.backup-nas-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // First check NAS connection before proceeding with backup
        frappe.call({
            method: "nacstnew.api.backup.check_nas_connection",
            freeze: true,
            freeze_message: 'Checking NAS connection...',
            callback: (r) => {
                const isConnected = r.message?.connected || false;
                
                // Update the status icon immediately
                set_html_content(frm, generate_html_content(isConnected, frm.doc.last_backup_at, frm.doc.backup_reminder_days));
                setTimeout(() => {
                    attach_event_handlers(frm);
                }, 100);
                
                if (!isConnected) {
                    // Notify user that NAS is not connected
                    frappe.msgprint({
                        title: "NAS Not Connected",
                        message: "Cannot backup to NAS. Please check your NAS connection and try again.",
                        indicator: "red"
                    });
                    return;
                }
                
                // NAS is connected, proceed with backup
                frappe.call({
                    method: 'nacstnew.api.backup.backup_to_qnap',
                    freeze: true,
                    freeze_message: 'Backing up to QNAP...',
                    callback: (r) => {
                        frappe.msgprint(r.message);
                        // Update last backup time locally and refresh UI
                        const now = frappe.datetime.now_datetime();
                        frm.set_value("last_backup_at", now);
                        // Refresh connection status after backup
                        check_and_update_connection_status(frm);
                    },
                    error: (r) => {
                        // Refresh connection status on error
                        check_and_update_connection_status(frm);
                    }
                });
            },
            error: (r) => {
                // Connection check failed, assume disconnected
                const isConnected = false;
                set_html_content(frm, generate_html_content(isConnected, frm.doc.last_backup_at, frm.doc.backup_reminder_days));
                setTimeout(() => {
                    attach_event_handlers(frm);
                }, 100);
                
                frappe.msgprint({
                    title: "Connection Check Failed",
                    message: "Unable to check NAS connection. Please verify your NAS settings and try again.",
                    indicator: "red"
                });
            }
        });
    });

    // Reminder days change handler
    $(frm.wrapper).off('change', '#backup-reminder-days').on('change', '#backup-reminder-days', function(e) {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
            frm.set_value("backup_reminder_days", val);
        }
    });
    
    $(frm.wrapper).off('click', '.view-nas-backups-btn').on('click', '.view-nas-backups-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        frappe.call({
            method: "nacstnew.api.backup.list_nas_backups",
            callback: (r) => {
                if (!r.message || !r.message.length) {
                    frappe.msgprint("No backups found on NAS");
                    return;
                }
        
                frappe.msgprint({
                    title: "Backups on NAS",
                    message: "<ul>" + r.message.map(b => `<li>${b}</li>`).join("") + "</ul>",
                    indicator: "blue"
                });
            }
        });
    });
}

function update_nas_html_field(frm) {
    // Check NAS connection status and update HTML field
    check_and_update_connection_status(frm, () => {
        // Wait a bit for the field to render, then attach event handlers
        setTimeout(() => {
            attach_event_handlers(frm);
        }, 300);
    });

    // Set up periodic status checks (every 30 seconds) for connection status
    if (frm._nas_status_interval) {
        clearInterval(frm._nas_status_interval);
    }
    frm._nas_status_interval = setInterval(() => {
        check_and_update_connection_status(frm);
    }, 30000);
}

// WOL (Wake-on-LAN) and Power Control Functions
function set_wol_html_content(frm, htmlContent) {
    // Try multiple methods to ensure HTML is set
    if (frm.fields_dict.nas_wol_html) {
        // Method 1: Direct field control
        frm.fields_dict.nas_wol_html.set_value(htmlContent);
    } else {
        // Method 2: Using set_value
        frm.set_value("nas_wol_html", htmlContent).then(() => {
            frm.refresh_field("nas_wol_html");
        });
    }
    
    // Method 3: Direct DOM manipulation as fallback
    setTimeout(() => {
        const field_wrapper = $(frm.wrapper).find('[data-fieldname="nas_wol_html"]');
        if (field_wrapper.length) {
            const html_wrapper = field_wrapper.find('.control-value-wrapper, .html-control');
            if (html_wrapper.length) {
                html_wrapper.html(htmlContent);
            } else {
                field_wrapper.find('.control-input-wrapper').html(htmlContent);
            }
        }
    }, 100);
}

function generate_wol_html_content(isPoweredOn) {
    const statusIcon = isPoweredOn 
        ? '<i class="fa fa-power-off" style="color: green; font-size: 18px; margin-right: 5px;" title="NAS Powered On"></i>'
        : '<i class="fa fa-power-off" style="color: red; font-size: 18px; margin-right: 5px;" title="NAS Powered Off"></i>';
    const statusText = isPoweredOn ? "NAS Powered On" : "NAS Powered Off";
    
    return `
        <div style="padding: 15px; border: 1px solid #d1d8dd; border-radius: 4px; background: #fafbfc;">
            <div style="margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center;">
                    ${statusIcon}
                    <span style="font-weight: 500; font-size: 14px;" id="nas-power-status-text">${statusText}</span>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-success btn-sm power-on-nas-btn" style="flex: 1;">
                    <i class="fa fa-play"></i> Power On NAS
                </button>
                <button class="btn btn-danger btn-sm power-off-nas-btn" style="flex: 1;">
                    <i class="fa fa-stop"></i> Power Off NAS
                </button>
            </div>
        </div>
    `;
}

function check_and_update_power_status(frm) {
    frappe.call({
        method: "nacstnew.api.backup.check_nas_connection",
        callback: (r) => {
            if (r.exc) {
                console.error("Error checking NAS power status:", r.exc);
                const isPoweredOn = false;
                set_wol_html_content(frm, generate_wol_html_content(isPoweredOn));
                setTimeout(() => {
                    attach_wol_event_handlers(frm);
                }, 200);
                return;
            }
            
            // If we can connect, NAS is powered on
            const isPoweredOn = r.message?.connected || false;
            set_wol_html_content(frm, generate_wol_html_content(isPoweredOn));
            
            // Reattach event handlers after updating HTML
            setTimeout(() => {
                attach_wol_event_handlers(frm);
            }, 200);
        },
        error: (r) => {
            console.error("Error checking NAS power status:", r);
            // If connection check fails, assume NAS is off
            const isPoweredOn = false;
            set_wol_html_content(frm, generate_wol_html_content(isPoweredOn));
            setTimeout(() => {
                attach_wol_event_handlers(frm);
            }, 200);
        }
    });
}

function attach_wol_event_handlers(frm) {
    // Power On button
    $(frm.wrapper).off('click', '.power-on-nas-btn').on('click', '.power-on-nas-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        frappe.call({
            method: 'nacstnew.api.backup.power_on_nas',
            freeze: true,
            freeze_message: 'Sending Wake-on-LAN packet...',
            callback: (r) => {
                frappe.msgprint({
                    title: "Wake-on-LAN Sent",
                    message: r.message || "Wake-on-LAN packet sent. Please wait a moment for the NAS to power on.",
                    indicator: "blue"
                });
                
                // Wait a bit, then check status
                setTimeout(() => {
                    check_and_update_power_status(frm);
                }, 3000);
                
                // Keep checking status every few seconds for a minute
                let checkCount = 0;
                const statusCheckInterval = setInterval(() => {
                    checkCount++;
                    check_and_update_power_status(frm);
                    if (checkCount >= 12) { // Check for 1 minute (12 * 5 seconds)
                        clearInterval(statusCheckInterval);
                    }
                }, 5000);
            },
            error: (r) => {
                frappe.msgprint({
                    title: "Error",
                    message: r.message || "Failed to send Wake-on-LAN packet. Please check your configuration.",
                    indicator: "red"
                });
            }
        });
    });
    
    // Power Off button
    $(frm.wrapper).off('click', '.power-off-nas-btn').on('click', '.power-off-nas-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Confirm before powering off
        frappe.confirm(
            'Are you sure you want to power off the NAS?',
            () => {
                // User confirmed
                frappe.call({
                    method: 'nacstnew.api.backup.power_off_nas',
                    freeze: true,
                    freeze_message: 'Sending shutdown command...',
                    callback: (r) => {
                        frappe.msgprint({
                            title: "Shutdown Command Sent",
                            message: r.message || "Shutdown command sent to NAS.",
                            indicator: "orange"
                        });
                        
                        // Update status immediately (will show as off)
                        setTimeout(() => {
                            check_and_update_power_status(frm);
                        }, 2000);
                    },
                    error: (r) => {
                        frappe.msgprint({
                            title: "Error",
                            message: r.message || "Failed to send shutdown command. Please check your configuration.",
                            indicator: "red"
                        });
                        // Still check status in case it worked
                        setTimeout(() => {
                            check_and_update_power_status(frm);
                        }, 2000);
                    }
                });
            },
            () => {
                // User cancelled
            }
        );
    });
}

function update_wol_html_field(frm) {
    // Check NAS power status and update HTML field
    check_and_update_power_status(frm);
    
    // Set up periodic status checks (every 30 seconds)
    if (frm._wol_status_interval) {
        clearInterval(frm._wol_status_interval);
    }
    
    frm._wol_status_interval = setInterval(() => {
        check_and_update_power_status(frm);
    }, 30000); // Check every 30 seconds
}

frappe.ui.form.on("Backup to NAS", {
    onload(frm) {
        update_nas_html_field(frm);
        update_wol_html_field(frm);
    },
    
    refresh(frm) {
        update_nas_html_field(frm);
        update_wol_html_field(frm);
    },
    
    // Clean up interval when form is closed
    before_save(frm) {
        // Keep the interval running
    }
});
