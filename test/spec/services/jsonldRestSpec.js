'use strict';

describe('jsonldRest', function() {

  var $httpBackend;
  var $timeout;
  var $rootScope;
  var JsonldRest;

  var sampleHydraCollection = {
    '@context': 'http://www.w3.org/ns/hydra/context.jsonld',
    '@type': 'hydra:PagedCollection',
    'member': [
        {'@id':'/sites/1','@type':'Site','lang':'es'},
        {'@id':'/sites/2','@type':'Site','lang':'en'}
    ],
    'firstPage': 'http://example.org/collection?page=0',
    '@id': 'http://example.org/thisColId'
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
      //$httpBackend.verifyNoOutstandingExpectation();
      //$httpBackend.verifyNoOutstandingRequest();
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

  it('should return a JsonldRest when call withConfig', function(){
    var client = JsonldRest.withConfig(function(configurator){
      configurator.setRestangularFields({
        selfLink: '@id'
      });
    });
    expect(client.collection).toBeDefined();
  });

  it('should acccess resource', function(done){
    $httpBackend.expectGET('/collection/res').respond(sampleHydraCollection, {'Content-Type': 'application/ld+json'});
    JsonldRest.resource('collection', 'res').get().then(function(data){
      expect(data['@id']).toEqual('http://example.org/thisColId');
    }).
    catch(function(err){
      throw(err);
    }).
    finally(done);

    $httpBackend.flush();
    $rootScope.$apply();
  });

  it('should restangularize fields with type coercion', function(done){
    $httpBackend.expectGET('/collection/res').respond({
      '@context': {
        'p': {'@id': 'http://example/p', '@type': '@id'}
      },
      p: 'http://example.org/a'
    }, {'Content-Type': 'application/ld+json'});

    JsonldRest.resource('collection', 'res').withContext({
      p: 'http://example/p'
    }).get().then(function(data){
      expect(data.p.get).toBeDefined();
    }).
    catch(function(err){
      throw(err);
    }).
    finally(done);
    $rootScope.$apply();
    $httpBackend.flush();

  });

  it('should allow passing query parameters when getting a collection', function(){
    $httpBackend.expectGET('/collection?p1=a').respond({}, {'Content-Type': 'application/ld+json'});
    JsonldRest.collection('collection').get({p1:'a'});

    $rootScope.$apply();
    $httpBackend.flush();
  });

  it('should return resources with modified get', function(done){
    $httpBackend.expectGET('/collection/123').respond(sampleHydraCollection, {'Content-Type': 'application/ld+json'});
    var resource = JsonldRest.resource('collection', '123');
    resource.get().then(function(res){
      expect(res['hydra:firstPage']).toBeDefined();
    }).
    catch(function(err){
      throw(err);
    }).
    finally(done);
    $rootScope.$apply();
    $httpBackend.flush();
  });

  it('getList(member) should return an array of jsonld objects', function(done){
    $httpBackend.expectGET('/collection').respond(sampleHydraCollection, {'Content-Type': 'application/ld+json'});
    var col = JsonldRest.collection('collection');
    col.getList('hydra:member').then(function(res){
      expect(res.length).toBe(2);
      expect(res[0]['@id']).toBe('/sites/1');
      expect(res['hydra:firstPage']).toBeDefined();
    }).
    catch(function(err){
      throw(err);
    }).
    finally(done);
    $rootScope.$apply();
    $httpBackend.flush();
  });

  it('getList(member) should support request arguments', function(done){
    $httpBackend.expectGET('/collection?q=hello').respond(sampleHydraCollection, {'Content-Type': 'application/ld+json'});
    var col = JsonldRest.collection('collection');
    col.getList('hydra:member', {q: 'hello'}).then(function(res){
      expect(res.length).toBe(2);
    }).
    catch(function(err){
      throw(err);
    }).
    finally(done);
    $rootScope.$apply();
    $httpBackend.flush();
  });

});
