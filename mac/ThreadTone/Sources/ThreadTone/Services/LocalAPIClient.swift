import Foundation

struct RewriteResponse: Decodable {
    let ok: Bool
    let analysis: AnalysisDTO
    let rewrite: RewriteDTO
}

struct AnalysisDTO: Decodable {
    let summary: String
    let primaryTone: String
    let topics: [String]

    enum CodingKeys: String, CodingKey {
        case summary
        case primaryTone
        case topics
    }
}

struct RewriteDTO: Decodable {
    let text: String
    let engine: String
}

enum LocalAPIError: LocalizedError {
    case invalidURL
    case badStatus(Int)
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid API URL"
        case .badStatus(let code): return "API error (\(code))"
        case .server(let message): return message
        }
    }
}

struct LocalAPIClient {
    let baseURL: String
    let token: String

    func rewrite(draft: String, messages: [String]) async throws -> RewriteResponse {
        guard let url = URL(string: baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/v1/rewrite") else {
            throw LocalAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "draft": draft,
            "messages": messages,
        ])

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let err = obj["error"] as? String {
                throw LocalAPIError.server(err)
            }
            throw LocalAPIError.badStatus(status)
        }
        return try JSONDecoder().decode(RewriteResponse.self, from: data)
    }
}
