function timeOfDayGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Greeting({ firstName }: { firstName: string }) {
  const greeting = timeOfDayGreeting(new Date().getHours());
  return (
    <h1 className="text-3xl text-foreground">
      <span className="font-serif-italic">{greeting},</span>{" "}
      <span className="font-bold">{firstName}</span>
    </h1>
  );
}
