## Restify Model
A model/collection adapter that builds routes, handles CRUD operations (Create, Read, Update and Delete), and works with custom database adapters (Postgres, MySQL, MongoDB, etc.).

### Installation
```bash
npm install restify-model
```

### Example Usage
```javascript
var restify = require('restify');
var server = restify.createServer();
var Model = require('restify-model')(server);

var Person = Model.extend({
  // GET, POST to /people
  // GET, PUT, DELETE to /people/:id
  path: '/people',
  defaults: {
    name: 'Arthur',
    occupation: 'King'
  }
});

var tim = new Person({
  name: 'Tim',
  occupation: 'Enchanter',
  id: 1
});

var roger = new Person({
  name: 'Roger',
  occupation: 'Shrubber',
  id: 2
});

Person.add([tim, roger]);

// GET /people
// =>  [{
//       "name": "Tim",
//       "occupation": "Enchanter",
//       "id": 1
//     }, {
//       "name": "Roger",
//       "occupation": "Shrubber",
//       "id": 2
//     }]

server.listen(3000);
```

### Nested Routes & Collection Relationships
```javascript
var Equipment = Model.extend({
  key: Person.relationship('carrying'),
  path: Person.namespace('equipment'),
  defaults: {
    name: 'Sword'
  }
});

Equipment.add({
  name: 'Coconuts',
  id: 1
});

Person.add({
  id: 4,
  name: 'Patsy',
  carrying: Equipment.with(function(model) {
    return model.get('name') === 'Coconuts';
  }).pluck('id')
});

// GET, POST to /people/:person_id/equipment
// GET, PUT, DELETE to /people/:person_id/equipment/:id
```

### CRUD Operations
`GET` `/people`
```javascript
[{
  "name": "Tim",
  "occupation": "Enchanter",
  "id": 1
}, {
  "name": "Roger",
  "occupation": "Shrubber",
  "id": 2
}]
```
`GET` `/people/1`
```javascript
{
  "name": "Tim",
  "occupation": "Enchanter",
  "id": 1
}
```
`POST` `{ name: 'Brave Sir Robin', occupation: 'Knight', id: 3 }` `/people`
```javascript
{
  "name": "Brave Sir Robin",
  "occupation": "Knight",
  "id": 3
}
```
`GET` `/people`
```javascript
[{
  "name": "Tim",
  "occupation": "Enchanter",
  "id": 1
}, {
  "name": "Roger",
  "occupation": "Shrubber",
  "id": 2
}, {
  "name": "Brave Sir Robin",
  "occupation": "Knight",
  "id": 3
}]
```
`PUT` `{ name: 'Brave Sir Robin', occupation: 'Knight of the Round Table' }` `/people/3`
```javascript
{
  "name": "Brave Sir Robin",
  "occupation": "Knight of the Round Table",
  "id": 3
}
```

### Specifying CRUD Operations
```javascript
// CREATE, READ, UPDATE
var CRUModel = Model.extend({
  operations: 'CRU'
});
```

### Using a Database/Persistence Adapter
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
  }
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

### Middleware
Restify Model comes with the following middleware
- `findById` Finds related model, assigns it to `req.model`, calls `next()`
- `detail` Gets `req.model` and sends `model.toJSON()`, ends request
- `list` Gets `req.collection` and sends `collection.toJSON()`, ends request
- `create` Creates a new instance of `req.model` and calls `model.save()`, calls `next()` (`middleware.detail`)
- `update` Updates `req.model` with body and calls `model.save()`, calls `next()` (`middleware.detail`)
- `remove` Removes `req.model`, calls `next()` (`middleware.detail`)

### Customizing middleware

```javascript
var CustomModel = Model.extend({
  middleware: Model.middleware.extend({
    list: function(req, res) {
      res.send(CustomModel.all());
    }
  })
});
```

### Sample Database Adapter
This is an example of a simple database adapter. Any database ORM can be used here (Postgres, MySQL, MongoDB, etc.). Pseudo coding MongoDB as an example.

```javascript
var mongoose = require('mongoose').connect();

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
          model.set('id', row._inserted_id);
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
  schema: mongoose.Person,
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

### Running `colleciton.load()` on every request
```javascript
var Persist = Person.extend({
  middleware: Person.middleware.extend({
    persist: true // Setting persist to true will load() on every request
  })
});
```

### Customizing Routes
```javascript
var Custom = Model.extend({
  path: '/',
  routes: {
    "/foo": function(req, res, next) {
      // Do stuff
    },
    "/bar": function(req, res, next) {
      // Do stuff
    }
  }
});
```
