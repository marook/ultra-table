(function(angular){
    var app = angular.module('demo', [
        'ultra-table',
    ]);

    app.controller('MainController', function($scope){
        $scope.columns = [
            {
                id: 'firstName',
                width: 200
            },
            {
                id: 'birthday',
                width: 240
            },
            {
                id: 'favouriteFood',
                width: 160
            }
        ];

        $scope.rows = [
            {
                firstName: 'Markus',
                birthday: new Date(1980, 1, 1),
                favouriteFood: 'Pizza'
            },
            {
                firstName: 'Cristian',
                birthday: new Date(1970, 1, 1),
                favouriteFood: 'Salad'
            },
            {
                firstName: 'Emanuell',
                birthday: new Date(1990, 1, 1),
                favouriteFood: 'Wraps'
            }
        ];

        $scope.shuffleColumnOrder = shuffleColumnOrder;
        $scope.shuffleNames = shuffleNames;
        $scope.shuffleRows = shuffleRows;
        $scope.growColumns = growColumns;
        $scope.shrinkColumns = shrinkColumns;

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
