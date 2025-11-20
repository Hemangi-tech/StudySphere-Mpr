import React, { useState } from "react";
import { supabaseNotes } from "../lib/supabase_notes";

const UploadNoteForm = ({ onUploadSuccess }) => {
  const [uploadedBy, setUploadedBy] = useState("");  // Name or Enrollment No
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [semester, setSemester] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadedBy || !file || !subject) {
      setError("Please enter your name/enrollment, subject, and select a file.");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const fileExt = file.name.split(".").pop();
      const fileName = file.name;       // original file name
      const fileSize = file.size;       // bytes
      const uniqueFileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${semester || "General"}/${subject}/${uniqueFileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabaseNotes.storage
        .from("notes")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabaseNotes.storage
        .from("notes")
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // Insert into SQL table
      const { data: newNote, error: dbError } = await supabaseNotes
        .from("notes")
        .insert([
          {
            uploaded_by: uploadedBy,
            title: title || fileName,
            subject,
            semester: semester || null,
            file_name: fileName,
            file_size: fileSize,
            file_path: filePath,
            public_url: publicUrl,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Reset form
      setUploadedBy("");
      setTitle("");
      setSubject("");
      setSemester("");
      setFile(null);

      // Callback to update notes list
      if (onUploadSuccess) onUploadSuccess(newNote);

      alert("File uploaded successfully!");
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4">Upload Notes</h2>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <form onSubmit={handleUpload} className="space-y-4">

        <input
          type="text"
          placeholder="Enrollment No"
          className="w-full border p-2 rounded"
          value={uploadedBy}
          onChange={(e) => setUploadedBy(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Title (optional)"
          className="w-full border p-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="text"
          placeholder="Subject"
          className="w-full border p-2 rounded"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Semester (optional)"
          className="w-full border p-2 rounded"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        />

        <input
          type="file"
          className="w-full border p-2 rounded"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />

        <button
          type="submit"
          disabled={uploading}
          className={`w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 ${
            uploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
};

export default UploadNoteForm;
