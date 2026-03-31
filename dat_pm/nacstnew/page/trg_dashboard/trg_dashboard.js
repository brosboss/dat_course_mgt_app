frappe.pages['trg-dashboard'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'TRG Dashboard',
		single_column: true
	});
}