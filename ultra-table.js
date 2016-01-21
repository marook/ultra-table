(function(angular, document){
    var module = angular.module('ultra-table', []);

    module.directive('ultraTable', function($compile){

        /**
         * Key is column id / value is cell template jqlite element.
         */
        var thTemplates = {};

        /**
         * Key is column id / value is cell template jqlite element.
         */
        var tdTemplates = {};

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
        }

        function linkTable(scope, thead, tbody){
            scope.$watchCollection('columns', function(){
                renderHead(thead, scope);
                renderRows(tbody, scope);
            });
            renderHead(thead, scope);

            scope.$watchCollection('rows', function(){
                renderRows(tbody, scope);
            });
            renderRows(tbody, scope);
        }

        function renderHead(thead, scope){
            empty(thead);

            for(var i = 0; i < scope.columns.length; ++i){
                var th = renderTh(scope.columns[i], scope);

                thead.appendChild(th);
            }
        }

        function renderTh(column, scope){
            var th = document.createElement('th');
            th.setAttribute('draggable', 'true');
            bindDragListenersForColumn(th, column.id, scope);

            var columnTemplate = thTemplates[column.id];
            if(columnTemplate){
                var cellScope = scope.$new();
                cellScope.column = column;

                renderTemplateWithinElement(th, columnTemplate, cellScope);
            }

            return th;
        }

        function bindDragListenersForColumn(th, columnId, scope){
            th.addEventListener('dragstart', onColumnDragStart, false);
            th.addEventListener('dragover', onColumnDragOver, false);
            th.addEventListener('dragleave', onColumnDragLeave, false);
            th.addEventListener('drop', onColumnDrop, false);

            function onColumnDragStart(e){
                e.dataTransfer.setData('application/json', JSON.stringify({
                    columnId: columnId
                }));
            }

            function onColumnDragOver(e){
                if (e.preventDefault) {
                    e.preventDefault();
                }

                applyDragStyling(this);

                return false;
            }

            function onColumnDragLeave(e){
                resetDragStyling(this);
            }

            function onColumnDrop(e){
                resetDragStyling(this);

                if(e.preventDefault){
                    e.preventDefault();
                }

                var dragData = JSON.parse(e.dataTransfer.getData('application/json'));

                scope.$apply(function(){
                    var dragColumnIndex = indexOfColumn(dragData.columnId);
                    var dropColumnIndex = indexOfColumn(columnId);

                    if(dragColumnIndex === dropColumnIndex){
                        return;
                    }

                    var columns = scope.columns;
                    var dragColumn = columns.splice(dragColumnIndex, 1)[0];
                    scope.columns.splice(dropColumnIndex - ((dragColumnIndex < dropColumnIndex) ? 1 : 0), 0, dragColumn);
                });

                return false;
            }

            function indexOfColumn(columnId){
                for(var i = scope.columns.length - 1; i >= 0; --i){
                    var column = scope.columns[i];

                    if(column.id === columnId){
                        return i;
                    }
                }

                return -1;
            }

        }

        function applyDragStyling(th){
            th.classList.add('ut-drop-column');
        }

        function resetDragStyling(th){
            th.classList.remove('ut-drop-column');
        }

        function renderRows(tbody, scope){
            empty(tbody);

            for(var i = 0; i < scope.rows.length; ++i){
                var row = scope.rows[i];
                appendRow(tbody, row, scope);
            }
        }

        function appendRow(tbody, row, scope){
            var tr = document.createElement('tr');
            tbody.appendChild(tr);

            for(var i = 0; i < scope.columns.length; ++i){
                var column = scope.columns[i];

                var td = document.createElement('td');
                tr.appendChild(td);

                var columnTemplate = tdTemplates[column.id];
                if(columnTemplate){
                    var cellScope = scope.$new();
                    cellScope.row = row;

                    renderTemplateWithinElement(td, columnTemplate, cellScope);
                }
            }
        }

        function renderTemplateWithinElement(element, $template, scope){
            var content = $template.clone();
            element.appendChild(content[0]);

            $compile(content)(scope);
        }

        function empty(element){
            while(element.children.length > 0){
                element.removeChild(element.children[element.children.length - 1]);
            }
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
                 *     id: 'firstName',
                 *   }
                 * ]
                 */
                columns: '=',

                /**
                 * [
                 *   {
                 *     firstName: 'Markus',
                 *   }
                 * ]
                 */
                rows: '='
                
            }
        };
    });

}(angular, document));
