# WebSocket API Documentation

## Connection

Connect to WebSocket server:
```javascript
const socket = io('http://localhost:3000');
```

## Authentication

Authenticate with JWT token:
```javascript
socket.emit('authenticate', 'your-jwt-token');

socket.on('authenticated', (data) => {
  console.log('Authenticated:', data.userId);
});

socket.on('error', (error) => {
  console.log('Auth error:', error.message);
});
```

## Subscription

Subscribe to auction updates:
```javascript
// Subscribe
socket.emit('subscribe:auction', 'auction-id');

// Unsubscribe
socket.emit('unsubscribe:auction', 'auction-id');
```

## Events from Server

### auction:started
Auction has started:
```javascript
socket.on('auction:started', (data) => {
  // data: { auctionId, name, currentRound, startTime }
  console.log(`Auction ${data.name} started`);
});
```

### auction:completed
Auction has completed:
```javascript
socket.on('auction:completed', (data) => {
  // data: { auctionId, totalRounds, totalWinners }
  console.log(`Auction completed with ${data.totalWinners} winners`);
});
```

### round:started
Round has started:
```javascript
socket.on('round:started', (data) => {
  // data: { auctionId, roundNumber, itemsInRound, scheduledEndTime }
  console.log(`Round ${data.roundNumber} started`);
  console.log(`Ends at: ${data.scheduledEndTime}`);
});
```

### round:extended
Round was extended (anti-sniping):
```javascript
socket.on('round:extended', (data) => {
  // data: { auctionId, roundNumber, newEndTime, extensionsCount }
  console.log(`Round extended! New end: ${data.newEndTime}`);
  console.log(`Total extensions: ${data.extensionsCount}`);
});
```

### round:completed
Round has completed:
```javascript
socket.on('round:completed', (data) => {
  // data: { auctionId, roundNumber, winnersCount }
  console.log(`Round ${data.roundNumber} completed`);
  console.log(`${data.winnersCount} winners`);
});
```

### bid:placed
New bid was placed:
```javascript
socket.on('bid:placed', (data) => {
  // data: { auctionId, bidId, userId, username, amount, roundNumber, timestamp }
  console.log(`${data.username} bid ${data.amount}`);
});
```

### bid:increased
Bid was increased:
```javascript
socket.on('bid:increased', (data) => {
  // data: { auctionId, bidId, userId, username, previousAmount, newAmount, roundNumber, timestamp }
  console.log(`${data.username} increased from ${data.previousAmount} to ${data.newAmount}`);
});
```

### leaderboard:updated
Leaderboard has changed:
```javascript
socket.on('leaderboard:updated', (data) => {
  // data: { auctionId, roundNumber, timestamp }
  // Fetch new leaderboard via REST API
  fetchLeaderboard(data.auctionId, data.roundNumber);
});
```

### user:won
You won an item (personal event):
```javascript
socket.on('user:won', (data) => {
  // data: { auctionId, itemNumber, amount, roundNumber }
  console.log(`Congratulations! You won item #${data.itemNumber}`);
});
```

### bid:refunded
Your bid was refunded (personal event):
```javascript
socket.on('bid:refunded', (data) => {
  // data: { auctionId, amount }
  console.log(`Bid refunded: ${data.amount}`);
});
```

## Client Example

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Authenticate
socket.emit('authenticate', localStorage.getItem('token'));

socket.on('authenticated', () => {
  console.log('Connected to WebSocket');
  
  // Subscribe to auction
  const auctionId = 'your-auction-id';
  socket.emit('subscribe:auction', auctionId);
  
  // Listen for events
  socket.on('bid:placed', (data) => {
    updateLeaderboard(data);
  });
  
  socket.on('round:extended', (data) => {
    updateTimer(data.newEndTime);
  });
  
  socket.on('user:won', (data) => {
    showCongratulations(data.itemNumber);
  });
});

// Cleanup
window.addEventListener('beforeunload', () => {
  socket.disconnect();
});
```

## React Hook Example

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useAuctionSocket = (auctionId, token) => {
  const [socket, setSocket] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  
  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    
    newSocket.emit('authenticate', token);
    
    newSocket.on('authenticated', () => {
      newSocket.emit('subscribe:auction', auctionId);
    });
    
    newSocket.on('bid:placed', () => {
      // Refetch leaderboard
      fetchLeaderboard();
    });
    
    newSocket.on('bid:increased', () => {
      fetchLeaderboard();
    });
    
    newSocket.on('round:extended', (data) => {
      console.log('Round extended:', data.newEndTime);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, [auctionId, token]);
  
  return socket;
};
```

## Best Practices

1. **Always authenticate** before subscribing
2. **Subscribe only to active auctions** to reduce load
3. **Unsubscribe** when leaving auction page
4. **Reconnect on disconnect** with exponential backoff
5. **Cache leaderboard** and update on events
6. **Show loading states** during reconnection
7. **Handle errors gracefully**

## Error Handling

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  if (reason === 'io server disconnect') {
    // Server disconnected, try to reconnect
    socket.connect();
  }
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```
