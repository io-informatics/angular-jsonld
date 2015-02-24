/* global */
(function() {
  'use strict';
  angular
    .module('angularJsonld')
    .factory('JsonldRest', JsonldRest);

  /* @ngInject */
  function JsonldRest($q, $log, $rootScope, Restangular, jsonld, jsonldContext) {
    var restangular =  Restangular.withConfig(function(RestangularConfigurer){
      RestangularConfigurer.setRestangularFields({
        selfLink: '@id'
      });
    });

    var restangularWithConfig = restangular.withConfig;

    return angular.extend(restangular, {
      collection: collection,
      resource: resource,
      withConfig: function(f){
        return new JsonldRest($q, $log, $rootScope, restangularWithConfig(f), jsonld, jsonldContext);
      }
    });

    function  resource(containerRoute, localRoute, context){
      return restangular.withConfig(function(RestangularConfigurer){
        RestangularConfigurer.extendModel(containerRoute, function(res){
          var doGet = res.get;
          return angular.extend(res, {
            get: function() {
              return doGet().then(function(data){
                return compact(data, context);
              }).then(restangularize);
            },
            withContext: function(c) {
              return resource(containerRoute, localRoute, c);
            }
          });
        });
      }).one(containerRoute, localRoute);
    }

    function collection(route, context){
      return restangular.withConfig(function(RestangularConfigurer){
        RestangularConfigurer.extendCollection(route, function(col){
          var doGet = col.get;
          return angular.extend(col, {
            get: function() {
              return doGet('').then(function(data){
                return compact(data, context);
              }).then(restangularize);
            },
            withContext: function(c) {
              return collection(route, c);
            }
          });
        });
      }).all(route);
    }

    function restangularize(node, parent){
        if(node instanceof Array){
          return node.map(function(element){
            return restangularize(element, parent);
          });
        }
        for(var field in node) {
          if(node.hasOwnProperty(field) && typeof(node[field]) === 'object'){
            node[field] = restangularize(node[field], node);
          }
        }
        if(node['@id']) {
          var link = restangular.restangularizeElement(parent, node, node['@id']);
          $log.info('Created Restangular subresource: ', link);
          return link;
        }
        else {
          return node;
        }
    }

    function compact(data, context){
      var c = angular.copy(jsonldContext);
      if(context){
        angular.extend(c, context);
      }
      var compactDefer = $q.defer();
      jsonld.compact(data, c, function(err, compacted){
        if(err) {
          $log.error('Faild compact jsonld', err);
          compactDefer.reject(err);
        }
        else {
          $log.debug('Completed jsonld compact processing', compacted);
          compactDefer.resolve(compacted);
        }
        $rootScope.$apply();
      });
      return compactDefer.promise;
    }

    function isJsonld(response) {
      return response.headers('Content-Type') === 'application/ld+json';
    }
  }

})();
