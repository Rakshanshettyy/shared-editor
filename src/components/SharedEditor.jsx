import { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { db } from "../../firebaseConfig";
import { ref, get, set, onValue } from "firebase/database";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SharedEditor = () => {
	const quillRef = useRef(null);
	const [editorContent, setEditorContent] = useState("");
	const [isSaved, setIsSaved] = useState(true);
	const [initialContent, setInitialContent] = useState(""); // Track initial content

	const docRef = ref(db, "documents/sharedEditor");

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
						const newContent = data.content || "";
						setEditorContent(newContent);
						setInitialContent(newContent); // Store the initial content when syncing
					}
					setIsSaved(true); // Mark as saved when real-time data is received
				});

				return () => unsubscribe();
			} catch (error) {
				console.error("Error setting up document:", error);
			}
		};

		fetchAndSync();

		// Handle Ctrl+S save
		const handleKeyDown = (event) => {
			if (event.ctrlKey && event.key === "s") {
				event.preventDefault();
				handleSave();
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	// Update Realtime Database on content change
	const handleContentChange = (content) => {
		setEditorContent(content);
		// Only mark as unsaved if content is different from initial content
		if (content !== initialContent) {
			setIsSaved(false);
		}
		console.log("Content unsaved");
	};

	// Insert content into DB once typing is done (on blur or timeout)
	const handleBlur = () => {
		handleSave();
	};

	// Save the document manually and show a toaster notification
	const handleSave = () => {
		const quill = quillRef.current.getEditor();
		const content = quill.getContents();
		set(docRef, { content: content || "" });
		setIsSaved(true); // Mark as saved after saving
		setInitialContent(content); // Update the initial content after saving
		toast.success("Document updated!");
	};

	const modules = {
		toolbar: {
			container: "#sharedToolbar",
		},
	};

	return (
		<div className='flex flex-col h-screen'>
			{/* Toolbar */}
			<div id='sharedToolbar' className='flex justify-center gap-2 p-4 bg-gray-100 rounded-t-lg overflow-x-auto'>
				<div className='flex gap-2'>
					<button className='ql-size' value='small' title='Small'>
						<i className='fas fa-font fa-xs'></i>
					</button>
					<button className='ql-size' value='large' title='Large'>
						<i className='fas fa-font fa-sm'></i>
					</button>
					<button className='ql-size' value='huge' title='Huge'>
						<i className='fas fa-font fa-lg'></i>
					</button>
				</div>
				<button className='ql-bold text-lg font-bold'>B</button>
				<button className='ql-italic text-lg font-italic'>I</button>
				<button className='ql-underline text-lg underline'>U</button>
				<button className='ql-strike text-lg line-through'>S</button>
				<button className='ql-script' value='super'>Super</button>
				<button className='ql-script' value='sub'>Sub</button>
				<button className='ql-list' value='ordered'>Ordered List</button>
				<button className='ql-list' value='bullet'>Bullet List</button>
				<button className='ql-indent' value='-1'>Indent</button>
				<button className='ql-indent' value='+1'>Outdent</button>
				<button className='ql-link'>Link</button>
				<button className='ql-image'>Image</button>
				<button className='ql-code-block'>Code Block</button>
				<button className='ql-blockquote'>Blockquote</button>
				<button className='ql-clean'>Clear Formatting</button>

				<div className='flex ml-4 items-center gap-2'>
					<button
						onClick={handleSave}
						className='bg-blue-500 text-black rounded-md p-3 mt-2'
						style={{ position: "relative", bottom: "9px" }}
					>
						<i className='fas fa-save text-xl'></i>
					</button>
					{/* Save status icon */}
					<span
						title={isSaved ? "Document is saved" : "Document has unsaved changes"}
						className={`text-lg ${
							isSaved ? "text-green-500" : "text-red-500"
						}`}
					>
						<i className={`fas ${isSaved ? "fa-check-circle" : "fa-exclamation-circle"}`}></i>
					</span>
				</div>
			</div>

			{/* Editor */}
			<div className='flex-1 h-full border border-gray-300 bg-white shadow-md p-2 overflow-x-auto'>
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
			{/* Toaster Notification */}
			<ToastContainer />
		</div>
	);
};

export default SharedEditor;
