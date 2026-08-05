// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ThreadTone",
    platforms: [
        .macOS(.v13),
    ],
    products: [
        .executable(name: "ThreadTone", targets: ["ThreadTone"]),
    ],
    targets: [
        .executableTarget(
            name: "ThreadTone",
            path: "Sources/ThreadTone"
        ),
    ]
)
