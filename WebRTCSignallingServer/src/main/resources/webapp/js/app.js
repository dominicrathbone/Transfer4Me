var TodoRouter = Backbone.Router.extend({
    /* define the route and function maps for this router */
    routes: { 
        
    }
});

var roomUrl = Backbone.Model.extend({
  defaults: {
    roomUrl: Math.floor((Math.random() * 100) + 1)
  }
});
