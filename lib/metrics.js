/*!
 * Ghostery for Safari
 * http://www.ghostery.com/
 *
 * Copyright 2014 Ghostery, Inc. All rights reserved.
 * See https://www.ghostery.com/eula for license.
 */

define([
	'lib/conf',
	'lib/utils'
], function (conf, utils) {

	var OS = (safari.extension.globalPage.contentWindow.navigator.appVersion.toLowerCase().indexOf('win') >= 0 ? 'win' : 'mac');

	function sendReq(kind) {
		var xhr,
			metrics_url = 'https://d.ghostery.com/' + kind +
			'?gr=' + (conf.ghostrank ? '1' : '0') +
			'&v=' + encodeURIComponent(utils.VERSION) +
			'&os=' + encodeURIComponent(OS) +
			'&ua=sf';
		utils.log('XHR to ' + metrics_url);

		xhr = new XMLHttpRequest();
		xhr.open("GET", metrics_url, true);
		xhr.send();

		// setting this even on upgrades to set flag on upgrades from < 5.4
		utils.prefs('install_recorded', true);
	}

	function recordInstall() {
		if (utils.prefs('install_recorded')) { return; }

		sendReq('install');
	}

	function recordUpgrade() {
		sendReq('upgrade');
	}

	return {
		recordInstall: recordInstall,
		recordUpgrade: recordUpgrade
	};

});
