namespace BeefLsp;

using System;

class ConsoleLogger : ILogger {
	public void Log(Message message) {
		Console.ForegroundColor = message.level.ConsoleColor;
		Console.WriteLine(message.text);
	}
}