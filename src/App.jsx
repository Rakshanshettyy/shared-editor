

import { useState } from 'react';
import 'quill/dist/quill.snow.css';
import SharedEditor from './components/SharedEditor';
import PersonalEditor from './components/PersonalEditor';

function App() {
  const [activeTab, setActiveTab] = useState("shared");

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Tab Navigation */}
      <div className="flex justify-center bg-white shadow-md border-b border-gray-200">
        {['shared', 'personal'].map(tab => (
          <button 
            key={tab}
            className={`px-6 py-3 text-sm font-medium transition-all duration-300 focus:outline-none
              ${activeTab === tab 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-blue-100'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'shared' ? 'Shared Room' : 'Personal Room'}
          </button>
        ))}
      </div>

   

      {/* Quill Editors */}
      <div className="flex-grow p-4">
        {activeTab === 'shared' ? <SharedEditor /> : <PersonalEditor />}
      </div>
    </div>
  );
}

export default App;
