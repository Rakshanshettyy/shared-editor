// src/components/SharedEditor.jsx
import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { db } from "../../firebaseConfig";
import { ref, get, set, onValue, remove } from "firebase/database";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PropTypes from "prop-types";

// Custom clipboard to clean up newlines on copy/paste
const Clipboard = Quill.import("modules/clipboard");
class CleanClipboard extends Clipboard {
  convert(html = null) {
    let text = super.convert(html);
    if (typeof text === "string") {
      text = text.replace(/\n{2,}/g, "\n");
    }
    return text;
  }
}
Quill.register("modules/clipboard", CleanClipboard, true);

const SharedEditor = ({ roomName, username, onLeave }) => {
  const quillRef = useRef(null);
  const [editorContent, setEditorContent] = useState("");
  const [isSaved, setIsSaved] = useState(true);
  const [initialContent, setInitialContent] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [autoCopySelection, setAutoCopySelection] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const contentRef = ref(db, `rooms/${roomName}/content`);
  const presenceRef = ref(db, `rooms/${roomName}/users/${username}`);

  // Debounce save
  const saveTimeout = useRef(null);

  if (!roomName || !username) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500 font-semibold">
          No room joined. Please go back and join a room.
        </p>
      </div>
    );
  }

  useEffect(() => {
    let unsubscribe = () => {};
    let cleanupCalled = false;

    const init = async () => {
      try {
        // Ensure content exists
        const snap = await get(contentRef);
        if (!snap.exists()) {
          await set(contentRef, "");
        }

        // Listen to content changes
        unsubscribe = onValue(contentRef, (snapshot) => {
          const c = snapshot.val() || "";
          if (
            quillRef.current &&
            c !== quillRef.current.getEditor().root.innerHTML
          ) {
            setEditorContent(c);
            setInitialContent(c);
            setIsSaved(true);
          }
        });

        // mark presence (simple)
        await set(presenceRef, { joinedAt: Date.now() });

        // remove presence on unload
        const cleanup = async () => {
          if (cleanupCalled) return;
          cleanupCalled = true;
          try {
            await remove(presenceRef);
          } catch (e) {
            console.warn("presence remove failed", e);
          }
        };
        window.addEventListener("beforeunload", cleanup);
        return cleanup;
      } catch (err) {
        console.error("SharedEditor init error:", err);
      }
    };

    let cleanupFn;
    init().then((fn) => {
      cleanupFn = fn;
    });

    // keyboard save (ctrl/cmd + s)
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (typeof unsubscribe === "function") unsubscribe();
      clearTimeout(saveTimeout.current);
      if (typeof cleanupFn === "function") cleanupFn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, username]);

  // Listen for active users in the room
  useEffect(() => {
    const usersRef = ref(db, `rooms/${roomName}/users`);
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersObj = snapshot.val() || {};
      const usersList = Object.keys(usersObj);
      setActiveUsers(usersList);
    });
    return () => unsubscribe();
  }, [roomName]);

  const handleContentChange = (content) => {
    setEditorContent(content);
    if (content !== initialContent) setIsSaved(false);
    setIsAutoSaving(true);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      handleSave();
      setIsAutoSaving(false);
    }, 1200);
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleSave = async () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const content = quill.root.innerHTML;
    try {
      await set(contentRef, content || "");
      setIsSaved(true);
      setInitialContent(content);
      toast.success("Document updated!");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save document.");
    }
  };

  const handleCopyPlainText = async () => {
    try {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const plainText = quill.getText();
      await navigator.clipboard.writeText(plainText);
      toast.success("Copied all plain text!");
    } catch (err) {
      toast.error("Clipboard copy failed.");
    }
  };

  const handleCopySelectionPlainText = async () => {
    try {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const selection = quill.getSelection();
      if (selection && selection.length > 0) {
        const selectedText = quill.getText(selection.index, selection.length);
        await navigator.clipboard.writeText(selectedText);
        toast.success("Selected text copied as plain text!");
      } else {
        toast.info("No text selected.");
      }
    } catch (err) {
		console.log(err);
		
      toast.error("Clipboard copy failed.");
    }
  };

  const handleUndo = () => {
    const quill = quillRef.current?.getEditor();
    if (quill) quill.history.undo();
  };

  const handleRedo = () => {
    const quill = quillRef.current?.getEditor();
    if (quill) quill.history.redo();
  };

  const handleDownload = (type) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    let data, filename, mime;
    if (type === "txt") {
      data = quill.getText();
      filename = `${roomName || "document"}.txt`;
      mime = "text/plain";
    } else {
      data = quill.root.innerHTML;
      filename = `${roomName || "document"}.html`;
      mime = "text/html";
    }
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as ${type.toUpperCase()}`);
  };

  const toggleDarkMode = () => setDarkMode((p) => !p);

  // Auto-copy selection if enabled
  useEffect(() => {
    if (!autoCopySelection) return;
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const handler = () => {
      const selection = quill.getSelection();
      if (selection && selection.length > 0) {
        const selectedText = quill.getText(selection.index, selection.length);
        navigator.clipboard.writeText(selectedText).then(() => {
          toast.success("Selected text auto-copied!");
        }).catch(() => {
          toast.error("Clipboard copy failed.");
        });
      }
    };
    quill.on("selection-change", handler);
    return () => quill.off("selection-change", handler);
  }, [autoCopySelection]);

  const quillToolbarOptions = [
    [{ size: ["small", false, "large", "huge"] }],
    ["bold", "italic", "underline", "strike"],
    [{ script: "sub" }, { script: "super" }],
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ direction: "rtl" }],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ["link", "image", "video"],
    ["code-block", "blockquote"],
    ["clean"],
  ];

  const modules = {
    toolbar: { container: quillToolbarOptions },
    history: { delay: 500, maxStack: 100, userOnly: true },
  };

  const leaveRoom = async () => {
    try {
      await remove(presenceRef);
    } catch (e) {
      console.warn("leave error", e);
    }
    localStorage.removeItem("roomInfo");
    if (typeof onLeave === "function") onLeave();
  };

  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-black"}`}>
      {/* Active users bar */}
      <div className={`flex items-center gap-2 px-2 py-1 text-xs font-medium border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"}`}>
        <span className="text-gray-400 mr-2">Active:</span>
        <div className="flex gap-2 overflow-x-auto">
          {activeUsers.map(u => (
            <span key={u} className={`px-2 py-1 rounded ${u === username ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>
              {u}
            </span>
          ))}
        </div>
      </div>

      <div className={`flex flex-wrap justify-between items-center gap-2 p-2 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"}`}>
        <div className="flex items-center gap-3">
          <div className="text-sm">Room: <strong>{roomName}</strong></div>
          <div className="text-sm">You: <strong>{username}</strong></div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleUndo} className={`rounded p-2 ${darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"}`} aria-label="Undo" title="Undo">
            <i className="fas fa-undo fa-md"></i>
          </button>
          <button onClick={handleRedo} className={`rounded p-2 ${darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"}`} aria-label="Redo" title="Redo">
            <i className="fas fa-redo fa-md"></i>
          </button>
          <button onClick={handleSave} className={`rounded p-2 ${darkMode ? "bg-blue-700 text-white" : "bg-blue-500 text-white"}`} aria-label="Save" title="Save">
            <i className="fas fa-save fa-md"></i>
          </button>
          <button onClick={handleCopyPlainText} className={`rounded p-2 ${darkMode ? "bg-green-700 text-white" : "bg-green-500 text-white"}`} aria-label="Copy all plain text" title="Copy all plain text">
            <i className="fas fa-copy fa-md"></i>
          </button>
          <button onClick={handleCopySelectionPlainText} className={`rounded p-2 ${darkMode ? "bg-yellow-700 text-white" : "bg-yellow-400 text-black"}`} aria-label="Copy selected plain text" title="Copy selected plain text">
            <i className="fas fa-i-cursor fa-md"></i>
          </button>
          <button onClick={() => handleDownload("txt")} className={`rounded p-2 ${darkMode ? "bg-purple-700 text-white" : "bg-purple-500 text-white"}`} aria-label="Download as TXT" title="Download as TXT">
            <i className="fas fa-file-alt fa-md"></i>
          </button>
          <button onClick={() => handleDownload("html")} className={`rounded p-2 ${darkMode ? "bg-pink-700 text-white" : "bg-pink-500 text-white"}`} aria-label="Download as HTML" title="Download as HTML">
            <i className="fas fa-file-code fa-md"></i>
          </button>

          <button onClick={toggleDarkMode} className={`rounded p-2 ${darkMode ? "bg-gray-900 text-yellow-300" : "bg-gray-300 text-gray-800"}`} title={darkMode ? "Light" : "Dark"}>
            {darkMode ? <i className='fas fa-sun fa-md'></i> : <i className='fas fa-moon fa-lg'></i>}
          </button>

          <button onClick={leaveRoom} className="ml-2 bg-red-500 text-white px-3 py-1 rounded">Leave</button>

          <label className='flex items-center gap-1 ml-2 cursor-pointer' title="Auto-copy selection">
            <input type="checkbox" checked={autoCopySelection} onChange={() => setAutoCopySelection(v => !v)} />
            <span className='text-xs'>Auto-copy selection</span>
          </label>

          <span title={isSaved ? "Document is saved" : "Document has unsaved changes"} className={`text-lg ${isSaved ? "text-green-500" : "text-red-500"} ml-2`}>
            <i className={`fas ${isSaved ? "fa-check-circle" : "fa-exclamation-circle"}`}></i>
          </span>
          {isAutoSaving && <span className="text-blue-400 text-xs ml-2 animate-pulse">Auto-saving...</span>}
        </div>
      </div>

      <div className={`flex-1 h-full border ${darkMode ? "border-gray-700 bg-gray-900" : "border-gray-300 bg-white"} shadow-md p-2 overflow-x-auto`}>
        <ReactQuill
          ref={quillRef}
          theme='snow'
          value={editorContent}
          onChange={handleContentChange}
          onBlur={handleBlur}
          modules={modules}
          style={{ height: "100%" }}
        />
      </div>

      <ToastContainer theme={darkMode ? "dark" : "light"} />
    </div>
  );
};

SharedEditor.propTypes = {
  roomName: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  onLeave: PropTypes.func
};
export default SharedEditor;
