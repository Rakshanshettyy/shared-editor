import { useState, useEffect } from "react";
import "quill/dist/quill.snow.css";
import SharedEditor from "./components/SharedEditor";
import PersonalEditor from "./components/PersonalEditor";
import RoomAccess from "./components/RoomAccess";

const DEFAULT_PUBLIC_ROOM = "shareroom";

function App() {
  const [activeTab, setActiveTab] = useState("shared");
  const [roomName, setRoomName] = useState(null);
  const [username, setUsername] = useState(null);

  // On first load, auto-join public room if no session
  useEffect(() => {
    const saved = localStorage.getItem("roomInfo");
    if (saved) {
      const { roomName, username } = JSON.parse(saved);
      if (roomName && username) {
        setRoomName(roomName);
        setUsername(username);
        return;
      }
    }
    // Prompt for username for public room
    setRoomName(DEFAULT_PUBLIC_ROOM);
  }, []);

  // If username missing, prompt for it (for public room)
  const handlePublicJoin = (user) => {
    setUsername(user);
    localStorage.setItem("roomInfo", JSON.stringify({ roomName: DEFAULT_PUBLIC_ROOM, username: user }));
  };

  const handleJoin = (room, user) => {
    setRoomName(room);
    setUsername(user);
    localStorage.setItem("roomInfo", JSON.stringify({ roomName: room, username: user }));
  };

  const handleLeave = () => {
    setRoomName(null);
    setUsername(null);
    localStorage.removeItem("roomInfo");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Tab Navigation */}
      <div className="flex justify-center bg-white shadow-md border-b border-gray-200">
        {["shared", "personal"].map((tab) => (
          <button
            key={tab}
            className={`px-6 py-3 text-sm font-medium transition-all duration-300 focus:outline-none
              ${activeTab === tab
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-blue-100"}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "shared" ? "Shared Room" : "Personal Room"}
          </button>
        ))}
      </div>

      {/* Editors */}
      <div className="flex-grow p-4">
        {activeTab === "shared" ? (
          roomName === DEFAULT_PUBLIC_ROOM ? (
            username ? (
              <SharedEditor
                roomName={DEFAULT_PUBLIC_ROOM}
                username={username}
                onLeave={handleLeave}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="bg-white p-6 rounded shadow w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4">Enter Username for Public Room</h2>
                  <input
                    className="w-full border rounded px-3 py-2 mb-3"
                    placeholder="Your display name"
                    onKeyDown={e => {
                      if (e.key === "Enter" && e.target.value.trim()) {
                        handlePublicJoin(e.target.value.trim());
                      }
                    }}
                  />
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded w-full"
                    onClick={() => {
                      const input = document.querySelector('input');
                      if (input.value.trim()) handlePublicJoin(input.value.trim());
                    }}
                  >
                    Join Public Room
                  </button>
                </div>
              </div>
            )
          ) : roomName && username ? (
            <SharedEditor
              roomName={roomName}
              username={username}
              onLeave={handleLeave}
            />
          ) : (
            <RoomAccess onJoin={handleJoin} />
          )
        ) : (
          <PersonalEditor />
        )}
      </div>
    </div>
  );
}

export default App;
