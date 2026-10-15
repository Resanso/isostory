// Lift the subject out of a photo with Apple Vision (macOS 14+, no model download):
//   cutout <in.jpg|png> <out.png> [--bw] [--crop]
// Writes an RGBA PNG with only the foreground (people, objects, animals). --bw makes it greyscale with a
// little contrast (the "B/W cutout on a white board" look); --crop trims the transparent margin.
import Foundation
import Vision
import CoreImage
import ImageIO

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: cutout <in> <out.png> [--bw] [--crop]"); exit(1) }
let bw = args.contains("--bw"), crop = args.contains("--crop")
guard var img = CIImage(contentsOf: URL(fileURLWithPath: args[1]), options: [.applyOrientationProperty: true]) else { print("cannot read \(args[1])"); exit(1) }
img = img.transformed(by: CGAffineTransform(translationX: -img.extent.minX, y: -img.extent.minY))
let ctx = CIContext()
let handler = VNImageRequestHandler(ciImage: img, options: [:])
let req = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([req])
guard let obs = req.results?.first, !obs.allInstances.isEmpty else { print("no foreground subject found"); exit(2) }
// every instance Vision found, scaled to the image
let maskBuf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
let mask = CIImage(cvPixelBuffer: maskBuf)
var src = img
if bw {
  src = src.applyingFilter("CIColorControls", parameters: [kCIInputSaturationKey: 0, kCIInputContrastKey: 1.12, kCIInputBrightnessKey: 0.02])
}
var out = src.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: CIImage(color: .clear).cropped(to: img.extent), kCIInputMaskImageKey: mask])
if crop {
  // bounding box of the mask (alpha > 0) from a small CPU pass
  let w = CVPixelBufferGetWidth(maskBuf), h = CVPixelBufferGetHeight(maskBuf)
  CVPixelBufferLockBaseAddress(maskBuf, .readOnly)
  let base = CVPixelBufferGetBaseAddress(maskBuf)!, row = CVPixelBufferGetBytesPerRow(maskBuf)
  let fmt = CVPixelBufferGetPixelFormatType(maskBuf)
  var minX = w, minY = h, maxX = 0, maxY = 0
  for y in 0..<h { for x in 0..<w {
    let v: Float = fmt == kCVPixelFormatType_OneComponent32Float ? base.load(fromByteOffset: y * row + x * 4, as: Float.self) : Float(base.load(fromByteOffset: y * row + x, as: UInt8.self)) / 255
    if v > 0.05 { minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) }
  } }
  CVPixelBufferUnlockBaseAddress(maskBuf, .readOnly)
  if maxX > minX {
    let sx = img.extent.width / CGFloat(w), sy = img.extent.height / CGFloat(h)
    // CoreImage's origin is bottom-left
    let r = CGRect(x: CGFloat(minX) * sx, y: img.extent.height - CGFloat(maxY + 1) * sy, width: CGFloat(maxX - minX + 1) * sx, height: CGFloat(maxY - minY + 1) * sy).insetBy(dx: -8, dy: -8).intersection(img.extent)
    out = out.cropped(to: r).transformed(by: CGAffineTransform(translationX: -r.minX, y: -r.minY))
  }
}
try ctx.writePNGRepresentation(of: out, to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print("\(args[2]) \(Int(out.extent.width))x\(Int(out.extent.height)) instances \(obs.allInstances.count)")
