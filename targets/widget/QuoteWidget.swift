import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Shared constants (keep in sync with lib/widgetSync.ts and lib/widgetQuotes.ts)

private let appGroup = "group.com.mahlv.biblewise"
private let quotesKey = "widgetQuotes"
private let offsetKey = "widgetQuoteOffset"
private let bibleURL = URL(string: "biblewise://bible")!

private let slotLength: TimeInterval = 12 * 3600
private let firstSlotHour: TimeInterval = 6 * 3600

// MARK: - Model

struct Quote: Codable, Hashable {
  let id: String
  let text: String
  let author: String
  let type: String
}

/// Shown until the app has synced the quotes (first launch) or if decoding fails.
private let fallbackQuote = Quote(
  id: "0",
  text: "O Senhor é meu pastor, nada me faltará.",
  author: "Salmos 23:1",
  type: "bible"
)

private func loadQuotes() -> [Quote] {
  guard
    let data = UserDefaults(suiteName: appGroup)?.data(forKey: quotesKey),
    let quotes = try? JSONDecoder().decode([Quote].self, from: data),
    !quotes.isEmpty
  else { return [fallbackQuote] }
  return quotes
}

// MARK: - Rotation (same formula as getSlotNumber in lib/widgetQuotes.ts)

/// 12h slot number; slots start at 06:00 and 18:00 local time.
private func slotNumber(for date: Date) -> Int {
  let local = date.timeIntervalSince1970 + Double(TimeZone.current.secondsFromGMT(for: date))
  return Int(floor((local - firstSlotHour) / slotLength))
}

/// Start of the slot after the one containing `date` (06:00 or 18:00 local time).
private func nextSlotStart(after date: Date) -> Date {
  let nextSlot = slotNumber(for: date) + 1
  let local = Double(nextSlot) * slotLength + firstSlotHour
  // Convert the local wall-clock value back to an absolute date.
  let approx = Date(timeIntervalSince1970: local - Double(TimeZone.current.secondsFromGMT(for: date)))
  return Date(timeIntervalSince1970: local - Double(TimeZone.current.secondsFromGMT(for: approx)))
}

private func quote(in quotes: [Quote], slot: Int, offset: Int) -> Quote {
  let count = quotes.count
  return quotes[(((slot + offset) % count) + count) % count]
}

/// Manual "next quote" steps for the slot; they expire when the slot changes.
private func manualOffset(slot: Int) -> Int {
  let defaults = UserDefaults(suiteName: appGroup)
  guard let stored = defaults?.dictionary(forKey: offsetKey),
        stored["slot"] as? Int == slot,
        let offset = stored["offset"] as? Int
  else { return 0 }
  return offset
}

// MARK: - Refresh button (iOS 17+)

struct NextQuoteIntent: AppIntent {
  static var title: LocalizedStringResource = "Próxima frase"

  func perform() async throws -> some IntentResult {
    let defaults = UserDefaults(suiteName: appGroup)
    let slot = slotNumber(for: Date())
    defaults?.set(["slot": slot, "offset": manualOffset(slot: slot) + 1], forKey: offsetKey)
    return .result()
  }
}

// MARK: - Timeline

struct QuoteEntry: TimelineEntry {
  let date: Date
  let quote: Quote
}

struct QuoteProvider: TimelineProvider {
  func placeholder(in context: Context) -> QuoteEntry {
    QuoteEntry(date: Date(), quote: fallbackQuote)
  }

  func getSnapshot(in context: Context, completion: @escaping (QuoteEntry) -> Void) {
    completion(currentEntry())
  }

  /// One entry now plus the next few scheduled rotations; the system reloads at the end of the last one.
  func getTimeline(in context: Context, completion: @escaping (Timeline<QuoteEntry>) -> Void) {
    let quotes = loadQuotes()
    let now = Date()
    var entries = [QuoteEntry(date: now, quote: quote(in: quotes, slot: slotNumber(for: now), offset: manualOffset(slot: slotNumber(for: now))))]

    var start = nextSlotStart(after: now)
    for _ in 0..<4 {
      entries.append(QuoteEntry(date: start, quote: quote(in: quotes, slot: slotNumber(for: start), offset: 0)))
      start = nextSlotStart(after: start)
    }
    completion(Timeline(entries: entries, policy: .after(start)))
  }

  private func currentEntry() -> QuoteEntry {
    let now = Date()
    let slot = slotNumber(for: now)
    return QuoteEntry(date: now, quote: quote(in: loadQuotes(), slot: slot, offset: manualOffset(slot: slot)))
  }
}

// MARK: - Views

struct QuoteWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: QuoteEntry

  private var quoteFont: Font {
    switch family {
    case .systemSmall: return .system(size: 15, design: .serif).italic()
    case .systemMedium: return .system(size: 18, design: .serif).italic()
    default: return .system(size: 24, design: .serif).italic()
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("“\(entry.quote.text)”")
        .font(quoteFont)
        .foregroundColor(Color("quoteText"))
        .minimumScaleFactor(0.7)
        .lineLimit(family == .systemLarge ? 9 : (family == .systemMedium ? 4 : 7))

      Spacer(minLength: 0)

      HStack(spacing: 8) {
        Text(entry.quote.author)
          .font(.system(size: family == .systemSmall ? 11 : 12, weight: .semibold))
          .foregroundColor(Color("authorText"))
          .lineLimit(1)

        Spacer(minLength: 0)

        if family != .systemSmall {
          if family == .systemLarge {
            Button(intent: NextQuoteIntent()) {
              Image(systemName: "arrow.clockwise")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color("brand"))
                .frame(width: 36, height: 36)
                .background(Circle().fill(Color.white.opacity(0.85)))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Próxima frase")
          }

          Link(destination: bibleURL) {
            Image(systemName: "book.fill")
              .font(.system(size: 15, weight: .semibold))
              .foregroundColor(.white)
              .frame(width: 36, height: 36)
              .background(Circle().fill(Color("brand")))
          }
          .accessibilityLabel("Abrir a Bíblia")
        }
      }
    }
    .padding(family == .systemSmall ? 12 : 16)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .containerBackground(
      LinearGradient(
        colors: [Color("cardTop"), Color("cardBottom")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      ),
      for: .widget
    )
  }
}

// MARK: - Widget

struct QuoteWidget: Widget {
  let kind = "BiblewiseQuote"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: QuoteProvider()) { entry in
      QuoteWidgetView(entry: entry)
    }
    .configurationDisplayName("Biblewise")
    .description("Versículos e frases inspiradoras, atualizados duas vezes ao dia.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
