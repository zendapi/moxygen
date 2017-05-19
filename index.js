/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/
'use strict';

var path = require('path');
var util = require('util');

var doxyparser = require('./src/parser');
var templates = require('./src/templates');
var helpers = require('./src/helpers');

module.exports = {

  /**
   * Default options values.
   **/
  defaultOptions: {

    directory: null,            /** Location of the doxygen files **/
    output: 'api.md',           /** Output file **/
    groups: false,              /** Output doxygen groups separately **/
    noindex: false,             /** Disable generation of the index. Does not work with `groups` option **/
    anchors: true,              /** Generate anchors for internal links **/
    language: 'cpp',            /** Programming language **/
    templates: 'templates',     /** Templates directory **/

    filters: {
      members: [
        'define',
        'enum',
        // 'enumvalue',
        'func',
        // 'variable',
        'public-attrib',
        'public-func',
        'protected-attrib',
        'protected-func'
      ],
      compounds: [
        'namespace',
        'class',
        'struct',
        'union',
        'typedef',
        // 'file'
      ]
    }
  },

  /**
   * Parse files and render the output.
   **/
  run: function (options) {

    // Sanitize options
    if (options.groups == options.output.indexOf('%s') === -1)
      throw "The `output` file parameter must contain an '%s' for group name " +
        "substitution when `groups` are enabled."

    if (options.templates == this.defaultOptions.templates)
      options.templates = path.join(__dirname, 'templates', options.language);

    // Load templates
    templates.registerHelpers(options);
    templates.load(options.templates);

    // Parse files
    doxyparser.loadIndex(options, function (err, root) {
      if (err)
        throw err;

      // Output groups
      if (options.groups) {
        var groups = root.toArray('compounds', 'group');
        if (!groups.length)
          throw "You have enabled `groups` output, but no groups were " +
            "located in your doxygen XML files."

        groups.forEach(function (group) {
          group.filterChildren(options.filters, group.id);

          var compounds = group.toFilteredArray('compounds');
          compounds.unshift(group); // insert group at top
          var contents = templates.renderArray(compounds);
          helpers.writeFile(util.format(options.output, group.name), contents);
        });
      }

      // Output single file
      else {
        root.filterChildren(options.filters);

        var compounds = root.toFilteredArray('compounds');
        if (!options.noindex)
          compounds.unshift(root); // insert root at top if index is enabled
        var contents = templates.renderArray(compounds);
        helpers.writeFile(options.output, contents);
      }
    });
  }
}
