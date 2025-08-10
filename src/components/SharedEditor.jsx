import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { db } from "../../firebaseConfig";
import { ref, get, set, onValue } from "firebase/database";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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



const SharedEditor = () => {
	const quillRef = useRef(null);
	const [editorContent, setEditorContent] = useState("");
	const [isSaved, setIsSaved] = useState(true);
	const [initialContent, setInitialContent] = useState("");
	const [darkMode, setDarkMode] = useState(false);
	const [autoCopySelection, setAutoCopySelection] = useState(false);
	const [isAutoSaving, setIsAutoSaving] = useState(false);

	const docRef = ref(db, "documents/sharedEditor");

	// Debounce save
	let saveTimeout = useRef(null);

	useEffect(() => {
		const fetchAndSync = async () => {
			try {
				const docSnap = await get(docRef);
				if (!docSnap.exists()) {
					await set(docRef, { content: "" });
				}
				const unsubscribe = onValue(docRef, (snapshot) => {
					const data = snapshot.val();
					if (data) {
						const newContent = data.content || "";
						setEditorContent(newContent);
						setInitialContent(newContent);
					}
					setIsSaved(true);
				});
				return () => unsubscribe();
			} catch (error) {
				console.error("Error setting up document:", error);
			}
		};
		fetchAndSync();

		const handleKeyDown = (event) => {
			if (event.ctrlKey && event.key === "s") {
				event.preventDefault();
				handleSave();
			}
		};
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			clearTimeout(saveTimeout.current);
		};
	}, []);



	const handleContentChange = (content) => {
		setEditorContent(content);
		if (content !== initialContent) {
			setIsSaved(false);
		}
		setIsAutoSaving(true);
		clearTimeout(saveTimeout.current);
		saveTimeout.current = setTimeout(() => {
			handleSave();
			setIsAutoSaving(false);
		}, 1200); // Auto-save after 1.2s of inactivity
	};

	const handleBlur = () => {
		handleSave();
	};

	const handleSave = () => {
		const quill = quillRef.current.getEditor();
		const content = quill.root.innerHTML;
		set(docRef, { content: content || "" });
		setIsSaved(true);
		setInitialContent(content);
		toast.success("Document updated!");
	};

	const handleCopyPlainText = () => {
		const quill = quillRef.current.getEditor();
		const plainText = quill.getText();
		navigator.clipboard.writeText(plainText);
		toast.success("Copied all plain text!");
	};

	const handleCopySelectionPlainText = () => {
		const quill = quillRef.current.getEditor();
		const selection = quill.getSelection();
		if (selection && selection.length > 0) {
			const selectedText = quill.getText(selection.index, selection.length);
			navigator.clipboard.writeText(selectedText);
			toast.success("Selected text copied as plain text!");
		} else {
			toast.info("No text selected.");
		}
	};

	const handleUndo = () => {
		const quill = quillRef.current.getEditor();
		quill.history.undo();
	};

	const handleRedo = () => {
		const quill = quillRef.current.getEditor();
		quill.history.redo();
	};

	const handleDownload = (type) => {
		const quill = quillRef.current.getEditor();
		let data, filename, mime;
		if (type === "txt") {
			data = quill.getText();
			filename = "document.txt";
			mime = "text/plain";
		} else {
			data = quill.root.innerHTML;
			filename = "document.html";
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

	const toggleDarkMode = () => setDarkMode((prev) => !prev);

	// Auto-copy selection if enabled
	useEffect(() => {
		if (!autoCopySelection) return;
		const quill = quillRef.current?.getEditor();
		if (!quill) return;
		const handler = () => {
			const selection = quill.getSelection();
			if (selection && selection.length > 0) {
				const selectedText = quill.getText(selection.index, selection.length);
				navigator.clipboard.writeText(selectedText);
				toast.success("Selected text auto-copied!");
			}
		};
		quill.on("selection-change", handler);
		return () => {
			quill.off("selection-change", handler);
		};
	}, [autoCopySelection]);

	const quillToolbarOptions = [
		[{ "size": ["small", false, "large", "huge"] }],
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
		toolbar: {
			container: quillToolbarOptions,
		},
		history: {
			delay: 500,
			maxStack: 100,
			userOnly: true,
		},
	};

	// Custom styles for dark mode
	return (
		<div className={`flex flex-col h-screen transition-colors duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-black"}`}>
			{/* Responsive Action Bar */}
			<div className={`flex flex-wrap justify-center gap-2 p-2 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"}`}>
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
				<button onClick={toggleDarkMode} className={`rounded p-2 ${darkMode ? "bg-gray-900 text-yellow-300" : "bg-gray-300 text-gray-800"}`} aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
					{darkMode ? <i className='fas fa-sun fa-md'></i> : <i className='fas fa-moon fa-lg'></i>}
				</button>
				<label className='flex items-center gap-1 ml-2 cursor-pointer' title="Auto-copy selection">
					<input type="checkbox" checked={autoCopySelection} onChange={() => setAutoCopySelection(v => !v)} />
					<span className='text-xs'>Auto-copy selection</span>
				</label>
				<span title={isSaved ? "Document is saved" : "Document has unsaved changes"} className={`text-lg ${isSaved ? "text-green-500" : "text-red-500"}`}>
					<i className={`fas ${isSaved ? "fa-check-circle" : "fa-exclamation-circle"}`}></i>
				</span>
				{isAutoSaving && <span className="text-blue-400 text-xs ml-2 animate-pulse">Auto-saving...</span>}
			</div>
			{/* Quill Editor with full toolbar */}
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

export default SharedEditor;
