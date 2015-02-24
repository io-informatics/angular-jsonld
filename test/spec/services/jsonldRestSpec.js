'use strict';

describe('jsonldRest', function() {

  var $httpBackend;
  var $timeout;
  var $rootScope;
  var JsonldRest;

  var sampleHydraCollection = {
    '@context': 'http://www.w3.org/ns/hydra/context.jsonld',
    '@type': 'hydra:PagedCollection',
    'member': [],
    'firstPage': 'http://example.org/collection?page=0'
  };

  // load the service's module
  beforeEach(module('angularJsonld', function($provide){
    $provide.value('$log',console);
  }));
  beforeEach(module('angularJsonld.hydraCore', function($provide){
    $provide.value('$log',console);
  }));

  beforeEach(inject(function($injector) {
    $httpBackend = $injector.get('$httpBackend');
    $timeout = $injector.get('$timeout');
    $rootScope = $injector.get('$rootScope');
    JsonldRest = $injector.get('JsonldRest');
  }));

  afterEach(function(){
    $timeout(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });
  });

  it('should compact and provide extended context', function(done){
    $httpBackend.expectGET('/collection').respond(sampleHydraCollection, {'Content-Type': 'application/ld+json'});
    JsonldRest.collection('collection').get().then(function(data){
      expect(data['hydra:firstPage']['@id']).toEqual('http://example.org/collection?page=0');
    }).
    catch(function(err){
      throw(err);
    }).
    finally(done);

    $rootScope.$apply();
    $httpBackend.flush();
  });

  it('should make links navigatables', function(done){
    $httpBackend.expectGET('/collection').respond(sampleHydraCollection, {'Content-Type': 'application/ld+json'});
    $httpBackend.whenGET('http://example.org/collection?page=0').respond({});
    JsonldRest.collection('collection').get().then(function(data){
      data['hydra:firstPage'].get();
    }).
    catch(function(err){
      throw(err);
    }).
    finally(function(){
      done();
    });
    $rootScope.$apply();
    $httpBackend.flush();
  });

  it('should support local context', function(done){
    $httpBackend.expectGET('/collection').respond(sampleHydraCollection, {'Content-Type': 'application/ld+json'});
    JsonldRest.collection('collection').withContext({'fp': 'hydra:firstPage'}).get().then(function(data){
      expect(data.fp['@id']).toEqual('http://example.org/collection?page=0');
      expect(data.fp.get).toBeDefined();
    }).
    catch(function(err){
      throw(err);
    }).
    finally(done);

    $rootScope.$apply();
    $httpBackend.flush();
  });
});
