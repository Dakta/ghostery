/*!
 * Ghostery for Safari
 * http://www.ghostery.com/
 *
 * Copyright 2014 EVIDON, Inc. All rights reserved.
 * See https://www.ghostery.com/eula for license.
 */

/*global jQuery */

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

	$.fn.scrollIntoGreatness = function (options) {

		var settings = $.extend({
			container: null
		}, options);

		return this.each(function () {
			var $this = $(this),
				container = settings.container || this.offsetParent,
				$container = $(container),
				containerTop = $container.scrollTop(),
				containerBottom = containerTop + $container.height(),
				elTop = this.offsetTop,
				elBottom = elTop + $this.height(),
				centerElementInContainer = (elTop + ($this.height() * 0.5)) - ($container.height() / 2);

			if (elTop < containerTop) {
				$container.animate({
					scrollTop: centerElementInContainer
				});

			} else if (elBottom > containerBottom) {
				$container.animate({
					scrollTop: centerElementInContainer
				});
			}
		});
	};

}));
