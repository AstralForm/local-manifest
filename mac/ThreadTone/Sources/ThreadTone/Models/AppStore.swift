import Foundation
import AppKit
import Combine

@MainActor
final class AppStore: ObservableObject {
    @Published var draft: String = ""
    @Published var threadPaste: String = ""
    @Published var analysisSummary: String = ""
    @Published var primaryTone: String = ""
    @Published var topics: [String] = []
    @Published var rewritten: String = ""
    @Published var engine: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var apiBaseURL: String
    @Published var apiToken: String

    private let defaults = UserDefaults.standard

    init() {
        apiBaseURL = defaults.string(forKey: "apiBaseURL") ?? "http://127.0.0.1:8787"
        apiToken = defaults.string(forKey: "apiToken") ?? ""
    }

    func saveSettings() {
        defaults.set(apiBaseURL, forKey: "apiBaseURL")
        defaults.set(apiToken, forKey: "apiToken")
    }

    func rewrite() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        let messages = threadPaste
            .split(separator: "\n", omittingEmptySubsequences: false)
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        do {
            let client = LocalAPIClient(baseURL: apiBaseURL, token: apiToken)
            let response = try await client.rewrite(draft: draft, messages: messages)
            analysisSummary = response.analysis.summary
            primaryTone = response.analysis.primaryTone
            topics = response.analysis.topics
            rewritten = response.rewrite.text
            engine = response.rewrite.engine
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func copyRewritten() {
        guard !rewritten.isEmpty else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(rewritten, forType: .string)
    }
}
