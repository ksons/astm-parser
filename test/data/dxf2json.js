const DxfParser = require('dxf-parser')
const forEachInDir = require('foreach-in-dir')
const fs = require('fs')
const path = require('path')
const safename = require('safename')
const renameExtension = require('rename-extension')
const Ajv = require('ajv')
const schema = require('../../schema/dxf.json')

const ajv = new Ajv()
var validate = ajv.compile(schema)

const parser = new DxfParser()
const dir = './dxf'
const outdir = './dxf.json'

forEachInDir(dir, filename => {
  console.log('Opening', filename)
  const fileText = fs.readFileSync(path.join(dir, filename), 'utf-8')
  console.log('Parsing', filename)
  var dxf = parser.parseSync(fileText)
  var valid = validate(dxf)
  if (!valid) {
    console.log(validate.errors)
    process.exit()
  } else {
    save(dxf, filename)
  }
})

function save(dxf, filename) {
  var outName = safename.low(filename)
  outName = renameExtension(outName, '.json')
  outName = path.join(outdir, outName)
  console.log('Writing', outName)
  fs.writeFileSync(outName, JSON.stringify(dxf, null, 3))
  console.log('Done writing output to ', outName)
}
