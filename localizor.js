#!/usr/bin/env node

var xmldoc = require('xmldoc'), 
        fs = require('fs'),
   program = require('commander'), 
     colors = require('colors');

program
  .version('0.0.1')
  .option('-v, --verbose', 'enable verbose logging')
  .usage('<input_file> <output_file> [options]')
  .parse(process.argv);

if(program.args.length != 2) {
  program.help();
}

var inputFilePath = program.args[0];
var outputFilePath = program.args[1];

if (!fs.existsSync(inputFilePath)) {
  console.log("\n  ERROR: input_file not found: '%s'", inputFilePath);
  program.help();
}


var mappings = {};

fs.readFile(inputFilePath, 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }

  var document = new xmldoc.XmlDocument(data);

  document.eachChild(function(child, index, array) {
    if (child.name.toLowerCase() != "file") {
      console.log("skipped unexpected xml elment: '%s'", child.name)
      return;
    }

    var fileName = child.attr["original"]
    var sourceLang = child.attr["source-language"].toLowerCase();
    var targetLang = child.attr["target-language"].toLowerCase();
    if (sourceLang != "en") {
      console.log("unsupported source-language '%s' for file %s", sourceLang, fileName);
      return; // skip this file
    }

    if (mappings['de'] == undefined) {
      try {
         mappings['de'] = require('./languages/' + targetLang + '.json');
      } catch (e) {
        console.warn("unsupported target-language '%s' for file %s", targetLang, fileName);
        return; // skip this file
      }
    }

    var body = child.childNamed("body");
    body.eachChild(function(child, index, array) {
      if (child.name.toLowerCase() == "trans-unit") {
        var note = child.childNamed("note")
        if (note != null) { 
          var isOSXMenuItem = note.val.containsSubstring('Class = "NSMenu";') ||  note.val.containsSubstring('Class = "NSMenuItem";');

          var source = child.childNamed("source").val
          var target = child.childNamed("target");

          if (isOSXMenuItem) {
            var translation = mappings[targetLang][source];
            if (translation == undefined) {
              console.log("no '%s' translation found for key '%s' in file '%s'", targetLang, source, fileName);
            } else {
              console.log("replaced '%s' with '%s' (language:'%s') for key '%s' in file '%s'".green, target.val, translation, targetLang, source, fileName); 
              target.val = translation;
            }
          } else {
            if (program.verbose) { console.log("skipped trans-unit with source '%s' in file '%s'", source, fileName); }
          }
        } else {
          if (program.verbose) { console.log("skipped trans-unit"); }
        }
        
      } else {
        if (program.verbose) { console.log("skipped unexpected xml elment: '%s'", child.name); }
      } 

    })

  });

  console.log();

  fs.writeFile(outputFilePath, document.toString(), function (err) {
    if (err) {
      console.log("Failed to write output file:\n\n\t%s\n".red, err); 
    }
  });

});



String.prototype.containsSubstring = function(substr) {
    return this.indexOf(substr) > -1;
};
