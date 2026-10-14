// Person cutouts with Apple Vision: seg <in_dir> <out_dir>; writes RGBA PNG (person only) per input PNG
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers
let args = CommandLine.arguments
let inDir = URL(fileURLWithPath: args[1]), outDir = URL(fileURLWithPath: args[2])
let ctx = CIContext()
let files = try FileManager.default.contentsOfDirectory(at: inDir, includingPropertiesForKeys: nil).filter { $0.pathExtension == "png" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
let req = VNGeneratePersonSegmentationRequest()
req.qualityLevel = .accurate
req.outputPixelFormat = kCVPixelFormatType_OneComponent8
let t0 = Date()
for f in files {
  guard let img = CIImage(contentsOf: f) else { continue }
  let h = VNImageRequestHandler(ciImage: img, options: [:])
  try h.perform([req])
  guard let mask = req.results?.first?.pixelBuffer else { continue }
  var m = CIImage(cvPixelBuffer: mask)
  m = m.transformed(by: CGAffineTransform(scaleX: img.extent.width / m.extent.width, y: img.extent.height / m.extent.height))
  let clear = CIImage(color: .clear).cropped(to: img.extent)
  let out = img.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: clear, kCIInputMaskImageKey: m])
  let dest = outDir.appendingPathComponent(f.lastPathComponent)
  try ctx.writePNGRepresentation(of: out, to: dest, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
}
print("frames \(files.count) secs \(Date().timeIntervalSince(t0))")
