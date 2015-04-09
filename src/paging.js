'use strict';

var toolbar = 'ko-grid-toolbar';

define(['module', 'knockout', 'ko-grid', 'text!ko-grid-paging/paging.html.template', toolbar], function (module, ko, koGrid, pagingTemplate) {
    var extensionId = module.id.indexOf('/') < 0 ? module.id : module.id.substring(0, module.id.indexOf('/'));

    var PAGE_SIZE_FIT = 'fit';

    koGrid.defineExtension(extensionId, {
        dependencies: [toolbar],
        initializer: template => template.to('right-toolbar').append('paging', pagingTemplate),
        Constructor: PagingExtension
    });

    function PagingExtension(bindingValue, config, grid) {
        var desiredPageSize = firstValue(bindingValue, config, ['pageSize', 'desired'], ['pageSize']);
        var maximumPageSize = firstValue(bindingValue, config, ['pageSize', 'maximum']) || 50;

        var scroller, table;
        grid.postApplyBindings(()=> {
            scroller = grid.element.querySelector('.ko-grid-table-scroller');
            table = grid.element.querySelector('.ko-grid-table');
        });

        this.maximumStepSize = this['maximumStepSize'] = ko.observable(2); // TODO this should be configurable

        this.rowCount = this['rowCount'] = ko.pureComputed(() => grid.data.view.filteredSize());

        var pageSize = {};
        pageSize.desired = pageSize['desired'] = ko.observable(desiredPageSize);
        pageSize.maximum = pageSize['maximum'] = ko.observable(maximumPageSize);
        pageSize.actual = pageSize['actual'] = ko.pureComputed(() => {
            var desiredPageSize = this.pageSize.desired();
            if (desiredPageSize === PAGE_SIZE_FIT) {
                var capacity = Math.floor(availableRowSpace() / averageRowHeight());
                desiredPageSize = Math.max(1, capacity);
            }
            return Math.min(this.pageSize.maximum(), desiredPageSize);
        });
        this.pageSize = this['pageSize'] = pageSize;

        this.pageIndex = this['pageIndex'] = ko.observable(0);

        this.pageCount = this['pageCount'] = ko.pureComputed(() => {
            var maxPageIndex = Math.max(0, Math.floor((this.rowCount() - 1) / this.pageSize.actual()));
            this.pageIndex(Math.min(this.pageIndex(), maxPageIndex));
            return maxPageIndex + 1;
        });

        var averageRowHeightFallback = grid.layout.determineCellDimensions('|').height;
        var availableRowSpace = ko.observable(5 * averageRowHeightFallback);
        var averageRowHeight = ko.observable(averageRowHeightFallback);
        grid.layout.afterRelayout(recomputeAvailableSpaceAndAvgRowHeight);
        grid.postApplyBindings(() => grid.data.rows.displayedSynchronized.subscribe(synchronized => {
            if (synchronized)
                recomputeAvailableSpaceAndAvgRowHeight();
        }));

        function recomputeAvailableSpaceAndAvgRowHeight() {
            var displayedRowsCount = table.querySelectorAll('tbody tr').length,
                tableHeight = table.clientHeight,
                newAverageRowHeight = Math.floor(tableHeight / (displayedRowsCount || 1)) || averageRowHeightFallback,
                rowSpace = tableHeight - tableHeight % newAverageRowHeight,
                requiredNonRowSpace = tableHeight - rowSpace;

            availableRowSpace(scroller.clientHeight - requiredNonRowSpace);
            averageRowHeight(newAverageRowHeight);
        }

        var pageIndexSubscription = this.pageIndex.subscribe(newIndex => grid.data.offset(newIndex * this.pageSize.actual()));
        var pageSizeSubscription = this.pageSize.actual.subscribe(newActualPageSize => {
            grid.data.offset(this.pageIndex() * newActualPageSize);
            grid.data.limit(newActualPageSize);
        });
        grid.data.offset(this.pageIndex() * this.pageSize.actual());
        grid.data.limit(this.pageSize.actual());

        var desiredPageSizeSubscription = this.pageSize.desired.subscribe(adaptToDesiredPageSize);
        grid.postApplyBindings(() => adaptToDesiredPageSize(this.pageSize.desired()));
        function adaptToDesiredPageSize(desiredPageSize) {
            if (desiredPageSize === PAGE_SIZE_FIT)
                grid.element.classList.add('with-fitted-page-size');
            else
                grid.element.classList.remove('with-fitted-page-size');
        }

        this.dispose = () => {
            this.rowCount.dispose();
            pageIndexSubscription.dispose();
            pageSizeSubscription.dispose();
            desiredPageSizeSubscription.dispose();
        };
    }

    PagingExtension.prototype = {
        get '__adjacentPageIndizes'() {
            return ko.pureComputed(() => {
                var from = Math.max(0, this.pageIndex() - this.maximumStepSize()),
                    to = Math.min(this.pageCount() - 1, this.pageIndex() + this.maximumStepSize()),
                    count = to - from + 1,
                    result = new Array(count);
                for (var i = 0; i < count; ++i)
                    result[i] = from + i;
                return result;
            });
        },
        get '__message'() {
            return ko.pureComputed(() => {
                var first = this.pageIndex() * this.pageSize.actual() + 1;
                var last = Math.min(this.rowCount(), (this.pageIndex() + 1) * this.pageSize.actual());
                return first + '\u2013' + last + ' of ' + this.rowCount();
            });
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
    function firstValue(bindingValue, config, /**...Array<string>*/ paths) {
        for (var i = 2; i < arguments.length; ++i)
            for (var j = 0; j < 2; ++j) {
                var potentialResult = arguments[i].reduce((a, p) => a && a[p], arguments[j]);
                if (potentialResult !== undefined && typeof potentialResult !== 'object')
                    return potentialResult;
            }
    }

    return koGrid.declareExtensionAlias('paging', extensionId);
});
