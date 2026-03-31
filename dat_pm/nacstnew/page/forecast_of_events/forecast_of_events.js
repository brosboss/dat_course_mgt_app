// Page script is run as a plain script (not ES module). We load frappe-gantt
// dynamically and init the chart into <div id="gantt"> (course_nomination_an-style HTML).

frappe.pages['forecast-of-events'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Forecast of Events',
		single_column: true
	});

	var html = [
		'<div class="forecast-gantt-container" style="max-width: 1400px; margin: 0 auto; padding: 20px;">',
		'  <div id="gantt" style="width: 100%; min-height: 450px;"></div>',
		'</div>'
	].join('');
	page.main.html(html);

	var tasks = [
		{ id: "Task 1", name: "Planning", start: "2026-03-10", end: "2026-03-15", progress: 20 },
		{ id: "Task 2", name: "Execution", start: "2026-03-16", end: "2026-03-25", progress: 50 }
	];

	function init_gantt() {
		if (typeof window.Gantt === "undefined") {
			setTimeout(init_gantt, 50);
			return;
		}
		var $w = $(wrapper);
		var gantt_el = $w.find("#gantt")[0] || document.getElementById("gantt");
		if (!gantt_el) {
			setTimeout(init_gantt, 50);
			return;
		}
		// Wait for layout so container has dimensions
		requestAnimationFrame(function() {
			try {
				new window.Gantt("#gantt", tasks);
			} catch (e) {
				console.error("Forecast of Events: Gantt init failed", e);
				page.main.find(".forecast-gantt-container").prepend(
					'<div class="alert alert-warning">Chart failed to load. Check console.</div>'
				);
			}
		});
	}

	// Load frappe-gantt CSS first
	var link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = "https://cdn.jsdelivr.net/npm/frappe-gantt/dist/frappe-gantt.css";
	document.head.appendChild(link);

	// Load UMD bundle (exposes Gantt on window)
	var script = document.createElement("script");
	script.src = "https://cdn.jsdelivr.net/npm/frappe-gantt/dist/frappe-gantt.umd.js";
	script.onload = init_gantt;
	script.onerror = function() {
		page.main.find(".forecast-gantt-container").prepend(
			'<div class="alert alert-danger">Could not load Gantt library (check network/CDN).</div>'
		);
	};
	document.head.appendChild(script);
};