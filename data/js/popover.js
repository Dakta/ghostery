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

	function messageListener(e) {
		if (e.name == 'popoverData') {
			Panel.model.set('language', e.message.language);
			Panel.model.set(e.message);
			// TODO find a better place for this, needs to be run after everything is set
			// When inside the change:needsReload listener, pauseBlocking/whitelisted not set yet
			Panel.initializeStartingStates();
		}
	}

	function popoverListener() {
		safari.application.activeBrowserWindow.activeTab.page.dispatchMessage('popoverMessage', {
			name: 'popoverLoaded'
		});
	}

	$('#content').html(Panel.render().el);

	// TODO users can reload the popover and double-attach the safari.application listeners
	safari.application.addEventListener('message', messageListener, false);
	safari.application.addEventListener('popover', popoverListener, false);

});
