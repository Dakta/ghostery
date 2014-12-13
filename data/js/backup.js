/*!
 * Ghostery for Chrome
 * http://www.ghostery.com/
 *
 * Copyright 2014 EVIDON, Inc. All rights reserved.
 * See https://www.ghostery.com/eula for license.
 */

require([
	'jquery',
	'underscore',
	'backbone',
	'moment',
	'data/lib/browser',
	'lib/i18n',
	'lib/utils',
	'tpl/backup',
	// modules below this line do not return useful values
	'tiptip' // jQuery plugin
], function ($, _, Backbone, moment, browser, i18n, utils, backup_tpl) {

	var t = i18n.t,
		settings;

	function sendMessage(name, data) {
		safari.self.tab.dispatchMessage(name, data);
	}

	function generateBackup(settings) {
		var hash = utils.hashCode(JSON.stringify(settings)),
			backup = JSON.stringify({hash: hash, settings: settings});

		// blobs don't download properly in Safari, use data URI, make the user right click save as
		var downloadLink = document.createElement("a");
		downloadLink.innerHTML = t('backup_right_click');
		downloadLink.href = "data:text/plain," + encodeURIComponent(backup);

		$('#backup-button').hide().parent().append(downloadLink);
	}

	function checkBackup() {
		var backup;

		var fileToLoad = document.getElementById("restore-file").files[0];

		var fileReader = new FileReader();
		fileReader.onload = function (fileLoadedEvent) {
			try {
				backup = JSON.parse(fileLoadedEvent.target.result);

				if (backup.hash !== utils.hashCode(JSON.stringify(backup.settings))) {
					throw "Invalid hash";
				}

				settings = backup.settings;

				$("#restore-error").hide();
				$("#restore-button").show().prop("disabled", false);

			} catch (err) {
				$("#restore-error").show();
				$("#restore-button").hide().prop("disabled", true);
				return;
			}
		};
		fileReader.readAsText(fileToLoad, "UTF-8");
	}

	function restoreBackup() {
		$('#saving-options-notice-overlay').fadeIn({
			duration: 'fast',
			complete: function () {
				$('#saving-options-notice').css('visibility', 'visible');
			}
		});

		settings.conf.alert_bubble_timeout = +settings.conf.alert_bubble_timeout;

		window.setTimeout(function () {
			sendMessage('restoreBackup', {prefs: settings.prefs, conf: settings.conf});
			window.close();
		}, 1500);
	}

	function loadBackup(msg) {
		i18n.init(msg.language);
		moment.lang(msg.language.toLowerCase().replace('_', '-'));

		document.title = t('backup_page_title');

		$('#content').html(backup_tpl({}));
		$('#header-title').text(t('backup_page_title'));

		$("#backup-button").click(function () {
			sendMessage('generateBackup');
		}).prop("disabled", false);
		$("#restore-button").click(restoreBackup).prop("disabled", true);
		$("#restore-file").change(checkBackup);

		$("#goto-options").click(function (e) {
			e.preventDefault();
			sendMessage("openOptions");
			window.close();
		});
	}

	safari.self.addEventListener('message', function (e) {
		if (e.name == 'backupData') {
			loadBackup(e.message);
		} else if (e.name == 'generatedBackup') {
			generateBackup(e.message);
		}
	}, false);

	sendMessage('backupLoaded');
});
