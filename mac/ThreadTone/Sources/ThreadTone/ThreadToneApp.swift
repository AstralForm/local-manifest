import SwiftUI
import AppKit

@main
struct ThreadToneApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        MenuBarExtra("ThreadTone", systemImage: "text.bubble") {
            ContentView()
                .environmentObject(store)
                .frame(width: 380, height: 520)
        }
        .menuBarExtraStyle(.window)

        Settings {
            SettingsView()
                .environmentObject(store)
                .frame(width: 420, height: 280)
        }
    }
}
