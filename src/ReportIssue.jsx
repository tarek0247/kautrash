import React, { useState } from 'react';

export default function ReportIssue() {
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // 1. التقاط إحداثيات الموقع
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          alert("تعذر تحديد الموقع الجغرافي. يرجى تفعيل الـ GPS.");
        }
      );
    }
  };

  // 2. اختيار أو التقاط الصورة
  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      getLocation();
    }
  };

  // 3. إرسال البلاغ
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const reportData = {
      image,
      location,
      description,
      createdAt: new Date().toISOString(),
    };

    console.log("Report Data Submitted:", reportData);

    setTimeout(() => {
      setLoading(false);
      setStatus("تم إرسال البلاغ بنجاح!");
      setImage(null);
      setDescription('');
    }, 1500);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '20px auto', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)' }}>
      <h3 style={{ marginBottom: '15px' }}>الإبلاغ عن حاوية ممتلئة / تالفة</h3>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>صورة الحاوية:</label>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            onChange={handleImageCapture}
            required 
          />
        </div>

        {image && (
          <div style={{ marginBottom: '15px' }}>
            <img src={image} alt="Preview" style={{ width: '100%', borderRadius: '8px' }} />
          </div>
        )}

        {location && (
          <p style={{ color: '#4caf50', fontSize: '14px', marginBottom: '15px' }}>
            📍 تم تحديد الإحداثيات: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>الوصف أو الملاحظات:</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="مثال: الحاوية ممتلئة بالكامل أو تالفة..."
            rows="3"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '12px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? "جاري الإرسال..." : "إرسال البلاغ"}
        </button>
      </form>

      {status && <p style={{ marginTop: '15px', color: '#81c784' }}>{status}</p>}
    </div>
  );
}