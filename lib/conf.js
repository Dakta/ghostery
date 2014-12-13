/*!
 * Ghostery for Safari
 * http://www.ghostery.com/
 *
 * Copyright 2014 EVIDON, Inc. All rights reserved.
 * See https://www.ghostery.com/eula for license.
 */

// TODO abstract localStorage/window.widget.preferences away
// TODO unit tests
// TODO generalize into a helper/mixin (?) that equips objects with getters/setters
// TODO support reacting to array/object change deltas

// Returns a conf object that acts as a write-through cache.
//
// All conf properties are backed by getters and setters,
// which lets us transparently persistent to localStorage on update.
//
// Conf properties that are not arrays or objects contain their default value
// in the defaults object, and are persisted in localStorage (without JSON
// stringifying/parsing) under the same name.
//
// Conf properties that are arrays or objects (used as hashes) require an
// object in the defaults object containing the following functions:
//
// 1. init(): Called once on property initialization. Responsible for reading
// from localStorage if there is something there.
//
// 2. save(value): Called every time the property gets updated. Responsible for
// saving the value to localStorage and calling whatever else needs to happen.

define([
	'jquery',
	'underscore',
	'lib/dispatcher',
	'lib/i18n',
	'lib/utils'
], function ($, _, dispatcher, i18n, utils) {

	function getDefaultLanguage() {
		var lang = window.navigator.language.replace('-', '_');

		if (i18n.SUPPORTED_LANGUAGES.hasOwnProperty(lang)) {
			return lang;
		}

		lang = lang.slice(0, 2);
		if (i18n.SUPPORTED_LANGUAGES.hasOwnProperty(lang)) {
			return lang;
		}

		return 'en';
	}

	var prefs = utils.prefs,
		ret = {},
		_values = {},
		defaults = {
			enable_autoupdate: true,

			selected_app_ids: {
				init: function () {
					return prefs('selected_app_ids') || {};
				},
				save: function (v) {
					prefs('selected_app_ids', v);
				}
			},

			ghostrank: false,
			show_alert: true,
			alert_bubble_pos: 'br',
			alert_bubble_timeout: 15,
			expand_sources: false,
			ignore_first_party: true,
			block_by_default: false,
			notify_library_updates: false,
			show_badge: true,
			show_contextual_menu_items: true,
			enable_click2play: true,
			enable_click2play_social: true,

			// note: not persisted
			paused_blocking: {
				init: function () {
					return false;
				},
				save: function () {}
			},

			site_whitelist: {
				init: function () {
					return prefs('site_whitelist') || [];
				},
				save: function (v) {
					prefs('site_whitelist', v);
				}
			},

			language: {
				init: function () {
					var lang = prefs('language');
					if (lang) {
						return lang;
					}
					return getDefaultLanguage();
				},
				save: function (v) {
					var saved_lang = prefs('language');
					// if we haven't saved language before, save only if the language changed
					// this way we can still pick up system language changes
					if (saved_lang || v != getDefaultLanguage()) {
						prefs('language', v);
					}
				}
			},

			site_specific_unblocks: {
				init: function () {
					return prefs('site_specific_unblocks') || {};
				},
				save: function (v) {
					prefs('site_specific_unblocks', v);
				}
			}
		};

	// migrate most localStorage settings to safari.extension.settings
	if (localStorage.previousVersion) {
		var settings = [
			'alert_bubble_cfg',
			'bugs',
			'bugs_last_updated',
			'enable_autoupdate',
			'ghostrank',
			'previousVersion',
			'selected_bug_ids',
			'show_alert',
			'expand_sources',
			'site_whitelist',
			'walkthroughAborted',
			'walkthroughFinished'
		];

		for (var i = 0, setting; i < settings.length; i++) {
			setting = settings[i];
			if (!localStorage.hasOwnProperty(setting)) {
				continue;
			}

			if (setting == 'selected_bug_ids') { // [sic]
				// parse and rename
				prefs('selected_app_ids', JSON.parse(localStorage[setting]));
			} else if (setting == 'site_whitelist' || setting == 'bugs') {
				// parse
				prefs(setting, JSON.parse(localStorage[setting]));
			} else if (localStorage[setting] === '1' || localStorage[setting] ===  '0' || localStorage[setting] === 'true' || localStorage[setting] === 'false') {
				// standardize on booleans
				prefs(setting, !!JSON.parse(localStorage[setting]));
			} else {
				// just copy
				prefs(setting, localStorage[setting]);
			}

			delete localStorage[setting];
		}
	}

	// convert old alert_bubble_cfg setting
	if (safari.extension.settings.alert_bubble_cfg) {
		var val = safari.extension.settings.alert_bubble_cfg;
		safari.extension.settings.alert_bubble_pos = val.slice(0, 2);
		safari.extension.settings.alert_bubble_timeout = +val.slice(2);
		delete safari.extension.settings.alert_bubble_cfg;
	}

	_.each(defaults, function (sval, sname) {
		if (_.isObject(sval)) { // complex preference
			// initial value
			var initial = sval.init();

			_values[sname] = {
				current: initial,
				old: utils.deepClone(initial)
			};

			// waits 200 ms to check if we need to trigger the setter
			// throttled to run only once at the end of frequent updates/fetches
			var check_for_changes = _.debounce(function () {
				var v = _values[sname];

				//log('checking old vs. new for %s ...', sname);

				if (!_.isEqual(v.current, v.old)) {
					//log('change detected for %s', sname);

					// trigger the setter
					ret[sname] = v.current;
				}
			}, 200);

			// getter and setter
			Object.defineProperty(ret, sname, {
				get: function () {
					//log('getter for %s', sname);

					// Can't have a catchall setter on all properties, but we
					// need to detect changes in the array/object made through
					// subscript access (o[i] = true), array methods,
					// and deletes (for objects).

					// TODO replace w/ proxies when they land in V8?
					check_for_changes();

					return _values[sname].current;
				},
				set: function (v) {
					//log('setter for %s', sname);

					_values[sname].current = v;
					_values[sname].old = utils.deepClone(v);

					sval.save(v);

					// notify any subscribers
					dispatcher.trigger('conf.save.' + sname, utils.deepClone(v));
				}
			});

		} else { // simple preference
			// initial value
			if (prefs(sname) !== undefined) {
				_values[sname] = prefs(sname);
			} else {
				_values[sname] = sval;
			}

			// getter and setter
			Object.defineProperty(ret, sname, {
				get: function () {
					return _values[sname];
				},
				set: function (v) {
					// note: no JSON stringifying
					prefs(sname, v);
					_values[sname] = v;

					// notify any subscribers
					dispatcher.trigger('conf.save.' + sname, v);
				}
			});
		}
	});

	ret.addSiteSpecificUnblock = function (host, app_id) {
		var ssu = ret.site_specific_unblocks;

		if (!ssu.hasOwnProperty(host)) {
			ssu[host] = [];
		}

		if (ssu[host].indexOf(app_id) == -1) {
			ssu[host].push(app_id);
		}
	};

	ret.removeSiteSpecificUnblock = function (host, app_id) {
		var ssu = ret.site_specific_unblocks;

		if (ssu.hasOwnProperty(host) && ssu[host].indexOf(app_id) >= 0) {
			ssu[host].splice(ssu[host].indexOf(app_id), 1);

			if (ssu[host].length === 0) {
				delete ssu[host];
			}
		}
	};

	// support stringifying (so that at least conf values can be used via
	// message passing in Safari (no direct access to the bg page))
	ret.toJSON = function () {
		return _.reduce(_values, function (memo, val, key) {
			// complex preferences contain their value in val.current
			memo[key] = _.isObject(val) ? val.current : val;
			return memo;
		}, {});
	};

	return ret;

});
