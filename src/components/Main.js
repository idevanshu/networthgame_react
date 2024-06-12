import { DynamicWidget, useDynamicContext  } from "@dynamic-labs/sdk-react-core";

import { useEffect, useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import React from 'react';

const Main = () => {
  const { address } = useAccount();
  const { user, logout } = useDynamicContext();
  const [netWorth, setNetWorth] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [name, setName] = useState('');
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    if (user && address) {
      const userData = {
        userId: user.id,
        address: address,
      };

      // Send user data to the backend
      fetch('http://localhost:3001/api/userdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })
      .then(response => response.json())
      .then(data => {
        setName(data.name);
        setMultiplier(data.multiplier);
        setNetWorth(data.netWorth);
      })
      .catch(error => console.error('Error:', error));
    }

    // Listen for the logout event
    const handleLogout = () => {
      setName('');
      setNetWorth(0);
      setMultiplier(1);
    };

    if (logout) {
      logout.on('logout', handleLogout);
    }

    // Cleanup event listener on unmount
    return () => {
      if (logout) {
        logout.off('logout', handleLogout);
      }
    };
  }, [user, address, logout]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/leaderboard');
      const data = await response.json();
      setLeaders(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-bold mb-4">Welcome, {name || '!'}</h1>
      {name && (
        <>
          <p className="text-lg mb-4">Net Worth: {netWorth.toFixed(3)} ETH</p>
          <p className="text-lg mb-16">Login Multiplier: {multiplier}</p>

          <button 
            className="btn btn-primary mt-4 mx-2 my-4" 
            data-toggle="modal" 
            data-target="#leaderboardModal"
            onClick={fetchLeaderboard}
          >
            View Leaderboard
          </button>
        </>
      )}
      <DynamicWidget />

      <div className="modal fade" id="leaderboardModal" tabIndex="-1" role="dialog" aria-labelledby="leaderboardModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="leaderboardModalLabel" style={{ color: 'black' }}>Leaderboard</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true" style={{ color: 'black' }}>&times;</span>
              </button>
            </div>
            <div className="modal-body" style={{ color: 'black' }}>
              <div className="container">
                <h1 className="text-center mt-5" style={{ color: 'black' }}>Leaderboard</h1>
                <table className="table table-striped mt-3" style={{ color: 'black' }}>
                  <thead className="thead-dark" style={{ color: 'black' }}>
                    <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      <th>Net Worth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaders.map((user, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{user.name}</td>
                        <td>{user.netWorth} ETH</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className="btn btn-primary" data-dismiss="modal">Go Back</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
