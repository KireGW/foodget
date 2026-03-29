import AppKit
import ImageIO
import Foundation
import PDFKit
import Vision

struct OCRExtractor {
  static func run() throws {
    let arguments = CommandLine.arguments

    guard arguments.count >= 3 else {
      throw NSError(domain: "FoodgetOCR", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "Missing PDF path or output path",
      ])
    }

    let inputPath = arguments[1]
    let outputPath = arguments[2]
    let inputURL = URL(fileURLWithPath: inputPath)
    let output = try extractText(from: inputURL)
    try output.write(toFile: outputPath, atomically: true, encoding: .utf8)
  }

  private static func extractText(from inputURL: URL) throws -> String {
    let fileType = inputURL.pathExtension.lowercased()

    if fileType == "pdf" {
      guard let document = PDFDocument(url: inputURL) else {
        return ""
      }

      var allText: [String] = []

      for pageIndex in 0..<document.pageCount {
        guard let page = document.page(at: pageIndex) else {
          continue
        }

        if let pageText = page.string?.trimmingCharacters(in: .whitespacesAndNewlines),
           !pageText.isEmpty {
          allText.append(pageText)
          continue
        }

        if let renderedImage = render(page: page),
           let ocrText = recognizeText(in: renderedImage),
           !ocrText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
          allText.append(ocrText)
        }
      }

      return allText.joined(separator: "\n")
    }

    guard let image = loadImage(at: inputURL),
          let ocrText = recognizeText(in: image) else {
      return ""
    }

    return ocrText
  }

  private static func render(page: PDFPage) -> CGImage? {
    let bounds = page.bounds(for: .mediaBox)
    let scale: CGFloat = 2.5
    let width = max(Int(bounds.width * scale), 1)
    let height = max(Int(bounds.height * scale), 1)

    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
          let context = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
          ) else {
      return nil
    }

    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.saveGState()
    context.scaleBy(x: scale, y: scale)
    context.translateBy(x: 0, y: bounds.height)
    context.scaleBy(x: 1, y: -1)
    page.draw(with: .mediaBox, to: context)
    context.restoreGState()

    return context.makeImage()
  }

  private static func recognizeText(in image: CGImage) -> String? {
    let orientations: [CGImagePropertyOrientation] = [.up, .right, .down, .left]
    var bestText = ""
    var bestScore = Int.min

    for orientation in orientations {
      guard let candidateText = recognizeText(in: image, orientation: orientation) else {
        continue
      }

      let score = scoreRecognizedText(candidateText)
      if score > bestScore {
        bestScore = score
        bestText = candidateText
      }
    }

    return bestText.isEmpty ? nil : bestText
  }

  private static func loadImage(at inputURL: URL) -> CGImage? {
    guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil) else {
      return nil
    }

    return CGImageSourceCreateImageAtIndex(source, 0, nil)
  }

  private static func recognizeText(
    in image: CGImage,
    orientation: CGImagePropertyOrientation
  ) -> String? {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.recognitionLanguages = ["es-MX", "es-ES", "en-US"]

    let handler = VNImageRequestHandler(cgImage: image, orientation: orientation, options: [:])

    do {
      try handler.perform([request])
      let observations = request.results ?? []
      let lines = observations.compactMap { observation in
        observation.topCandidates(1).first?.string
      }
      return lines.joined(separator: "\n")
    } catch {
      return nil
    }
  }

  private static func scoreRecognizedText(_ text: String) -> Int {
    let uppercaseText = text.uppercased()
    let keywordHits = [
      "TOTAL",
      "CITY MARKET",
      "LA COMER",
      "ARTICULOS",
      "TICKET",
      "CAJA",
      "PZA",
      "AHORRO",
      "SUBTOTAL",
    ].reduce(0) { partialResult, keyword in
      partialResult + (uppercaseText.contains(keyword) ? 12 : 0)
    }

    let digitCount = text.filter(\.isNumber).count
    let currencyLikeCount = uppercaseText.components(separatedBy: "$").count - 1
    let lineCount = text.split(separator: "\n").count

    return keywordHits + digitCount + (currencyLikeCount * 6) + lineCount
  }
}

do {
  try OCRExtractor.run()
} catch {
  fputs("\(error.localizedDescription)\n", stderr)
  exit(1)
}
