import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Shared constants (keep in sync with lib/widgetSync.ts and lib/widgetQuotes.ts)

private let appGroup = "group.com.mahlv.biblewise"
private let quotesKey = "widgetQuotes"
private let offsetKey = "widgetQuoteOffset"
private let settingsKey = "widgetSettings"
private let bibleURL = URL(string: "biblewise://bible")!
private let settingsURL = URL(string: "biblewise://widget/settings")!

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

// MARK: - Settings (written by lib/widgetSync.ts; colors are absent for the automatic look)

struct WidgetSettings: Codable {
  var enabled: Int?
  var fontDesign: String?
  var fontWeight: String?
  var fontItalic: Int?
  var from: String?
  var to: String?
  var text: String?
  var muted: String?
  var button: String?
  var buttonIcon: String?
  var secondaryButton: String?
  var secondaryIcon: String?

  var isEnabled: Bool { enabled != 0 }
  var hasCustomColors: Bool { from != nil && to != nil }
}

private func loadSettings() -> WidgetSettings {
  guard
    let data = UserDefaults(suiteName: appGroup)?.data(forKey: settingsKey),
    let settings = try? JSONDecoder().decode(WidgetSettings.self, from: data)
  else { return WidgetSettings() }
  return settings
}

extension Color {
  /// Parses "#RRGGBB"; falls back to the given color when malformed or missing.
  init(hex: String?, fallback: Color) {
    guard let hex = hex?.trimmingCharacters(in: CharacterSet(charactersIn: "#")),
          hex.count == 6, let value = UInt32(hex, radix: 16) else {
      self = fallback
      return
    }
    self.init(
      red: Double((value >> 16) & 0xFF) / 255,
      green: Double((value >> 8) & 0xFF) / 255,
      blue: Double(value & 0xFF) / 255
    )
  }
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
  let settings: WidgetSettings
}

struct QuoteProvider: TimelineProvider {
  func placeholder(in context: Context) -> QuoteEntry {
    QuoteEntry(date: Date(), quote: fallbackQuote, settings: WidgetSettings())
  }

  func getSnapshot(in context: Context, completion: @escaping (QuoteEntry) -> Void) {
    completion(currentEntry())
  }

  /// One entry now plus the next few scheduled rotations; the system reloads at the end of the last one.
  func getTimeline(in context: Context, completion: @escaping (Timeline<QuoteEntry>) -> Void) {
    let quotes = loadQuotes()
    let settings = loadSettings()
    let now = Date()
    var entries = [QuoteEntry(date: now, quote: quote(in: quotes, slot: slotNumber(for: now), offset: manualOffset(slot: slotNumber(for: now))), settings: settings)]

    var start = nextSlotStart(after: now)
    for _ in 0..<4 {
      entries.append(QuoteEntry(date: start, quote: quote(in: quotes, slot: slotNumber(for: start), offset: 0), settings: settings))
      start = nextSlotStart(after: start)
    }
    completion(Timeline(entries: entries, policy: .after(start)))
  }

  private func currentEntry() -> QuoteEntry {
    let now = Date()
    let slot = slotNumber(for: now)
    return QuoteEntry(date: now, quote: quote(in: loadQuotes(), slot: slot, offset: manualOffset(slot: slot)), settings: loadSettings())
  }
}

// MARK: - Views

struct QuoteWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: QuoteEntry

  private var settings: WidgetSettings { entry.settings }
  /// Custom background chosen in the app; otherwise the automatic light/dark asset colors.
  private var custom: Bool { settings.hasCustomColors }

  private var textColor: Color { custom ? Color(hex: settings.text, fallback: .primary) : Color("quoteText") }
  private var mutedColor: Color { custom ? Color(hex: settings.muted, fallback: .secondary) : Color("authorText") }
  private var buttonColor: Color { custom ? Color(hex: settings.button, fallback: Color("brand")) : Color("brand") }
  private var buttonIconColor: Color { custom ? Color(hex: settings.buttonIcon, fallback: .white) : .white }
  private var secondaryButtonColor: Color {
    custom ? Color(hex: settings.secondaryButton, fallback: .white) : Color.white.opacity(0.85)
  }
  private var secondaryIconColor: Color {
    custom ? Color(hex: settings.secondaryIcon, fallback: Color("brand")) : Color("brand")
  }

  private var fontDesign: Font.Design { settings.fontDesign == "default" ? .default : .serif }
  private var fontWeight: Font.Weight {
    switch settings.fontWeight {
    case "medium": return .medium
    case "semibold": return .semibold
    case "bold": return .bold
    default: return .regular
    }
  }
  /// Italic serif is the default look (matches the app's "Itálica" font).
  private var isItalic: Bool { settings.fontItalic.map { $0 == 1 } ?? true }

  private var quoteSize: CGFloat {
    switch family {
    case .systemSmall: return 15
    case .systemMedium: return 18
    default: return 24
    }
  }

  private var quoteFont: Font {
    let font = Font.system(size: quoteSize, weight: fontWeight, design: fontDesign)
    return isItalic ? font.italic() : font
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("“\(entry.quote.text)”")
        .font(quoteFont)
        .foregroundColor(textColor)
        .minimumScaleFactor(0.7)
        .lineLimit(family == .systemLarge ? 9 : (family == .systemMedium ? 4 : 7))

      Spacer(minLength: 0)

      HStack(spacing: 8) {
        Text(entry.quote.author)
          .font(.system(size: family == .systemSmall ? 11 : 12, weight: .semibold))
          .foregroundColor(mutedColor)
          .lineLimit(1)

        Spacer(minLength: 0)

        if family != .systemSmall {
          if family == .systemLarge {
            Button(intent: NextQuoteIntent()) {
              Image(systemName: "arrow.clockwise")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(secondaryIconColor)
                .frame(width: 36, height: 36)
                .background(Circle().fill(secondaryButtonColor))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Próxima frase")
          }

          Link(destination: bibleURL) {
            Image(systemName: "book.fill")
              .font(.system(size: 15, weight: .semibold))
              .foregroundColor(buttonIconColor)
              .frame(width: 36, height: 36)
              .background(Circle().fill(buttonColor))
          }
          .accessibilityLabel("Abrir a Bíblia")
        }
      }
    }
    .padding(family == .systemSmall ? 12 : 16)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .containerBackground(
      LinearGradient(
        colors: custom
          ? [Color(hex: settings.from, fallback: Color("cardTop")), Color(hex: settings.to, fallback: Color("cardBottom"))]
          : [Color("cardTop"), Color("cardBottom")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      ),
      for: .widget
    )
  }
}

/// Shown while the widget is turned off in the app; tapping opens the widget settings.
struct PausedWidgetView: View {
  var body: some View {
    VStack(spacing: 4) {
      Text("Widget pausado")
        .font(.system(size: 14, weight: .bold))
        .foregroundColor(Color("quoteText"))
      Text("Toque para ativar")
        .font(.system(size: 12))
        .foregroundColor(Color("authorText"))
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .widgetURL(settingsURL)
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
      if entry.settings.isEnabled {
        QuoteWidgetView(entry: entry)
      } else {
        PausedWidgetView()
      }
    }
    .configurationDisplayName("Biblewise")
    .description("Versículos e frases inspiradoras, atualizados duas vezes ao dia.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
