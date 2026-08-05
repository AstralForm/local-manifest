import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        Form {
            Section("Local ThreadTone API") {
                TextField("Base URL", text: $store.apiBaseURL)
                SecureField("Bearer token (optional)", text: $store.apiToken)
                Text("Start the Slack app with ENABLE_LOCAL_API=true so the menu bar app can call /v1/rewrite.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Button("Save") {
                store.saveSettings()
            }
        }
        .padding()
    }
}
