"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { supabase } from "../lib/supabase";

type EvidenceAttachment = {
  name: string;
  path: string;
  type: string;
  size: number;
  signedUrl?: string;
};

type TimelineEvent = {
  id: number;
  created_at?: string;
  title: string;
  event_date: string;
  category: string;
  description: string;
  attachments: EvidenceAttachment[];
};

export default function Home() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<EvidenceAttachment[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [summary, setSummary] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("evidence-files")
      .createSignedUrl(path, 60 * 60);

    if (error) {
      console.error("Signed URL error:", error.message);
      return undefined;
    }

    return data.signedUrl;
  };

  const normalizeAttachments = async (rawAttachments: any[]) => {
    if (!rawAttachments) return [];

    const normalized = await Promise.all(
      rawAttachments.map(async (item) => {
        if (typeof item === "string") {
          return {
            name: item,
            path: "",
            type: "unknown",
            size: 0,
            signedUrl: undefined,
          };
        }

        const signedUrl = item.path ? await getSignedUrl(item.path) : undefined;

        return {
          name: item.name || "Unnamed file",
          path: item.path || "",
          type: item.type || "unknown",
          size: item.size || 0,
          signedUrl,
        };
      })
    );

    return normalized;
  };

  const fetchEvents = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error.message);
      alert("Could not load events from Supabase.");
    } else {
      const eventsWithSignedUrls = await Promise.all(
        (data || []).map(async (event) => ({
          ...event,
          attachments: await normalizeAttachments(event.attachments || []),
        }))
      );

      setEvents(eventsWithSignedUrls);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setEventDate("");
    setCategory("General");
    setDescription("");
    setAttachments([]);
    setSelectedFiles([]);
    setEditingId(null);
  };

  const handleAttachmentChange = (files: FileList | null) => {
    if (!files) return;
    setSelectedFiles(Array.from(files));
  };

  const uploadSelectedFiles = async () => {
  if (selectedFiles.length === 0) return [];

  setUploading(true);

  try {
    const uploadedAttachments: EvidenceAttachment[] = [];

    for (const file of selectedFiles) {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const filePath = `${Date.now()}-${safeFileName}`;

      const { error } = await supabase.storage
        .from("evidence-files")
        .upload(filePath, file);

      if (error) {
        console.error("File upload error:", error.message);
        alert(`Could not upload file: ${file.name}. ${error.message}`);
        continue;
      }

      const signedUrl = await getSignedUrl(filePath);

      uploadedAttachments.push({
        name: file.name,
        path: filePath,
        type: file.type || "unknown",
        size: file.size,
        signedUrl,
      });
    }

    return uploadedAttachments;
  } finally {
    setUploading(false);
  }
};

  const saveEvent = async () => {
    if (!title || !eventDate || !description) {
      alert("Please complete all required fields.");
      return;
    }

    const newUploadedAttachments = await uploadSelectedFiles();
    const finalAttachments = [...attachments, ...newUploadedAttachments];

    if (editingId) {
      const { error } = await supabase
        .from("events")
        .update({
          title,
          event_date: eventDate,
          category,
          description,
          attachments: finalAttachments.map(({ signedUrl, ...rest }) => rest),
        })
        .eq("id", editingId);

      if (error) {
        console.error("Error updating event:", error.message);
        alert("Could not update event.");
        return;
      }

      await fetchEvents();
      resetForm();
      return;
    }

    const { error } = await supabase.from("events").insert([
      {
        title,
        event_date: eventDate,
        category,
        description,
        attachments: finalAttachments.map(({ signedUrl, ...rest }) => rest),
      },
    ]);

    if (error) {
      console.error("Error saving event:", error.message);
      alert("Could not save event to Supabase.");
      return;
    }

    await fetchEvents();
    resetForm();
  };

  const editEvent = (event: TimelineEvent) => {
    setTitle(event.title);
    setEventDate(event.event_date);
    setCategory(event.category);
    setDescription(event.description);
    setAttachments(event.attachments || []);
    setSelectedFiles([]);
    setEditingId(event.id);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteEvent = async (id: number) => {
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      console.error("Error deleting event:", error.message);
      alert("Could not delete event.");
      return;
    }

    await fetchEvents();
  };

  const clearTimeline = async () => {
    if (!confirm("Are you sure you want to clear the entire timeline?")) return;

    const { error } = await supabase.from("events").delete().neq("id", 0);

    if (error) {
      console.error("Error clearing timeline:", error.message);
      alert("Could not clear timeline.");
      return;
    }

    setSummary("");
    resetForm();
    await fetchEvents();
  };

  const filteredEvents = events.filter((event) => {
    const attachmentText = (event.attachments || [])
      .map((file) => file.name)
      .join(" ");

    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.event_date.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attachmentText.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "All" || event.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const generateSummary = () => {
    if (events.length === 0) {
      alert("Add at least one event before generating a summary.");
      return;
    }

    const sortedEvents = [...events].sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

    const categoryCounts = events.reduce<Record<string, number>>(
      (acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      },
      {}
    );

    const categorySummary = Object.entries(categoryCounts)
      .map(
        ([cat, count]) =>
          `- ${cat}: ${count} event${count > 1 ? "s" : ""}`
      )
      .join("\n");

    const timelineNarrative = sortedEvents
      .map((event, index) => {
        const attachmentLine =
          event.attachments && event.attachments.length > 0
            ? `\n   Attachments: ${event.attachments
                .map((file) => file.name)
                .join(", ")}`
            : "\n   Attachments: None listed";

        return `${index + 1}. On ${event.event_date}, "${event.title}" was recorded under ${event.category}. ${event.description}${attachmentLine}`;
      })
      .join("\n\n");

    const generatedSummary = `CHRONOLABS TIMELINE SUMMARY

Total Events: ${events.length}

CATEGORY BREAKDOWN:
${categorySummary}

CHRONOLOGICAL NARRATIVE:
${timelineNarrative}

MISSING INFORMATION CHECKLIST:
- Are all dates accurate?
- Are supporting documents preserved?
- Are screenshots and evidence saved?
- Are involved parties identified?
- Are follow-up actions documented?
- Are attachment file names clear and easy to identify?

NOTE:
This summary is an organizational aid only. It does not provide legal advice, medical advice, or professional conclusions.`;

    setSummary(generatedSummary);
  };

  const copySummary = async () => {
    if (!summary) return;

    await navigator.clipboard.writeText(summary);
    alert("Summary copied to clipboard.");
  };

  const downloadPDF = () => {
    if (!summary) {
      alert("Generate a summary first.");
      return;
    }

    const doc = new jsPDF();
    const lines = doc.splitTextToSize(summary, 180);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(lines, 10, 10);
    doc.save("chronolabs-summary.pdf");
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
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
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

            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
              <label className="block text-sm text-gray-300 mb-2">
                Attach Evidence Files
              </label>

              <input
                type="file"
                multiple
                onChange={(e) => handleAttachmentChange(e.target.files)}
                className="block w-full text-sm text-gray-300"
              />

              {selectedFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">
                    Selected files to upload:
                  </p>

                  <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                    {selectedFiles.map((file) => (
                      <li key={file.name}>
                        {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">
                    Existing attachments:
                  </p>

                  <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                    {attachments.map((file) => (
                      <li key={file.path || file.name}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-3">
                Files are uploaded to private Supabase Storage. Links are
                temporary signed links.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveEvent}
                disabled={uploading}
                className="bg-white text-black font-semibold rounded-xl py-3 px-6 hover:bg-gray-300 transition disabled:opacity-50"
              >
                {uploading
                  ? "Uploading..."
                  : editingId
                  ? "Save Changes"
                  : "Add Event"}
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

        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Search & Filter</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search title, description, date, or attachment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-3"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-3"
            >
              <option>All</option>
              <option>General</option>
              <option>Legal</option>
              <option>Employment</option>
              <option>Safety</option>
              <option>Insurance</option>
              <option>Personal</option>
            </select>
          </div>

          <p className="text-gray-400 mt-4">
            Showing {filteredEvents.length} of {events.length} events.
          </p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold">
            Timeline ({filteredEvents.length})
          </h2>

          <div className="flex gap-3 flex-wrap justify-end">
            {events.length > 0 && (
              <button
                onClick={generateSummary}
                className="border border-blue-500 text-blue-400 px-4 py-2 rounded-xl hover:bg-blue-950 transition"
              >
                Generate Summary
              </button>
            )}

            {summary && (
              <>
                <button
                  onClick={copySummary}
                  className="border border-green-500 text-green-400 px-4 py-2 rounded-xl hover:bg-green-950 transition"
                >
                  Copy Summary
                </button>

                <button
                  onClick={downloadPDF}
                  className="border border-yellow-500 text-yellow-400 px-4 py-2 rounded-xl hover:bg-yellow-950 transition"
                >
                  Download PDF
                </button>
              </>
            )}

            {events.length > 0 && (
              <button
                onClick={clearTimeline}
                className="border border-red-500 text-red-400 px-4 py-2 rounded-xl hover:bg-red-950 transition"
              >
                Clear Timeline
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading events from Supabase...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-gray-500">No matching timeline events found.</div>
        ) : (
          <div className="space-y-6 mb-10">
            {filteredEvents.map((event) => (
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

                <p className="text-gray-400 mb-4">{event.event_date}</p>

                <p className="text-gray-200 mb-6">{event.description}</p>

                {event.attachments && event.attachments.length > 0 && (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 mb-6">
                    <p className="text-sm font-semibold text-gray-300 mb-3">
                      Attachments
                    </p>

                      {event.attachments.map((file: any, index: number) => (
                        <div key={index} className="mt-2">
                          <a
                          href={file.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 underline"
                          >
                            {file.name}
                            </a>
                            </div>
                      ))}
                      </div>
                )}

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

        {summary && (
          <div className="bg-zinc-900 border border-green-700 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold text-green-400 mb-4">
              Generated Summary
            </h2>

            <pre className="whitespace-pre-wrap text-gray-200 text-sm leading-6">
              {summary}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
