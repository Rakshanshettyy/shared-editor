import { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { db } from "../../firebaseConfig";
import { ref, get, set, onValue } from "firebase/database";
import { toast, ToastContainer } from "react-toastify"; // Import toast
import "react-toastify/dist/ReactToastify.css"; // Import styles

const SharedEditor = () => {
	const quillRef = useRef(null);
	const [editorContent, setEditorContent] = useState("");

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
						setEditorContent(data.content || ""); 
					}
				});

				return () => unsubscribe();
			} catch (error) {
				console.error("Error setting up document:", error);
			}
		};

		fetchAndSync();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Update Realtime Database on content change
	const handleContentChange = (content) => {
		setEditorContent(content);
	};

	// Insert content into DB once typing is done (on blur or timeout)
	const handleBlur = () => {
		const quill = quillRef.current.getEditor();
		const content = quill.getContents(); // Get the full content
		set(docRef, { content: content || "" }); // Save content to the database
	};

	// Save the document manually and show a toaster notification
	const handleSave = () => {
		const quill = quillRef.current.getEditor();
		const content = quill.getContents(); // Get the full content
		set(docRef, { content: content || "" }); // Save content to the database
		toast.success("Document updated!"); // Show success toaster
	};

	const modules = {
		toolbar: {
			container: "#sharedToolbar",
		},
	};

	return (
		<div className='flex flex-col h-screen'>
			{/* Toolbar */}
			<div
				id='sharedToolbar'
				className='flex justify-center gap-2 p-4 bg-gray-100 rounded-t-lg overflow-x-auto'
			>
				<div className='flex gap-2'>
					<button
						className='ql-size'
						value='small'
						aria-label='Small Font Size'
						title='Small'
					>
						<i className='fas fa-font fa-xs'></i>
					</button>
					<button
						className='ql-size'
						value='large'
						aria-label='Large Font Size'
						title='Large'
					>
						<i className='fas fa-font fa-sm'></i>
					</button>
					<button
						className='ql-size'
						value='huge'
						aria-label='Huge Font Size'
						title='Huge'
					>
						<i className='fas fa-font fa-lg'></i>
					</button>
				</div>
				<button className='ql-bold text-lg font-bold'>B</button>
				<button className='ql-italic text-lg font-italic'>I</button>
				<button className='ql-underline text-lg underline'>U</button>
				<button className='ql-strike text-lg line-through'>S</button>
				<button className='ql-script' value='super'>
					Super
				</button>
				<button className='ql-script' value='sub'>
					Sub
				</button>
				<button className='ql-list' value='ordered'>
					Ordered List
				</button>
				<button className='ql-list' value='bullet'>
					Bullet List
				</button>
				<button className='ql-indent' value='-1'>
					Indent
				</button>
				<button className='ql-indent' value='+1'>
					Outdent
				</button>
				<button className='ql-link'>Link</button>
				<button className='ql-image'>Image</button>
				<button className='ql-code-block'>Code Block</button>
				<button className='ql-blockquote'>Blockquote</button>
				<button className='ql-clean'>Clear Formatting</button>

				<div className='flex  ml-4'>
					<button
						onClick={handleSave}
						className='bg-blue-500 text-black rounded-md p-3 mt-2'
						style={{ position: "relative", bottom: "9px" }}
					>
						<i className='fas fa-save text-xl'></i>
					</button>
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
