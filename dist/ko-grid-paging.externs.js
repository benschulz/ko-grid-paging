

/** @namespace */
de.benshu.ko.grid.extensions.paging = {};

/**
 * @constructor
 */
de.benshu.ko.grid.extensions.paging.PagingExtension = function () {};

/**
 * @type {PageSizes}
 */
de.benshu.ko.grid.extensions.paging.PagingExtension.prototype.pageSize;

/**
 * @constructor
 */
function PageSizes() {}

/**
 * @type {ko.Subscribable<number>}
 */
PageSizes.prototype.actual;

/**
 * @type {ko.Subscribable<number|string>}
 */
PageSizes.prototype.desired;

/**
 * @type {ko.Subscribable<number>}
 */
PageSizes.prototype.maximum;
