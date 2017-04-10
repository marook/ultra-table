(function(angular, document){
    var module = angular.module('ultra-table', []);

    module.directive('ultraTable', function($compile, $timeout, $q, $parse){

        var DRAG_TYPE = {
            COLUMN_DRAG: 'ultra-table.columnDrag',
            COLUMN_RESIZE: 'ultra-table.columnResize'
        };

        var SCROLLBAR_WIDTH = 35;

        var SELECTION_TYPES = new Set([
            'NONE',
            'SINGLE',
            'MULTIPLE',
        ]);

        var dragTypeInProgress = null;

        function compile(templateElement, templateAttrs){
            /**
             * Key is column id / value is cell template jqlite element.
             */
            var thTemplates = {};

            /**
             * Key is column id / value is cell template jqlite element.
             */
            var tdTemplates = {};

            var rowsRenderQueue = null;

            var getSelection = $parse(templateAttrs.utSelection);
            
            var selectionType = 'NONE';
            if(templateAttrs.utSelection){
                if (templateAttrs.utSelectionType && SELECTION_TYPES.has(templateAttrs.utSelectionType.toUpperCase())) {
                    selectionType = templateAttrs.utSelectionType.toUpperCase();
                } else {
                    selectionType = 'SINGLE'
                }
            }


            extractCellTemplates(templateElement[0]);

            function extractCellTemplates(element){
                var children = element.children;

                for(var i = children.length - 1; i >= 0; --i){
                    var child = children[i];
                    var columnId = child.getAttribute('column-id');

                    if(columnId){
                        var tagName = child.tagName.toLowerCase();
                        var $child = angular.element(child);

                        if(tagName === 'ut-td'){
                            tdTemplates[columnId] = $child;
                        }
                        else if(tagName === 'ut-th'){
                            thTemplates[columnId] = $child;
                        }
                    }

                    element.removeChild(child);
                }
            }

            function link(tableScope, $element, attrs){
                var element = $element[0];
                var tableClass = attrs.tableClass || '';

                appendTables(tableScope, element, tableClass);

                bindColumnResizeListener(element, tableScope);
            }

            function appendTables(tableScope, element, tableClass){
                var headTableContainer = document.createElement('div');
                headTableContainer.classList.add('ut-head-table-container');
                element.appendChild(headTableContainer);

                var headTable = document.createElement('table');
                headTable.className = 'ut-head-table ' + tableClass;
                headTableContainer.appendChild(headTable);

                var thead = document.createElement('thead');
                headTable.appendChild(thead);

                var bodyTableContainer = document.createElement('div');
                bodyTableContainer.classList.add('ut-body-table-container');
                element.appendChild(bodyTableContainer);
                bindHeadAndBodyTableScrollSynchronization(headTableContainer, bodyTableContainer);

                var bodyTable = document.createElement('table');
                bodyTable.className = 'ut-body-table ' + tableClass;
                bodyTableContainer.appendChild(bodyTable);

                var tbody = document.createElement('tbody');
                bodyTable.appendChild(tbody);

                linkTable(tableScope, thead, tbody, _updateTableWidths_);

                function _updateTableWidths_(){
                    updateTableWidths(tableScope, headTable, bodyTable);
                }
            }

            function updateTableWidths(scope, headTable, bodyTable){
                var width = 0;
                for(var i = scope.columns.length - 1; i >= 0; --i){
                    width += scope.columns[i].width;
                }

                headTable.style.width = (width + SCROLLBAR_WIDTH) + 'px';
                bodyTable.style.width = width + 'px';
            }

            function bindHeadAndBodyTableScrollSynchronization(headTableContainer, bodyTableContainer){
                bodyTableContainer.addEventListener('scroll', synchronizeScroll, false);
                synchronizeScroll();

                function synchronizeScroll(){
                    headTableContainer.scrollLeft = bodyTableContainer.scrollLeft;
                }
            }

            function bindColumnResizeListener(element, scope){
                element.addEventListener('dragover', onDragOver, false);
                element.addEventListener('drop', onDrop, false);

                function onDragOver(e){
                    if(dragTypeInProgress !== DRAG_TYPE.COLUMN_RESIZE){
                        return;
                    }

                    if(e.preventDefault){
                        e.preventDefault();
                    }

                    handleColumnResizeEvent(e);
                }

                function onDrop(e){
                    if(dragTypeInProgress !== DRAG_TYPE.COLUMN_RESIZE){
                        return;
                    }

                    dragTypeInProgress = null;

                    if(e.preventDefault){
                        e.preventDefault();
                    }

                    handleColumnResizeEvent(e);
                }

                function handleColumnResizeEvent(e){
                    var resizeData = getDragData(e, DRAG_TYPE.COLUMN_RESIZE);
                    if(resizeData === null){
                        return;
                    }

                    var columnIndex = indexOfColumn(scope, resizeData.columnId);
                    if(columnIndex === -1){
                        return;
                    }

                    scope.$apply(function(){
                        var column = scope.columns[columnIndex];
                        var dx = e.clientX - resizeData.startX;
                        var width = resizeData.startWidth + dx;

                        column.width = enforceBounds(width, column.minWidth, column.maxWidth);
                    });
                }
            }

            function linkTable(tableScope, thead, tbody, updateTableWidths){
                var tbodyScopes = [];
                var theadScopes = [];
                var selectedRowElements = new Set();
                var rowElementByRowMap = null;

                tableScope.$watchCollection('columns', function(){
                    renderHead(thead, theadScopes, tableScope, updateTableWidths);
                    if(tbody){
                        renderRows();
                    }
                });
                renderHead(thead, theadScopes, tableScope, updateTableWidths);

                tableScope.$watchCollection('rows', function(){
                    if(tbody){
                        renderRows();
                    }
                });
                if(tbody){
                    renderRows();
                }
                

                if(isSelectable()){
                    var deregister = tableScope.$parent.$watchCollection(templateAttrs.utSelection, updateSelectedRowElements);
                    tableScope.$on('$destroy', deregister);
                }

                function renderRows(){
                    rowElementByRowMap = new Map();

                    if(rowsRenderQueue){
                        rowsRenderQueue.abortRendering();
                    }
                    rowsRenderQueue = buildRenderQueue();

                    empty(tbody, tbodyScopes);

                    if(tableScope.rows){
                        for(var i = 0; i < tableScope.rows.length; ++i){
                            var row = tableScope.rows[i];
                            rowElementByRowMap.set(row, appendRow(row, tableScope, i === 0));
                        }
                        if (tableScope.rows.length === 0){
                            appendEmptyRow(tbody, tableScope, tbodyScopes);
                        }
                        updateSelectedRowElements(getSelection(tableScope.$parent));
                    }

                    rowsRenderQueue.startRendering();
                }

                function appendRow(row, tableScope, enforceWidth){
                    var tr = document.createElement('tr');
                    if(isSelectable()){
                        tr.addEventListener('click', function(event){
                            if(tr.parentNode === null){
                                return;
                            }
                            tableScope.$apply(function () {
                                return $q.when()
                                    .then(function () {
                                        if (selectedRowElements.has(tr)) {
                                            if (isMultiSelect()) {
                                                var selection = getSelection(tableScope.$parent);
                                                if (selection) {
                                                    if (event.ctrlKey) {
                                                        selection.splice(selection.indexOf(row), 1);
                                                    } else {
                                                        selection.splice(0, selection.length);
                                                        selection.push(row);
                                                    }
                                                }
                                            }
                                            return $q.reject();
                                        }
                                        return tableScope.utBeforeSelection({
                                            row: row
                                        });
                                    })
                                    .then(function () {
                                        var selection = getSelection(tableScope.$parent);
                                        if (selection) {
                                            if (isMultiSelect() && event.ctrlKey) {
                                                selection.push(row);
                                            } else {
                                                selection.splice(0, selection.length);
                                                selection.push(row);
                                            }
                                        }
                                    });
                            });
                        });
                    }
                    tbody.appendChild(tr);

                    for(var i = 0; i < tableScope.columns.length; ++i){
                        (function(column){
                            var td = document.createElement('td');
                            tr.appendChild(td);

                            var columnTemplate = tdTemplates[column.id];
                            if(columnTemplate){
                                var cellScope = tableScope.$parent.$new();
                                tbodyScopes.push(cellScope);
                                cellScope.column = column;
                                cellScope.row = row;

                                rowsRenderQueue.appendJob(function(){
                                    renderTemplateWithinElement(td, columnTemplate, cellScope);

                                    if(enforceWidth){
                                        (function(td, column){
                                            cellScope.$watch('column.width', updateWidth);
                                            updateWidth();

                                            function updateWidth(){
                                                td.style.width = column.width + 'px';
                                            }
                                        }(td, column));
                                    }
                                });
                            }
                        }(tableScope.columns[i]));
                    }
                    return tr;
                }
                function updateSelectedRowElements(selection) {
                    if (!selection) {
                        return
                    }
                    var selectedElements = new Set(selection.filter(item => rowElementByRowMap.has(item)).map(item => rowElementByRowMap.get(item)));
                    [...selectedRowElements]
                        .filter(row => !selectedElements.has(row))
                        .forEach(row => {
                            row.classList.remove('selected');
                        });

                    selectedRowElements = selectedElements;
                    selectedRowElements.forEach(row => {
                        row.classList.add('selected');
                    });
                }
            }

            function renderHead(thead, threadScopes, scope, updateTableWidths){
                empty(thead, threadScopes);

                if(scope.columns){
                    for(var i = 0; i < scope.columns.length; ++i){
                        var th = renderTh(scope.columns[i], scope, threadScopes, updateTableWidths);

                        thead.appendChild(th);
                    }
                }

                thead.appendChild(renderScrollbarSpacerColumn('th'));
            }

            function renderScrollbarSpacerColumn(tagName){
                var cell = document.createElement(tagName);
                cell.style.width = SCROLLBAR_WIDTH + 'px';

                return cell;
            }

            function renderTh(column, scope, scopes, updateTableWidths){
                var th = document.createElement('th');
                th.setAttribute('draggable', 'true');
                th.classList.add('content-column');
                bindDragListenersForColumn(th, column.id, scope);

                th.appendChild(renderResizeDragger(column, scope));

                var columnTemplate = thTemplates[column.id];
                if(columnTemplate){
                    var cellScope = scope.$parent.$new();
                    scopes.push(cellScope);
                    cellScope.column = column;

                    renderTemplateWithinElement(th, columnTemplate, cellScope);

                    cellScope.$watch('column.width', updateWidth);
                    updateWidth();
                }

                return th;

                function updateWidth(){
                    th.style.width = enforceBounds(column.width, column.minWidth, column.maxWidth) + 'px';
                    updateTableWidths();
                }
            }

            function enforceBounds(value, min, max){
                if(typeof min === 'number' && value < min){
                    return min;
                }

                if(typeof max === 'number' && value > max){
                    return max;
                }

                return value;
            }

            function renderResizeDragger(column, scope){
                var resizeDragger = document.createElement('div');
                resizeDragger.setAttribute('draggable', 'true');
                resizeDragger.classList.add('ut-column-resize-dragger');

                bindDragListenersForResize(resizeDragger, column.id, scope);

                return resizeDragger;
            }

            function bindDragListenersForResize(resizeDragger, columnId, scope){
                resizeDragger.addEventListener('dragstart', onDragStart, false);

                function onDragStart(e){
                    e.cancelBubble = true;

                    var columnIndex = indexOfColumn(scope, columnId);
                    if(columnIndex === -1){
                        return;
                    }

                    e.dataTransfer.effectAllowed = 'move';

                    setDragData(e, DRAG_TYPE.COLUMN_RESIZE, {
                        columnId: columnId,
                        startX: e.clientX,
                        startWidth: scope.columns[columnIndex].width
                    });
                }
            }

            function bindDragListenersForColumn(th, columnId, scope){
                th.addEventListener('dragstart', onColumnDragStart, false);
                th.addEventListener('dragover', onColumnDragOver, false);
                th.addEventListener('dragleave', onColumnDragLeave, false);
                th.addEventListener('drop', onColumnDrop, false);

                function onColumnDragStart(e){
                    e.cancelBubble = true;
                    e.dataTransfer.effectAllowed = 'move';

                    setDragData(e, DRAG_TYPE.COLUMN_DRAG, columnId);
                }

                function onColumnDragOver(e){
                    if(dragTypeInProgress !== DRAG_TYPE.COLUMN_DRAG){
                        return;
                    }

                    if(e.preventDefault){
                        e.preventDefault();
                    }

                    if(e.target.getBoundingClientRect){
                        applyDragStyling(this, isLeftDrop(e));
                    }

                    return false;
                }

                function onColumnDragLeave(e){
                    if(dragTypeInProgress !== DRAG_TYPE.COLUMN_DRAG){
                        return;
                    }

                    resetDragStyling(this);
                }

                function onColumnDrop(e){
                    var draggedColumnId = getDragData(e, DRAG_TYPE.COLUMN_DRAG);
                    if(draggedColumnId === null){
                        return;
                    }

                    dragTypeInProgress = null;

                    resetDragStyling(this);

                    if(e.preventDefault){
                        e.preventDefault();
                    }

                    scope.$apply(function(){
                        var dragColumnIndex = indexOfColumn(scope, draggedColumnId);
                        var dropColumnIndex = indexOfColumn(scope, columnId) + (isLeftDrop(e) ? 0 : 1);

                        if(dragColumnIndex === dropColumnIndex){
                            return;
                        }

                        var columns = scope.columns;
                        var dragColumn = columns.splice(dragColumnIndex, 1)[0];
                        scope.columns.splice(dropColumnIndex - ((dragColumnIndex < dropColumnIndex) ? 1 : 0), 0, dragColumn);
                    });

                    return false;
                }

            }

            function indexOfColumn(scope, columnId){
                for(var i = scope.columns.length - 1; i >= 0; --i){
                    var column = scope.columns[i];

                    if(column.id === columnId){
                        return i;
                    }
                }

                return -1;
            }

            function isLeftDrop(e){
                var targetBounding = e.target.getBoundingClientRect();
                var cursorXOnTarget = e.clientX - targetBounding.left;
                var relativeCursorXOnTarget = cursorXOnTarget / targetBounding.width;

                return relativeCursorXOnTarget <= 0.5;
            }

            function applyDragStyling(th, left){
                if(left){
                    th.classList.add('ut-drop-column-left');
                    th.classList.remove('ut-drop-column-right');
                }
                else{
                    th.classList.add('ut-drop-column-right');
                    th.classList.remove('ut-drop-column-left');
                }
            }

            function resetDragStyling(th){
                th.classList.remove('ut-drop-column-left');
                th.classList.remove('ut-drop-column-right');
            }

            function appendEmptyRow(tbody, scope, scopes, enforceWidth){
                var tr = document.createElement('tr');
                tbody.appendChild(tr);
                tr.style.height = '1px';
            }

            function isSelectable() {
                return selectionType !== 'NONE';
            }

            function isMultiSelect() {
                return selectionType === 'MULTIPLE';
            }

            return link;
        }

        function getDragData(event, dragType){
            try{
                var serializedCommand = event.dataTransfer.getData('text');
                if(!serializedCommand){
                    return null;
                }

                var command = JSON.parse(serializedCommand);

                if(command.type !== dragType){
                    return null;
                }

                return command.body;
            }
            catch(e){
                return null;
            }
        }

        function setDragData(event, dragType, data){
            dragTypeInProgress = dragType;

            var serializedCommand = JSON.stringify({
                type: dragType,
                body: data
            });

            event.dataTransfer.setData('text', serializedCommand);
        }

        function renderTemplateWithinElement(element, $template, scope){
            var content = $template.clone();
            element.appendChild(content[0]);

            $compile(content)(scope);
        }

        function buildRenderQueue(){
            var renderQueue = [];

            function appendJob(renderJob){
                renderQueue.push(renderJob);
            }

            function startRendering(){
                /*
                 * the queue is reversed so we can remove elements from
                 * the end quickly with O(1) and still execute the jobs
                 * in the order they where queued.
                 */
                renderQueue.reverse();

                workNextQueueChunk();
            }

            function workNextQueueChunk(){
                var processedJobs = 0;
                for(var i = renderQueue.length - 1; processedJobs < 200 && i >= 0; --i){
                    renderQueue[i]();
                    ++processedJobs;
                }

                renderQueue.splice(i + 1, processedJobs);

                if(i > 0){
                    $timeout(workNextQueueChunk, 25);
                }
            }

            function abortRendering(){
                renderQueue = [];
            }

            return {
                appendJob: appendJob,
                startRendering: startRendering,
                abortRendering: abortRendering
            };
        }

        function empty(element, scopes){
            angular.element(element).empty();
            for(var i = scopes.length - 1; i >= 0; --i){
                scopes[i].$destroy();
            }
            scopes.splice(0, scopes.length);
        }

        return {
            restrict: 'E',
            compile: compile,
            scope: {

                /**
                 * Classes which are assigned to the table element.
                 */
                tableClass: '@',

                /**
                 * Definition of the table's columns. Example:
                 *
                 * [
                 *   {
                 *     id: 'someColumnId',
                 *     width: 100,
                 *   },
                 *   {
                 *     id: 'anotherColumnId',
                 *     width: 120
                 *   }
                 * ]
                 */
                columns: '=',

                /**
                 * An array of rows.
                 */
                rows: '=',

                utSelectionType: '<',

                /**
                 * This expression is evaluated when the user selects a
                 * row in the table body. The expression can return a
                 * rejected promise to prevent the selection change.
                 *
                 * The following additional variables are available in
                 * the expression:
                 * - row: The row object which's tr element got
                 *   clicked.
                 */
                utBeforeSelection: '&',

                utSelection: '@',
            }
        };
    });

}(angular, document));
