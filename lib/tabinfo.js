/*!
 * Ghostery for Safari
 * http://www.ghostery.com/
 *
 * Copyright 2014 EVIDON, Inc. All rights reserved.
 * See https://www.ghostery.com/eula for license.
 */

define([], function () {

	var tabInfo = {};

	function normalizeUrl(url) {
		return url.replace(/#.*$/, ''); // strip the anchor
	}

	function clear(url) {
		delete tabInfo[normalizeUrl(url)];
	}

	function create(url) {
		tabInfo[normalizeUrl(url)] = {
			//url: nav_url, // TODO
			//host: utils.processUrl(nav_url).host, // TODO
			//sids: [], // TODO
			//DOMLoaded: false, // TODO
			needsReload: {changes: {}}
		};
	}

	function get(url) {
		return tabInfo[normalizeUrl(url)];
	}

	return {
		create: create,
		get: get,
		getAll: function () {
			return tabInfo;
		},
		clear: clear
	};

});
