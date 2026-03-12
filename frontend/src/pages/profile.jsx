import React, { useState } from "react";
import { User, Building2, Phone, Mail, Edit3, Save, X } from "lucide-react";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    username: "krishna joshi",
    organization: "MNNIT AI Club",
    mobile: "9876543210",
    email: "krishna@mnnit.ac.in",
  });
  
  // To allow canceling, we keep a backup of the data
  const [backup, setBackup] = useState({ ...profile });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[6-9]\d{9}$/;

    if (!profile.username.trim()) newErrors.username = "Required";
    if (!profile.organization.trim()) newErrors.organization = "Required";
    if (!emailRegex.test(profile.email)) newErrors.email = "Invalid email";
    if (!phoneRegex.test(profile.mobile)) newErrors.mobile = "Invalid mobile";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const startEditing = () => {
    setBackup({ ...profile });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setProfile({ ...backup });
    setErrors({});
    setIsEditing(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (validate()) {
      setIsEditing(false);
      // Removed setSaved logic here
    }
  };

  const inputBaseStyle = `w-full bg-white/[0.03] border transition-all duration-300 font-light p-3 rounded-xl text-white outline-none`;
  const activeStyle = `border-white/[0.2] bg-white/[0.07] focus:border-blue-500/50`;
  const readOnlyStyle = `border-transparent cursor-default opacity-70`;

  return (
    // Changed justify-center to justify-start and added pt-20 to move content up
    <div className="min-h-screen bg-[#020202] px-8 lg:px-12 flex flex-col items-center justify-start pt-20">
      <div className="w-full max-w-3xl relative">
        
        <header className="mb-10 ml-2 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Profile Settings</h1>
          <p className="text-slate-500 font-light tracking-wide text-sm uppercase">Swarm Operator Identity</p>
        </header>

        <div className="relative group">
          <div className="absolute inset-0 bg-blue-500/5 blur-3xl -z-10" />

          <div className="relative bg-gradient-to-br from-white/[0.08] to-transparent backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-8 shadow-2xl overflow-hidden">
            
            {/* ACTION BUTTONS GROUP */}
            <div className="absolute top-6 right-6 z-20 flex gap-3">
              {isEditing && (
                <button
                  onClick={cancelEditing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
              )}
              
              <button
                onClick={isEditing ? handleSave : startEditing}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${
                  isEditing 
                  ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20" 
                  : "bg-white text-black hover:bg-blue-50 shadow-white/5"
                }`}
              >
                {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
                <span>{isEditing ? "Save Changes" : "Update Profile"}</span>
              </button>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10">
              {/* USER NAME */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] ml-1">
                   User Name
                </label>
                <input
                  type="text"
                  name="username"
                  readOnly={!isEditing}
                  value={profile.username}
                  onChange={handleChange}
                  className={`${inputBaseStyle} ${isEditing ? activeStyle : readOnlyStyle}`}
                />
                {errors.username && <p className="text-red-400 text-[10px] font-bold ml-1 uppercase">{errors.username}</p>}
              </div>

              {/* ORGANIZATION */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] ml-1">
                   Organization
                </label>
                <input
                  type="text"
                  name="organization"
                  readOnly={!isEditing}
                  value={profile.organization}
                  onChange={handleChange}
                  className={`${inputBaseStyle} ${isEditing ? activeStyle : readOnlyStyle}`}
                />
                {errors.organization && <p className="text-red-400 text-[10px] font-bold ml-1 uppercase">{errors.organization}</p>}
              </div>

              {/* MOBILE */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] ml-1">
                   Contact
                </label>
                <div className="flex">
                  <span className={`flex items-center px-4 bg-white/[0.05] border border-r-0 border-white/[0.1] rounded-l-xl text-slate-500 text-sm ${!isEditing && 'opacity-50'}`}>
                    +91
                  </span>
                  <input
                    type="text"
                    name="mobile"
                    readOnly={!isEditing}
                    value={profile.mobile}
                    onChange={handleChange}
                    className={`${inputBaseStyle} rounded-l-none ${isEditing ? activeStyle : readOnlyStyle}`}
                  />
                </div>
                {errors.mobile && <p className="text-red-400 text-[10px] font-bold ml-1 uppercase">{errors.mobile}</p>}
              </div>

              {/* EMAIL */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] ml-1">
                   System Email
                </label>
                <input
                  type="text"
                  name="email"
                  readOnly={!isEditing}
                  value={profile.email}
                  onChange={handleChange}
                  className={`${inputBaseStyle} ${isEditing ? activeStyle : readOnlyStyle}`}
                />
                {errors.email && <p className="text-red-400 text-[10px] font-bold ml-1 uppercase">{errors.email}</p>}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;