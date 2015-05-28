# angular-jsonld [![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/io-informatics/angular-jsonld?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
This angular module facilitates the integration of [JSON-LD](http://json-ld.org) server APIs in AngularJS clients. It is implemented on top of [Restagular](https://github.com/mgonto/restangular). Its purpose is to provide an adapter layer to map client's data model to the server's API model by using the semantics embedded in JSON-LD as the contract interface. Another important
functionality of *angular-jsonld* is to enable easy navigation of JSON-LD hyperlinks in client's code. We further explain the meaning of these two feature bellow.


## Mapping local objects to JSON-LD representations
As mentioned before one of the intend of this library is that you can semantically map your local (JS) objects to the representations obtained from the server. For example let's say your server provides you with the following representation:

```json
{
  "@context": "http://schema.org/",
  "@type": "Person",
  "name": "Jane Doe",
  "jobTitle": "Professor",
  "telephone": "(425) 123-4567",
  "url": "http://www.janedoe.com"
}
```
On one side we could consume this JSONLD representation as you would with any other JSON representation (i.e at the syntactic level). For instance:

```javascript
$http.get('http://example.org/person/1').success(function(res){
  console.log('Hello ',res.name);
});
```

The code above assumes a specific syntactic representation of the response, but if you do such thing why bother with JSONLD, right? In fact, your server could send you the following JSONLD representation instead:
```json
{
  "@context": {},
  "@type": "http://schema.org/Person",
  "http://schema.org/name": "Jane Doe",
  "http://schema.org/jobTitle": "Professor",
  "http://schema.org/telephone": "(425) 123-4567",
  "http://schema.org/url": "http://www.janedoe.com"
}
```
or...
```json
{
  "@context": {
      "schema": "http://schema.org/"
  },
  "@type": "schema:Person",
  "schema:name": "Jane Doe",
  "schema:jobTitle": "Professor",
  "schema:telephone": "(425) 123-4567",
  "schema:url": "http://www.janedoe.com"
}
```

Even thought these are syntactically different they both means exactly the same as the JSONLD representation of the first example. However, your client code will break as it will not find a property "name" in the object parsed from the server response.

*Here is where angular-jsonld comes handy!*

Instead of working at the syntactic level you can bind a "local context" to the semantic representation provided by the server. Let see the angular-jsonld code:

```javascript
var app = angular.module('app', ['angularJsonld']);

app.controller('HelloCtrl', function(JsonldRest){

  /* Confiigure the API baseUrl */
  JsonldRest.setBaseUrl('http://example.org');

  /* A handler to a server collection of persons with a local context interpretation */
  var people = JsonldRest.collection('/person').withContext({
    "schema": "http://schema.org/",
    "fullName": "schema:name" /* My client calls 'fullName' the http://schema.org/name property*/ property */
  });

  /* We retrieve the person http://example.org/person/1 */
  people.one('1').get().then(function(res){
    console.log("Hello ", res.fullName);
  });

})
```

Now, as you can see we decoupled from the syntactic representation and just map our own data model (i.e. fullName) to the semantic property http://schema.org/name. No matter which of the the three different representations showed above we get from the server, our client will always work. Furthermore, if the server changes (semantically) or we connect to a different API it is easy to adapt our client by just changing the local context. Actually you can provide a local context which is global to the entire application such that a refactor like such is even easier. For instance:

```javascript
var app = angular.module('app', ['angularJsonld']);

app.config(function(jsonldContextProvider){
  /* If we need to change the semantics of 'fullName' we just do it here for the entire application */
  jsonldContextProvider.add({
    "schema": "http://schema.org/",
    "fullName": "schema:name" /* My client calls 'fullName' the http://schema.org/name property*/
  });
});

app.controller('HelloCtrl', function(JsonldRest){

  /* Confiigure the API baseUrl */
  JsonldRest.setBaseUrl('http://example.org');

  /* A handler to a server collection of persons with a local context interpretation */
  var people = JsonldRest.collection('/person');

  /* We retrieve the person http://example.org/person/1 */
  people.one('1').get().then(function(res){
    console.log("Hello ", res.fullName);
  });

})
```

## Link dereferencing
JSONLD is about [Linked Data](http://linkeddata.org), and linked data is mostly about *Linking* :bowtie:. If you are using JSONLD in your API is probably because you are building [Hypermedia REST API](http://www.blueprintforge.com/blog/2012/01/01/a-short-explanation-of-hypermedia-controls-in-restful-services/) and you expect clients to easily follow links in your JSONLD representations. For instance let's say we add a list of friends links to the Person representation from the examples of the previous section:

```json
{
  "@context": ["http://schema.org/", {
      "foaf": "http://xmlns.com/foaf/0.1/",
      "knows": {
        "@id": "foaf:knows",
        "@type": "@id"
      }
    }],
  "@type": "Person",
  "name": "Jane Doe",
  "jobTitle": "Professor",
  "telephone": "(425) 123-4567",
  "url": "http://www.janedoe.com",
  "knows": [ "http://example.org/2", "http://example.org/3"]
}
```
You can easily navigate these links with angular-jsonld. Let's look at the code:

```javascript
var app = angular.module('app', ['angularJsonld']);

app.config(function(jsonldContextProvider){
  /* If we need to change the semantics of 'fullName' we just do it here for the entire application */
  jsonldContextProvider.add({
    "schema": "http://schema.org/",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "fullName": "schema:name" /* My client calls 'fullName' the http://schema.org/name property */
    "friends": "foaf:knows" /* My client calls 'friends' the http://xmlns.com/foaf/0.1/knows property */
  });
});

app.controller('HelloCtrl', function(JsonldRest){

  /* Confiigure the API baseUrl */
  JsonldRest.setBaseUrl('http://example.org');

  /* A handler to a server collection of persons with a local context interpretation */
  var people = JsonldRest.collection('/person');

  /* We retrieve the person http://example.org/person/1 */
  people.one('1').get().then(function(res){
    console.log(res.fullName+' is friend with: ');
    res.friends.forEach(function(friendLink){
      /* Navigate to the friend resource */
      friendLink.get().then(function(friend){
        console.log(friend.fullName);
      });
    });
  });

})
```
