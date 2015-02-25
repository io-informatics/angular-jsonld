/* global jsonld */
(function(jsonld) {
  'use strict';
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
