'use strict';
// Source: src/angularJsonld.module.js
(function() {
angular
    .module('angularJsonld', ['restangular']);

})();

// Source: src/providers/jsonld.provider.js
/* global jsonld */
(function(jsonld) {
angular
    .module('angularJsonld')
    .provider('jsonld', JsonldProvider);

  /* @ngInject */
  function JsonldProvider() {
    var knownContexts = {};
    var provider = this;

    /* @ngInject */
    provider.$get = function($log) {
      var nodeDocumentLoader = jsonld.documentLoaders.xhr();

      var customLoader = function(uri, callback) {
        if(uri in knownContexts) {
          $log.debug('Returning known context:', knownContexts[uri]);
          return callback(
            null, {
              contextUrl: null, // this is for a context via a link header
              document: knownContexts[uri], // this is the actual document that was loaded
              documentUrl: uri // this is the actual context URL after redirects
            });
        }
        nodeDocumentLoader(uri).then(function(response){
          callback(null, response);
        }).
        catch(function(err){
          callback(err, null);
        });
      };
      jsonld.documentLoader = customLoader;
      return jsonld;
    };

    provider.registerContext = function(uri, context) {
      knownContexts[uri] = context;
    };
  }

})(jsonld);

// Source: src/providers/jsonldContext.provider.js
(function() {
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

// Source: src/services/jsonldRest.service.js
/* global */
(function() {
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

// Source: src/vocabularies/hydraCore.module.js
(function() {
var context = {
    '@context': {
      'hydra': 'http://www.w3.org/ns/hydra/core#',
      'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#',
      'owl': 'http://www.w3.org/2002/07/owl#',
      'vs': 'http://www.w3.org/2003/06/sw-vocab-status/ns#',
      'dc': 'http://purl.org/dc/terms/',
      'cc': 'http://creativecommons.org/ns#',
      'apiDocumentation': 'hydra:apiDocumentation',
      'ApiDocumentation': 'hydra:ApiDocumentation',
      'title': 'hydra:title',
      'description': 'hydra:description',
      'entrypoint': { '@id': 'hydra:entrypoint', '@type': '@id' },
      'supportedClass': { '@id': 'hydra:supportedClass', '@type': '@vocab' },
      'Class': 'hydra:Class',
      'supportedProperty': { '@id': 'hydra:supportedProperty', '@type': '@id' },
      'SupportedProperty': 'hydra:SupportedProperty',
      'property': { '@id': 'hydra:property', '@type': '@vocab' },
      'required': 'hydra:required',
      'readonly': 'hydra:readonly',
      'writeonly': 'hydra:writeonly',
      'supportedOperation': { '@id': 'hydra:supportedOperation', '@type': '@id' },
      'Operation': 'hydra:Operation',
      'CreateResourceOperation': 'hydra:CreateResourceOperation',
      'ReplaceResourceOperation': 'hydra:ReplaceResourceOperation',
      'DeleteResourceOperation': 'hydra:DeleteResourceOperation',
      'method': 'hydra:method',
      'expects': { '@id': 'hydra:expects', '@type': '@vocab' },
      'returns': { '@id': 'hydra:returns', '@type': '@vocab' },
      'statusCodes': { '@id': 'hydra:statusCodes', '@type': '@id' },
      'StatusCodeDescription': 'hydra:StatusCodeDescription',
      'statusCode': 'hydra:statusCode',
      'Error': 'hydra:Error',
      'Resource': 'hydra:Resource',
      'operation': 'hydra:operation',
      'Collection': 'hydra:Collection',
      'member': { '@id': 'hydra:member', '@type': '@id' },
      'search': 'hydra:search',
      'freetextQuery': 'hydra:freetextQuery',
      'PagedCollection': 'hydra:PagedCollection',
      'totalItems': 'hydra:totalItems',
      'itemsPerPage': 'hydra:itemsPerPage',
      'firstPage': { '@id': 'hydra:firstPage', '@type': '@id' },
      'lastPage': { '@id': 'hydra:lastPage', '@type': '@id' },
      'nextPage': { '@id': 'hydra:nextPage', '@type': '@id' },
      'previousPage': { '@id': 'hydra:previousPage', '@type': '@id' },
      'Link': 'hydra:Link',
      'TemplatedLink': 'hydra:TemplatedLink',
      'IriTemplate': 'hydra:IriTemplate',
      'template': 'hydra:template',
      'mapping': 'hydra:mapping',
      'IriTemplateMapping': 'hydra:IriTemplateMapping',
      'variable': 'hydra:variable',
      'defines': { '@reverse': 'rdfs:isDefinedBy' },
      'comment': 'rdfs:comment',
      'label': 'rdfs:label',
      'preferredPrefix': 'http://purl.org/vocab/vann/preferredNamespacePrefix',
      'cc:license': {'@type': '@id' },
      'cc:attributionURL': {'@type': '@id' },
      'domain': { '@id': 'rdfs:domain', '@type': '@vocab' },
      'range': {'@id': 'rdfs:range', '@type': '@vocab' },
      'subClassOf': { '@id': 'rdfs:subClassOf', '@type': '@vocab' },
      'subPropertyOf': { '@id': 'rdfs:subPropertyOf', '@type': '@vocab' },
      'seeAlso': { '@id': 'rdfs:seeAlso', '@type': '@id' }
    }
  };

  angular
    .module('angularJsonld.hydraCore', ['angularJsonld'])
    .config(config);

  /* @ngInject */
  function config(jsonldProvider, jsonldContextProvider){
    jsonldProvider.registerContext('http://www.w3.org/ns/hydra/context.jsonld', context);
    jsonldContextProvider.add({
      'hydra': 'http://www.w3.org/ns/hydra/core#'
    });
  }

})();

// Source: src/vocabularies/schema.org.module.js
(function() {
var context = {
    '@context':    {
        '@vocab': 'http://schema.org/',
        'acceptsReservations': { '@type': '@id' },
        'additionalType': { '@type': '@id' },
        'applicationCategory': { '@type': '@id' },
        'applicationSubCategory': { '@type': '@id' },
        'arrivalTime': { '@type': 'DateTime' },
        'artform': { '@type': '@id' },
        'availabilityEnds': { '@type': 'DateTime' },
        'availabilityStarts': { '@type': 'DateTime' },
        'availableFrom': { '@type': 'DateTime' },
        'availableThrough': { '@type': 'DateTime' },
        'birthDate': { '@type': 'Date' },
        'bookingTime': { '@type': 'DateTime' },
        'checkinTime': { '@type': 'DateTime' },
        'checkoutTime': { '@type': 'DateTime' },
        'codeRepository': { '@type': '@id' },
        'commentTime': { '@type': 'Date' },
        'contentUrl': { '@type': '@id' },
        'dateCreated': { '@type': 'Date' },
        'dateIssued': { '@type': 'DateTime' },
        'dateModified': { '@type': 'Date' },
        'datePosted': { '@type': 'Date' },
        'datePublished': { '@type': 'Date' },
        'deathDate': { '@type': 'Date' },
        'departureTime': { '@type': 'DateTime' },
        'discussionUrl': { '@type': '@id' },
        'dissolutionDate': { '@type': 'Date' },
        'doorTime': { '@type': 'DateTime' },
        'downloadUrl': { '@type': '@id' },
        'dropoffTime': { '@type': 'DateTime' },
        'embedUrl': { '@type': '@id' },
        'endDate': { '@type': 'Date' },
        'endTime': { '@type': 'DateTime' },
        'expectedArrivalFrom': { '@type': 'DateTime' },
        'expectedArrivalUntil': { '@type': 'DateTime' },
        'expires': { '@type': 'Date' },
        'featureList': { '@type': '@id' },
        'foundingDate': { '@type': 'Date' },
        'gameLocation': { '@type': '@id' },
        'gamePlatform': { '@type': '@id' },
        'guidelineDate': { '@type': 'Date' },
        'hasMap': { '@type': '@id' },
        'image': { '@type': '@id' },
        'installUrl': { '@type': '@id' },
        'isBasedOnUrl': { '@type': '@id' },
        'labelDetails': { '@type': '@id' },
        'lastReviewed': { '@type': 'Date' },
        'license': { '@type': '@id' },
        'logo': { '@type': '@id' },
        'map': { '@type': '@id' },
        'maps': { '@type': '@id' },
        'material': { '@type': '@id' },
        'memoryRequirements': { '@type': '@id' },
        'menu': { '@type': '@id' },
        'modifiedTime': { '@type': 'DateTime' },
        'namedPosition': { '@type': '@id' },
        'orderDate': { '@type': 'DateTime' },
        'ownedFrom': { '@type': 'DateTime' },
        'ownedThrough': { '@type': 'DateTime' },
        'paymentDue': { '@type': 'DateTime' },
        'paymentUrl': { '@type': '@id' },
        'pickupTime': { '@type': 'DateTime' },
        'prescribingInfo': { '@type': '@id' },
        'previousStartDate': { '@type': 'Date' },
        'priceValidUntil': { '@type': 'Date' },
        'publishingPrinciples': { '@type': '@id' },
        'relatedLink': { '@type': '@id' },
        'releaseDate': { '@type': 'Date' },
        'releaseNotes': { '@type': '@id' },
        'replyToUrl': { '@type': '@id' },
        'requirements': { '@type': '@id' },
        'roleName': { '@type': '@id' },
        'sameAs': { '@type': '@id' },
        'scheduledPaymentDate': { '@type': 'Date' },
        'scheduledTime': { '@type': 'DateTime' },
        'screenshot': { '@type': '@id' },
        'serviceUrl': { '@type': '@id' },
        'significantLink': { '@type': '@id' },
        'significantLinks': { '@type': '@id' },
        'sport': { '@type': '@id' },
        'startDate': { '@type': 'Date' },
        'startTime': { '@type': 'DateTime' },
        'storageRequirements': { '@type': '@id' },
        'surface': { '@type': '@id' },
        'targetUrl': { '@type': '@id' },
        'temporal': { '@type': 'DateTime' },
        'thumbnailUrl': { '@type': '@id' },
        'ticketToken': { '@type': '@id' },
        'trackingUrl': { '@type': '@id' },
        'uploadDate': { '@type': 'Date' },
        'url': { '@type': '@id' },
        'validFrom': { '@type': 'DateTime' },
        'validThrough': { '@type': 'DateTime' },
        'validUntil': { '@type': 'Date' },
        'warning': { '@type': '@id' },
        'webCheckinTime': { '@type': 'DateTime' }
    }
  };

  angular
    .module('angularJsonld.schema.org', ['angularJsonld'])
    .config(config);

  /* @ngInject */
  function config(jsonldProvider, jsonldContextProvider){
    jsonldProvider.registerContext('http://schema.org', context);
    jsonldContextProvider.add({
      'schema': 'http://schema.org/'
    });
  }

})();
