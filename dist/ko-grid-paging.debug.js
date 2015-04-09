/**
 * @license Copyright (c) 2015, Ben Schulz
 * License: BSD 3-clause (http://opensource.org/licenses/BSD-3-Clause)
 */
;(function(factory) {
    if (typeof define === 'function' && define['amd'])
        define(['ko-grid', 'knockout', 'ko-data-source', 'ko-indexed-repeat'], factory);
    else
        window['ko-grid-paging'] = factory(window.ko.bindingHandlers['grid'], window.ko);
} (function(ko_grid, knockout) {
var text, text_ko_grid_paging_paginghtmltemplate, ko_grid_paging_paging, ko_grid_paging;
text = {
  load: function (id) {
    throw new Error('Dynamic load not allowed: ' + id);
  }
};
text_ko_grid_paging_paginghtmltemplate = '<!-- ko with: extensions.paging -->\n<div class="ko-grid-paging" data-bind="if: pageCount() > 1, click: __handleClick">\n    <span data-bind="text: __message"></span>\n    <button class="ko-grid-toolbar-button ko-grid-paging-button" data-bind="visible: pageIndex() - maximumStepSize() > 0">1</button>\n    <span data-bind="visible: pageIndex() - maximumStepSize() > 1">&hellip;</span>\n    <button data-bind="indexedRepeat: {\n                forEach: __adjacentPageIndizes,\n                indexedBy: function(i) { return \'\' + i; },\n                as: \'i\'\n            }"\n            data-repeat-bind="text: i() + 1, css: {\n                \'pressed\': pageIndex() == i(),\n                \'ko-grid-toolbar-button\': true,\n                \'current-page\': pageIndex() == i(),\n                \'ko-grid-paging-button\': true\n            }">\n    </button>\n    <span data-bind="visible: pageIndex() + maximumStepSize() + 2 < pageCount()">&hellip;</span>\n    <button class="ko-grid-toolbar-button ko-grid-paging-button" tabIndex="-1" data-bind="visible: pageIndex() + maximumStepSize() + 1 < pageCount(), text: pageCount">?</button>\n</div>\n<!-- /ko -->\n';

var toolbar = 'ko-grid-toolbar';
ko_grid_paging_paging = function (module, ko, koGrid, pagingTemplate) {
  var extensionId = 'ko-grid-paging'.indexOf('/') < 0 ? 'ko-grid-paging' : 'ko-grid-paging'.substring(0, 'ko-grid-paging'.indexOf('/'));
  var PAGE_SIZE_FIT = 'fit';
  koGrid.defineExtension(extensionId, {
    dependencies: [toolbar],
    initializer: function (template) {
      return template.to('right-toolbar').append('paging', pagingTemplate);
    },
    Constructor: PagingExtension
  });
  function PagingExtension(bindingValue, config, grid) {
    var desiredPageSize = firstValue(bindingValue, config, [
      'pageSize',
      'desired'
    ], ['pageSize']);
    var maximumPageSize = firstValue(bindingValue, config, [
      'pageSize',
      'maximum'
    ]) || 50;
    var scroller, table;
    grid.postApplyBindings(function () {
      scroller = grid.element.querySelector('.ko-grid-table-scroller');
      table = grid.element.querySelector('.ko-grid-table');
    });
    this.maximumStepSize = this['maximumStepSize'] = ko.observable(2);
    // TODO this should be configurable
    this.rowCount = this['rowCount'] = ko.pureComputed(function () {
      return grid.data.view.filteredSize();
    });
    var pageSize = {};
    pageSize.desired = pageSize['desired'] = ko.observable(desiredPageSize);
    pageSize.maximum = pageSize['maximum'] = ko.observable(maximumPageSize);
    pageSize.actual = pageSize['actual'] = ko.pureComputed(function () {
      var desiredPageSize = this.pageSize.desired();
      if (desiredPageSize === PAGE_SIZE_FIT) {
        var capacity = Math.floor(availableRowSpace() / averageRowHeight());
        desiredPageSize = Math.max(1, capacity);
      }
      return Math.min(this.pageSize.maximum(), desiredPageSize);
    }.bind(this));
    this.pageSize = this['pageSize'] = pageSize;
    this.pageIndex = this['pageIndex'] = ko.observable(0);
    this.pageCount = this['pageCount'] = ko.pureComputed(function () {
      var maxPageIndex = Math.max(0, Math.floor((this.rowCount() - 1) / this.pageSize.actual()));
      this.pageIndex(Math.min(this.pageIndex(), maxPageIndex));
      return maxPageIndex + 1;
    }.bind(this));
    var averageRowHeightFallback = grid.layout.determineCellDimensions('|').height;
    var availableRowSpace = ko.observable(5 * averageRowHeightFallback);
    var averageRowHeight = ko.observable(averageRowHeightFallback);
    grid.layout.afterRelayout(recomputeAvailableSpaceAndAvgRowHeight);
    grid.postApplyBindings(function () {
      return grid.data.rows.displayedSynchronized.subscribe(function (synchronized) {
        if (synchronized)
          recomputeAvailableSpaceAndAvgRowHeight();
      });
    });
    function recomputeAvailableSpaceAndAvgRowHeight() {
      var displayedRowsCount = table.querySelectorAll('tbody tr').length, tableHeight = table.clientHeight, newAverageRowHeight = Math.floor(tableHeight / (displayedRowsCount || 1)) || averageRowHeightFallback, rowSpace = tableHeight - tableHeight % newAverageRowHeight, requiredNonRowSpace = tableHeight - rowSpace;
      availableRowSpace(scroller.clientHeight - requiredNonRowSpace);
      averageRowHeight(newAverageRowHeight);
    }
    var pageIndexSubscription = this.pageIndex.subscribe(function (newIndex) {
      return grid.data.offset(newIndex * this.pageSize.actual());
    }.bind(this));
    var pageSizeSubscription = this.pageSize.actual.subscribe(function (newActualPageSize) {
      grid.data.offset(this.pageIndex() * newActualPageSize);
      grid.data.limit(newActualPageSize);
    }.bind(this));
    grid.data.offset(this.pageIndex() * this.pageSize.actual());
    grid.data.limit(this.pageSize.actual());
    var desiredPageSizeSubscription = this.pageSize.desired.subscribe(adaptToDesiredPageSize);
    grid.postApplyBindings(function () {
      return adaptToDesiredPageSize(this.pageSize.desired());
    }.bind(this));
    function adaptToDesiredPageSize(desiredPageSize) {
      if (desiredPageSize === PAGE_SIZE_FIT)
        grid.element.classList.add('with-fitted-page-size');
      else
        grid.element.classList.remove('with-fitted-page-size');
    }
    this.dispose = function () {
      this.rowCount.dispose();
      pageIndexSubscription.dispose();
      pageSizeSubscription.dispose();
      desiredPageSizeSubscription.dispose();
    }.bind(this);
  }
  PagingExtension.prototype = {
    get '__adjacentPageIndizes'() {
      return ko.pureComputed(function () {
        var from = Math.max(0, this.pageIndex() - this.maximumStepSize()), to = Math.min(this.pageCount() - 1, this.pageIndex() + this.maximumStepSize()), count = to - from + 1, result = new Array(count);
        for (var i = 0; i < count; ++i)
          result[i] = from + i;
        return result;
      }.bind(this));
    },
    get '__message'() {
      return ko.pureComputed(function () {
        var first = this.pageIndex() * this.pageSize.actual() + 1;
        var last = Math.min(this.rowCount(), (this.pageIndex() + 1) * this.pageSize.actual());
        return first + '\u2013' + last + ' of ' + this.rowCount();
      }.bind(this));
    },
    '__handleClick': function (data, event) {
      if (event.target.tagName === 'BUTTON')
        this.pageIndex(parseInt(event.target.textContent, 10) - 1);
    }
  };
  /**
   * @param {*} bindingValue
   * @param {*} config
   * @param {...Array<string>}paths
   * @return {*}
   */
  function firstValue(bindingValue, config, paths) {
    for (var i = 2; i < arguments.length; ++i)
      for (var j = 0; j < 2; ++j) {
        var potentialResult = arguments[i].reduce(function (a, p) {
          return a && a[p];
        }, arguments[j]);
        if (potentialResult !== undefined && typeof potentialResult !== 'object')
          return potentialResult;
      }
  }
  return koGrid.declareExtensionAlias('paging', extensionId);
}({}, knockout, ko_grid, text_ko_grid_paging_paginghtmltemplate);
ko_grid_paging = function (main) {
  return main;
}(ko_grid_paging_paging);return ko_grid_paging;
}));