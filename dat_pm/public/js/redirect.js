frappe.router.on("change", function () {
    if (frappe.boot?.feedback_only_desk_lock) {
        const r = frappe.get_route_str();
        if (r !== "course-feedback" && !r.startsWith("course-feedback/")) {
            frappe.set_route("course-feedback");
            return;
        }
    }
    const route = frappe.get_route();
    // Check if the workspace route matches the one you want
    if (route && route[0] === "Workspaces" && route[1] === "Real Time Audit Log") {
        frappe.set_route("app/rtal");
    }
    if (route && route[0] === "Workspaces" && route[1] === "NAPMA") {
        frappe.set_route("app/napma-analysis-2");
    }
    if (route && route[0] === "Workspaces" && route[1] === "Personnel Analysis") {
        frappe.set_route("app/personnel-list");
    }
    if (route && route[0] === "Workspaces" && route[1] === "Feedbacks") {
        frappe.set_route("app/course-feedback");
    }
    if (route && route[0] === "Workspaces" && route[1] === "Personnel Course") {
        frappe.set_route("app/personnel-course-det");
    }
    if (route && route[0] === "Workspaces" && route[1] === "Course Nomination Page") {
        frappe.set_route("app/course-nomination-an");
    }
    if (route && route[0] === "Workspaces" && route[1] === "Training Dashboard") {
        frappe.set_route("app/trg-dashboard");
    }

});