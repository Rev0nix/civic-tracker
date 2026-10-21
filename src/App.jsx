import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('Geolocation error:', err)
      );
    }
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setIssues(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return alert('Please enable location access to submit an issue.');
    setLoading(true);

    try {
      let photoUrl = null;
      if (file) {
        const filePath = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('issue-photos')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        photoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/issue-photos/${filePath}`;
      }

      const pointLocation = `POINT(${location.lng} ${location.lat})`;

      const { error: insertError } = await supabase.from('issues').insert([
        {
          title,
          description,
          photo_url: photoUrl,
          location: pointLocation,
          category_id: 1,
        },
      ]);

      if (insertError) throw insertError;

      setTitle('');
      setDescription('');
      setFile(null);
      fetchIssues();
      alert('Issue submitted successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Civic Issue Tracker</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
        <input
          type="text"
          placeholder="Issue Title (e.g. Broken Streetlight)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="p-3 border rounded-md w-full bg-white text-gray-800"
          required
        />
        <textarea
          placeholder="Detailed Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="p-3 border rounded-md w-full bg-white text-gray-800 h-24"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="p-2 text-sm text-gray-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition disabled:bg-gray-400"
        >
          {loading ? 'Submitting...' : 'Report Issue'}
        </button>
      </form>

      <hr className="my-8 border-gray-300" />

      <h2 className="text-2xl font-bold mb-4 text-gray-800">Reported Civic Issues</h2>
      <div className="flex flex-col gap-4">
        {issues.map((issue) => (
          <div key={issue.id} className="p-4 border rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
            <p className="text-gray-600 my-2">{issue.description}</p>
            <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2.5 py-0.5 rounded font-medium">
              Status: {issue.status}
            </span>
            {issue.photo_url && (
              <img
                src={issue.photo_url}
                alt="Proof"
                className="w-full h-48 object-cover rounded-md mt-3"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}