"use client";

import { useEffect, useState } from "react";

type TimelineEvent = {
  id: number;
  title: string;
  date: string;
  category: string;
  description: string;
};

export default function Home() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    const savedEvents = localStorage.getItem("chronolabs-events");
    if (savedEvents) setEvents(JSON.parse(savedEvents));
  }, []);

  useEffect(() => {
    localStorage.setItem("chronolabs-events", JSON.stringify(events));
  }, [events]);

  const resetForm = () => {
    setTitle("");
    setDate("");
    setCategory("General");
    setDescription("");
    setEditingId(null);
  };

  const saveEvent = () => {
    if (!title || !date || !description) {
      alert("Please complete all fields.");
      return;
    }

    if (editingId) {
      setEvents(
        events.map((event) =>
          event.id === editingId
            ? { ...event, title, date, category, description }
            : event
        )
      );
      resetForm();
      return;
    }

    const newEvent: TimelineEvent = {
      id: Date.now(),
      title,
      date,
      category,
      description,
    };

    setEvents([newEvent, ...events]);
    resetForm();
  };

  const editEvent = (event: TimelineEvent) => {
    setTitle(event.title);
    setDate(event.date);
    setCategory(event.category);
    setDescription(event.description);
    setEditingId(event.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEvent = (id: number) => {
    setEvents(events.filter((event) => event.id !== id));
  };

  const clearTimeline = () => {
    if (confirm("Are you sure you want to clear the entire timeline?")) {
      setEvents([]);
      resetForm();
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold mb-2">ChronoLabs</h1>

        <p className="text-gray-400 mb-10">
          AI-Powered Evidence & Timeline Organizer
        </p>

        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 mb-10">
          <h2 className="text-2xl font-semibold mb-6">
            {editingId ? "Edit Timeline Event" : "Add Timeline Event"}
          </h2>

          <div className="grid gap-4">
            <input
              type="text"
              placeholder="Event Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-3"
            />

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-3"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-3"
            >
              <option>General</option>
              <option>Legal</option>
              <option>Employment</option>
              <option>Safety</option>
              <option>Insurance</option>
              <option>Personal</option>
            </select>

            <textarea
              placeholder="Describe the event or evidence..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 min-h-[120px]"
            />

            <div className="flex gap-3">
              <button
                onClick={saveEvent}
                className="bg-white text-black font-semibold rounded-xl py-3 px-6 hover:bg-gray-300 transition"
              >
                {editingId ? "Save Changes" : "Add Event"}
              </button>

              {editingId && (
                <button
                  onClick={resetForm}
                  className="border border-zinc-600 text-gray-300 font-semibold rounded-xl py-3 px-6 hover:bg-zinc-800 transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold">
            Timeline ({events.length})
          </h2>

          {events.length > 0 && (
            <button
              onClick={clearTimeline}
              className="border border-red-500 text-red-400 px-4 py-2 rounded-xl hover:bg-red-950 transition"
            >
              Clear Timeline
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="text-gray-500">No timeline events added yet.</div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-2xl font-bold">{event.title}</h3>

                  <span className="text-sm bg-zinc-700 px-3 py-1 rounded-full">
                    {event.category}
                  </span>
                </div>

                <p className="text-gray-400 mb-4">{event.date}</p>

                <p className="text-gray-200 mb-6">{event.description}</p>

                <div className="flex gap-4">
                  <button
                    onClick={() => editEvent(event)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Edit Event
                  </button>

                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Delete Event
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}