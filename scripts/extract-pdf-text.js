/* eslint-disable no-undef, no-unused-vars */
ObjC.import('Foundation')
ObjC.import('PDFKit')

function run(argv) {
  const filePath = argv[0]
  const outputPath = argv[1]

  if (!filePath || !outputPath) {
    throw new Error('Missing PDF path or output path')
  }

  const url = $.NSURL.fileURLWithPath(filePath)
  const document = $.PDFDocument.alloc.initWithURL(url)

  if (!document) {
    return ''
  }

  const text = ObjC.unwrap(document.string)
  const output = text ?? ''
  $(output).writeToFileAtomicallyEncodingError(
    outputPath,
    true,
    $.NSUTF8StringEncoding,
    null,
  )
  return output
}
