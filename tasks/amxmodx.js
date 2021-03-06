/*
 * grunt-amxmodx
 * https://github.com/ertrzyiks/grunt-amxmodx
 *
 * Copyright (c) 2014 Mateusz Derks
 * Licensed under the MIT license.
 */

'use strict';

var async = require("async"),
    path = require("path"),
    mkdirp = require("mkdirp"),
    fs = require("fs"),
    clc = require("cli-color"),
    install = require("../scripts/install.js"),
    config = require("../config/config.js"),
    amxxpc = require("./lib/amxxpc.js");

module.exports = function (grunt) {
    grunt.registerMultiTask('amxmodx', 'AMX mod X compiler task', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            versions: [ config.getDefaultVersion() ],
            output: "tmp/",
            includePath: null
        });
    
        var cb = this.async();
        var files = this.files;
        
        grunt.log.writeln('Processing task...', options.versions);

        var calls = options.versions.map(function (version) {
            return function (next) {
            
                grunt.log.writeln("===================================");
                grunt.log.writeln('Compile using version ' + clc.yellow.underline(version));
                grunt.log.writeln("===================================");
                              
                function run(err)
                {
                    if (err)
                    {
                        throw err;
                    }
                    
                    // Iterate over all specified file groups.
                    async.each(files, compileFiles(version, options), next);
                }
                
                if (!install.isInstalled(version))
                {
                    install.installVersion(version, run);
                }
                else
                {
                    run();
                }
            };
        });
    
        async.series(calls, cb);
    });
  
    function compileFiles(version, options)
    {
        var outputDir = options.output,
            includePath = options.includePath;
            
        return function (f, done) {
            var src = f.src.filter(function (filepath) {
                if (!grunt.file.exists(filepath))
                {
                    throw new Error('Source file ' + clc.green(filepath) + ' not found.');
                }
                return true;
            });
        
            async.each(src, function (filepath, next) {
                grunt.log.writeln(clc.green(filepath));
                
                var outputPath = path.join(outputDir, "amxmodx-" + version),
                    outputAbsolutePath = path.resolve(outputPath),
                    filename = path.basename(filepath, path.extname(filepath)),
                    output = outputAbsolutePath + "/" + filename + ".amxx";
                
                mkdirp.sync(outputAbsolutePath);
                
                var args = [  "-o" + output  ];
                
                if (includePath)
                {
                    args.push("-i" + path.resolve(includePath));
                }
                    
                amxxpc.compile(filepath, { version: version, args: args }, function (err) {
                    console.log("Output:", output);
                    console.log("-------------------------------");
                     
                    onCompile(err, next);
                });
            }, function (err) {
                done(err);
            });
        };
    
    }
  
    function onCompile(errors, cb)
    {
        if (errors.length)
        {
            errors.forEach(function (err) {
                if (err instanceof amxxpc.CompilationWarning)
                {
                    grunt.log.warning(err);
                }
                else
                {
                    grunt.fail.fatal(err);
                }
            });
            
            cb(errors);
        }
        else
        {
            cb();
        }
    }

};
