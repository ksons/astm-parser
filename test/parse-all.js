const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const glob = require('glob');
const ASTMParser = require('../dist/index.js').ASTMParser

glob('**/*.dxf', {nocase: true}, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }
  const jobs = files.map(file => {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(path.join(process.cwd(), file), {encoding: 'utf8'});
      const parser = new ASTMParser();

      parser.parseStream(fileStream, (err, msg) => {
        if (err) {
            console.error("Here", err)
          return reject({file: file, msg: err});
        }
        console.log('Parsed', file)
        resolve({file: file, diag: msg.diagnostics})
      })

    });
  });
  Promise.all(jobs)
      .then(result => {
          const log = result.reduce((diagMap, curr) => {
            const messages = _.uniq(curr.diag.map( diag => diag.message))
            const file = curr.file
            
            messages.forEach(msg => {
                if(!diagMap.hasOwnProperty(msg)) {
                    diagMap[msg] = []    
                }
                diagMap[msg].push(file)
            })
            return diagMap
          }, {})
          console.log(log)
    })
      .catch(err => {console.error('Error parsing:', err)})
});
