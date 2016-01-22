(function(angular, document){
    var module = angular.module('ultra-table', []);

    module.directive('ultraTable', function($compile){

        var DRAG_TYPE = {
            COLUMN_DRAG: 'ultra-table.columnDrag',
            COLUMN_RESIZE: 'ultra-table.columnResize'
        };

        /**
         * Key is column id / value is cell template jqlite element.
         */
        var thTemplates = {};

        /**
         * Key is column id / value is cell template jqlite element.
         */
        var tdTemplates = {};

        var dragTypeInProgress = null;

        function compile(templateElement, templateAttrs){
            extractCellTemplates(templateElement[0]);

            return link;
        }

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

        function link(scope, $element, attrs){
            var element = $element[0];

            var table = document.createElement('table');
            element.appendChild(table);

            var thead = document.createElement('thead');
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            table.appendChild(tbody);

            linkTable(scope, thead, tbody);
            bindColumnResizeListener(element, scope);
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
                console.log('>>>>dddd');
                console.log('>>>>drop', getDragData(e, DRAG_TYPE.COLUMN_RESIZE));

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
                    column.width = resizeData.startWidth + dx;
                });
            }
        }

        function linkTable(scope, thead, tbody){
            var tbodyScopes = [];
            var theadScopes = [];

            scope.$watchCollection('columns', function(){
                renderHead(thead, theadScopes, scope);
                renderRows(tbody, tbodyScopes, scope);
            });
            renderHead(thead, theadScopes, scope);

            scope.$watchCollection('rows', function(){
                renderRows(tbody, tbodyScopes, scope);
            });
            renderRows(tbody, tbodyScopes, scope);
        }

        function renderHead(thead, threadScopes, scope){
            empty(thead, threadScopes);

            for(var i = 0; i < scope.columns.length; ++i){
                var th = renderTh(scope.columns[i], scope, threadScopes);

                thead.appendChild(th);
            }
        }

        function renderTh(column, scope, scopes){
            var th = document.createElement('th');
            th.setAttribute('draggable', 'true');
            bindDragListenersForColumn(th, column.id, scope);

            th.appendChild(renderResizeDragger(column, scope));

            var columnTemplate = thTemplates[column.id];
            if(columnTemplate){
                var cellScope = scope.$new();
                scopes.push(cellScope);
                cellScope.column = column;

                renderTemplateWithinElement(th, columnTemplate, cellScope);
                
                cellScope.$watch('column.width', updateWidth);
                updateWidth();
            }

            return th;

            function updateWidth(){
                th.style.width = column.width + 'px';
            }
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

        function renderRows(tbody, tbodyScopes, scope){
            empty(tbody, tbodyScopes);

            for(var i = 0; i < scope.rows.length; ++i){
                var row = scope.rows[i];
                appendRow(tbody, row, scope, tbodyScopes);
            }
        }

        function appendRow(tbody, row, scope, scopes){
            var tr = document.createElement('tr');
            tbody.appendChild(tr);

            for(var i = 0; i < scope.columns.length; ++i){
                var column = scope.columns[i];

                var td = document.createElement('td');
                tr.appendChild(td);

                var columnTemplate = tdTemplates[column.id];
                if(columnTemplate){
                    var cellScope = scope.$new();
                    scopes.push(cellScope);
                    cellScope.row = row;

                    renderTemplateWithinElement(td, columnTemplate, cellScope);
                }
            }
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

        function empty(element, scopes){
            while(element.children.length > 0){
                element.removeChild(element.children[element.children.length - 1]);
            }

            for(var i = scopes.length - 1; i >= 0; --i){
                scopes[i].$destroy();
            }

            scopes.splice(0, scopes.length);
        }

        return {
            restrict: 'E',
            compile: compile,
            link: link,
            scope: {
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
                rows: '='
                
            }
        };
    });

}(angular, document));
