// Copyright (c) 2025, !! and contributors
// For license information, please see license.txt

/**
 * Reusable Navigation Sidebar Component
 * Usage:
 *   let sidebarHtml = getNavigationSidebar('personnel-list');
 *   let sidebarCss = getNavigationSidebarCSS();
 */

// Navigation menu items configuration
// Use window.NAVIGATION_ITEMS to avoid redeclaration errors when scripts reload
if (typeof window.NAVIGATION_ITEMS === 'undefined') {
	window.NAVIGATION_ITEMS = [
		{
			route: 'personnel-record',
			label: 'Personnel Record',
			icon: 'fa-user'
		},
		{
			route: 'personnel-list',
			label: 'Personnel List',
			icon: 'fa-list'
		},
		// {
		// 	route: 'no-strength-returns-',
		// 	label: 'No Strength Returns',
		// 	icon: 'fa-user-times'
		// },
		// {
		// 	route: 'multiple-strength-re',
		// 	label: 'Multiple Strength Returns',
		// 	icon: 'fa-clone'
		// },

		{
			route: 'units-view2',
			label: 'Units View 2 (Compact)',
			icon: 'fa-building-o'
		},
		{
			route: 'rtal',
			label: 'Real-Time Audit Log',
			icon: 'fa-history'
		},
		// {
		// 	route: 'postings-with-pengin',
		// 	label: 'Pending Part 2 Orders',
		// 	icon: 'fa-exclamation-circle'
		// },
		// {
		// 	route: 'personnel-unit-stati',
		// 	label: 'Unit Analysis',
		// 	// Use Font Awesome 4 icon (Frappe v15 ships FA4, not FA5)
		// 	icon: 'fa-exchange'
		// },
		// {
		// 	route: '#',
		// 	label: 'Reports',
		// 	// Use FA4 chart icon
		// 	icon: 'fa-bar-chart'
		// },
		// {
		// 	route: '#',
		// 	label: 'Documents',
		// 	// Use FA4 document icon
		// 	icon: 'fa-file-text-o'
		// },
		// {
		// 	route: '#',
		// 	label: 'Settings',
		// 	icon: 'fa-cog'
		// }
	];
}

/**
 * Get the CSS for the navigation sidebar with page-specific prefix
 * @param {string} pagePrefix - Page-specific prefix (e.g., 'pl' for personnel-list)
 * @returns {string} CSS styles as a string
 */
function getNavigationSidebarCSS(pagePrefix) {
	const prefix = pagePrefix || 'nav';
	const styleId = `navigation-sidebar-css-${prefix}`;

	if (document.getElementById(styleId)) {
		return ''; // CSS already injected for this page
	}

	const style = document.createElement('style');
	style.id = styleId;
	style.textContent = `
		/* Scoped sidebar styles - only affect elements with ${prefix}-nav- prefix */
		.${prefix}-nav-sidebar {
			width: 250px !important;
			background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%) !important;
			border-radius: 12px !important;
			padding: 20px !important;
			box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
			overflow-y: auto !important;
			flex-shrink: 0 !important;
			position: relative !important;
			z-index: 1 !important;
		}
		
		.${prefix}-nav-sidebar * {
			box-sizing: border-box;
		}
		
		.${prefix}-nav-sidebar-title {
			color: #fff !important;
			font-size: 18px !important;
			font-weight: 700 !important;
			margin-bottom: 30px !important;
			padding-bottom: 15px !important;
			border-bottom: 2px solid rgba(255,255,255,0.1) !important;
		}
		
		.${prefix}-nav-sidebar .${prefix}-nav-item {
			display: block !important;
			padding: 12px 15px !important;
			margin-bottom: 8px !important;
			color: rgba(255,255,255,0.8) !important;
			text-decoration: none !important;
			border-radius: 8px !important;
			transition: all 0.3s ease !important;
			cursor: pointer !important;
			border-left: 3px solid transparent !important;
		}
		
		.${prefix}-nav-sidebar .${prefix}-nav-item:hover {
			background: rgba(255,255,255,0.1) !important;
			color: #fff !important;
			border-left-color: #667eea !important;
			transform: translateX(5px) !important;
		}
		
		.${prefix}-nav-sidebar .${prefix}-nav-item.active {
			background: rgba(102, 126, 234, 0.2) !important;
			color: #fff !important;
			border-left-color: #667eea !important;
		}
		
		.${prefix}-nav-sidebar .${prefix}-nav-item i {
			margin-right: 10px !important;
			width: 20px !important;
		}
		
		/* Scrollbar styling for sidebar - scoped to sidebar only */
		.${prefix}-nav-sidebar::-webkit-scrollbar {
			width: 6px !important;
		}
		
		.${prefix}-nav-sidebar::-webkit-scrollbar-track {
			background: rgba(255,255,255,0.1) !important;
			border-radius: 10px !important;
		}
		
		.${prefix}-nav-sidebar::-webkit-scrollbar-thumb {
			background: rgba(255,255,255,0.3) !important;
			border-radius: 10px !important;
		}
		
		.${prefix}-nav-sidebar::-webkit-scrollbar-thumb:hover {
			background: rgba(255,255,255,0.5) !important;
		}
	`;
	document.head.appendChild(style);
	return ''; // Return empty string since CSS is injected directly
}

/**
 * Get the HTML for the navigation sidebar with page-specific prefix
 * @param {string} activeRoute - The route name of the currently active page (e.g., 'personnel-list')
 * @param {string} pagePrefix - Page-specific prefix (e.g., 'pl' for personnel-list)
 * @returns {string} HTML string for the sidebar
 */
function getNavigationSidebar(activeRoute, pagePrefix) {
	const prefix = pagePrefix || 'nav';

	// Inject CSS for this page
	getNavigationSidebarCSS(prefix);

	let html = `
		<div class="${prefix}-nav-sidebar">
			<div class="${prefix}-nav-sidebar-title">
				<i class="fa fa-bars"></i> IRPMS
			</div>
	`;

	window.NAVIGATION_ITEMS.forEach(function (item) {
		const isActive = item.route === activeRoute;
		const activeClass = isActive ? 'active' : '';
		const onClick = item.route === '#'
			? ''
			: `onclick="frappe.set_route('${item.route}'); return false;"`;

		html += `
			<a href="#" class="${prefix}-nav-item ${activeClass}" ${onClick}>
				<i class="fa ${item.icon}"></i> ${item.label}
			</a>
		`;
	});

	html += `</div>`;
	return html;
}

/**
 * Inject CSS to hide Frappe's default sidebar for a specific page (only once per page)
 * @param {string} pageName - The page name (e.g., 'personnel-list')
 * @returns {string} Empty string (CSS is injected directly)
 */
function hideDefaultSidebarCSS(pageName) {
	const styleId = `hide-default-sidebar-${pageName}`;
	if (document.getElementById(styleId)) {
		return ''; // CSS already injected for this page
	}

	const style = document.createElement('style');
	style.id = styleId;
	style.textContent = `
		body[data-page-name="${pageName}"] .form-sidebar,
		body[data-page-name="${pageName}"] .list-sidebar,
		body[data-page-name="${pageName}"] .desk-sidebar,
		body[data-page-name="${pageName}"] .page-sidebar {
			display: none !important;
		}
		
		body[data-page-name="${pageName}"] .layout-main-section {
			width: 100% !important;
			margin-left: 0 !important;
		}
		
		body[data-page-name="${pageName}"] .page-content {
			width: 100% !important;
			padding: 0 !important;
		}
	`;
	document.head.appendChild(style);
	return ''; // Return empty string since CSS is injected directly
}

// Expose helpers globally so page scripts can reliably access them
// regardless of asset bundling/evaluation context.
if (typeof window !== 'undefined') {
	window.getNavigationSidebarCSS = getNavigationSidebarCSS;
	window.getNavigationSidebar = getNavigationSidebar;
	window.hideDefaultSidebarCSS = hideDefaultSidebarCSS;
}
