import { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { db } from "../../firebaseConfig";  // Import Realtime Database config
import { ref, get, set, onValue } from "firebase/database";  // Import Realtime Database methods

const SharedEditor = () => {
  const quillRef = useRef(null);
  const [editorContent, setEditorContent] = useState("");

  const docRef = ref(db, "documents/sharedEditor");

  // Fetch and set up real-time sync
  useEffect(() => {
    const fetchAndSync = async () => {
      try {
        const docSnap = await get(docRef);
        
        // Initialize document if it doesn't exist
        if (!docSnap.exists()) {
          await set(docRef, { content: "" });
        }

        // Set up real-time listener
        const unsubscribe = onValue(docRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setEditorContent(data.content);
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up document:", error);
      }
    };

    fetchAndSync();
  }, []);

  // Update Realtime Database on content change
  const handleContentChange = (content) => {
    setEditorContent(content);
    set(docRef, { content });  // Use set to update the content in Realtime Database
  };

  const modules = {
    toolbar: {
      container: "#sharedToolbar",
    },
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div id="sharedToolbar" className="flex justify-center gap-2 p-2 bg-gray-100 rounded-t-lg overflow-x-auto">
        <div className="flex gap-2">
          <button className="ql-size" value="small" aria-label="Small Font Size" title="Small">
            <i className="fas fa-font fa-xs"></i>
          </button>
          <button className="ql-size" value="large" aria-label="Large Font Size" title="Large">
            <i className="fas fa-font fa-sm"></i>
          </button>
          <button className="ql-size" value="huge" aria-label="Huge Font Size" title="Huge">
            <i className="fas fa-font fa-lg"></i>
          </button>
        </div>
        <button className="ql-bold text-lg font-bold">B</button>
        <button className="ql-italic text-lg font-italic">I</button>
        <button className="ql-underline text-lg underline">U</button>
        <button className="ql-strike text-lg line-through">S</button>
        <button className="ql-script" value="super">Super</button>
        <button className="ql-script" value="sub">Sub</button>
        <button className="ql-list" value="ordered">Ordered List</button>
        <button className="ql-list" value="bullet">Bullet List</button>
        <button className="ql-indent" value="-1">Indent</button>
        <button className="ql-indent" value="+1">Outdent</button>
        <button className="ql-link">Link</button>
        <button className="ql-image">Image</button>
        <button className="ql-code-block">Code Block</button>
        <button className="ql-blockquote">Blockquote</button>
        <button className="ql-clean">Clear Formatting</button>
      </div>

      {/* Editor */}
      <div className="flex-1 h-full border border-gray-300 bg-white shadow-md p-2">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={editorContent}
          onChange={(content) => handleContentChange(content)}
          modules={modules}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
};

export default SharedEditor;
