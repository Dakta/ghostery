/*!
 * Ghostery for Safari
 * http://www.ghostery.com/
 *
 * Copyright 2014 EVIDON, Inc. All rights reserved.
 * See https://www.ghostery.com/eula for license.
 */

require([
	'jquery',
	'data/lib/panel'
], function ($, Panel) {

	$('#content').html(Panel.render().el);

	safari.self.addEventListener('message', function (e) {
		if (e.name == 'panelData') {
			Panel.model.set('language', e.message.language);
			Panel.model.set(e.message);
			// TODO find a better place for this, needs to be run after everything is set
			// When inside the change:needsReload listener, pauseBlocking/whitelisted not set yet
			Panel.initializeStartingStates();

			safari.self.tab.dispatchMessage('panelResize', {
				animate: true,
				height: 421
			});
		}
	}, false);

	document.addEventListener('keyup', function (e) {
		if (e.which == 27) { // Esc
			safari.self.tab.dispatchMessage('panelClose');
		}
	}, false);

	safari.self.tab.dispatchMessage('panelLoaded');

});
