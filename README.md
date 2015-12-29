## Restify Model
A model adapter that also handles CRUD (Create, Read, Update and Delete) operations. Works with Restify or Express.js.

### Usage
```javascript
var restify = require('restify'),
    server = restify.createServer(),
    Model = require('restify-model')(server);

server.use(restify.bodyParser());
server.use(restify.queryParser());

var User = Model.extend({
    path: '/users',
    defaults: {
        name: 'Guest',
        occupation: 'Unemployed'
    }
});

User.add({ name: 'Tim', occupation: 'Enchanter' });
User.add({ name: 'Roger', occupation: 'Shrubber' });

server.listen(3000, function(){
    console.log('Server started...');
});
```
An HTTP `GET` to `/users` would respond with
```javascript
[
  {
    "name": "Tim",
    "occupation": "Enchanter"
  },
  {
    "name": "Roger",
    "occupation": "Shrubber"
  }
]
```

#### Using a Persistence Adapter
```javascript
var MyModel = Model.extend({
    unique_key: 'id',
    adapter: function(){
        var self = this;

        return {
            read: function(list){
                // Get All records
                list([]);
            },
            create: function(model){
                // A new model was created
                console.log('Created', model.id());
            },
            update: function(model){
                // Model was updated
                console.log('Updated', model.id());
            },
            remove: function(model){
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

var tim = new Enchanter({ id: 1 });

tim.save();
// => Created 1
```
