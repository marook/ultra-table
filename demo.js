(function(angular){
    var app = angular.module('demo', [
        'ultra-table',
    ]);

    app.controller('MainController', function($scope){
        $scope.sort = {
            sortColumnId: 'firstName',
            sortOrder: -1
        };

        $scope.columns = [
            {
                id: 'firstName',
                label: 'First Name'
            },
            {
                id: 'birthday',
                label: 'Birthday'
            },
            {
                id: 'favouriteFood',
                label: 'Favourite Food'
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
            }
        ];

        $scope.shuffleColumnOrder = shuffleColumnOrder;

        function shuffleColumnOrder(){
            shuffle($scope.columns);
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
