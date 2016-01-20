(function(angular, document){
    var module = angular.module('ultra-table', []);

    module.directive('ultraTable', function($compile){

        /**
         * Key is column id / value is cell template jqlite elements.
         */
        var cellTemplates = {};

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
                    cellTemplates[columnId] = angular.element(child);
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

            th.appendChild(document.createTextNode(column.label));

            return th;
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
                var columnTemplate = cellTemplates[column.id];

                var td = document.createElement('td');
                tr.appendChild(td);

                if(columnTemplate){
                    var cellScope = scope.$new();
                    cellScope.row = row;

                    var cellContent = columnTemplate.clone();
                    td.appendChild(cellContent[0]);

                    $compile(cellContent)(cellScope);
                }
            }
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
                 * true/false
                 */
                columnsDraggable: '=',

                /**
                 * Defines the current sorting of the table.
                 *
                 * {
                 *   sortColumnId: 'firstName',
                 *   sortOrder: -1,
                 * }
                 */
                sort: '=',

                /**
                 * Definition of the table's columns. Example:
                 *
                 * [
                 *   {
                 *     id: 'firstName',
                 *     label: 'First Name',
                 *     sortable: true,
                 *     comparator: function(left, right){},
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
