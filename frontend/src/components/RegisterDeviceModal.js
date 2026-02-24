import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { devicesAPI, animalsAPI } from "../services/api";
import toast from "react-hot-toast";

const RegisterDeviceModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [animalsLoading, setAnimalsLoading] = useState(false);
  const [animals, setAnimals] = useState([]);

  const [formData, setFormData] = useState({
    device_id: "",
    imei: "",
    animal: "",              // REQUIRED by backend
    phone_number: "+263",    // REQUIRED by backend (non-blank)
  });

  useEffect(() => {
    if (!isOpen) return;

    const loadAnimals = async () => {
      setAnimalsLoading(true);
      try {
        const res = await animalsAPI.list(); // must exist in services/api
        // DRF pagination: res.data.results
        const items = res?.data?.results ?? res?.data ?? [];
        const valid = items.filter(a => typeof a.id === "string" && a.id.trim().length > 0);
        setAnimals(valid);

        if (valid.length === 0) {
          toast.error("No animals with valid IDs found. Backend must fix Animal IDs.");
        }
      } catch (err) {
        console.error("Failed to load animals", err);
        toast.error("Failed to load animals list");
      } finally {
        setAnimalsLoading(false);
      }
    };

    loadAnimals();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.animal || !formData.animal.trim()) {
      toast.error("Please select an animal");
      return;
    }
    if (!formData.phone_number || !formData.phone_number.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setLoading(true);
    try {
      await devicesAPI.create(formData);
      toast.success("Tracker registered successfully!");
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error("Registration failed:", error);
      const serverMsg =
        error?.response?.data?.message ||
        JSON.stringify(error?.response?.data || {});
      toast.error(serverMsg || "Failed to register tracker");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div className="card" style={{ width: "420px", maxWidth: "90%", margin: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ margin: 0 }}>Register New Tracker</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              Device ID *
            </label>
            <input
              type="text"
              name="device_id"
              required
              className="form-input"
              placeholder="e.g., TRK-001"
              value={formData.device_id}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              IMEI *
            </label>
            <input
              type="text"
              name="imei"
              required
              className="form-input"
              placeholder="15-digit IMEI"
              value={formData.imei}
              onChange={handleChange}
            />
            <small className="text-muted">
              Backend model currently requires IMEI (unique)
            </small>
          </div>

          <div className="mb-3">
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              Assign to Animal *
            </label>
            <select
              name="animal"
              required
              className="form-input"
              value={formData.animal}
              onChange={handleChange}
              disabled={animalsLoading}
            >
              <option value="">
                {animalsLoading ? "Loading animals..." : "Select an animal"}
              </option>
              {animals.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.category}, {a.breed}) — ID: {a.id}
                </option>
              ))}
            </select>
            <small className="text-muted">
              Uses Animal.id from /api/tracking/animals/
            </small>
          </div>

          <div className="mb-3">
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              Phone Number *
            </label>
            <input
              type="text"
              name="phone_number"
              required
              className="form-input"
              placeholder="+2637..."
              value={formData.phone_number}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? <div className="spinner" /> : "Register Tracker"}
          </button>
        </form>

        {(!animalsLoading && animals.length === 0) && (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <b>Backend issue:</b> No animals with valid IDs were returned. Fix Animal.id generation/serialization.
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterDeviceModal;
