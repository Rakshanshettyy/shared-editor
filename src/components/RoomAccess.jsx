import { useState } from "react";
import { db } from "../../firebaseConfig";
import { ref, get, set } from "firebase/database";
import bcrypt from "bcryptjs";
import { toast } from "react-toastify";
import PropTypes from "prop-types";

export default function RoomAccess({ onJoin }) {
  const [roomName, setRoomName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const sanitizeRoomName = (name) =>
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "")
      .slice(0, 64);

  // Real-time validation
  const validate = () => {
    const errs = {};
    if (!roomName.trim()) errs.roomName = "Room name is required.";
    else if (!sanitizeRoomName(roomName)) errs.roomName = "Room name is invalid.";
    if (!username.trim()) errs.username = "Username is required.";
    if (sanitizeRoomName(roomName) !== "shareroom" && !password)
      errs.password = "Password required for private rooms.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleJoin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const normalizedRoom = sanitizeRoomName(roomName);

      if (normalizedRoom === "shareroom") {
        onJoin(normalizedRoom, username);
        setLoading(false);
        return;
      }

      const roomRef = ref(db, `rooms/${normalizedRoom}`);
      const snap = await get(roomRef);

      if (snap.exists()) {
        const data = snap.val();
        const storedHash = data?.passwordHash;
        if (!storedHash) {
          toast.error("Room exists but has no password. Contact admin.");
          setLoading(false);
          return;
        }
        const ok = bcrypt.compareSync(password, storedHash);
        if (!ok) {
          setErrors({ password: "Invalid password for this room." });
          setLoading(false);
          return;
        }
      } else {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        await set(roomRef, {
          passwordHash: hash,
          content: "",
          createdAt: Date.now(),
        });
        toast.success("Room created.");
      }

      const userRef = ref(db, `rooms/${normalizedRoom}/users/${username}`);
      await set(userRef, { joinedAt: Date.now() });

      onJoin(normalizedRoom, username);
    } catch (err) {
        console.log(err);
        
      toast.error("Error accessing room. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 px-2">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 text-center tracking-tight">
          Join or Create a Room
        </h2>
        <form
          className="space-y-5"
          onSubmit={e => {
            e.preventDefault();
            handleJoin();
          }}
          autoComplete="off"
        >
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">
              Room Name
            </label>
            <input
              id="roomName"
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition
                ${errors.roomName ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"}`}
              value={roomName}
              onChange={e => {
                setRoomName(e.target.value);
                setErrors({ ...errors, roomName: undefined });
              }}
              placeholder="Room name (unique)"
              autoFocus
            />
            {errors.roomName && (
              <div className="text-xs text-red-500 mt-1 animate-fade-in">{errors.roomName}</div>
            )}
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition
                ${errors.username ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"}`}
              value={username}
              onChange={e => {
                setUsername(e.target.value);
                setErrors({ ...errors, username: undefined });
              }}
              placeholder="Your display name"
            />
            {errors.username && (
              <div className="text-xs text-red-500 mt-1 animate-fade-in">{errors.username}</div>
            )}
          </div>

          {sanitizeRoomName(roomName) !== "shareroom" && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition
                  ${errors.password ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"}`}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrors({ ...errors, password: undefined });
                }}
                placeholder="Password to join or create room"
              />
              {errors.password && (
                <div className="text-xs text-red-500 mt-1 animate-fade-in">{errors.password}</div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold text-white transition
              ${loading ? "bg-blue-300" : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg"}`}
          >
            {loading ? "Please wait..." : "Join / Create Room"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setRoomName("");
              setUsername("");
              setPassword("");
              setErrors({});
            }}
            className="w-full py-2 rounded-lg border border-gray-300 text-gray-600 mt-2 hover:bg-gray-50 transition"
          >
            Clear
          </button>
        </form>
        <div className="mt-4 text-xs text-gray-500 text-center">
          Public room is <b>shareroom</b> (no password required).
        </div>
      </div>
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px);}
          to { opacity: 1; transform: translateY(0);}
        }
      `}</style>
    </div>
  );
}

RoomAccess.propTypes = {
  onJoin: PropTypes.func.isRequired
};
