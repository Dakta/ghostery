/*!
 * Ghostery for Safari
 * http://www.ghostery.com/
 *
 * Copyright 2014 EVIDON, Inc. All rights reserved.
 * See https://www.ghostery.com/eula for license.
 */

// TODO this only works when senders/receivers are in the same global scope
// TODO need to use browser messaging in order for conf.js to talk to background.js from options.html, for example
// TODO GOOGLE: requirejs modules dispatcher
// TODO http://stackoverflow.com/questions/12401530/backbone-js-global-event-dispatcher-require-js-how-to
// TODO https://code.google.com/p/adblockforchrome/source/browse/trunk/port.js
define(['require', 'underscore', 'backbone'], function (require, _, Backbone) {
	return _.clone(Backbone.Events);

	//safari.self.tab.dispatchMessage(name, contents);

	//safari.self.addEventListener('message', function (e) {
	//e.name
	//e.message
	//});
});
