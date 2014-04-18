
module.exports = function(grunt) {

  'use strict';

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      options: {
        jshintrc: '.jshintrc',
      },
      all: [
        'Gruntfile.js',
        'lib/{,*/}*.js',
        'bin/{,*/}*.js',
        'examples/{,*/}*.js'
      ]
    }

  });

  grunt.registerTask('default', ['jshint']);

};
