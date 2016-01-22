(function(angular){
    var app = angular.module('demo', [
        'ultra-table',
    ]);

    app.controller('MainController', function($scope){
        $scope.columns = [
            {
                id: 'firstName',
                width: 200,
                minWidth: 150
            },
            {
                id: 'birthday',
                width: 240
            },
            {
                id: 'favouriteFood',
                width: 160,
                maxWidth: 200
            }
        ];

        $scope.rows = createRandomRows(20);

        $scope.shuffleColumnOrder = shuffleColumnOrder;
        $scope.shuffleNames = shuffleNames;
        $scope.shuffleRows = shuffleRows;
        $scope.growColumns = growColumns;
        $scope.shrinkColumns = shrinkColumns;

        function createRandomRows(n){
            var rows = [];

            for(var i = 0; i < n; ++i){
                rows.push(createRandomRow());
            }

            return rows;
        }

        function createRandomRow(){
            return {
                firstName: selectRandomElement(['Markus', 'Cristian', 'Emanuell']),
                birthday: new Date(1970 + Math.round(Math.random() * 20), 1 + Math.round(Math.random() * 12), 1 + Math.round(Math.random() * 28)),
                favouriteFood: selectRandomElement(['Pizza', 'Salad', 'Wraps', 'Curry'])
            };
        }

        function selectRandomElement(array){
            return array[Math.floor(Math.random() * array.length)];
        }

        function shuffleColumnOrder(){
            shuffle($scope.columns);
        }

        function shuffleNames(){
            for(var i = 0; i < $scope.rows.length; ++i){
                var row = $scope.rows[i];
                var firstName = row.firstName;

                row.firstName = firstName.substring(1) + firstName.substring(0, 1);
            }
        }

        function shuffleRows(){
            shuffle($scope.rows);
        }

        function growColumns(){
            addColumnWidth(10);
        }

        function shrinkColumns(){
            addColumnWidth(-10);
        }

        function addColumnWidth(addedWidth){
            for(var i = 0; i < $scope.columns.length; ++i){
                $scope.columns[i].width += addedWidth;
            }
        }

    });

    /**
     * Broght to you with the help of
     * http://stackoverflow.com/a/12646864/404522
     */
    function shuffle(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }
}(angular));
