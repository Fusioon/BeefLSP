namespace BeefLsp;

using System;
using System.Collections;

enum LogLevel {
	case Debug, Info, Warning, Error;

	public ConsoleColor ConsoleColor {
		get {
			switch (this) {
				case .Debug:	return .DarkGray;
				case .Info:		return .White;
				case .Warning:	return .Yellow;
				case .Error:	return .Red;
				}
		}
	};

	public StringView DisplayString {
		get {
			switch (this) {
			case .Debug:	return "DEBUG";
			case .Info:		return "INFO";
			case .Warning:	return "WARNING";
			case .Error:	return "ERROR";
			}
		}
	}

}

struct Message : this(LogLevel level, StringView text) {}

interface ILogger {
	void Log(Message message);
}

static class Log {
	private static List<ILogger> LOGGERS = new .() ~ DeleteContainerAndItems!(_);

	public static LogLevel MIN_LEVEL =
#if DEBUG
		.Debug;
#else
		.Info;
#endif

	public static void AddLogger(ILogger logger) {
		LOGGERS.Add(logger);
	}

	[Comptime]
	static int GetLogLevelDisplayStringMaxLength()
	{
		int max = 0;
		for (let v in Enum.GetValues<LogLevel>())
			max = Math.Max(v.DisplayString.Length, max);
		return max;
	}
	public const int LOG_LEVEL_MAX_LENGTH = GetLogLevelDisplayStringMaxLength();

	public static void Debug(StringView fmt, params Object[] args) => Log(.Debug, fmt, params args);
	public static void Info(StringView fmt, params Object[] args) => Log(.Info, fmt, params args);
	public static void Warning(StringView fmt, params Object[] args) => Log(.Warning, fmt, params args);
	public static void Error(StringView fmt, params Object[] args) => Log(.Error, fmt, params args);

	public static void Log(LogLevel level, StringView fmt, params Object[] args) {
		// Check minimum log level
		if (MIN_LEVEL > level) return;

		// Header
		String msg = scope .(128);
		let levelDisplayString = level.DisplayString;

		msg.Append('[');
		msg.Append(levelDisplayString);
		msg.Append(']');
		// Pad the string
		msg.Append(' ', (LOG_LEVEL_MAX_LENGTH - levelDisplayString.Length));

		DateTime time = .Now;
		msg.AppendF("[{:D2}:{:D2}:{:D2}] ", time.Hour, time.Minute, time.Second);

		// Text
		msg.AppendF(fmt, params args);

		// Log
		for (let logger in LOGGERS) logger.Log(.(level, msg));
	}
}