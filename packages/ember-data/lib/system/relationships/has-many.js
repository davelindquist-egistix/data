/**
  @module ember-data
*/

import computedPolyfill from "ember-new-computed";
import Model from "ember-data/system/model";
import normalizeModelName from "ember-data/system/normalize-model-name";

/**
  `DS.hasMany` is used to define One-To-Many and Many-To-Many
  relationships on a [DS.Model](/api/data/classes/DS.Model.html).

  `DS.hasMany` takes an optional hash as a second parameter, currently
  supported options are:

  - `async`: A boolean value used to explicitly declare this to be an async relationship.
  - `inverse`: A string used to identify the inverse property on a related model.

  #### One-To-Many
  To declare a one-to-many relationship between two models, use
  `DS.belongsTo` in combination with `DS.hasMany`, like this:

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    comments: DS.hasMany('comment')
  });
  ```

  ```app/models/comment.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    post: DS.belongsTo('post')
  });
  ```

  #### Many-To-Many
  To declare a many-to-many relationship between two models, use
  `DS.hasMany`:

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    tags: DS.hasMany('tag')
  });
  ```

  ```app/models/tag.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    posts: DS.hasMany('post')
  });
  ```

  You can avoid passing a string as the first parameter. In that case Ember Data
  will infer the type from the singularized key name.

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    tags: DS.hasMany()
  });
  ```

  will lookup for a Tag type.

  #### Explicit Inverses

  Ember Data will do its best to discover which relationships map to
  one another. In the one-to-many code above, for example, Ember Data
  can figure out that changing the `comments` relationship should update
  the `post` relationship on the inverse because post is the only
  relationship to that model.

  However, sometimes you may have multiple `belongsTo`/`hasManys` for the
  same type. You can specify which property on the related model is
  the inverse using `DS.hasMany`'s `inverse` option:

  ```app/models/comment.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    onePost: DS.belongsTo('post'),
    twoPost: DS.belongsTo('post'),
    redPost: DS.belongsTo('post'),
    bluePost: DS.belongsTo('post')
  });
  ```

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    comments: DS.hasMany('comment', {
      inverse: 'redPost'
    })
  });
  ```

  You can also specify an inverse on a `belongsTo`, which works how
  you'd expect.

  @namespace
  @method hasMany
  @for DS
  @param {String} type (optional) type of the relationship
  @param {Object} options (optional) a hash of options
  @return {Ember.computed} relationship
*/
function hasMany(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  }

  Ember.assert("The first argument to DS.hasMany must be a string representing a model type key, not an instance of " + Ember.inspect(type) + ". E.g., to define a relation to the Comment model, use DS.hasMany('comment')", typeof type === 'string' || typeof type === 'undefined');

  options = options || {};

  var shouldWarnAsync = false;
  if (typeof options.async === 'undefined') {
    shouldWarnAsync = true;
  }

  if (typeof type === 'string') {
    type = normalizeModelName(type);
  }

  // Metadata about relationships is stored on the meta of
  // the relationship. This is used for introspection and
  // serialization. Note that `key` is populated lazily
  // the first time the CP is called.
  var meta = {
    type: type,
    isRelationship: true,
    options: options,
    kind: 'hasMany',
    key: null,
    shouldWarnAsync: shouldWarnAsync
  };

  return computedPolyfill({
    get: function(key) {
      if (meta.shouldWarnAsync) {
        Ember.deprecate(`In Ember Data 2.0, relationships will be asynchronous by default. You must set \`${key}: DS.hasMany('${type}', { async: false })\` if you wish for a relationship remain synchronous.`, false, {
          id: 'ds.model.relationship-changing-to-asynchrounous-by-default',
          until: '2.0.0'
        });
        meta.shouldWarnAsync = false;
      }
      var relationship = this._internalModel._relationships.get(key);
      return relationship.getRecords();
    },
    set: function(key, records) {
      var relationship = this._internalModel._relationships.get(key);
      relationship.clear();
      Ember.assert("You must pass an array of records to set a hasMany relationship", Ember.isArray(records));
      relationship.addRecords(Ember.A(records).mapBy('_internalModel'));
      return relationship.getRecords();
    }
  }).meta(meta);
}

Model.reopen({
  notifyHasManyAdded: function(key) {
    //We need to notifyPropertyChange in the adding case because we need to make sure
    //we fetch the newly added record in case it is unloaded
    //TODO(Igor): Consider whether we could do this only if the record state is unloaded

    //Goes away once hasMany is double promisified
    this.notifyPropertyChange(key);
  }
});


export default hasMany;