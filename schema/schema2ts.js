const j2t = require('json-schema-to-typescript')
const fs = require('fs')
// compile from file
j2t.compileFromFile('dxf.json').then(ts => fs.writeFileSync('dxf.d.ts', ts))
