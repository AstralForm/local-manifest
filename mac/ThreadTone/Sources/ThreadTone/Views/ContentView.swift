import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("ThreadTone")
                .font(.system(size: 22, weight: .semibold, design: .serif))
                .foregroundStyle(Color(red: 0.11, green: 0.26, blue: 0.20))

            Text("Paste thread context, write your draft, rewrite to match tone & topic.")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            labeledField("Thread messages (one per line)") {
                TextEditor(text: $store.threadPaste)
                    .font(.system(size: 12, design: .monospaced))
                    .frame(minHeight: 90)
                    .padding(6)
                    .background(fieldBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            labeledField("Your draft") {
                TextEditor(text: $store.draft)
                    .font(.system(size: 13))
                    .frame(minHeight: 70)
                    .padding(6)
                    .background(fieldBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            HStack {
                Button {
                    Task { await store.rewrite() }
                } label: {
                    if store.isLoading {
                        ProgressView()
                            .controlSize(.small)
                            .padding(.horizontal, 8)
                    } else {
                        Text("Rewrite")
                            .fontWeight(.semibold)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Color(red: 0.11, green: 0.26, blue: 0.20))
                .disabled(store.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.isLoading)

                if !store.rewritten.isEmpty {
                    Button("Copy") { store.copyRewritten() }
                }
                Spacer()
            }

            if let error = store.errorMessage {
                Text(error)
                    .font(.system(size: 11))
                    .foregroundStyle(.red)
            }

            if !store.analysisSummary.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text(store.analysisSummary)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                    if !store.topics.isEmpty {
                        Text(store.topics.joined(separator: " · "))
                            .font(.system(size: 11, weight: .medium))
                    }
                }
            }

            if !store.rewritten.isEmpty {
                labeledField("Rewritten\(store.engine.isEmpty ? "" : " (\(store.engine))")") {
                    TextEditor(text: $store.rewritten)
                        .font(.system(size: 13))
                        .frame(minHeight: 80)
                        .padding(6)
                        .background(Color(red: 0.93, green: 0.96, blue: 0.94))
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.97, blue: 0.95),
                    Color(red: 0.88, green: 0.93, blue: 0.90),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    private var fieldBackground: some View {
        Color.white.opacity(0.85)
    }

    @ViewBuilder
    private func labeledField<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color(red: 0.20, green: 0.35, blue: 0.28))
            content()
        }
    }
}
