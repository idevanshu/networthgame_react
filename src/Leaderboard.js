import React, { useState, useEffect } from 'react';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/leaderboard');
        const contentType = response.headers.get('content-type');

        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Invalid content type: Expected JSON, got ${contentType}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) { // Check if data is an array
          throw new Error('Invalid data format: Expected an array of leaders');
        }
        setLeaders(data);
      } catch (error) {
        setError(error.message);
        console.error('Fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      <ul>
        {leaders.map((user) => (
          <li key={user.id}>{user.name} - Net Worth: {user.netWorth} ETH</li>
        ))}
      </ul>
    </div>
  );
}

export default Leaderboard;
