import { useEffect, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Import Quill styles

// Personal Editor Component
const PersonalEditor = () => {
	const quillRef = useRef(null);

	useEffect(() => {
		const savedContent = localStorage.getItem("personalContent");
		if (savedContent && quillRef.current) {
			const quillInstance = quillRef.current.getEditor();
			quillInstance.setContents(JSON.parse(savedContent));
		}

		// Save content to localStorage on text change
		const quillInstance = quillRef.current
			? quillRef.current.getEditor()
			: null;
		if (quillInstance) {
			quillInstance.on("text-change", () => {
				localStorage.setItem(
					"personalContent",
					JSON.stringify(quillInstance.getContents())
				);
			});
		}
	}, []);

	const modules = {
		toolbar: {
			container: "#personalToolbar", // Point to the custom toolbar
		},
	};

	return (
		<div className='flex flex-col h-screen'>
			{/* Toolbar */}
			<div
				id='personalToolbar'
				className='flex justify-center gap-2 p-2 bg-gray-100 rounded-t-lg overflow-x-auto
 '
			>
				{/* Font Size Icons with Font Awesome */}
				<div className='flex gap-2'>
					<button
						className='ql-size'
						value='small'
						aria-label='Small Font Size'
						title='Small'
					>
						<i className='fas fa-font fa-xs'></i> {/* Small Font Size Icon */}
					</button>

					<button
						className='ql-size'
						value='large'
						aria-label='Large Font Size'
						title='Large'
					>
						<i className='fas fa-font fa-sm'></i> {/* Normal Font Size Icon */}
					</button>
					<button
						className='ql-size'
						value='huge'
						aria-label='Huge Font Size'
						title='Huge'
					>
						<i className='fas fa-font fa-lg'></i> {/* Large Font Size Icon */}
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
			</div>

			{/* Editor */}
			<div className='flex-1 h-full border border-gray-300 rounded-lg bg-white shadow-md p-2'>
				<ReactQuill
					ref={quillRef}
					theme='snow'
					modules={modules}
					style={{ height: "100%" }}
				/>
			</div>
		</div>
	);
};

export default PersonalEditor;
