## Restify Model
A model adapter that builds routes and handles CRUD operations (Create, Read, Update and Delete). Works with Restify or Express.js.

### Installation
```bash
npm install restify-model
```

### Example Usage
```javascript
var restify = require('restify');
var server = restify.createServer();
var Model = require('restify-model')(server);

// GET, POST to /people
// GET, PUT, DELETE to /people/:id
var Person = Model.extend({
  path: '/people',
  defaults: {
    name: 'Arthur',
    occupation: 'King'
  }
});


Person.add({ name: 'Tim', occupation: 'Enchanter', id: 1 });
Person.add({ name: 'Roger', occupation: 'Shrubber', id: 2 });

server.listen(3000);
```

### Using a Persistence Adapter
```javascript
var MyModel = Model.extend({
  unique_key: 'id',
  adapter: function() {
    var self = this;

    return {
      read: function(list) {
        // Get All records
        list([]);
      },
      create: function(model) {
        // A new model was created
        console.log('Created', model.id());
      },
      update: function(model) {
        // Model was updated
        console.log('Updated', model.id());
      },
      remove: function(model) {
        // Model was deleted
        console.log('Removed', model.id());
      }
    }
  },
});

var Enchanter = MyModel.extend({
  defaults: {
    occupation: 'Enchanter'
  }
});

var tim = new Enchanter({
  id: 1
});

tim.save();
// => Created 1
```

### Nested Routes
```javascript
// GET, POST to /people/:person_id/occupations
// GET, PUT, DELETE to /people/:person_id/occupations/:id
var Occupation = Person.nest('/occupations', {
  defaults: {
    role: 'Peasant'
  }
});
```

### CRUD Operations
`GET` `/people`
```javascript
[
  {
    "name": "Tim",
    "occupation": "Enchanter",
    "id": 1
  },
  {
    "name": "Roger",
    "occupation": "Shrubber",
    "id": 2
  }
]
```
`GET` `/people/1`
```javascript
{
  "name": "Tim",
  "occupation": "Enchanter",
  "id": 1
}
```
`POST` `{ name: 'Brave Sir Robin', occupation: 'Knight' }` `/people`
```javascript
{
  "name": "Brave Sir Robin",
  "occupation": "Knight",
  "id": 3
}
```
`GET` `/people`
```javascript
[
  {
    "name": "Tim",
    "occupation": "Enchanter",
    "id": 1
  },
  {
    "name": "Roger",
    "occupation": "Shrubber",
    "id": 2
  },
  {
    "name": "Brave Sir Robin",
    "occupation": "Knight"
  }
]
```
`PUT` `{ name: 'Brave Sir Robin', occupation: 'Knight of the Round Table' }` `/people/3`
```javascript
{
  "name": "Brave Sir Robin",
  "occupation": "Knight of the Round Table",
  "id": 3
}
```

### Sample Database Adapter
This is an example of a simple database adapter. Any database ORM can be used here (Postgres, MySQL, MongoDB, etc.). Pseudo coding MongoDB as an example.

```javascript
var db = require('db').connect();

var DBModel = Model.extend({
  unique_key: '_id',
  adapter: function() {
    var self = this;
    var schema = this.schema;

    if (!schema) {
      return false;
    }

    return {
      read: function(cb) {
        schema.getAll(function(err, docs) {
          cb(docs.toObject());
        });
      },
      create: function(model) {
        schema.create(model.attributes, function(err, row) {
          model.attr('id', row._inserted_id);
        });
      },
      update: function(model) {
        schema.update(model.id(), model.changes);
      },
      remove: function(model) {
        schema.remove(model.id());
      }
    }
  },
});

var Person = DBModel.extend({
  schema: db.Person,
  path: '/people',
  defaults: {
    name: 'Old Man from Scene 24',
    occupation: 'Peasant'
  }
});

var tim = new Person({ name: 'Tim', occupation: 'Enchanter' });

tim.save();
// => Created 54b9e08ed983b41d432473e4
// POST /people { name: 'Roger', occupation: 'Shrubber' }
// => Created 54bcacb4c812ec812382b6b2
// GET /people
// => [{
//      "name": "Tim",
//      "occupation": "Enchanter",
//      "_id": "54b9e08ed983b41d432473e4"
//    }, {
//      "name": "Roger",
//      "occupation": "Shrubber",
//      "_id": "54bcacb4c812ec812382b6b2"
//    }]

```
