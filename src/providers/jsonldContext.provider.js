(function() {
  'use strict';

  /**
  * @name angularJsonld.contextProvider
  * @description
  * Provider to configure JSONLD context
  */
  angular
    .module('angularJsonld')
    .provider('jsonldContext', JsonldContextProvider);

  /* @ngInject */
  function JsonldContextProvider(){
    var provider = this;
    var context = {};

    provider.$get = function() {
      return Object.freeze(context);
    };

    provider.add = function(c){
      angular.extend(context, c);
    };

  }

})();
