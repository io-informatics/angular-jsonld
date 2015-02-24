'use strict';

describe('Module angularJsonld', function() {

  var jsonld;
  var JsonldRest;

  // load the service's module
  beforeEach(module('angularJsonld', function($provide){
    $provide.value('$log',console);
  }));

  beforeEach(inject(function($injector) {
    jsonld = $injector.get('jsonld');
    JsonldRest = $injector.get('JsonldRest');
  }));

  it('should provide jsonld.js library', function(){
    expect(jsonld).toBeDefined();
  });

  it('should provide the jsonldRest service', function(){
    expect(JsonldRest).toBeDefined();
  });

});
