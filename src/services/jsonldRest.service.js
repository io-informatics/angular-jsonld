/* global */
(function() {
  'use strict';
  angular
    .module('angularJsonld')
    .factory('JsonldRest', JsonldRest);

  /* @ngInject */
  function JsonldRest($q, $log, $rootScope, Restangular, jsonld, jsonldContext) {
    function JsonldRestangular(context) {
      var configuredRestangular = Restangular.withConfig(function(RestangularConfigurer){
        RestangularConfigurer.setRestangularFields({
          selfLink: '@id',
          get: '_get'
        });
        RestangularConfigurer.setOnElemRestangularized(function(elem, isCollection, what, Restangular){
          return angular.extend(elem,{
            get: jsonldGet(elem, context, isCollection)
          });
        });
      });

      var withConfigFn = configuredRestangular.withConfig;

      return angular.extend(configuredRestangular, {
        collection: collection,
        resource: resource,
        withConfig: function(f){
          return new JsonldRest($q, $log, $rootScope, withConfigFn(f), jsonld, jsonldContext);
        },
        withContext: function(c) {
          return new JsonldRestangular(c);
        }
      });
    }

    var restangular = new JsonldRestangular();

    return restangular;

    function  resource(containerRoute, localRoute, context){
      var ra = context? restangular.withContext(context): restangular;
      var r = ra.one(containerRoute, localRoute);
      return angular.extend(r, {
        withContext: function(c) {
          return resource(containerRoute, localRoute, c);
        }
      });
    }

    function collection(route, context){
      var ra = context? restangular.withContext(context): restangular;

      var col = ra.all(route);

      return angular.extend(col,{
        withContext: function(c) {
          return collection(route, c);
        },
        one: function(elementRoute){
          return resource(route, elementRoute, context);
        },
        getList: function(){
          var members = arguments.length > 0? arguments[0] : '@graph';
          var args = arguments.length > 1? Array.prototype.slice.apply(arguments, [1]) : undefined;
          return col.get.apply(col, args).then(function(res){
            return angular.extend(asArray(res[members]), res);
          });
        }
      });
    }

    function asArray(obj){
      if(obj instanceof Array) {
        return obj;
      }
      else {
        return [obj];
      }
    }

    function restangularize(node, parent){
        if(node instanceof Array){
          return node.map(function(element){
            return restangularize(element, parent);
          });
        }
        for(var field in node) {
          if(node.hasOwnProperty(field) && field !== '@context' && typeof(node[field]) === 'object'){
            node[field] = restangularize(node[field], node);
          }
        }
        if(node['@context']){
          var context = node['@context'];
          for(var prop in context){
            if(context.hasOwnProperty(prop) && isTypeCoercionProperty(context, prop, node)){
              node[prop] = restangularize({'@id':node[prop]}, node);
            }
          }
        }

        if(node['@id']) {
          var link = restangular.restangularizeElement(parent, node, node['@id']);
          $log.info('Created Restangular subresource: ', link);
          return angular.extend(link, {
            get: jsonldGet(link)
          });
        }
        else {
          return node;
        }
    }

    function jsonldGet(obj, context, isCollection){
      if(angular.isFunction(obj._get)){
        var doGet = function(params){
          if(isCollection) {
            return obj._get('', params);
          }
          return obj._get(params);
        };
        return function(params) {
          return doGet(params).then(function(data){
            return compact(data, context);
          }).then(function(compacted){
            return restangularize(compacted);
          });
        };
      }
      return undefined;
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

    function isTypeCoercionProperty(context, prop, node){
      return context[prop]['@type'] === '@id' && node[prop] !== undefined;
    }
  }

})();
