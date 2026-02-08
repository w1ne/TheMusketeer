import { useEffect, useState } from 'react';
import './index.css';

interface Agent {
    id: string;
    name: string;
    status: string;
}

function App() {
    const [agents, setAgents] = useState<Agent[]>([]);

    useEffect(() => {
        fetch('/api/agents')
            .then((res) => res.json())
            .then((data) => setAgents(data))
            .catch((err) => console.error(err));
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Vibe Kanban Dashboard
                </h1>

                <div className="grid gap-4">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center"
                        >
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800">
                                    {agent.name}
                                </h2>
                                <p className="text-sm text-gray-500">ID: {agent.id}</p>
                            </div>
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${agent.status === 'working'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                            >
                                {agent.status}
                            </span>
                        </div>
                    ))}

                    {agents.length === 0 && (
                        <p className="text-gray-500 text-center">No agents active.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
